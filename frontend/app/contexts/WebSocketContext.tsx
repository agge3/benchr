import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useWebSocket } from '~/hooks/useWebSocket';
import type { WebSocketHook } from '~/hooks/useWebSocket';

const WS_URL = 'wss://www.benchr.cc/ws';

const WebSocketContext = createContext<WebSocketHook | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const ws = useWebSocket(WS_URL);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketHook {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
