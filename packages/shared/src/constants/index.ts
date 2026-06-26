import { Verdict } from '../types';

export const VERDICT_RISK_SCORES: Record<Verdict, number> = {
  ALLOW: 0,
  BLOCK: 15,
  VALIDATION_FAIL: 10,
  INJECTION_DETECTED: 40,
  INDIRECT_INJECTION_DETECTED: 50,
  INTENT_DRIFT: 20,
  DANGEROUS_CHAIN: 35,
  HOLD_FOR_APPROVAL: 0,
  BUDGET_EXCEEDED: 0,
  RATE_LIMIT_EXCEEDED: 0,
  LOOP_DETECTED: 0,
};

export const VERDICT_PRIORITY: Record<Verdict, number> = {
  INJECTION_DETECTED: 10,
  INDIRECT_INJECTION_DETECTED: 10, // Not explicitly in prompt mapping but logically goes here
  BLOCK: 9,
  VALIDATION_FAIL: 8,
  DANGEROUS_CHAIN: 7, // Similarly added for completion based on missing elements
  INTENT_DRIFT: 7,
  RATE_LIMIT_EXCEEDED: 7,
  HOLD_FOR_APPROVAL: 6,
  BUDGET_EXCEEDED: 5,
  LOOP_DETECTED: 4,
  ALLOW: 0,
};

export const MAX_LOOP_ITERATIONS = 10;
export const RISK_FLAG_THRESHOLD = 80;
export const RISK_TERMINATE_THRESHOLD = 100;
export const APPROVAL_DEFAULT_TTL_SECONDS = 120;
export const AGENT_TOOL_TIMEOUT_MS = 10000;
export const LOOP_GUARD_WINDOW = 3;
