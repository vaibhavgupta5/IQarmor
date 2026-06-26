const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options?.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { message: data.error || res.statusText, status: res.status, code: data.code };
  }

  return data as T;
}

export const api = {
  chat: {
    send: (body: any, token: string) => apiRequest<any>('/api/chat', { method: 'POST', body: JSON.stringify(body) }, token),
    listHistory: (token: string) => apiRequest<any[]>('/api/chat', {}, token),
  },
  rules: {
    list: (params: any, token: string) => apiRequest<any>('/api/rules?' + new URLSearchParams(params).toString(), {}, token),
    create: (body: any, token: string) => apiRequest<any>('/api/rules', { method: 'POST', body: JSON.stringify(body) }, token),
    update: (id: string, body: any, token: string) => apiRequest<any>(`/api/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token),
    delete: (id: string, token: string) => apiRequest<void>(`/api/rules/${id}`, { method: 'DELETE' }, token),
    toggle: (id: string, isActive: boolean, token: string) => apiRequest<any>(`/api/rules/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token),
    templates: (token: string) => apiRequest<any[]>('/api/rules/templates', {}, token),
    export: (token: string) => apiRequest<any[]>('/api/rules/export', {}, token),
    import: (rules: any[], token: string) => apiRequest<{ count: number }>('/api/rules/import', { method: 'POST', body: JSON.stringify({ rules }) }, token),
  },
  audit: {
    list: (params: any, token: string) => apiRequest<any>('/api/audit?' + new URLSearchParams(params).toString(), {}, token),
    verify: (token: string) => apiRequest<any>('/api/audit/verify', {}, token),
    conversation: (id: string, token: string) => apiRequest<any>(`/api/audit/${id}`, {}, token),
  },
  approvals: {
    list: (params: any, token: string) => apiRequest<any[]>('/api/approvals?' + new URLSearchParams(params).toString(), {}, token),
    decide: (id: string, decision: 'APPROVED' | 'REJECTED', token: string) => apiRequest<any>(`/api/approvals/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision }) }, token),
  },
  servers: {
    list: (token: string) => apiRequest<any[]>('/api/servers', {}, token),
    probe: (body: any, token: string) => apiRequest<any>('/api/servers/probe', { method: 'POST', body: JSON.stringify(body) }, token),
    register: (body: any, token: string) => apiRequest<any>('/api/servers', { method: 'POST', body: JSON.stringify(body) }, token),
    toggle: (id: string, isActive: boolean, token: string) => apiRequest<any>(`/api/servers/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token),
    tools: (id: string, token: string) => apiRequest<any[]>(`/api/servers/${id}/tools`, {}, token),
  },
  analytics: {
    summary: (token: string) => apiRequest<any>('/api/analytics/summary', {}, token),
    topBlocked: (token: string) => apiRequest<any[]>('/api/analytics/top-blocked', {}, token),
  },
};
