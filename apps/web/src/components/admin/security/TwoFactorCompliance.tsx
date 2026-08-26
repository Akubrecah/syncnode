import React, { useState } from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState, AdminPagination } from '../shared/AdminPrimitives';
import { AdminUser } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface UsersResponse extends Record<string, unknown> {
  success: boolean;
  users: AdminUser[];
  page: number;
  total: number;
  totalPages: number;
}

/**
 * Two-factor compliance: accounts without TOTP enabled are the highest-value
 * account-takeover targets. Filtered server-side via ?totpEnabled=false.
 */
export const TwoFactorCompliance: React.FC = () => {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20', totpEnabled: 'false' });
  const query = useAdminQuery<UsersResponse>(`/api/v1/admin/users?${params.toString()}`, { refreshInterval: 30000 });
  const users = query.data?.users || [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="2FA Compliance"
        subtitle={`${query.data?.total?.toLocaleString() ?? '--'} account(s) WITHOUT two-factor authentication`}
      />

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={users.length === 0}
        emptyMessage="Every registered account has 2FA enabled. Full compliance."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr><th>User</th><th>KYC</th><th>Withdrawal Restriction</th><th>Status</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <span className="admin-avatar sm">{(u.fullName || u.email)[0].toUpperCase()}</span>
                      <div>
                        <strong>{u.fullName || u.email.split('@')[0]}</strong>
                        <small>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.kycStatus === 'APPROVED' ? 'badge-green' : u.kycStatus === 'PENDING' ? 'badge-amber' : ''}`}>
                      {u.kycStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{u.isWithdrawalSuspended ? 'restricted' : '—'}</td>
                  <td>
                    <span className={`admin-status-pill ${u.isSuspended ? 'critical' : 'healthy'}`}>
                      {u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="admin-muted-cell">{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {query.data && query.data.totalPages > 1 && (
          <AdminPagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPageChange={setPage} />
        )}
      </AdminDataState>
    </div>
  );
};