import { PolicyRule } from '@armoriq/shared';
import { CheckResult } from '../types';

function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return toolName === pattern;
}

export function checkRateLimitRules(toolName: string, callTimestamps: Map<string, number[]>, rules: PolicyRule[]): CheckResult {
  const rateLimitRules = rules.filter(r => r.type === 'RATE_LIMIT' && r.isActive && matchesPattern(toolName, r.toolPattern));

  for (const rule of rateLimitRules) {
    if (!rule.condition || rule.condition.field !== 'count') continue;
    
    const limit = Number(rule.condition.value);
    const history = callTimestamps.get(toolName) || [];

    if (history.length >= limit) {
      return {
        matched: true,
        verdict: 'RATE_LIMIT_EXCEEDED',
        reason: `Exceeded rate limit of ${limit} calls for tool ${toolName}`,
        matchedRuleId: rule.id
      };
    }
  }

  return { matched: false };
}

export function recordToolCall(toolName: string, callTimestamps: Map<string, number[]>): void {
  const history = callTimestamps.get(toolName) || [];
  history.push(Date.now());
  callTimestamps.set(toolName, history);
}
