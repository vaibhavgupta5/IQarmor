import crypto from 'crypto';

interface CallRecord {
  toolName: string;
  paramsHash: string;
  timestamp: number;
}

const LOOP_GUARD_WINDOW = 5;

export class LoopGuard {
  private recentCalls: CallRecord[] = [];
  private windowSize: number;

  constructor(windowSize: number = LOOP_GUARD_WINDOW) {
    this.windowSize = windowSize;
  }

  private hashParams(params: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');
  }

  isDuplicate(toolName: string, params: Record<string, unknown>): boolean {
    const paramsHash = this.hashParams(params);
    const window = this.recentCalls.slice(-this.windowSize);
    return window.some(c => c.toolName === toolName && c.paramsHash === paramsHash);
  }

  record(toolName: string, params: Record<string, unknown>): void {
    const paramsHash = this.hashParams(params);
    this.recentCalls.push({ toolName, paramsHash, timestamp: Date.now() });
    if (this.recentCalls.length > this.windowSize * 2) {
      this.recentCalls = this.recentCalls.slice(-this.windowSize);
    }
  }

  reset(): void {
    this.recentCalls = [];
  }
}
