'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentStore, useServersStore } from '@/store';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { VerdictBadge } from '@/components/verdict-badge';
import { Activity, ShieldAlert, CheckSquare, ShieldCheck } from 'lucide-react';

export default function OverviewPage() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const { servers, setServers } = useServersStore();
  const { toolTrace } = useAgentStore();

  useEffect(() => {
    if (!session?.access_token) return;
    
    api.analytics.summary(session.access_token)
      .then(res => {
        const data = res.data || res;
        setSummary({
          ...data,
          avgRiskScore: data.avgRiskScore ?? data.averageRiskScore
        });
      })
      .catch(console.error);
      
    api.servers.list(session.access_token)
      .then(res => setServers((res as any).data || res))
      .catch(console.error);
  }, [session?.access_token, setServers]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ArmorIQ Overview</h1>
      
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs text-[#888888] font-medium uppercase tracking-wider">Total Tool Calls</CardTitle>
            <Activity className="h-4 w-4 text-[#444444]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-primary">{summary?.totalCallsToday ?? '-'}</div>
            <p className="text-xs text-[#444444] mt-1">// Across all servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs text-[#888888] font-medium uppercase tracking-wider">Blocked Today</CardTitle>
            <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-[#EF4444]">{summary?.blockedToday ?? '-'}</div>
            <p className="text-xs text-[#444444] mt-1">// Violations prevented</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs text-[#888888] font-medium uppercase tracking-wider">Pending Approvals</CardTitle>
            <CheckSquare className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-[#F59E0B]">{summary?.pendingApprovals ?? '-'}</div>
            <p className="text-xs text-[#444444] mt-1">// Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs text-[#888888] font-medium uppercase tracking-wider">Avg Risk Score</CardTitle>
            <ShieldCheck className="h-4 w-4 text-[#444444]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-primary">{summary?.avgRiskScore?.toFixed(1) ?? '-'}</div>
            <p className="text-xs text-[#444444] mt-1">// Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Server Health Strip */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">System Health</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {servers.map(server => (
            <Card key={server.name} className="min-w-45 sm:min-w-50 shrink-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{server.name}</div>
                  <div className="text-xs text-muted-foreground">{server.toolCount} tools</div>
                </div>
                <div className={`h-2 w-2 rounded-full ${server.isHealthy ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              </CardContent>
            </Card>
          ))}
          {servers.length === 0 && (
            <div className="text-sm text-muted-foreground">No servers registered.</div>
          )}
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">Live Event Feed</h2>
        <Card>
          <div className="divide-y divide-dashed divide-[#1A1A1A]">
            {toolTrace.slice(0, 15).map((event, i) => (
              <div key={i} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4 hover:bg-[#0A0A0A] transition-colors" style={{ animation: 'slideIn 150ms ease-out' }}>
                <div className="text-xs md:text-sm font-mono text-[#444444] md:w-20 shrink-0 tabular-nums">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="font-medium font-mono text-sm text-[#FAFAFA] md:w-48 truncate shrink-0" title={event.toolName}>
                  {event.toolName}
                </div>
                <div className="flex-1 text-xs md:text-sm text-[#888888] break-all md:truncate font-mono">
                  {JSON.stringify(event.params).slice(0, 100)}
                </div>
                <div className="shrink-0 w-full md:w-24">
                  <VerdictBadge verdict={event.decision as any} />
                </div>
                <div className="text-xs md:text-sm text-[#888888] w-full md:w-48 md:truncate shrink-0 font-mono" title={event.reason}>
                  {event.reason}
                </div>
              </div>
            ))}
            {toolTrace.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No recent activity. Tool calls will appear here in real-time.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
