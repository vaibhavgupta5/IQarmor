import { PolicyRule, TimeoutAction } from '@armoriq/shared';
import { CheckResult } from '../types';

function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return toolName === pattern;
}

export function checkApprovalRules(toolName: string, rules: PolicyRule[]): CheckResult & { ttlSeconds?: number; onTimeout?: TimeoutAction } {
  const approveRules = rules.filter(r => r.type === 'APPROVE' && r.isActive && matchesPattern(toolName, r.toolPattern));

  if (approveRules.length > 0) {
    const rule = approveRules[0]!;
    return {
      matched: true,
      verdict: 'HOLD_FOR_APPROVAL',
      reason: `Requires approval based on rule ${rule.id}`,
      matchedRuleId: rule.id,
      ttlSeconds: rule.ttlSeconds ?? undefined,
      onTimeout: rule.onTimeout
    };
  }

  return { matched: false };
}
