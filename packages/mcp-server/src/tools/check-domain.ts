import { z } from 'zod';
import { checkDomain as checkDomainApi } from '../lib/virustotal';
import { checkRateLimit, recordCall } from '../middleware/rate-limiter';

export const checkDomainSchema = z.object({
  domain: z.string().min(3).max(253).describe('Domain name to check (e.g. example.com)')
});

export type CheckDomainInput = z.infer<typeof checkDomainSchema>;

export async function checkDomain(input: CheckDomainInput): Promise<unknown> {
  try {
    const validated = checkDomainSchema.parse(input);
    if (!checkRateLimit('check_domain')) {
      return { error: 'Rate limit exceeded for check_domain (4/min)', code: 'RATE_LIMIT' };
    }
    recordCall('check_domain');

    const result = await checkDomainApi(validated.domain);
    return result;
  } catch (err: any) {
    return { error: err.message || 'Unknown error in checkDomain', code: 'VALIDATION_ERROR' };
  }
}
