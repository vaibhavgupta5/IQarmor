import { PolicyRule, ConversationContext } from '@armoriq/shared';
import { CheckResult } from '../types';

function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return toolName === pattern;
}

export function checkBudget(ctx: ConversationContext, rules: PolicyRule[], toolName: string = '*'): CheckResult {
  if (ctx.budgetLimit !== undefined && ctx.budgetLimit !== null && ctx.tokenCount >= ctx.budgetLimit) {
    return {
      matched: true,
      verdict: 'BUDGET_EXCEEDED',
      reason: `Context token budget limit (${ctx.budgetLimit}) exceeded. Current: ${ctx.tokenCount}`
    };
  }

  const budgetRules = rules.filter(r => r.type === 'BUDGET' && r.isActive && matchesPattern(toolName, r.toolPattern));

  for (const rule of budgetRules) {
    if (!rule.condition) continue;
    const limit = Number(rule.condition.value);
    if (ctx.tokenCount >= limit) {
      return {
        matched: true,
        verdict: 'BUDGET_EXCEEDED',
        reason: `Rule token budget limit (${limit}) exceeded. Current: ${ctx.tokenCount}`,
        matchedRuleId: rule.id
      };
    }
  }

  return { matched: false };
}
