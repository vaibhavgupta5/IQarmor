import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Triggering backend reload after MCP server is fully online and healthy
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { correlationIdMiddleware } from './middleware/correlationId';
import { apiRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat';
import { rulesRouter } from './routes/rules';
import { auditRouter } from './routes/audit';
import { approvalsRouter } from './routes/approvals';
import { serversRouter } from './routes/servers';
import { toolsRouter } from './routes/tools';
import { analyticsRouter } from './routes/analytics';
import { setupSocketHandlers } from './ws/socket-handler';
import { requireAuth } from './middleware/auth';
import { initPolicyEngine } from './lib/policy-engine-instance';
import { mcpManager } from './mcp/manager';
import { healthMonitor } from './mcp/health-monitor';
import { startApprovalExpiryJob } from './jobs/approval-expiry';
import { chatRateLimit } from './middleware/rateLimit';

const REQUIRED_ENV = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'PORT'
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:3000', 
  'https://iqarmor.vercel.app', 
  'https://armoriq-frontend.vercel.app'
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});
setupSocketHandlers(io);

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(correlationIdMiddleware);
app.use(apiRateLimit);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', requireAuth, chatRateLimit, chatRouter);
app.use('/api/rules', requireAuth, rulesRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/approvals', requireAuth, approvalsRouter);
app.use('/api/servers', requireAuth, serversRouter);
app.use('/api/tools', requireAuth, toolsRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);

// Global Error Handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  io.close();
  httpServer.close(() => {
    prisma.$disconnect().then(() => {
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  });
});

const PORT = Number(process.env.PORT) ?? 3001;
httpServer.listen(PORT, async () => {
  logger.info({ port: PORT }, 'ArmorIQ backend started');
  
  // Startup sequence
  await initPolicyEngine();
  await mcpManager.initialize();
  healthMonitor.start();
  startApprovalExpiryJob();
  
  // Seed rule templates if empty
  const templatesCount = await prisma.ruleTemplate.count();
  if (templatesCount === 0) {
    await prisma.ruleTemplate.createMany({
      data: [
        { name: 'Block Destructive Tools', category: 'SECURITY', description: 'Block all delete/drop/remove tools', ruleConfig: { type: 'BLOCK', toolPattern: 'delete_*', priority: 10 } },
        { name: 'Block Email Send', category: 'SECURITY', description: 'Require approval before sending emails', ruleConfig: { type: 'APPROVE', toolPattern: 'send_*', ttlSeconds: 120, onTimeout: 'DENY', priority: 8 } },
        { name: 'Domain Allowlist Only', category: 'COMPLIANCE', description: 'Prevent internal domain leakage', ruleConfig: { type: 'VALIDATE', toolPattern: 'check_domain', condition: { field: 'domain', operator: 'not_contains', value: 'internal' }, priority: 5 } },
        { name: 'Token Budget 4000', category: 'COST', description: 'Limit conversations to 4000 tokens', ruleConfig: { type: 'BUDGET', toolPattern: '*', condition: { field: 'count', operator: 'lt', value: 4000 }, priority: 1 } },
        { name: 'Rate Limit Domain Check', category: 'COST', description: 'Max 10 domain checks per conversation', ruleConfig: { type: 'RATE_LIMIT', toolPattern: 'check_domain', condition: { field: 'count', operator: 'lt', value: 10 }, priority: 1 } }
      ]
    });
  }
});

