import { VERDICT_PRIORITY, Verdict } from '@armoriq/shared';
import { CheckResult } from './types';

export interface ConflictResolution {
  winningVerdict: Verdict;
  resolution: string;
  matchedRuleId?: string;
  conflictResolved: boolean;
}

export function resolveConflicts(results: Array<CheckResult & { verdict: Verdict; matchedRuleId?: string }>): ConflictResolution {
  const matches = results.filter(r => r.matched && r.verdict);
  if (matches.length === 0) {
    return {
      winningVerdict: 'ALLOW',
      resolution: 'No rules matched',
      conflictResolved: false
    };
  }

  if (matches.length === 1) {
    return {
      winningVerdict: matches[0]!.verdict!,
      resolution: matches[0]!.reason || 'Matched rule',
      matchedRuleId: matches[0]!.matchedRuleId,
      conflictResolved: false
    };
  }

  matches.sort((a, b) => {
    const priorityA = VERDICT_PRIORITY[a.verdict!] ?? 0;
    const priorityB = VERDICT_PRIORITY[b.verdict!] ?? 0;
    return priorityB - priorityA;
  });

  const winner = matches[0]!;
  const runnerUp = matches[1]!;

  return {
    winningVerdict: winner.verdict!,
    resolution: `Conflict resolved: ${winner.verdict} beat ${runnerUp.verdict}`,
    matchedRuleId: winner.matchedRuleId,
    conflictResolved: true
  };
}
