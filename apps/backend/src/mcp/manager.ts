import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getIo } from '../ws/socket-handler';
import { Type } from '@google/genai';
import { decrypt } from '../lib/crypto';

interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface ManagedServer {
  config: any;
  client: Client;
  tools: Map<string, DiscoveredTool>;
  isHealthy: boolean;
  lastPingAt: Date | null;
}

export class McpManager {
  private servers: Map<string, ManagedServer> = new Map();
  private toolIndex: Map<string, { serverName: string; tool: DiscoveredTool }> = new Map();

  async initialize(): Promise<void> {
    const configs = await prisma.mcpServerConfig.findMany({ where: { isActive: true } });
    for (const config of configs) {
      await this.connectServer(config).catch(e => logger.error({ err: e, serverName: config.name }, 'Failed to connect server'));
    }
  }

  async connectServer(config: any): Promise<void> {
    let transport;
    const dbConfig = typeof config.config === 'string' ? JSON.parse(config.config) : (config.config || {});
    const urlStr = dbConfig.url;

    if (!urlStr) {
      throw new Error(`Missing url in config for server: ${config.name}`);
    }

    if (config.transport === 'STREAMABLE_HTTP') {
      const headers: Record<string, string> = {};
      const rawApiKey = config.authHeader || (config.name === 'context7-mcp' ? process.env.CONTEXT7_API_KEY : undefined);
      const apiKey = rawApiKey ? decrypt(rawApiKey) : undefined;
      
      if (apiKey) {
        headers['CONTEXT7_API_KEY'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      transport = new SSEClientTransport(new URL(urlStr), {
        eventSourceInit: Object.keys(headers).length > 0 ? ({ headers } as any) : undefined,
        requestInit: Object.keys(headers).length > 0 ? ({ headers } as any) : undefined
      });
    } else if (config.transport === 'STDIO') {
      const parts = urlStr.split(' ');
      
      const env: Record<string, string> = { ...process.env } as Record<string, string>;
      if (dbConfig.env) {
        for (const [k, v] of Object.entries(dbConfig.env)) {
          env[k] = decrypt(v as string);
        }
      }

      transport = new StdioClientTransport({
        command: parts[0],
        args: parts.slice(1),
        env
      });
    } else {
      throw new Error(`Unsupported transport: ${config.transport}`);
    }

    const client = new Client({ name: 'armoriq-backend', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const toolsMap = new Map<string, DiscoveredTool>();
    const allowedTools = config.allowedTools || [];

    for (const t of toolsResponse.tools) {
      if (allowedTools.length === 0 || allowedTools.includes(t.name)) {
        const discovered: DiscoveredTool = {
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as any
        };
        toolsMap.set(t.name, discovered);
        this.toolIndex.set(t.name, { serverName: config.name, tool: discovered });
      }
    }

    this.servers.set(config.name, {
      config,
      client,
      tools: toolsMap,
      isHealthy: true,
      lastPingAt: new Date()
    });

    await prisma.mcpServerConfig.update({
      where: { id: config.id },
      data: {
        isHealthy: true,
        toolCount: toolsMap.size,
        discoveredTools: Array.from(toolsMap.keys())
      }
    });

    try {
      getIo().emit('tools:updated');
    } catch(e) {}
  }

  async disconnectServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (server) {
      await server.client.close();
      this.servers.delete(serverName);
      for (const [tName, idx] of this.toolIndex.entries()) {
        if (idx.serverName === serverName) this.toolIndex.delete(tName);
      }
    }
  }

  getAllTools(): DiscoveredTool[] {
    const all: DiscoveredTool[] = [];
    for (const server of this.servers.values()) {
      if (server.isHealthy) {
        all.push(...Array.from(server.tools.values()));
      }
    }
    return all;
  }

  getToolClient(toolName: string): Client | null {
    const idx = this.toolIndex.get(toolName);
    if (!idx) return null;
    return this.servers.get(idx.serverName)?.client || null;
  }

  getToolSchema(toolName: string): DiscoveredTool | null {
    return this.toolIndex.get(toolName)?.tool || null;
  }

  getToolServerName(toolName: string): string | null {
    return this.toolIndex.get(toolName)?.serverName || null;
  }

  async probeServer(urlStr: string, transportType: string, authHeader?: string, customEnv?: Record<string, string>): Promise<any[]> {
    let transport;
    if (transportType === 'STREAMABLE_HTTP') {
      const headers: Record<string, string> = {};
      const apiKey = authHeader ? decrypt(authHeader) : undefined;
      if (apiKey) {
        headers['CONTEXT7_API_KEY'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      transport = new SSEClientTransport(new URL(urlStr), {
        eventSourceInit: Object.keys(headers).length > 0 ? ({ headers } as any) : undefined,
        requestInit: Object.keys(headers).length > 0 ? ({ headers } as any) : undefined
      });
    } else if (transportType === 'STDIO') {
      const parts = urlStr.split(' ');
      const env: Record<string, string> = { ...process.env, ...customEnv } as Record<string, string>;
      transport = new StdioClientTransport({
        command: parts[0],
        args: parts.slice(1),
        env
      });
    } else {
      throw new Error(`Unsupported transport: ${transportType}`);
    }

    const client = new Client({ name: 'armoriq-probe-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    try {
      const toolsResponse = await client.listTools();
      return toolsResponse.tools || [];
    } finally {
      await client.close().catch(() => {});
    }
  }

  async pingAll(): Promise<void> {
    for (const [name, server] of this.servers.entries()) {
      try {
        await server.client.listTools();
        server.isHealthy = true;
        server.lastPingAt = new Date();
        await prisma.mcpServerConfig.update({ where: { id: server.config.id }, data: { isHealthy: true }});
      } catch (e) {
        server.isHealthy = false;
        await prisma.mcpServerConfig.update({ where: { id: server.config.id }, data: { isHealthy: false }});
        logger.warn({ serverName: name }, 'Server ping failed');
      }
    }
    try {
      getIo().emit('server:health', Array.from(this.servers.entries()).map(([k, v]) => ({ name: k, healthy: v.isHealthy })));
    } catch(e) {}
  }
}

export const mcpManager = new McpManager();

function mapProperty(val: any): any {
  let genaiType = Type.STRING;
  if (val.type === 'number' || val.type === 'integer') genaiType = Type.NUMBER;
  else if (val.type === 'boolean') genaiType = Type.BOOLEAN;
  else if (val.type === 'array') genaiType = Type.ARRAY;
  else if (val.type === 'object') genaiType = Type.OBJECT;

  const prop: any = {
    type: genaiType,
    description: val.description || '',
  };

  if (val.type === 'array') {
    if (val.items) {
      prop.items = mapProperty(val.items);
    } else {
      prop.items = { type: Type.STRING };
    }
  } else if (val.type === 'object' && val.properties) {
    prop.properties = {};
    for (const [k, subVal] of Object.entries(val.properties)) {
      prop.properties[k] = mapProperty(subVal);
    }
    if (val.required) {
      prop.required = val.required;
    }
  }

  return prop;
}

export function toGeminiDeclarations(tools: DiscoveredTool[]): any[] {
  return tools.map(t => {
    let properties: Record<string, any> = {};
    if (t.inputSchema.properties) {
      for (const [key, val] of Object.entries(t.inputSchema.properties)) {
        properties[key] = mapProperty(val);
      }
    }

    return {
      name: t.name,
      description: t.description || 'No description',
      parameters: {
        type: Type.OBJECT,
        properties,
        required: t.inputSchema.required || []
      }
    };
  });
}

