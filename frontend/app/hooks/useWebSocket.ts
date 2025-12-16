import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketHook {
  socket: WebSocket | null;
  connected: boolean;
  send: (data: object) => void;
  subscribe: (jobId: string) => void;
  onJobComplete: (callback: (jobId: string) => void) => () => void;
}

const DEBUG = import.meta.env.DEV;

// Configuration
const MAX_RECONNECT_DELAY = 30000; // 30s max backoff
const FAST_RETRY_THRESHOLD = 3; // First 3 retries use fast timing
const FAST_RETRY_BASE_DELAY = 100; // 100ms base for fast retries
const CONNECTION_TIMEOUT = 5000; // 5s timeout per connection attempt

export function useWebSocket(url: string): WebSocketHook {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const jobCompleteCallbacks = useRef<Set<(jobId: string) => void>>(new Set());
  const messageQueue = useRef<object[]>([]);
  const subscribedJobs = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef(0);
  const isConnecting = useRef(false);
  const shouldReconnect = useRef(true);

  // Calculate delay based on attempt number
  const getReconnectDelay = useCallback((attempt: number): number => {
    if (attempt === 1) {
      return 0; // Immediate retry on first failure
    } else if (attempt <= FAST_RETRY_THRESHOLD) {
      // Fast retries: 100ms, 200ms, 400ms
      return FAST_RETRY_BASE_DELAY * 2 ** (attempt - 2);
    } else {
      // Normal exponential backoff: 1000ms, 2000ms, 4000ms, etc.
      return Math.min(1000 * 2 ** (attempt - FAST_RETRY_THRESHOLD - 1), MAX_RECONNECT_DELAY);
    }
  }, []);

  // Single connection attempt with timeout - returns promise
  const tryConnect = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      let settled = false;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(ws);
        }
      };

      ws.onerror = (error) => {
        DEBUG && console.error('[WebSocket] Error:', error);
      };

      ws.onclose = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error(event.reason || 'Connection closed'));
        }
      };
    });
  }, [url]);

  // Main connection loop with retry logic
  const connectWithRetry = useCallback(async () => {
    if (isConnecting.current) {
      DEBUG && console.log('[WebSocket] Connection already in progress');
      return;
    }

    isConnecting.current = true;
    shouldReconnect.current = true;

    while (shouldReconnect.current) {
      try {
        DEBUG && console.log(`[WebSocket] Connecting... (attempt ${reconnectAttempts.current + 1})`);
        const ws = await tryConnect();

        // Success - set up the socket
        socketRef.current = ws;
        setConnected(true);
        reconnectAttempts.current = 0;
        DEBUG && console.log('[WebSocket] Connected');

        // Flush queued messages
        messageQueue.current.forEach(msg => ws.send(JSON.stringify(msg)));
        messageQueue.current = [];

        // Resubscribe to jobs
        subscribedJobs.current.forEach(jobId =>
          ws.send(JSON.stringify({ type: 'subscribe', job_id: jobId }))
        );

        // Set up message handler
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'job_complete') {
              const jobId = String(data.job_id);
              subscribedJobs.current.delete(jobId);
              DEBUG && console.log('[WebSocket] job_complete received, callbacks:', jobCompleteCallbacks.current.size);
              jobCompleteCallbacks.current.forEach(cb => cb(jobId));
            } else if (data.type === 'subscribed') {
              DEBUG && console.log(`[WebSocket] Subscribed to job ${data.job_id}`);
            }
          } catch (err) {
            DEBUG && console.error('[WebSocket] Failed to parse message:', err);
          }
        };

        // Set up close handler for reconnection
        ws.onclose = (event) => {
          DEBUG && console.log('[WebSocket] Disconnected:', event.reason || 'Connection closed');
          setConnected(false);
          socketRef.current = null;

          // Clear stale subscriptions
          subscribedJobs.current.clear();

          // Trigger reconnection if we should
          if (shouldReconnect.current) {
            isConnecting.current = false;
            const delay = getReconnectDelay(reconnectAttempts.current + 1);
            DEBUG && console.log(`[WebSocket] Will reconnect in ${delay}ms`);
            setTimeout(() => connectWithRetry(), delay);
          }
        };

        // Exit the retry loop - we're connected
        isConnecting.current = false;
        return;

      } catch (err) {
        reconnectAttempts.current++;
        const delay = getReconnectDelay(reconnectAttempts.current);
        DEBUG && console.log(`[WebSocket] Attempt ${reconnectAttempts.current} failed. Retrying in ${delay}ms`);

        if (!shouldReconnect.current) {
          break;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    isConnecting.current = false;
  }, [tryConnect, getReconnectDelay]);

  // Initialize connection on mount only
  useEffect(() => {
    connectWithRetry();

    return () => {
      shouldReconnect.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
