import { InjectionScanResult } from '../types';

const DIRECT_PATTERNS = [
  { regex: /(ignore previous|ignore all|system:|new rule:|disregard|jailbreak|forget your instructions|you are now|act as|pretend you are|your new instructions)/i, type: 'DIRECT', confidence: 0.9 },
  { regex: /^[A-Za-z0-9+/]{20,}={0,2}$/, type: 'ENCODING', confidence: 0.7 }
];

function isInstructionLike(str: string): boolean {
  const verbs = ['do', 'call', 'execute', 'run', 'send', 'delete', 'access'];
  let count = 0;
  const sentences = str.split(/[.!?]+/);
  for (const sentence of sentences) {
    const firstWord = sentence.trim().split(/\s+/)[0]?.toLowerCase();
    if (verbs.includes(firstWord || '')) {
      count++;
    }
  }
  return count >= 2;
}

function hasMixedScripts(str: string): boolean {
  const hasLatin = /[a-zA-Z]/.test(str);
  const hasCyrillicOrGreek = /[\u0400-\u04FF\u0370-\u03FF]/.test(str);
  return hasLatin && hasCyrillicOrGreek;
}

function scanString(str: string, fieldName: string = ''): InjectionScanResult | null {
  for (const pattern of DIRECT_PATTERNS) {
    if (pattern.regex.test(str)) {
      // Check field constraint for base64
      if (pattern.type === 'ENCODING' && (fieldName.toLowerCase().includes('data') || fieldName.toLowerCase().includes('content'))) {
        continue;
      }
      return { detected: true, injectionType: pattern.type as any, matchedPattern: pattern.regex.source, confidence: pattern.confidence };
    }
  }
  if (isInstructionLike(str)) {
    return { detected: true, injectionType: 'DIRECT', matchedPattern: 'instruction-like structure', confidence: 0.8 };
  }
  
  const shortFields = ['id', 'name', 'domain', 'ip', 'url'];
  const isShortField = shortFields.some(f => fieldName.toLowerCase().includes(f));
  if (isShortField && str.length > 200) {
    return { detected: true, injectionType: 'PARAMETER_POLLUTION', matchedPattern: 'anomalously long string', confidence: 0.7 };
  }

  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) {
      return { detected: true, injectionType: 'DIRECT', matchedPattern: 'nested JSON payload', confidence: 0.85 };
    }
  } catch (e) {
    // not JSON
  }

  if (hasMixedScripts(str)) {
    return { detected: true, injectionType: 'ENCODING', matchedPattern: 'unicode homoglyphs', confidence: 0.95 };
  }

  return null;
}

function scanObjectRecursively(obj: unknown, isIndirect: boolean = false, fieldName: string = ''): InjectionScanResult | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'string') {
    const res = scanString(obj, fieldName);
    if (res && isIndirect) res.injectionType = 'INDIRECT';
    return res;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = scanObjectRecursively(item, isIndirect, fieldName);
      if (res) return res;
    }
  }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const res = scanObjectRecursively(value, isIndirect, key);
      if (res) return res;
    }
  }
  return null;
}

export function scanForDirectInjection(params: Record<string, unknown>): InjectionScanResult {
  const result = scanObjectRecursively(params, false);
  return result || { detected: false, confidence: 0 };
}

export function scanToolResultForInjection(result: unknown): InjectionScanResult {
  const res = scanObjectRecursively(result, true);
  return res || { detected: false, confidence: 0 };
}

