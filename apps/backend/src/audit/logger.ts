import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

interface AuditEntry {
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  decision: string;
  reason: string;
  result?: unknown;
  latencyMs?: number;
  riskContrib: number;
}

export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  const lastLog = await prisma.auditLog.findFirst({
    where: { conversationId: entry.conversationId },
    orderBy: { timestamp: 'desc' }
  });

  const prevHash = lastLog?.hash || 'GENESIS';
  const timestamp = new Date();

  const dataStr = entry.conversationId + timestamp.toISOString() + entry.toolName + JSON.stringify(entry.params) + entry.decision + entry.reason + prevHash;
  const hash = createHash('sha256').update(dataStr).digest('hex');

  await prisma.auditLog.create({
    data: {
      conversationId: entry.conversationId,
      toolName: entry.toolName,
      params: entry.params as any,
      decision: entry.decision,
      reason: entry.reason,
      result: entry.result ? (entry.result as any) : undefined,
      latencyMs: entry.latencyMs || 0,
      riskContrib: entry.riskContrib,
      hash,
      prevHash,
      timestamp
    }
  });

  logger.info({ audit: true, decision: entry.decision, tool: entry.toolName }, 'Audit log entry created');
}

export async function verifyChain(): Promise<{ valid: boolean; tamperedAt?: number; totalEntries: number }> {
  const entries = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'asc' }
  });

  let valid = true;
  let tamperedAt: number | undefined;

  const chains = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!chains.has(entry.conversationId)) chains.set(entry.conversationId, []);
    chains.get(entry.conversationId)!.push(entry);
  }

  for (const chain of chains.values()) {
    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i]!;
      
      if (i > 0) {
        if (entry.prevHash !== chain[i-1]!.hash) {
          valid = false;
          tamperedAt = entry.timestamp.getTime();
          break;
        }
      } else if (entry.prevHash !== 'GENESIS') {
         valid = false;
         tamperedAt = entry.timestamp.getTime();
         break;
      }

      // Helper to try permutations since Prisma JSON retrieval may reorder keys
      const getPermutations = (obj: any): string[] => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [JSON.stringify(obj)];
        const keys = Object.keys(obj);
        if (keys.length <= 1) return [JSON.stringify(obj)];
        const results: string[] = [];
        const permute = (arr: string[], memo: string[] = []) => {
          if (arr.length === 0) {
            const newObj: any = {};
            for (const k of memo) newObj[k] = obj[k];
            results.push(JSON.stringify(newObj));
          } else {
            for (let i = 0; i < arr.length; i++) {
              const curr = arr.slice();
              const next = curr.splice(i, 1);
              permute(curr, memo.concat(next));
            }
          }
        };
        permute(keys);
        return results;
      };

      let matchedHash = false;
      const perms = getPermutations(entry.params);
      for (const p of perms) {
        const dataStr = entry.conversationId + entry.timestamp.toISOString() + entry.toolName + p + entry.decision + entry.reason + entry.prevHash;
        const computedHash = createHash('sha256').update(dataStr).digest('hex');
        if (computedHash === entry.hash) {
          matchedHash = true;
          break;
        }
      }

      if (!matchedHash) {
        valid = false;
        tamperedAt = entry.timestamp.getTime();
        break;
      }
    }
    if (!valid) break;
  }

  return { valid, tamperedAt, totalEntries: entries.length };
}
