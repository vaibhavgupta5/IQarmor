import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';

import { checkDomain, checkDomainSchema } from './tools/check-domain';
import { checkIp, checkIpSchema } from './tools/check-ip';
import { lookupCve, lookupCveSchema } from './tools/lookup-cve';
import { scanUrl, scanUrlSchema } from './tools/scan-url';
import { getThreatSummary, getThreatSummarySchema } from './tools/get-threat-summary';

const server = new McpServer({
  name: 'threatintel-mcp',
  version: '1.0.0',
});

(server as any).tool(
  'check_domain',
  'Check if a domain is malicious using VirusTotal threat intelligence',
  { domain: z.string().min(3).max(253) },
  async (args: any) => {
    const result = await checkDomain(args as any);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

(server as any).tool(
  'check_ip',
  'Check if an IP address is malicious using AbuseIPDB',
  { ip: z.string().ip() },
  async (args: any) => {
    const result = await checkIp(args as any);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

(server as any).tool(
  'lookup_cve',
  'Look up vulnerability details by CVE ID using NIST NVD',
  { cveId: z.string().regex(/^CVE-\d{4}-\d{4,}$/i) },
  async (args: any) => {
    const result = await lookupCve(args as any);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

(server as any).tool(
  'scan_url',
  'Submit a URL to UrlScan.io and get the scan results',
  { url: z.string().url() },
  async (args: any) => {
    const result = await scanUrl(args as any);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

(server as any).tool(
  'get_threat_summary',
  'Auto-detect input type (domain, ip, cve, url) and get threat intel summary',
  { query: z.string().min(3).max(200) },
  async (args: any) => {
    const result = await getThreatSummary(args as any);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

const app = express();
app.use((req, res, next) => {
  console.log(`[MCP Server] ${req.method} ${req.url}`);
  console.log(`Headers:`, JSON.stringify(req.headers));
  const oldSend = res.send;
  res.send = function(body) {
    console.log(`[MCP Server] Response status: ${res.statusCode}`);
    return oldSend.apply(this, arguments as any);
  };
  next();
});
app.use(express.json());

const transports = new Map<string, SSEServerTransport>();

app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp', res);
  const sessionId = transport.sessionId;
  console.log(`[MCP Server] New SSE connection. sessionId=${sessionId}`);
  transports.set(sessionId, transport);

  transport.onclose = () => {
    console.log(`[MCP Server] SSE connection closed. Deleting sessionId=${sessionId}`);
    transports.delete(sessionId);
  };

  await server.connect(transport);
});

app.post('/mcp', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log(`[MCP Server] POST request. sessionId=${sessionId}, query=${JSON.stringify(req.query)}`);
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }
  const transport = transports.get(sessionId);
  if (!transport) {
    console.log(`[MCP Server] POST failed: Session not found for sessionId=${sessionId}. Active sessions: ${Array.from(transports.keys()).join(', ')}`);
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (sessionId) {
    const transport = transports.get(sessionId);
    if (transport) {
      await transport.close();
      transports.delete(sessionId);
    }
  }
  res.sendStatus(200);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'threatintel-mcp', tools: 5 });
});

// Run server
async function run() {
  const PORT = 3002;
  app.listen(PORT, () => console.log(`threatintel-mcp running on port ${PORT}`));
}

run().catch(console.error);
