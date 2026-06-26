import type { PolicyRule, PolicyDecision, ConversationContext, Verdict } from '@armoriq/shared';

export interface CheckResult {
  matched: boolean;
  verdict?: Verdict;
  reason?: string;
  matchedRuleId?: string;
  riskContribution?: number;
}

export interface RateLimitState {
  // key: toolName, value: array of call timestamps (epoch ms)
  callTimestamps: Map<string, number[]>;
}

export interface PolicyEngineConfig {
  // Window for rate limit tracking in ms (default: per-conversation, no expiry)
  rateLimitWindowMs?: number;
}

export interface InjectionScanResult {
  detected: boolean;
  injectionType?: 'DIRECT' | 'INDIRECT' | 'ENCODING' | 'PARAMETER_POLLUTION';
  matchedPattern?: string;
  confidence: number;  // 0-1
}
