import type { ConversationContext } from '@armoriq/shared';
import { prisma } from '../lib/prisma';

// In-memory store (Map<conversationId, ConversationContext>)
const contexts = new Map<string, ConversationContext>();

export async function getOrCreateContext(
  conversationId: string,
  userId?: string
): Promise<ConversationContext> {
  const existing = contexts.get(conversationId);
  if (existing) return existing;

  let budgetLimit: number | undefined;
  try {
    const budgetRule = await prisma.rule.findFirst({
      where: { type: 'BUDGET', isActive: true, toolPattern: '*' },
      orderBy: { priority: 'desc' }
    });
    if (budgetRule && budgetRule.condition && typeof budgetRule.condition === 'object') {
      const conditionValue = (budgetRule.condition as any).value;
      if (conditionValue) budgetLimit = Number(conditionValue);
    }
  } catch (e) {
    // ignore db error, budgetLimit undefined
  }

  const newContext: ConversationContext = {
    conversationId,
    tokenCount: 0,
    riskScore: 0,
    callHistory: [],
    sessionStatus: 'ACTIVE',
    budgetLimit
  };

  try {
    await prisma.conversationSession.upsert({
      where: { id: conversationId },
      update: {},
      create: {
        id: conversationId,
        userId: userId || null,
        budgetLimit: budgetLimit || null,
        status: 'ACTIVE',
        riskScore: 0,
      }
    });
  } catch {
  }

  contexts.set(conversationId, newContext);
  return newContext;
}

export function updateContext(
  conversationId: string,
  update: Partial<ConversationContext>
): void {
  const existing = contexts.get(conversationId);
  if (existing) {
    Object.assign(existing, update);
  }
}

export function getContext(conversationId: string): ConversationContext | undefined {
  return contexts.get(conversationId);
}

export function deleteContext(conversationId: string): void {
  contexts.delete(conversationId);
}
