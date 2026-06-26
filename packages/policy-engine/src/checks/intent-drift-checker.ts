import { CheckResult } from '../types';

const INTENT_TOOL_MAP: Record<string, { allowed: string[]; blocked: string[] }> = {
  'read_and_summarize': {
    allowed: ['read_*', 'get_*', 'fetch_*', 'search_*', 'lookup_*', 'check_*', 'scan_*', 'list_*'],
    blocked: ['delete_*', 'send_*', 'create_*', 'drop_*', 'remove_*', 'update_*', 'write_*']
  },
  'security_check': {
    allowed: ['check_*', 'scan_*', 'lookup_*', 'get_*', 'search_*'],
    blocked: ['delete_*', 'send_*', 'create_*', 'drop_*']
  },
  'threat_analysis': {
    allowed: ['check_*', 'scan_*', 'lookup_*', 'get_threat_*', 'search_*'],
    blocked: ['delete_*', 'send_*', 'drop_*']
  },
  'file_management': {
    allowed: ['read_*', 'list_*', 'get_*', 'create_file', 'write_file'],
    blocked: ['send_*', 'drop_*', 'delete_database']
  }
};

function matchesPattern(toolName: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return toolName === pattern;
}

export function checkIntentDrift(toolName: string, intentLabel: string | undefined, callHistory: string[]): CheckResult {
  if (!intentLabel) return { matched: false };

  // Find matching intent
  const key = Object.keys(INTENT_TOOL_MAP).find(k => intentLabel.toLowerCase().includes(k.toLowerCase()));
  if (!key) return { matched: false };

  const rules = INTENT_TOOL_MAP[key]!;

  const isBlocked = rules.blocked.some(pattern => matchesPattern(toolName, pattern));
  if (isBlocked) {
    return {
      matched: true,
      verdict: 'INTENT_DRIFT',
      reason: `Tool ${toolName} is blocked for intent ${intentLabel}`
    };
  }

  return { matched: false };
}
