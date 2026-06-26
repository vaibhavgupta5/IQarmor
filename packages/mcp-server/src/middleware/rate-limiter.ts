const limits: Record<string, { maxPerMinute: number }> = {
  check_domain: { maxPerMinute: 4 },
  check_ip: { maxPerMinute: 16 },
  lookup_cve: { maxPerMinute: 10 },
  scan_url: { maxPerMinute: 4 },
};

const calls: Record<string, number[]> = {
  check_domain: [],
  check_ip: [],
  lookup_cve: [],
  scan_url: []
};

export function checkRateLimit(toolName: string): boolean {
  if (!limits[toolName]) return true;
  const now = Date.now();
  const windowStart = now - 60000;
  
  // Clean up old calls
  calls[toolName] = calls[toolName]!.filter(timestamp => timestamp > windowStart);
  
  return calls[toolName]!.length < limits[toolName]!.maxPerMinute;
}

export function recordCall(toolName: string): void {
  if (calls[toolName]) {
    calls[toolName]!.push(Date.now());
  }
}
