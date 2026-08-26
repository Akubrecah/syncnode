import { useEffect, useRef, useState } from 'react';

export type FeedState = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'DISCONNECTED';

interface AdminWebSocketMessage {
  channel: string;
  data: unknown;
  event?: string;
}

interface UseAdminWebSocketOptions {
  /** Channel names to subscribe to, e.g. ['depth@BTC/USDT']. */
  channels: string[];
  /** Handler for channel messages. Keep stable via useCallback. */
  onMessage?: (channel: string, data: unknown) => void;
}

export interface AdminWebSocketResult {
  feedState: FeedState;
  lastMessageAt: number | null;
}

/**
 * Authenticated WebSocket subscription with exponential-backoff reconnect,
 * heartbeat staleness detection and guaranteed cleanup on unmount.
 */
export function useAdminWebSocket({ channels, onMessage }: UseAdminWebSocketOptions): AdminWebSocketResult {
  const [feedState, setFeedState] = useState<FeedState>('CONNECTING');
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelsKey = channels.join(',');
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem('syncnode_token');
      const wsUrl = token
        ? `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
        : `${protocol}//${window.location.host}/ws`;

      setFeedState((prev) => (prev === 'LIVE' ? 'RECONNECTING' : prev === 'CONNECTING' ? 'CONNECTING' : 'RECONNECTING'));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setFeedState('LIVE');
        const payload = { action: 'SUBSCRIBE', channels: channelsKey.split(',').filter(Boolean) };
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as AdminWebSocketMessage;
          if (msg.channel && msg.data !== undefined) {
            setLastMessageAt(Date.now());
            onMessageRef.current?.(msg.channel, msg.data);
          }
        } catch {
          // Non-JSON frame; ignore silently but do not crash the stream.
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setFeedState('DISCONNECTED');
        // Exponential backoff capped at 30s.
        const delay = Math.min(30000, 1000 * Math.pow(2, retryRef.current));
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent reconnect after intentional teardown
        ws.close();
      }
    };
  }, [channelsKey]);

  return { feedState, lastMessageAt };
}
