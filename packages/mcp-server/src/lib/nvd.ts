export interface CveReport {
  description: string;
  cvssScore: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN';
  affectedVersions: string[];
  publishedDate: string;
}

let lastCall = 0;
const DELAY = 600;

export async function lookupCve(cveId: string): Promise<CveReport | { error: string, code: string }> {
  try {
    const now = Date.now();
    if (now - lastCall < DELAY) {
      await new Promise(r => setTimeout(r, DELAY - (now - lastCall)));
    }
    lastCall = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.status === 403 || res.status === 429) return { error: 'NVD rate limit reached', code: 'RATE_LIMIT' };
    if (res.status === 404) return { error: 'CVE not found', code: 'NOT_FOUND' };
    if (!res.ok) return { error: `NVD error: ${res.statusText}`, code: 'API_ERROR' };

    const data: any = await res.json();
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
      return { error: 'CVE not found', code: 'NOT_FOUND' };
    }

    const cve = data.vulnerabilities[0].cve;
    const description = cve.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description';
    
    let cvssScore = null;
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN' = 'UNKNOWN';
    
    const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
    if (metrics) {
      cvssScore = metrics.cvssData?.baseScore || null;
      severity = (metrics.cvssData?.baseSeverity || metrics.baseSeverity || 'UNKNOWN').toUpperCase();
    }

    const affectedVersions: string[] = [];
    if (cve.configurations) {
      for (const config of cve.configurations) {
        for (const node of config.nodes || []) {
          for (const match of node.cpeMatch || []) {
            if (match.vulnerable) affectedVersions.push(match.criteria);
          }
        }
      }
    }

    return {
      description,
      cvssScore,
      severity,
      affectedVersions: affectedVersions.slice(0, 10), // Limit array
      publishedDate: cve.published
    };

  } catch (err: any) {
    if (err.name === 'AbortError') return { error: 'NVD timeout', code: 'TIMEOUT' };
    return { error: err.message, code: 'NETWORK_ERROR' };
  }
}
