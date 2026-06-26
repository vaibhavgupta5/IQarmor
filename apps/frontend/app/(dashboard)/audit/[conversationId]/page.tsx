'use client';
import { useEffect, useState, use } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VerdictBadge } from '@/components/verdict-badge';
import { JsonViewer } from '@/components/json-viewer';
import { toast } from 'sonner';

export default function ConversationTimelinePage({ params }: { params: Promise<{ conversationId: string }> }) {
  const resolvedParams = use(params);
  const { conversationId } = resolvedParams;
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    
    api.audit.conversation(conversationId, session.access_token)
      .then(res => setData((res as any).data || res))
      .catch(err => toast.error('Failed to load conversation timeline'))
      .finally(() => setLoading(false));
  }, [conversationId, session?.access_token]);

  if (loading) return <div className="p-8">Loading timeline...</div>;
  if (!data) return <div className="p-8">Conversation not found.</div>;

  return (
    <div className="flex-1 overflow-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Conversation Timeline</h1>
      <p className="text-muted-foreground font-mono text-sm">{conversationId}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Intent Label</CardTitle></CardHeader>
          <CardContent className="font-semibold">{data.session?.intentLabel || 'Unknown Intent'}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Final Risk Score</CardTitle></CardHeader>
          <CardContent className="font-semibold">{data.session?.riskScore}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tokens</CardTitle></CardHeader>
          <CardContent className="font-semibold">{data.session?.tokenCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent className="font-semibold">{data.session?.status}</CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Event Timeline</h2>
        <div className="relative border-l-2 border-muted ml-4 space-y-8 pb-8">
          {data.events?.map((event: any, i: number) => (
            <div key={event.id} className="relative pl-8">
              <div className={`absolute -left-[9px] top-2 h-4 w-4 rounded-full border-2 border-background ${
                event.decision === 'BLOCK' ? 'bg-red-500' : 
                event.decision === 'HOLD_FOR_APPROVAL' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-semibold">{event.toolName}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(event.timestamp).toLocaleString()}</div>
                    </div>
                    <VerdictBadge verdict={event.decision} />
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                    {event.reason}
                  </div>
                  
                  <JsonViewer data={event.params} />
                </CardContent>
              </Card>
            </div>
          ))}
          {(!data.events || data.events.length === 0) && (
            <div className="pl-8 text-muted-foreground">No tools were executed.</div>
          )}
        </div>
      </div>
    </div>
  );
}
