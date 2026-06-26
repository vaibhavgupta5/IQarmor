import { z } from 'zod';
import { scanUrl as scanUrlApi } from '../lib/urlscan';
import { checkRateLimit, recordCall } from '../middleware/rate-limiter';

export const scanUrlSchema = z.object({
  url: z.string().url().describe('URL to scan (e.g. https://example.com)')
});

export type ScanUrlInput = z.infer<typeof scanUrlSchema>;

export async function scanUrl(input: ScanUrlInput): Promise<unknown> {
  try {
    const validated = scanUrlSchema.parse(input);
    if (!checkRateLimit('scan_url')) {
      return { error: 'Rate limit exceeded for scan_url (4/min)', code: 'RATE_LIMIT' };
    }
    recordCall('scan_url');

    const result = await scanUrlApi(validated.url);
    return result;
  } catch (err: any) {
    return { error: err.message || 'Unknown error in scanUrl', code: 'VALIDATION_ERROR' };
  }
}
