'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-provider';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.access_token) {
      console.log('CLIENT SOCKET: No access token found in session.');
      return;
    }

    console.log('CLIENT SOCKET: Initializing socket connection to:', process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001');

    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token: session.access_token },
      reconnection: true
    });

    socketInstance.on('connect', () => {
      console.log('CLIENT SOCKET: connected successfully. Socket ID:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('CLIENT SOCKET: disconnected. Reason:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('CLIENT SOCKET: connection error:', error);
    });

    const timeoutId = setTimeout(() => {
      console.log('CLIENT SOCKET: Setting socket state instance');
      setSocket(socketInstance);
    }, 0);

    return () => {
      console.log('CLIENT SOCKET: Cleaning up / disconnecting socket instance');
      clearTimeout(timeoutId);
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [session?.access_token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
