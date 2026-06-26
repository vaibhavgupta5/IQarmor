// Verdict types - every possible policy decision outcome
export type Verdict =
  | 'ALLOW'
  | 'BLOCK'
  | 'HOLD_FOR_APPROVAL'
  | 'VALIDATION_FAIL'
  | 'BUDGET_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INJECTION_DETECTED'
  | 'INDIRECT_INJECTION_DETECTED'
  | 'INTENT_DRIFT'
  | 'DANGEROUS_CHAIN'
  | 'LOOP_DETECTED';

// Rule types
export type RuleType = 'BLOCK' | 'APPROVE' | 'VALIDATE' | 'BUDGET' | 'RATE_LIMIT';
export type TimeoutAction = 'DENY' | 'ESCALATE';
export type SessionStatus = 'ACTIVE' | 'FLAGGED' | 'TERMINATED' | 'COMPLETED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'TIMEOUT';
export type Transport = 'STDIO' | 'STREAMABLE_HTTP';
export type AddedVia = 'MANUAL' | 'DEEP_LINK' | 'IMPORT';

// Validation condition operators
export type ConditionOperator =
  | 'starts_with'
  | 'ends_with'
  | 'contains'
  | 'not_contains'
  | 'matches_regex'
  | 'lt'
  | 'gt'
  | 'in_list'
  | 'not_in_list';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | string[];
}

// Policy Engine types (plain objects, no Prisma dependency)
export interface PolicyRule {
  id: string;
  type: RuleType;
  toolPattern: string;
  condition?: RuleCondition | null;
  priority: number;
  ttlSeconds?: number | null;
  onTimeout: TimeoutAction;
  isActive: boolean;
}

export interface PolicyDecision {
  verdict: Verdict;
  reason: string;
  matchedRuleId?: string;
  conflictResolved: boolean;
  conflictResolution?: string;
  riskContribution: number;  // 0-50
  latencyMs: number;
}

export interface ConversationContext {
  conversationId: string;
  userId?: string;
  intentLabel?: string;
  tokenCount: number;
  budgetLimit?: number;
  riskScore: number;
  callHistory: string[];
  sessionStatus: SessionStatus;
}

// Socket.io event payloads
export interface AgentEvent {
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  decision: Verdict;
  reason: string;
  latencyMs: number;
  riskContrib: number;
  timestamp: string;
}

export interface ApprovalRequestEvent {
  id: string;
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  expiresAt: string;
}

export interface ServerHealthEvent {
  serverName: string;
  isHealthy: boolean;
  toolCount: number;
  latencyMs?: number;
}

export interface ConflictDetectedEvent {
  ruleAId: string;
  ruleBId: string;
  toolName: string;
  winningRuleId: string;
  resolution: string;
}

export interface RiskUpdatedEvent {
  conversationId: string;
  riskScore: number;
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  tokenCount: number;
}

// MCP Tool types
export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

// Audit types
export interface AuditEntry {
  id: string;
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  decision: string;
  reason: string;
  result?: Record<string, unknown> | null;
  latencyMs?: number | null;
  riskContrib: number;
  prevHash: string;
  hash: string;
  timestamp: string;
}
