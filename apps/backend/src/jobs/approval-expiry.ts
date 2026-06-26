import { prisma } from '../lib/prisma';
import { approvalResolvers, getIo } from '../ws/socket-handler';
import { logAuditEntry } from '../audit/logger';

export function startApprovalExpiryJob(): NodeJS.Timeout {
  return setInterval(async () => {
    const expired = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      }
    });

    for (const req of expired) {
      await prisma.approvalRequest.update({
        where: { id: req.id },
        data: { status: 'TIMEOUT' }
      });

      const resolver = approvalResolvers.get(req.id);
      if (resolver) {
        resolver('REJECTED'); // Or some custom TIMEOUT rejection
        approvalResolvers.delete(req.id);
      }

      await logAuditEntry({
        conversationId: req.conversationId,
        toolName: req.toolName,
        params: req.params as Record<string, unknown>,
        decision: 'AUTO_DENIED_TIMEOUT',
        reason: 'Approval request timed out',
        riskContrib: 0
      });

      try {
        getIo().emit('approval:expired', { id: req.id });
      } catch(e) {}
    }
  }, 5000);
}
