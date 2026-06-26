import { z } from 'zod';

/**
 * Validates incoming chat requests.
 */
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().cuid().optional(),
});
export type ChatRequestType = z.infer<typeof ChatRequestSchema>;

const RuleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'starts_with',
    'ends_with',
    'contains',
    'not_contains',
    'matches_regex',
    'lt',
    'gt',
    'in_list',
    'not_in_list',
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

/**
 * Validates creation of a new rule.
 */
export const RuleCreateSchema = z.object({
  type: z.enum(['BLOCK', 'APPROVE', 'VALIDATE', 'BUDGET', 'RATE_LIMIT']),
  toolPattern: z.string().min(1),
  condition: RuleConditionSchema.optional().nullable(),
  priority: z.number().int().default(0),
  ttlSeconds: z.number().int().optional().nullable(),
  onTimeout: z.enum(['DENY', 'ESCALATE']).default('DENY'),
  isActive: z.boolean().default(true),
});
export type RuleCreateType = z.infer<typeof RuleCreateSchema>;

/**
 * Validates updating an existing rule.
 */
export const RuleUpdateSchema = RuleCreateSchema.partial();
export type RuleUpdateType = z.infer<typeof RuleUpdateSchema>;

/**
 * Validates a decision made on a pending approval.
 */
export const ApprovalDecideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});
export type ApprovalDecideType = z.infer<typeof ApprovalDecideSchema>;

/**
 * Validates registration of an MCP server.
 */
export const ServerRegisterSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['STDIO', 'STREAMABLE_HTTP']),
  config: z.record(z.unknown()), // JSON object representation
  allowedTools: z.array(z.string()).default([]),
  authHeader: z.string().optional(),
});
export type ServerRegisterType = z.infer<typeof ServerRegisterSchema>;

/**
 * Validates a probe request to check MCP server status before registering.
 */
export const ServerProbeSchema = z.object({
  transport: z.enum(['STDIO', 'STREAMABLE_HTTP']),
  url: z.string().url().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  authHeader: z.string().optional(),
}).refine((data) => {
  if (data.transport === 'STREAMABLE_HTTP' && !data.url) return false;
  if (data.transport === 'STDIO' && (!data.command || !data.args)) return false;
  return true;
}, {
  message: "Invalid configuration for the selected transport.",
});
export type ServerProbeType = z.infer<typeof ServerProbeSchema>;
