export interface IpReport {
  abuseScore: number;
  country: string;
  isp: string;
  totalReports: number;
  isWhitelisted: boolean;
}

export async function checkIp(ip: string): Promise<IpReport | { error: string, code: string }> {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) return { error: 'ABUSEIPDB_API_KEY not configured', code: 'CONFIG_MISSING' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
      headers: { 'Key': apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.status === 429) return { error: 'AbuseIPDB rate limit reached', code: 'RATE_LIMIT' };
    if (!res.ok) return { error: `AbuseIPDB error: ${res.statusText}`, code: 'API_ERROR' };

    const data: any = await res.json();
    const rep = data.data;

    return {
      abuseScore: rep.abuseConfidenceScore,
      country: rep.countryCode,
      isp: rep.isp,
      totalReports: rep.totalReports,
      isWhitelisted: rep.isWhiteListed || false
    };

  } catch (err: any) {
    if (err.name === 'AbortError') return { error: 'AbuseIPDB timeout', code: 'TIMEOUT' };
    return { error: err.message, code: 'NETWORK_ERROR' };
  }
}
