import React from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { SecurityEventsResponse } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

/**
 * Login security monitor: recent failed-authentication events plus aggregate
 * targeting summary, sourced from the AUTH_LOGIN_FAILED audit stream.
 */
export const FailedLoginMonitor: React.FC = () => {
  const query = useAdminQuery<SecurityEventsResponse>('/api/v1/admin/security/events', { refreshInterval: 10000 });
  const data = query.data;
  const events = data?.events || [];
  const summary = data?.summary;

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Login Security"
        subtitle="Failed authentication attempts across the exchange"
      />

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={!data}
        emptyMessage="Security event feed unavailable."
        onRetry={query.refresh}
      >
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="admin-card" style={{ margin: 0 }}>
              <div className="admin-muted" style={{ fontSize: 12 }}>Failed attempts (recent window)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: summary.failedLoginAttempts > 0 ? 'var(--sell-red)' : 'var(--buy-green)' }}>
                {summary.failedLoginAttempts}
              </div>
            </div>
            <div className="admin-card" style={{ margin: 0 }}>
              <div className="admin-muted" style={{ fontSize: 12 }}>Distinct targeted accounts</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{summary.distinctTargetAccounts}</div>
            </div>
            <div className="admin-card" style={{ margin: 0 }}>
              <div className="admin-muted" style={{ fontSize: 12, marginBottom: 4 }}>Most targeted accounts</div>
              {summary.topTargets.length === 0 ? (
                <small className="admin-muted">No targets recorded.</small>
              ) : (
                summary.topTargets.map((t) => (
                  <div key={t.actorId} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="mono">{t.actorId.slice(0, 18)}…</span>
                    <strong>{t.count}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <AdminDataState
          status={query.status}
          error={null}
          isForbidden={false}
          isEmpty={events.length === 0}
          emptyMessage="No failed login attempts recorded. All clear."
          onRetry={query.refresh}
        >
          <div className="bn-table-wrapper">
            <table className="bn-table admin-users-table">
              <thead>
                <tr><th>Time</th><th>Account</th><th>IP Address</th><th>User Agent</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="admin-muted-cell">{formatDateTime(e.timestamp)}</td>
                    <td className="mono">{e.actorId}</td>
                    <td className="mono">{e.ipAddress || '—'}</td>
                    <td className="admin-muted-cell" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.userAgent || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminDataState>
      </AdminDataState>
    </div>
  );
};