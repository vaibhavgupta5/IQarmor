'use client';
import { useEffect } from 'react';
import { useSocket } from './socket-provider';
import { useAgentStore, useApprovalsStore, useRiskStore, useServersStore, AgentEvent, ApprovalRequestEvent, ServerHealthEvent } from '@/store';

export function SocketEventHandler() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('agent:event', (event: AgentEvent) => {
      console.log('WS EVENT (agent:event):', event);
      useAgentStore.getState().addToolTraceEvent(event);
    });

    socket.on('approval:request', (approval: ApprovalRequestEvent) => {
      console.log('WS EVENT (approval:request):', approval);
      useApprovalsStore.getState().addApproval(approval);
    });

    socket.on('approval:expired', ({ id }: { id: string }) => {
      console.log('WS EVENT (approval:expired):', id);
      useApprovalsStore.getState().expireApproval(id);
    });

    socket.on('risk:updated', ({ conversationId, riskScore }: { conversationId: string, riskScore: number }) => {
      console.log('WS EVENT (risk:updated):', { conversationId, riskScore });
      useRiskStore.getState().updateRiskScore(conversationId, riskScore);
    });

    socket.on('server:health', (event: ServerHealthEvent) => {
      useServersStore.getState().updateServerHealth(event);
    });

    socket.on('tools:updated', () => {
      // Refetch tools from API
    });

    return () => {
      socket.off('agent:event');
      socket.off('approval:request');
      socket.off('approval:expired');
      socket.off('risk:updated');
      socket.off('server:health');
      socket.off('tools:updated');
    };
  }, [socket]);

  return null;
}
