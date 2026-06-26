export interface ScanReport {
  verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  tags: string[];
  screenshotUrl: string | null;
  scanDate: string;
}

export async function scanUrl(url: string): Promise<ScanReport | { error: string, code: string, status?: string }> {
  const apiKey = process.env.URLSCAN_API_KEY;
  if (!apiKey) return { error: 'URLSCAN_API_KEY not configured', code: 'CONFIG_MISSING' };

  try {
    const submitRes = await fetch('https://urlscan.io/api/v1/scan/', {
      method: 'POST',
      headers: { 'API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, visibility: 'public' })
    });

    if (submitRes.status === 429) return { error: 'UrlScan rate limit reached', code: 'RATE_LIMIT' };
    if (!submitRes.ok) return { error: `UrlScan submit error: ${submitRes.statusText}`, code: 'API_ERROR' };

    const submitData: any = await submitRes.json();
    const uuid = submitData.uuid;

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const res = await fetch(`https://urlscan.io/api/v1/result/${uuid}/`);
      if (res.status === 200) {
        const data: any = await res.json();
        
        let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown' = 'unknown';
        const score = data.verdicts?.overall?.score || 0;
        const malicious = data.verdicts?.overall?.malicious || false;
        
        if (malicious) verdict = 'malicious';
        else if (score > 50) verdict = 'suspicious';
        else verdict = 'clean';

        return {
          verdict,
          tags: data.tags || [],
          screenshotUrl: data.task?.screenshotURL || null,
          scanDate: data.task?.time || new Date().toISOString()
        };
      } else if (res.status !== 404) {
        return { error: `UrlScan poll error: ${res.statusText}`, code: 'API_ERROR' };
      }
    }

    return { error: 'Scan taking too long', code: 'TIMEOUT', status: 'pending' };

  } catch (err: any) {
    return { error: err.message, code: 'NETWORK_ERROR' };
  }
}
