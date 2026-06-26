import { PolicyEngine } from '@armoriq/policy-engine';
import { mcpManager } from './manager';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

const AGENT_TOOL_TIMEOUT_MS = 15000;

export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  policyEngine: PolicyEngine
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const client = mcpManager.getToolClient(toolName);
  
  if (!client) {
    return { success: false, error: 'Tool not found in any connected server' };
  }

  // Not checking isHealthy aggressively here because getToolClient could be from a temporarily unhealthy server
  
  try {
    const promise = client.callTool({ name: toolName, arguments: params });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), AGENT_TOOL_TIMEOUT_MS));
    
    const result: any = await Promise.race([promise, timeout]);
    
    const scanRes = policyEngine.scanToolResult(result);
    if (scanRes.detected) {
      logger.warn({ toolName, type: scanRes.injectionType }, 'Indirect injection detected in tool result');
      // Log to DB
      await prisma.injectionAttemptLog.create({
        data: {
          conversationId: 'system',
          toolName,
          params: result as any,
          matchedPattern: scanRes.matchedPattern || 'unknown',
          injectionType: scanRes.injectionType || 'INDIRECT',
          confidence: scanRes.confidence || 1.0
        }
      });
      return { success: false, error: 'Tool result blocked: embedded injection detected' };
    }

    return { success: true, result };

  } catch (error: any) {
    logger.error({ err: error, toolName }, 'Tool execution failed');
    if (error.message === 'TIMEOUT') {
      return { success: false, error: 'Tool execution timed out' };
    }
    return { success: false, error: error.message || 'MCP protocol error' };
  }
}
