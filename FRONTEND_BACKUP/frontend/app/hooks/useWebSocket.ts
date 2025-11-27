import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketHook {
  socket: WebSocket | null;
  connected: boolean;
  send: (data: object) => void;
  subscribe: (jobId: string) => void;
  onJobComplete: (callback: (jobId: string) => void) => () => void;
}

export function useWebSocket(url: string): WebSocketHook {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const jobCompleteCallbacks = useRef<Set<(jobId: string) => void>>(new Set());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[WebSocket] Connected to server');
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.reason || 'Connection closed');
      setConnected(false);
      socketRef.current = null;

      // Attempt reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        console.log(`[WebSocket] Reconnecting... attempt ${reconnectAttempts.current}`);
        setTimeout(connect, reconnectDelay * reconnectAttempts.current);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'job_complete') {
          const jobId = String(data.job_id);
          jobCompleteCallbacks.current.forEach(callback => callback(jobId));
        } else if (data.type === 'subscribed') {
          console.log(`[WebSocket] Subscribed to job ${data.job_id}`);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };

    socketRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }, []);

  const subscribe = useCallback((jobId: string) => {
    send({ type: 'subscribe', job_id: jobId });
  }, [send]);

  const onJobComplete = useCallback((callback: (jobId: string) => void) => {
    jobCompleteCallbacks.current.add(callback);
    return () => {
      jobCompleteCallbacks.current.delete(callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    send,
    subscribe,
    onJobComplete,
  };
}
