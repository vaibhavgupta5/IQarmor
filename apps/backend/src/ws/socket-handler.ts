import { Server } from 'socket.io';
import { logger } from '../lib/logger';
import { supabaseAdmin } from '../lib/supabase';

let ioInstance: Server | null = null;
export const approvalResolvers = new Map<string, (decision: 'APPROVED' | 'REJECTED') => void>();

export function setupSocketHandlers(io: Server): void {
  ioInstance = io;
  
  io.on('connection', async (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');

    // Handshake Auth
    const token = socket.handshake.auth?.token;
    logger.info({ socketId: socket.id, hasToken: !!token }, 'Socket handshake authentication checking');
    if (token) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error) {
          logger.error({ socketId: socket.id, error }, 'Socket auth failed: Supabase error');
          socket.disconnect();
          return;
        }
        if (!data.user) {
          logger.error({ socketId: socket.id }, 'Socket auth failed: User not found in session');
          socket.disconnect();
          return;
        }
        logger.info({ socketId: socket.id, userId: data.user.id }, 'Socket client successfully authenticated');
      } catch (err: any) {
        logger.error({ socketId: socket.id, err }, 'Socket auth exception');
        socket.disconnect();
        return;
      }
    } else {
      logger.warn({ socketId: socket.id }, 'Socket connected without authentication token');
    }

    socket.on('rules:update', async () => {
      logger.info('Rules update event received from client');
      socket.emit('rules:reloaded');
    });

    socket.on('room:join', (roomId: string) => {
      socket.join(roomId);
      logger.info({ socketId: socket.id, roomId }, 'Socket joined room');
    });

    socket.on('approval:decide', async (data: { id: string; decision: 'APPROVED' | 'REJECTED' }) => {
      const resolver = approvalResolvers.get(data.id);
      if (resolver) {
        resolver(data.decision);
        approvalResolvers.delete(data.id);
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });
}

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}
