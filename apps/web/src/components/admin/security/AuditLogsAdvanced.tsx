import React, { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { AuditLog } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface AuditResponse extends Record<string, unknown> {
  success: boolean;
  logs: AuditLog[];
  total: number;
}

const ACTOR_TONE: Record<string, string> = { ADMIN: 'critical', USER: 'healthy', SYSTEM: '' };

/**
 * Enterprise audit trail. Read-only by design: the UI exposes filtering and
 * authorized CSV export (which itself is audited server-side) but no mutation.
 */
export const AuditLogsAdvanced: React.FC = () => {
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [actorType, setActorType] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ limit: '200' });
  if (actorId) params.set('actorId', actorId);
  if (action) params.set('action', action);
  if (actorType) params.set('actorType', actorType);

  const query = useAdminQuery<AuditResponse>(`/api/v1/admin/audit-logs?${params.toString()}`, { refreshInterval: 15000 });
  const logs = query.data?.logs || [];

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      // Direct authenticated fetch (response is CSV, not JSON). The export
      // event itself is audited server-side before the payload is returned.
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/admin/audit-logs/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncnode-audit-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Audit Logs"
        subtitle={`${(query.data?.total ?? 0).toLocaleString()} entries on record — immutable trail of privileged activity`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      {exportError && (
        <div role="alert" className="admin-state-box" style={{ marginBottom: 12 }}>
          Export failed: {exportError}
        </div>
      )}

      <div className="admin-filters-row">
        <input
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          placeholder="Filter by actor ID…"
          aria-label="Filter by actor"
          className="input-field admin-filter-select"
          style={{ minWidth: 220 }}
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action…"
          aria-label="Filter by action"
          className="input-field admin-filter-select"
          style={{ minWidth: 220 }}
        />
        <select value={actorType} onChange={(e) => setActorType(e.target.value)} aria-label="Filter by actor type" className="input-field admin-filter-select">
          <option value="">All actor types</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={logs.length === 0}
        emptyMessage="No audit entries match the current filters."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Time</th><th>Actor</th><th>Type</th><th>Action</th><th>Target</th><th>IP</th><th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="admin-muted-cell">{formatDateTime(l.timestamp)}</td>
                  <td className="mono" title={l.actorId}>{l.actorId.slice(0, 16)}…</td>
                  <td><span className={`admin-status-pill ${ACTOR_TONE[l.actorType] || ''}`}>{l.actorType}</span></td>
                  <td><strong>{l.action}</strong></td>
                  <td className="mono admin-muted-cell">{l.targetId ? `${l.targetId.slice(0, 14)}…` : '—'}</td>
                  <td className="mono admin-muted-cell">{l.ipAddress || '—'}</td>
                  <td className="admin-muted-cell" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.metadata ? JSON.stringify(l.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataState>
    </div>
  );
};