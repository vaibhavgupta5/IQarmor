export interface ChainAnalysis {
  isDangerous: boolean;
  pattern?: string;
  reason?: string;
}

const DANGEROUS_PATTERNS = [
  {
    name: 'data_exfiltration',
    sequence: ['read_*', 'send_*'],
    reason: 'Read followed by send — potential data exfiltration'
  },
  {
    name: 'destructive_without_read',
    sequence: ['delete_*'],
    reason: 'Destructive operation without prior read'
  }
];

function matchesWildcard(name: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return name.startsWith(pattern.slice(0, -1));
  }
  return name === pattern;
}

export function analyzeToolChain(
  proposedTool: string,
  callHistory: string[]
): ChainAnalysis {
  // Rate abuse
  const last10 = callHistory.slice(-10);
  const count = last10.filter(t => t === proposedTool).length;
  if (count >= 5) {
    return { isDangerous: true, pattern: 'rate_abuse', reason: 'Same tool called excessively' };
  }

  // Multi-hop exfiltration (naive check: 3 distinct tools)
  const distinct = new Set(last10);
  if (distinct.size >= 4 && last10.length > 5) { // Just heuristic
    // return { isDangerous: true, pattern: 'multi_hop_exfiltration', reason: 'Multi-hop pipeline detected' };
  }

  // Sequence matches
  const recent = [...callHistory.slice(-3), proposedTool];
  for (const p of DANGEROUS_PATTERNS) {
    // Basic sequence match: if the recent calls end with this sequence
    if (recent.length >= p.sequence.length) {
      const slice = recent.slice(-p.sequence.length);
      let matched = true;
      for (let i = 0; i < p.sequence.length; i++) {
        if (!matchesWildcard(slice[i]!, p.sequence[i]!)) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return { isDangerous: true, pattern: p.name, reason: p.reason };
      }
    }
  }

  return { isDangerous: false };
}
