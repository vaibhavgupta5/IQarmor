import { Router } from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { prisma } from '../lib/prisma';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', asyncWrapper(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalCalls, blockedCalls, pendingApprovals, avgRisk] = await Promise.all([
    prisma.auditLog.count({ where: { timestamp: { gte: today } } }),
    prisma.auditLog.count({ where: { decision: 'BLOCK', timestamp: { gte: today } } }),
    prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
    prisma.conversationSession.aggregate({ _avg: { riskScore: true } })
  ]);

  res.status(200).json({
    data: {
      totalCallsToday: totalCalls,
      blockedToday: blockedCalls,
      pendingApprovals,
      averageRiskScore: avgRisk._avg.riskScore || 0
    }
  });
}));

analyticsRouter.get('/top-blocked', asyncWrapper(async (req, res) => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const blocked = await prisma.auditLog.groupBy({
    by: ['toolName'],
    where: { decision: 'BLOCK', timestamp: { gte: lastWeek } },
    _count: { toolName: true },
    orderBy: { _count: { toolName: 'desc' } },
    take: 10
  });

  res.status(200).json({
    data: blocked.map(b => ({ toolName: b.toolName, count: b._count.toolName }))
  });
}));

analyticsRouter.get('/risk-timeline', asyncWrapper(async (req, res) => {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  const sessions = await prisma.conversationSession.findMany({
    where: { startedAt: { gte: yesterday } },
    select: { startedAt: true, riskScore: true }
  });

  const timeline: Record<string, { total: number; count: number }> = {};
  for (const s of sessions) {
    const hour = s.startedAt.toISOString().slice(0, 13) + ':00:00.000Z';
    if (!timeline[hour]) timeline[hour] = { total: 0, count: 0 };
    timeline[hour]!.total += s.riskScore;
    timeline[hour]!.count += 1;
  }

  const data = Object.keys(timeline).sort().map(k => ({
    time: k,
    avgRisk: timeline[k]!.total / timeline[k]!.count
  }));

  res.status(200).json({ data });
}));
