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

export function checkBlockRules(toolName: string, rules: PolicyRule[]): CheckResult {
  const blockRules = rules.filter(r => r.type === 'BLOCK' && r.isActive);
  
  // Sort by priority descending
  blockRules.sort((a, b) => b.priority - a.priority);

  for (const rule of blockRules) {
    if (matchesPattern(toolName, rule.toolPattern)) {
      return {
        matched: true,
        verdict: 'BLOCK',
        reason: `Matched BLOCK rule ${rule.id} (pattern: ${rule.toolPattern})`,
        matchedRuleId: rule.id
      };
    }
  }

  return { matched: false };
}
