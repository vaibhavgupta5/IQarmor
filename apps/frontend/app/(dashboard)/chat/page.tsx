'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentStore, useRiskStore, useApprovalsStore } from '@/store';
import { api } from '@/lib/api';
import { useSocket } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { VerdictBadge } from '@/components/verdict-badge';
import { JsonViewer } from '@/components/json-viewer';
import { toast } from 'sonner';
import { Download, Trash2, Send, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ChatPage() {
  const { session } = useAuth();
  const { activeConversationId, toolTrace, clearTrace, setActiveConversation, conversations, setConversations } = useAgentStore();
  const { riskScores } = useRiskStore();
  const { approvals, setApprovals } = useApprovalsStore();
  const { socket, connected } = useSocket();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);
  const auditEndRef = useRef<HTMLDivElement>(null);

  const [fallbackId] = useState(() => activeConversationId || 'chat-' + Math.random().toString(36).substring(2, 9));
  const currentId = activeConversationId || fallbackId;

  useEffect(() => {
    if (!activeConversationId) {
      setActiveConversation(currentId);
    }
  }, [activeConversationId, currentId, setActiveConversation]);

  useEffect(() => {
    setMessages([]);
    setHistoryLogs([]);
  }, [currentId]);

  useEffect(() => {
    if (!socket || !connected || !currentId) {
      console.log('CHAT PAGE [WS Room]: cannot emit room:join. socket:', !!socket, 'connected:', connected, 'currentId:', currentId);
      return;
    }
    console.log('CHAT PAGE [WS Room]: emitting room:join for conversation room:', currentId);
    socket.emit('room:join', currentId);
  }, [socket, connected, currentId]);

  const activeTrace = toolTrace.filter(t => t.conversationId === currentId);
  const currentRisk = riskScores.get(currentId) || 0;

  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    api.chat.listHistory(session.access_token)
      .then(res => {
        const list = (res as any).data || res;
        setConversations(list);
      })
      .catch(err => console.error('CHAT PAGE [History]: failed to fetch history:', err));
  }, [session?.access_token, setConversations]);

  useEffect(() => {
    if (!session?.access_token) return;
    console.log('CHAT PAGE [Approvals]: fetching pending approvals from backend API...');
    api.approvals.list({ status: 'PENDING' }, session.access_token)
      .then(res => {
        const list = (res as any).data || res;
        console.log('CHAT PAGE [Approvals]: loaded pending approvals list:', list);
        setApprovals(list);
      })
      .catch((err) => {
        console.error('CHAT PAGE [Approvals]: failed to fetch approvals:', err);
      });
  }, [session?.access_token, setApprovals]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!session?.access_token) return;
    console.log(`CHAT PAGE [Approvals]: submitting decision '${decision}' for approval request ID: ${id}`);
    try {
      await api.approvals.decide(id, decision, session.access_token);
      toast.success(`Request ${decision.toLowerCase()}`);
      console.log(`CHAT PAGE [Approvals]: decision '${decision}' accepted. Removing ID from store: ${id}`);
      setApprovals(approvals.filter(a => a.id !== id));
    } catch (err: any) {
      console.error('CHAT PAGE [Approvals]: failed to submit decision:', err);
      toast.error(err.message || 'Failed to submit decision');
    }
  };

  useEffect(() => {
    if (!session?.access_token || !currentId) return;
    
    api.audit.conversation(currentId, session.access_token)
      .then(res => {
        if (res?.data?.events) {
          setHistoryLogs(res.data.events);
        }
      })
      .catch(() => {});
  }, [currentId, session?.access_token]);

  const combinedLogs = [...historyLogs];
  for (const trace of activeTrace) {
    const exists = historyLogs.some(
      h => h.toolName === trace.toolName && new Date(h.timestamp).getTime() === new Date(trace.timestamp).getTime()
    );
    if (!exists) {
      combinedLogs.push(trace);
    }
  }

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-scroll tool trace
  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTrace]);

  // Auto-scroll audit logs
  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combinedLogs.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session?.access_token) return;

    const text = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const response = await api.chat.send({
        message: text,
        conversationId: currentId,
      }, session.access_token);
      
      const data = response.data || response;
      setMessages(prev => [...prev, { role: 'agent', text: data.message }]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(combinedLogs, null, 2));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", `trace-${currentId}.json`);
    document.body.appendChild(node);
    node.click();
    node.remove();
  };

  const handleClear = () => {
    clearTrace();
    setHistoryLogs([]);
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 h-full overflow-hidden relative">
      
      {/* Toggle Sidebar Button (When Closed) */}
      {!isSidebarOpen && (
        <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-50">
           <Button variant="outline" size="icon" className="h-8 w-5 rounded-none bg-background shadow-md border-y border-r border-l-0 hover:bg-muted" onClick={() => setIsSidebarOpen(true)}>
             <ChevronRight className="h-4 w-4" />
           </Button>
        </div>
      )}

      {/* LEFT SIDEBAR: History */}
      <div className={`${isSidebarOpen ? 'md:col-span-1 md:flex' : 'hidden'} hidden flex-col border-r h-full bg-[#030303] min-h-0 transition-all relative`}>
        {/* Toggle Sidebar Button (When Open) */}
        <div className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 z-50">
           <Button variant="outline" size="icon" className="h-8 w-5 rounded-none bg-background shadow-md border-y border-r border-l-0 hover:bg-muted" onClick={() => setIsSidebarOpen(false)}>
              <ChevronLeft className="h-4 w-4" />
           </Button>
        </div>

        <div className="p-4 border-b flex justify-between items-center bg-[#070707] shrink-0">
          <h2 className="font-semibold tracking-tight text-sm">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button 
            onClick={() => setActiveConversation('chat-' + Math.random().toString(36).substring(2, 9))}
            className="w-full text-left px-3 py-2 text-xs rounded-none transition-colors hover:bg-muted text-purple-400 font-semibold mb-2"
          >
            + New Chat
          </button>
          {conversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full text-left px-3 py-2 text-xs rounded-none truncate transition-colors ${currentId === conv.id ? 'bg-purple-900/40 text-purple-200 border-l-2 border-purple-500 font-medium' : 'hover:bg-muted text-muted-foreground border-l-2 border-transparent'}`}
              title={conv.intentLabel || conv.id}
            >
              {conv.intentLabel || conv.id.substring(0, 8)}
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="text-center text-xs text-muted-foreground mt-4">No history</div>
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN: Chat */}
      <div className={`${isSidebarOpen ? 'md:col-span-3' : 'md:col-span-4'} flex flex-col border-r h-full min-h-0`}>
        <div className="p-4 border-b flex justify-between items-center bg-background/95 backdrop-blur z-10 shrink-0">
          <div>
            <h2 className="font-semibold tracking-tight">Agent Terminal</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{currentId}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">
              Risk: <span className={currentRisk > 50 ? 'text-destructive' : currentRisk > 20 ? 'text-amber-500' : 'text-green-500'}>{currentRisk}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 h-screen space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Send a message to start the conversation...
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-none p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-[#0A0A0A] border border-[#1A1A1A] font-mono whitespace-pre-wrap'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-none p-3 text-sm font-mono flex items-center gap-2">
                <div className="h-2 w-2 bg-foreground/50 rounded-none animate-bounce" />
                <div className="h-2 w-2 bg-foreground/50 rounded-none animate-bounce delay-75" />
                <div className="h-2 w-2 bg-foreground/50 rounded-none animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-background shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Ask the agent to perform a task..." 
              className="flex-1 font-mono text-sm rounded-none focus-visible:ring-purple-500"
              disabled={loading}
            />
            <Button type="submit" className="rounded-none bg-purple-600 hover:bg-purple-700 text-white" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Tool Trace & Audit Logs */}
      <div className="md:col-span-2 flex flex-col h-full bg-muted/20 overflow-hidden border-l border-dashed border-[#1A1A1A]">
        
        {/* Upper half: Live Tool Trace */}
        <div className="flex flex-col h-1/2 min-h-0 border-b border-dashed border-[#1A1A1A]">
          <div className="p-4 border-b flex justify-between items-center bg-background/95 backdrop-blur z-10 shrink-0">
            <h2 className="font-semibold tracking-tight">Live Tool Trace</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-none" onClick={handleExport} disabled={combinedLogs.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Button variant="outline" size="sm" className="rounded-none hover:bg-destructive hover:text-destructive-foreground" onClick={handleClear} disabled={combinedLogs.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Clear
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {combinedLogs.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-10">
                No tool calls yet.
              </div>
            )}
            {combinedLogs.map((event, i) => (
              <Card key={i} className="animate-in fade-in slide-in-from-top-4 border-l-4 rounded-none bg-[#050505] border-[#1A1A1A]" style={{ borderLeftColor: event.decision === 'BLOCK' || event.decision?.includes('INJECTION') ? '#ef4444' : event.decision === 'HOLD_FOR_APPROVAL' ? '#f59e0b' : event.decision === 'RUNNING' ? '#3b82f6' : '#22c55e' }}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                        {event.toolName}
                        {event.serverName && (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                            {event.serverName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()} {event.latencyMs ? `· ${event.latencyMs}ms` : ''}</div>
                    </div>
                    {event.decision === 'RUNNING' ? (
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/10 gap-1 shrink-0">
                        <Loader2 className="h-3 w-3 animate-spin text-[#3B82F6]" />
                        RUNNING
                      </div>
                    ) : (
                      <VerdictBadge verdict={event.decision as any} />
                    )}
                  </div>
                  
                  <JsonViewer data={event.params} />
                  
                  <div className="text-sm mt-2 border-t pt-2">
                    <span className="font-medium">Reason:</span> {event.reason}
                  </div>
                  
                  {event.riskContrib > 0 && (
                    <div className="text-xs font-semibold text-amber-600 mt-1">
                      +{event.riskContrib} Risk Added
                    </div>
                  )}

                  {event.decision === 'HOLD_FOR_APPROVAL' && (() => {
                    const matchingApproval = approvals.find(
                      a => a.conversationId === currentId && a.toolName === event.toolName
                    );
                    
                    if (!matchingApproval) return null;

                    return (
                      <div className="mt-2 space-y-2 border-t pt-2">
                        <div className="text-xs font-semibold text-amber-500 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          Awaiting Approval...
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2.5 rounded-none"
                            onClick={() => handleDecision(matchingApproval.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2.5 rounded-none"
                            onClick={() => handleDecision(matchingApproval.id, 'APPROVED')}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
            <div ref={traceEndRef} />
          </div>
        </div>

        {/* Lower half: Real-time Security Audit Logs */}
        <div className="flex flex-col h-1/2 min-h-0 bg-[#020202]">
          <div className="p-4 border-b border-dashed border-[#1A1A1A] flex justify-between items-center bg-[#070707] shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="font-semibold tracking-tight text-emerald-500 font-mono text-sm uppercase">Security Audit Log</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">SECURE CHAINS ENABLED</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 text-green-400 select-all">
            {combinedLogs.length === 0 && (
              <div className="text-muted-foreground text-center py-10">
                No security audit logs recorded yet.
              </div>
            )}
            {combinedLogs.map((log, idx) => (
              <div key={idx} className="hover:bg-[#0A0A0A] p-2 border border-[#1A1A1A] rounded-none bg-[#050505] space-y-1.5 transition-all">
                <div className="flex justify-between items-center text-[10px] border-b border-[#1A1A1A] pb-1">
                  <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleString()}]</span>
                  <span className="font-bold text-gray-500 font-mono text-[9px] truncate max-w-[150px]" title={log.hash}>
                    HASH: {log.hash ? log.hash.substring(0, 16) : 'PENDING'}...
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Tool:</span>
                  <span className="text-blue-400 font-semibold">{log.toolName}</span>
                  <span className="text-muted-foreground font-light">|</span>
                  <span className="text-muted-foreground">Action:</span>
                  <span className={log.decision === 'BLOCK' || log.decision.includes('INJECTION') ? 'text-rose-500 font-bold bg-rose-500/10 px-1 rounded' : log.decision === 'HOLD_FOR_APPROVAL' ? 'text-amber-500 font-semibold bg-amber-500/10 px-1 rounded' : 'text-emerald-500 font-medium bg-emerald-500/10 px-1 rounded'}>
                    {log.decision}
                  </span>
                </div>
                {log.reason && (
                  <div className="text-[11px] text-gray-300 pl-2 border-l border-[#222]">
                    <span className="text-muted-foreground">Reason:</span> {log.reason}
                  </div>
                )}
                <div className="flex gap-4 text-[10px] text-muted-foreground pt-1 border-t border-[#111]">
                  {log.riskContrib > 0 && <span>Risk: <span className="text-amber-600 font-bold">+{log.riskContrib}</span></span>}
                  {log.latencyMs !== undefined && <span>Latency: <span className="text-gray-400">{log.latencyMs}ms</span></span>}
                </div>
              </div>
            ))}
            <div ref={auditEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
