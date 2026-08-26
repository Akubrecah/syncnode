import React from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { ApiKeyMetadata } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface ApiKeysResponse { success: boolean; apiKeys: ApiKeyMetadata[] }

/**
 * API key oversight. Only safe metadata is displayed — the backend never
 * returns full keys or secret material, and this UI must never need it.
 */
export const APIKeyManagement: React.FC = () => {
  const query = useAdminQuery<ApiKeysResponse>('/api/v1/admin/api-keys', { refreshInterval: 30000 });
  const apiKeys = query.data?.apiKeys || [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="API Key Management"
        subtitle={`${apiKeys.length} registered key(s) — metadata only, secrets are never exposed`}
      />

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={apiKeys.length === 0}
        emptyMessage="No API keys have been issued."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Owner</th><th>Label</th><th>Key Prefix</th><th>Permissions</th><th>IP Whitelist</th><th>Last Used</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id}>
                  <td>{k.userEmail}</td>
                  <td><strong>{k.label}</strong></td>
                  <td className="mono">{k.keyPrefix}</td>
                  <td>
                    <span className={`badge ${k.permissions.canRead ? 'badge-green' : ''}`}>read</span>{' '}
                    <span className={`badge ${k.permissions.canTrade ? 'badge-amber' : ''}`}>trade</span>{' '}
                    <span className={`badge ${k.permissions.canWithdraw ? 'badge-red' : ''}`}>withdraw</span>
                  </td>
                  <td className="mono admin-muted-cell">
                    {(k.ipWhitelist && k.ipWhitelist.length > 0) ? k.ipWhitelist.join(', ') : 'unrestricted'}
                  </td>
                  <td className="admin-muted-cell">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'never'}</td>
                  <td className="admin-muted-cell">{formatDateTime(k.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataState>
    </div>
  );
};