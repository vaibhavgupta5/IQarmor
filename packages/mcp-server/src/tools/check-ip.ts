import { z } from 'zod';
import { checkIp as checkIpApi } from '../lib/abuseipdb';
import { checkRateLimit, recordCall } from '../middleware/rate-limiter';

export const checkIpSchema = z.object({
  ip: z.string().ip().describe('IP address to check (e.g. 8.8.8.8)')
});

export type CheckIpInput = z.infer<typeof checkIpSchema>;

export async function checkIp(input: CheckIpInput): Promise<unknown> {
  try {
    const validated = checkIpSchema.parse(input);
    if (!checkRateLimit('check_ip')) {
      return { error: 'Rate limit exceeded for check_ip (16/min)', code: 'RATE_LIMIT' };
    }
    recordCall('check_ip');

    const result = await checkIpApi(validated.ip);
    return result;
  } catch (err: any) {
    return { error: err.message || 'Unknown error in checkIp', code: 'VALIDATION_ERROR' };
  }
}
