export interface DomainReport {
  verdict: 'clean' | 'malicious' | 'suspicious' | 'unknown';
  detectionCount: number;
  categories: string[];
  lastScanDate: string | null;
}

export async function checkDomain(domain: string): Promise<DomainReport | { error: string, code: string }> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return { error: 'VIRUSTOTAL_API_KEY not configured', code: 'CONFIG_MISSING' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: { 'x-apikey': apiKey },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.status === 429) return { error: 'VirusTotal rate limit reached', code: 'RATE_LIMIT' };
    if (res.status === 404) return { verdict: 'unknown', detectionCount: 0, categories: [], lastScanDate: null };
    if (!res.ok) return { error: `VirusTotal error: ${res.statusText}`, code: 'API_ERROR' };

    const data: any = await res.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    const categoriesObj = data.data?.attributes?.categories || {};
    
    let verdict: 'clean' | 'malicious' | 'suspicious' | 'unknown' = 'unknown';
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    
    if (malicious > 0) verdict = 'malicious';
    else if (suspicious > 0) verdict = 'suspicious';
    else if (stats.harmless > 0 || stats.undetected > 0) verdict = 'clean';

    return {
      verdict,
      detectionCount: malicious + suspicious,
      categories: Object.values(categoriesObj),
      lastScanDate: data.data?.attributes?.last_analysis_date ? new Date(data.data.attributes.last_analysis_date * 1000).toISOString() : null
    };

  } catch (err: any) {
    if (err.name === 'AbortError') return { error: 'VirusTotal timeout', code: 'TIMEOUT' };
    return { error: err.message, code: 'NETWORK_ERROR' };
  }
}
