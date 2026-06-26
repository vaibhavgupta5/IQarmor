import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { prisma } from '../lib/prisma';
import { approvalResolvers } from '../ws/socket-handler';
import { ApprovalStatus } from '@prisma/client';

export const approvalsRouter = Router();

const QuerySchema = z.object({
  status: z.nativeEnum(ApprovalStatus).optional()
});

approvalsRouter.get('/', validateQuery(QuerySchema), asyncWrapper(async (req, res) => {
  const query = req.query as z.infer<typeof QuerySchema>;
  const status = query.status || 'PENDING';

  const approvals = await prisma.approvalRequest.findMany({
    where: { status },
    include: {
      session: {
        select: { intentLabel: true }
      }
    },
    orderBy: { requestedAt: 'desc' }
  });

  res.status(200).json({ data: approvals });
}));

const DecideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED'])
});

approvalsRouter.post('/:id/decide', validateBody(DecideSchema), asyncWrapper(async (req, res) => {
  const { decision } = req.body as z.infer<typeof DecideSchema>;
  const id = req.params.id as string;

  const approval = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }

  if (approval.status !== 'PENDING') {
    res.status(400).json({ error: 'Approval is not pending' });
    return;
  }

  const updated = await prisma.approvalRequest.update({
    where: { id },
    data: {
      status: decision as ApprovalStatus,
      decidedAt: new Date(),
      decidedBy: req.user!.id
    }
  });

  const resolver = approvalResolvers.get(id);
  if (resolver) {
    resolver(decision);
    approvalResolvers.delete(id);
  }

  res.status(200).json({ data: { id, status: updated.status } });
}));
