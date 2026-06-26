import type { PolicyRule, PolicyDecision, ConversationContext, Verdict } from '@armoriq/shared';
import { VERDICT_RISK_SCORES } from '@armoriq/shared';
import type { RateLimitState, PolicyEngineConfig, InjectionScanResult, CheckResult } from './types';
import { scanForDirectInjection, scanToolResultForInjection } from './checks/injection-scanner';
import { checkBlockRules } from './checks/block-checker';
import { checkValidationRules } from './checks/validation-checker';
import { checkRateLimitRules, recordToolCall } from './checks/rate-limit-checker';
import { checkBudget } from './checks/budget-checker';
import { checkIntentDrift } from './checks/intent-drift-checker';
import { checkApprovalRules } from './checks/approval-checker';
import { resolveConflicts } from './conflict-resolver';

export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private rateLimitState: RateLimitState = { callTimestamps: new Map() };
  private config: PolicyEngineConfig;

  constructor(config: PolicyEngineConfig = {}) {
    this.config = config;
  }

  loadRules(rules: PolicyRule[]): void {
    this.rules = rules.filter(r => r.isActive);
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  /**
   * Main evaluation method. Runs all 8 checks in order.
   * Returns the most restrictive decision if multiple rules match.
   */
  evaluate(
    toolName: string,
    params: Record<string, unknown>,
    ctx: ConversationContext
  ): PolicyDecision {
    const startTime = Date.now();
    const results: Array<CheckResult & { verdict: Verdict }> = [];

    // Check 1: Direct injection scan (params)
    const directInjection = scanForDirectInjection(params);
    if (directInjection.detected) {
      // Record call and return immediately
      return this.buildDecision({
        verdict: 'INJECTION_DETECTED',
        reason: `Direct injection detected: pattern "${directInjection.matchedPattern}" (confidence: ${directInjection.confidence.toFixed(2)})`,
        startTime,
        riskContribution: VERDICT_RISK_SCORES['INJECTION_DETECTED']
      });
    }

    // Check 3: Block rules
    const blockCheck = checkBlockRules(toolName, this.rules);
    if (blockCheck.matched && blockCheck.verdict) results.push(blockCheck as CheckResult & { verdict: Verdict });

    // Check 4: Validation rules
    const validationCheck = checkValidationRules(toolName, params, this.rules);
    if (validationCheck.matched && validationCheck.verdict) results.push(validationCheck as CheckResult & { verdict: Verdict });

    // Check 5: Rate limit rules
    const rateLimitCheck = checkRateLimitRules(toolName, this.rateLimitState.callTimestamps, this.rules);
    if (rateLimitCheck.matched && rateLimitCheck.verdict) results.push(rateLimitCheck as CheckResult & { verdict: Verdict });

    // Check 6: Budget check
    const budgetCheck = checkBudget(ctx, this.rules, toolName);
    if (budgetCheck.matched && budgetCheck.verdict) results.push(budgetCheck as CheckResult & { verdict: Verdict });

    // Check 7: Intent drift
    const driftCheck = checkIntentDrift(toolName, ctx.intentLabel, ctx.callHistory);
    if (driftCheck.matched && driftCheck.verdict) results.push(driftCheck as CheckResult & { verdict: Verdict });

    // Check 8: Approval rules
    const approvalCheck = checkApprovalRules(toolName, this.rules);
    if (approvalCheck.matched && approvalCheck.verdict) results.push(approvalCheck as CheckResult & { verdict: Verdict });

    // (Check 2: indirect injection is called from the MCP router, not here)

    // If no rules match: ALLOW
    const finalDecision = results.length > 0
      ? resolveConflicts(results)
      : { winningVerdict: 'ALLOW' as Verdict, conflictResolved: false, resolution: 'No matching rules — default ALLOW' };

    if (finalDecision.winningVerdict === 'ALLOW') {
      recordToolCall(toolName, this.rateLimitState.callTimestamps);
    }

    return this.buildDecision({
      verdict: finalDecision.winningVerdict,
      reason: finalDecision.resolution,
      matchedRuleId: 'matchedRuleId' in finalDecision ? finalDecision.matchedRuleId as string : undefined,
      conflictResolved: finalDecision.conflictResolved,
      conflictResolution: finalDecision.resolution,
      startTime,
      riskContribution: VERDICT_RISK_SCORES[finalDecision.winningVerdict] ?? 0
    });
  }

  /**
   * Check 2: Scan a tool result for indirect injection before feeding to LLM.
   * Called by MCP Router, not the main evaluate() method.
   */
  scanToolResult(result: unknown): InjectionScanResult {
    return scanToolResultForInjection(result);
  }

  private buildDecision(opts: {
    verdict: Verdict;
    reason: string;
    matchedRuleId?: string;
    conflictResolved?: boolean;
    conflictResolution?: string;
    startTime: number;
    riskContribution: number;
  }): PolicyDecision {
    return {
      verdict: opts.verdict,
      reason: opts.reason,
      matchedRuleId: opts.matchedRuleId,
      conflictResolved: opts.conflictResolved ?? false,
      conflictResolution: opts.conflictResolution,
      riskContribution: opts.riskContribution,
      latencyMs: Date.now() - opts.startTime,
    };
  }
}

// Re-export types for consumers
export type { PolicyEngineConfig, InjectionScanResult } from './types';
