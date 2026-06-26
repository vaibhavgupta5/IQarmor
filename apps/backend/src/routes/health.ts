import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncWrapper } from '../middleware/asyncWrapper';

export const healthRouter = Router();

healthRouter.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', asyncWrapper(async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unreachable', error: 'Database unavailable' });
  }
}));
