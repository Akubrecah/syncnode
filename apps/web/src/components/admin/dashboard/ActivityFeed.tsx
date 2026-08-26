import React from 'react';
import { AuditLog } from '../../../types/admin';
import { timeAgo } from '../../../utils/adminHelpers';

/**
 * Recent privileged/system activity derived from the immutable audit trail
 * (GET /api/v1/admin/audit-logs). Read-only; audit entries cannot be edited.
 */
export const ActivityFeed: React.FC<{ logs: AuditLog[] }> = ({ logs }) => (
  <div className="admin-activity-feed">
    {logs.length === 0 && <p className="admin-muted">No recent activity recorded.</p>}
    {logs.map((log) => (
      <div key={log.id} className="admin-activity-row">
        <span className={`admin-activity-badge ${log.actorType.toLowerCase()}`}>{log.actorType}</span>
        <div className="admin-activity-meta">
          <strong>{log.action}</strong>
          <small>
            {log.actorId}
            {log.targetId ? ` → ${log.targetId}` : ''} · {timeAgo(log.timestamp)}
          </small>
        </div>
      </div>
    ))}
  </div>
);
