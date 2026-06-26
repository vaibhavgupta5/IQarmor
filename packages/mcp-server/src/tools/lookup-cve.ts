import { z } from 'zod';
import { lookupCve as lookupCveApi } from '../lib/nvd';
import { checkRateLimit, recordCall } from '../middleware/rate-limiter';

export const lookupCveSchema = z.object({
  cveId: z.string().regex(/^CVE-\d{4}-\d{4,}$/i).describe('CVE ID to lookup (e.g. CVE-2021-44228)')
});

export type LookupCveInput = z.infer<typeof lookupCveSchema>;

export async function lookupCve(input: LookupCveInput): Promise<unknown> {
  try {
    const validated = lookupCveSchema.parse(input);
    if (!checkRateLimit('lookup_cve')) {
      return { error: 'Rate limit exceeded for lookup_cve (10/min)', code: 'RATE_LIMIT' };
    }
    recordCall('lookup_cve');

    const result = await lookupCveApi(validated.cveId.toUpperCase());
    return result;
  } catch (err: any) {
    return { error: err.message || 'Unknown error in lookupCve', code: 'VALIDATION_ERROR' };
  }
}
