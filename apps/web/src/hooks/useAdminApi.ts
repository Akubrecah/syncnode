import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch, AdminApiError } from '../utils/adminHelpers';

export type QueryStatus = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export interface AdminQueryResult<T> {
  data: T | null;
  status: QueryStatus;
  error: string | null;
  /** HTTP 403 from the server - the principal lacks this capability. */
  isForbidden: boolean;
  lastUpdatedAt: number | null;
  /** True when the most recent successful fetch is older than 3x refresh interval. */
  isStale: boolean;
  refresh: () => void;
}

interface UseAdminQueryOptions {
  /** Poll interval in ms. Omit or 0 to disable polling. */
  refreshInterval?: number;
  /** Skip fetching until true (default: fetch immediately). */
  enabled?: boolean;
  /** Re-fetch when this dependency changes. */
  deps?: unknown[];
}

/**
 * Data-fetching hook for admin endpoints with polling, stale detection and
 * typed error handling. Polling acts as a fallback where no dedicated
 * WebSocket channel exists; real-time channels use useAdminWebSocket.
 */
export function useAdminQuery<T>(
  path: string,
  options: UseAdminQueryOptions = {}
): AdminQueryResult<T> {
  const { refreshInterval = 0, enabled = true, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<QueryStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setStatus('IDLE');
      return;
    }
    let cancelled = false;

    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await adminFetch<T>(path);
        if (cancelled) return;
        setData(result);
        setStatus('SUCCESS');
        setError(null);
        setIsForbidden(false);
        setLastUpdatedAt(Date.now());
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.statusCode === 403) setIsForbidden(true);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('ERROR');
      } finally {
        inFlight.current = false;
      }
    };

    run();

    let timer: ReturnType<typeof setInterval> | undefined;
    if (refreshInterval > 0) {
      timer = setInterval(run, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, refreshInterval, tick, ...deps]);

  const staleThresholdMs = refreshInterval > 0 ? refreshInterval * 3 : 30000;
  const isStale =
    status === 'SUCCESS' &&
    lastUpdatedAt !== null &&
    Date.now() - lastUpdatedAt > staleThresholdMs;

  return { data, status, error, isForbidden, lastUpdatedAt, isStale, refresh };
}

export type MutationState = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface AdminMutation<TBody, TResult> {
  execute: (body?: TBody) => Promise<TResult | null>;
  state: MutationState;
  error: string | null;
  reset: () => void;
}

export function useAdminMutation<TBody = Record<string, unknown>, TResult = unknown>(
  path: string | ((body?: TBody) => string),
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): AdminMutation<TBody, TResult> {
  const [state, setState] = useState<MutationState>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (body?: TBody): Promise<TResult | null> => {
      setState('PROCESSING');
      setError(null);
      const targetPath = typeof path === 'function' ? path(body) : path;
      try {
        const result = await adminFetch<TResult>(targetPath, {
          method,
          body: body === undefined ? undefined : JSON.stringify(body)
        });
        setState('SUCCESS');
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState('FAILED');
        return null;
      }
    },
    [path, method]
  );

  const reset = useCallback(() => {
    setState('IDLE');
    setError(null);
  }, []);

  return { execute, state, error, reset };
}
