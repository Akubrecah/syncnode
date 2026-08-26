// ==========================================================================
// Admin console helpers: authenticated API client, formatters, CSV export.
// ==========================================================================

const TOKEN_KEY = 'syncnode_token';

export class AdminApiError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AdminApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Authenticated fetch for admin endpoints. Throws typed errors on any
 * non-2xx response; never silently swallows failures.
 */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch (err) {
    throw new AdminApiError(
      `Network failure reaching ${path}: ${err instanceof Error ? err.message : String(err)}`,
      0
    );
  }

  if (!res.ok) {
    let message = `Request failed with HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body - keep the HTTP status message.
    }
    throw new AdminApiError(message, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new AdminApiError(`Malformed JSON response from ${path}`, res.status || 200);
  }
}

export function formatNumber(value: string | number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === '') return '--';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '--';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/** Smart precision: more decimals for small values (crypto prices). */
export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '--';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '--';
  if (num >= 1000) return formatNumber(num, 2);
  if (num >= 1) return formatNumber(num, 4);
  return formatNumber(num, 8);
}

export function formatPercent(value: string | null | undefined): string {
  if (!value) return '--';
  const num = parseFloat(value.replace('%', ''));
  if (Number.isNaN(num)) return value;
  return `${num > 0 ? '+' : ''}${formatNumber(num, 2)}%`;
}

export function formatDateTime(ts: number | undefined | null): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function timeAgo(ts: number | undefined | null): string {
  if (!ts) return '--';
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

export function truncateMiddle(value: string, keep = 8): string {
  if (!value || value.length <= keep * 2 + 3) return value || '';
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

/** Trigger a client-side CSV download of already-fetched rows. */
export function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const escapeCell = (v: unknown): string => {
    const str = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csv = [header.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
