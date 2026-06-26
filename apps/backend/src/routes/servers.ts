import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { prisma } from '../lib/prisma';
import { mcpManager } from '../mcp/manager';
import { Transport } from '@prisma/client';
import { encrypt } from '../lib/crypto';

export const serversRouter = Router();

serversRouter.get('/', asyncWrapper(async (req, res) => {
  const servers = await prisma.mcpServerConfig.findMany();
  const masked = servers.map(s => {
    const { authHeader, ...rest } = s;
    let parsedTools = [];
    try {
      parsedTools = typeof s.discoveredTools === 'string' ? JSON.parse(s.discoveredTools) : s.discoveredTools;
    } catch(e) {}
    return { ...rest, discoveredTools: parsedTools };
  });
  res.status(200).json({ data: masked });
}));

const ProbeSchema = z.object({
  name: z.string(),
  transport: z.nativeEnum(Transport),
  url: z.string(),
  authHeader: z.string().optional(),
  env: z.record(z.string()).optional()
});

serversRouter.post('/probe', validateBody(ProbeSchema), asyncWrapper(async (req, res) => {
  const body = req.body as z.infer<typeof ProbeSchema>;
  try {
    const envDecrypted = body.env; // We use the raw values for probing directly
    const tools = await mcpManager.probeServer(body.url, body.transport, body.authHeader, envDecrypted);
    res.status(200).json({ data: { tools, serverInfo: { name: body.name } } });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Probe failed' });
  }
}));

const RegisterSchema = z.object({
  name: z.string(),
  transport: z.nativeEnum(Transport),
  url: z.string(),
  authHeader: z.string().optional(),
  env: z.record(z.string()).optional()
});

serversRouter.post('/', validateBody(RegisterSchema), asyncWrapper(async (req, res) => {
  const body = req.body as z.infer<typeof RegisterSchema>;
  
  const encryptedEnv: Record<string, string> = {};
  if (body.env) {
    for (const [k, v] of Object.entries(body.env)) {
      encryptedEnv[k] = encrypt(v);
    }
  }

  const created = await prisma.mcpServerConfig.create({
    data: {
      name: body.name,
      transport: body.transport,
      config: { url: body.url, env: Object.keys(encryptedEnv).length > 0 ? encryptedEnv : undefined },
      authHeader: body.authHeader ? encrypt(body.authHeader) : undefined
    }
  });

  await mcpManager.connectServer(created).catch(() => {});

  const { authHeader, ...masked } = created;
  res.status(201).json({ data: masked });
}));

const UpdateSchema = z.object({
  config: z.any().optional(),
  allowedTools: z.array(z.string()).optional(),
  authHeader: z.string().optional()
});

serversRouter.put('/:id', validateBody(UpdateSchema), asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  const body = req.body as z.infer<typeof UpdateSchema>;

  const updated = await prisma.mcpServerConfig.update({
    where: { id },
    data: body
  });

  res.status(200).json({ data: updated });
}));

serversRouter.patch('/:id/toggle', asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  const server = await prisma.mcpServerConfig.findUnique({ where: { id } });
  if (!server) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const updated = await prisma.mcpServerConfig.update({
    where: { id },
    data: { isActive: !server.isActive }
  });

  if (updated.isActive) {
    await mcpManager.connectServer(updated).catch(() => {});
  } else {
    await mcpManager.disconnectServer(updated.name).catch(() => {});
  }

  res.status(200).json({ data: updated });
}));

serversRouter.get('/:id/tools', asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  const server = await prisma.mcpServerConfig.findUnique({ where: { id } });
  if (!server) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let parsedTools = [];
  try {
    parsedTools = typeof server.discoveredTools === 'string' ? JSON.parse(server.discoveredTools) : server.discoveredTools;
  } catch(e) {}

  res.status(200).json({ data: parsedTools });
}));
