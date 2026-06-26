import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { prisma } from '../lib/prisma';
import { logAuditEntry, verifyChain } from '../audit/logger';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';

export const auditRouter = Router();

const AuditQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  toolName: z.string().optional(),
  decision: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  conversationId: z.string().optional()
});

auditRouter.get('/', validateQuery(AuditQuerySchema), asyncWrapper(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof AuditQuerySchema>;
  
  const where: any = {};
  if (query.toolName) where.toolName = query.toolName;
  if (query.decision) where.decision = query.decision;
  if (query.conversationId) where.conversationId = query.conversationId;
  if (query.from || query.to) {
    where.timestamp = {};
    if (query.from) where.timestamp.gte = new Date(query.from);
    if (query.to) where.timestamp.lte = new Date(query.to);
  }

  const skip = (query.page - 1) * query.limit;

  const [total, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: query.limit
    })
  ]);

  res.status(200).json({
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit)
    }
  });
}));

auditRouter.get('/verify', asyncWrapper(async (req, res) => {
  const result = await verifyChain();
  res.status(200).json(result);
}));

const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json')
});

auditRouter.get('/export', validateQuery(ExportQuerySchema), asyncWrapper(async (req, res) => {
  const { format } = req.query as unknown as z.infer<typeof ExportQuerySchema>;
  
  const data = await prisma.auditLog.findMany({ orderBy: { timestamp: 'asc' }});
  
  const filename = `armoriq-audit-${new Date().toISOString()}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(data, null, 2));
  } else {
    res.setHeader('Content-Type', 'text/csv');
    let csv = 'timestamp,conversationId,toolName,decision,reason,latencyMs,riskContrib\n';
    for (const row of data) {
      csv += `${row.timestamp.toISOString()},${row.conversationId},${row.toolName},${row.decision},"${row.reason.replace(/"/g, '""')}",${row.latencyMs || 0},${row.riskContrib}\n`;
    }
    res.status(200).send(csv);
  }
}));

auditRouter.get('/:conversationId', asyncWrapper(async (req, res) => {
  const conversationId = req.params.conversationId as string;

  const session = await prisma.conversationSession.findUnique({ where: { id: conversationId } });
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const events = await prisma.auditLog.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'asc' }
  });

  res.status(200).json({ data: { session, events } });
}));
