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
  const messageQueue = useRef<object[]>([]);
  const subscribedJobs = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | null>(null);

  const maxReconnectDelay = 30000; // 30s

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnected(true);
      reconnectAttempts.current = 0;
      socketRef.current = ws;

      // Flush queued messages
      messageQueue.current.forEach(msg => ws.send(JSON.stringify(msg)));
      messageQueue.current = [];

      // Resubscribe
      subscribedJobs.current.forEach(jobId =>
        ws.send(JSON.stringify({ type: 'subscribe', job_id: jobId }))
      );
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.reason || 'Connection closed');
      setConnected(false);
      socketRef.current = null;

      // Exponential backoff reconnect
      reconnectAttempts.current++;
      const delay = Math.min(1000 * 2 ** (reconnectAttempts.current - 1), maxReconnectDelay);
      console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
      reconnectTimer.current = window.setTimeout(connect, delay);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'job_complete') {
          const jobId = String(data.job_id);
          subscribedJobs.current.delete(jobId);
		  console.log('[WebSocket] job_complete received, callbacks:', jobCompleteCallbacks.current.size);
		  jobCompleteCallbacks.current.forEach(cb => cb(jobId));
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
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      messageQueue.current.push(data);
    }
  }, []);

  const subscribe = useCallback((jobId: string) => {
    subscribedJobs.current.add(jobId);
    send({ type: 'subscribe', job_id: jobId });
  }, [send]);

  const onJobComplete = useCallback((callback: (jobId: string) => void) => {
    jobCompleteCallbacks.current.add(callback);
    return () => jobCompleteCallbacks.current.delete(callback);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    send,
    subscribe,
    onJobComplete,
  };
}
