import { z } from 'zod';
import { checkDomain } from './check-domain';
import { checkIp } from './check-ip';
import { lookupCve } from './lookup-cve';
import { scanUrl } from './scan-url';

export const getThreatSummarySchema = z.object({
  query: z.string().min(3).max(200).describe('Domain, IP, CVE ID, or URL to analyze')
});

export async function getThreatSummary(input: { query: string }): Promise<unknown> {
  try {
    const validated = getThreatSummarySchema.parse(input);
    const query = validated.query.trim();

    let detectedType = 'domain';
    let result: unknown;

    if (/^CVE-\d{4}-\d{4,}$/i.test(query)) {
      detectedType = 'cve';
      result = await lookupCve({ cveId: query });
    } else if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query)) {
      detectedType = 'ip';
      result = await checkIp({ ip: query });
    } else if (/^https?:\/\//i.test(query)) {
      detectedType = 'url';
      result = await scanUrl({ url: query });
    } else {
      detectedType = 'domain';
      result = await checkDomain({ domain: query });
    }

    return {
      query,
      detectedType,
      results: result
    };
  } catch (err: any) {
    return { error: err.message || 'Unknown error in getThreatSummary', code: 'VALIDATION_ERROR' };
  }
}
