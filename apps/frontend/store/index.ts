import { create } from 'zustand';

export interface ConversationSession {
  id: string;
  intentLabel?: string;
  riskScore: number;
}

export interface AgentEvent {
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  decision: string;
  reason: string;
  latencyMs?: number;
  riskContrib: number;
  timestamp: string;
  serverName?: string;
}

export interface ApprovalRequestEvent {
  id: string;
  conversationId: string;
  toolName: string;
  params: Record<string, unknown>;
  expiresAt: string;
  requestedAt : Date;
  status?: string;
}

export interface ServerHealthEvent {
  name: string;
  isHealthy: boolean;
  toolCount: number;
}

interface AgentStore {
  conversations: ConversationSession[];
  activeConversationId: string | null;
  toolTrace: AgentEvent[];
  isStreaming: boolean;
  setConversations: (conversations: ConversationSession[]) => void;
  setActiveConversation: (id: string | null) => void;
  addToolTraceEvent: (event: AgentEvent) => void;
  clearTrace: () => void;
  setStreaming: (streaming: boolean) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  toolTrace: [],
  isStreaming: false,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addToolTraceEvent: (event) => set((s) => {
    const existsIndex = s.toolTrace.findIndex(
      t => t.conversationId === event.conversationId && 
           t.toolName === event.toolName && 
           (t.decision === 'HOLD_FOR_APPROVAL' || t.decision === 'RUNNING')
    );
    if (existsIndex > -1 && (event.decision === 'APPROVED' || event.decision === 'BLOCK' || event.decision === 'REJECTED' || event.decision === 'ALLOW' || event.decision === 'INJECTION_DETECTED')) {
      const nextTrace = [...s.toolTrace];
      nextTrace[existsIndex] = {
        ...nextTrace[existsIndex],
        decision: event.decision,
        reason: event.reason,
        latencyMs: event.latencyMs,
        riskContrib: event.riskContrib,
        timestamp: event.timestamp,
        serverName: event.serverName || nextTrace[existsIndex].serverName
      };
      return { toolTrace: nextTrace };
    }
    return { toolTrace: [event, ...s.toolTrace] };
  }),
  clearTrace: () => set({ toolTrace: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
}));

interface RulesStore {
  rules: any[];
  loading: boolean;
  conflicts: any[];
  setRules: (rules: any[]) => void;
  setLoading: (loading: boolean) => void;
  setConflicts: (conflicts: any[]) => void;
}

export const useRulesStore = create<RulesStore>((set) => ({
  rules: [],
  loading: false,
  conflicts: [],
  setRules: (rules) => set({ rules }),
  setLoading: (loading) => set({ loading }),
  setConflicts: (conflicts) => set({ conflicts }),
}));

interface ApprovalsStore {
  approvals: ApprovalRequestEvent[];
  countdowns: Map<string, number>;
  addApproval: (approval: ApprovalRequestEvent) => void;
  expireApproval: (id: string) => void;
  setApprovals: (approvals: ApprovalRequestEvent[]) => void;
  updateCountdown: (id: string, msLeft: number) => void;
}

export const useApprovalsStore = create<ApprovalsStore>((set) => ({
  approvals: [],
  countdowns: new Map(),
  addApproval: (approval) => set((s) => ({ approvals: [approval, ...s.approvals] })),
  expireApproval: (id) => set((s) => ({ approvals: s.approvals.filter(a => a.id !== id) })),
  setApprovals: (approvals) => set({ approvals }),
  updateCountdown: (id, msLeft) => set((s) => {
    const nextMap = new Map(s.countdowns);
    nextMap.set(id, msLeft);
    return { countdowns: nextMap };
  })
}));

interface AuditStore {
  entries: any[];
  pagination: { page: number; total: number; limit: number };
  setEntries: (entries: any[]) => void;
  setPagination: (pagination: { page: number; total: number; limit: number }) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  entries: [],
  pagination: { page: 1, total: 0, limit: 50 },
  setEntries: (entries) => set({ entries }),
  setPagination: (pagination) => set({ pagination }),
}));

interface ServersStore {
  servers: any[];
  toolsByServer: Record<string, any[]>;
  setServers: (servers: any[]) => void;
  setToolsByServer: (tools: Record<string, any[]>) => void;
  updateServerHealth: (event: ServerHealthEvent) => void;
}

export const useServersStore = create<ServersStore>((set) => ({
  servers: [],
  toolsByServer: {},
  setServers: (servers) => set({ servers }),
  setToolsByServer: (toolsByServer) => set({ toolsByServer }),
  updateServerHealth: (event) => set((s) => ({
    servers: s.servers.map(srv => srv.name === event.name ? { ...srv, isHealthy: event.isHealthy, toolCount: event.toolCount } : srv)
  }))
}));

interface SocketStore {
  connected: boolean;
  lastEvent: string | null;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: string) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  connected: false,
  lastEvent: null,
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent }),
}));

interface RiskStore {
  riskScores: Map<string, number>;
  updateRiskScore: (conversationId: string, score: number) => void;
}

export const useRiskStore = create<RiskStore>((set) => ({
  riskScores: new Map(),
  updateRiskScore: (conversationId, score) => set((s) => {
    const nextMap = new Map(s.riskScores);
    nextMap.set(conversationId, score);
    return { riskScores: nextMap };
  })
}));
