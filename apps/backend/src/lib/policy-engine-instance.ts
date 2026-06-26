import { PolicyEngine } from '@armoriq/policy-engine';
import { prisma } from './prisma';

export const policyEngine = new PolicyEngine();

export async function initPolicyEngine(): Promise<void> {
  const rules = await prisma.rule.findMany({ where: { isActive: true } });
  policyEngine.loadRules(rules.map((r: any) => ({
    id: r.id,
    type: r.type,
    toolPattern: r.toolPattern,
    condition: r.condition,
    priority: r.priority,
    ttlSeconds: r.ttlSeconds,
    onTimeout: r.onTimeout,
    isActive: r.isActive,
  })));
}
