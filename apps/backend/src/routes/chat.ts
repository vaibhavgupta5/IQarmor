import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { runAgentLoop } from '../agent/loop';
import { getIo } from '../ws/socket-handler';
import crypto from 'crypto';

export const chatRouter = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional()
});

chatRouter.post('/', validateBody(ChatRequestSchema), asyncWrapper(async (req, res) => {
  const { message, conversationId: reqConvId } = req.body as z.infer<typeof ChatRequestSchema>;
  const userId = req.user!.id;
  const conversationId = reqConvId || crypto.randomUUID();

  const result = await runAgentLoop(message, conversationId, userId, getIo());

  res.status(200).json({
    data: {
      conversationId,
      message: result.finalText,
      tokenCount: result.tokenCount
    }
  });
}));

chatRouter.get('/', asyncWrapper(async (req, res) => {
  const userId = req.user!.id;
  const { prisma } = require('../lib/prisma');
  
  const sessions = await prisma.conversationSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      intentLabel: true,
      riskScore: true,
      status: true,
      tokenCount: true,
      startedAt: true,
      endedAt: true
    }
  });

  res.status(200).json({ data: sessions });
}));
