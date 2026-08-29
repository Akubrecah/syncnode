import React, { useState } from 'react';
import { Search, Eye, Ban, Wallet, Plus } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, AdminPagination, PermissionGate
} from '../shared/AdminPrimitives';
import { UserDetailDrawer } from './UserDetail';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { IngestTransactionModal } from './IngestTransactionModal';
import { AdminUser, KycStatusValue, KycTierValue } from '../../../types/admin';
import { formatDateTime, classNames } from '../../../utils/adminHelpers';

interface UsersResponse extends Record<string, unknown> {
  success: boolean;
  users: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const KYC_TIER_LABELS: Record<KycTierValue, string> = {
  TIER_0_UNVERIFIED: 'Tier 0',
  TIER_1_BASIC: 'Tier 1',
  TIER_2_VERIFIED: 'Tier 2',
  TIER_3_INSTITUTIONAL: 'Institutional'
};

export const UsersTable: React.FC<{
  lockedSuspendedFilter?: boolean;
  canManageUsers: boolean;
}> = ({ lockedSuspendedFilter, canManageUsers }) => {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [kycTier, setKycTier] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (appliedSearch) params.set('search', appliedSearch);
  if (kycStatus) params.set('kycStatus', kycStatus);
  if (kycTier) params.set('kycTier', kycTier);
  if (lockedSuspendedFilter) params.set('suspended', 'true');

  const query = useAdminQuery<UsersResponse>(`/api/v1/admin/users?${params.toString()}`, { refreshInterval: 30000 });
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<AdminUser | null>(null);
  const [ingestingUser, setIngestingUser] = useState<AdminUser | null>(null);

  return (
    <div className="admin-section">
      {!lockedSuspendedFilter ? (
        <AdminSectionHeader
          title="All Users"
          subtitle={`${query.data?.total?.toLocaleString() ?? '--'} registered accounts`}
        />
      ) : (
        <AdminSectionHeader
          title="Suspended Accounts"
          subtitle="Accounts currently blocked from trading by administrative action"
        />
      )}

      <div className="admin-filters-row">
        <form
          className="admin-search-box"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(search.trim());
          }}
        >
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, ID, or name…"
            aria-label="Search users"
          />
        </form>
        <select value={kycStatus} onChange={(e) => { setKycStatus(e.target.value); setPage(1); }} aria-label="Filter by KYC status" className="input-field admin-filter-select">
          <option value="">All KYC statuses</option>
          <option value="NOT_SUBMITTED">Not submitted</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={kycTier} onChange={(e) => { setKycTier(e.target.value); setPage(1); }} aria-label="Filter by KYC tier" className="input-field admin-filter-select">
          <option value="">All tiers</option>
          <option value="TIER_0_UNVERIFIED">Tier 0</option>
          <option value="TIER_1_BASIC">Tier 1</option>
          <option value="TIER_2_VERIFIED">Tier 2</option>
          <option value="TIER_3_INSTITUTIONAL">Institutional</option>
        </select>
      </div>

      <AdminDataState status={query.status} error={query.error} isForbidden={query.isForbidden} isEmpty={(query.data?.users || []).length === 0} emptyMessage="No users match the current filters." onRetry={query.refresh}>
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>User</th><th>KYC</th><th>Security</th><th>Status</th><th>Registered</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.users || []).map((u) => (
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
                    <span className={`badge ${u.kycStatus === 'APPROVED' ? 'badge-green' : u.kycStatus === 'PENDING' ? 'badge-amber' : u.kycStatus === 'REJECTED' ? 'badge-red' : ''}`}>
                      {KYC_TIER_LABELS[u.kycTier]} · {u.kycStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="admin-muted-cell">
                    {u.isTotpEnabled ? '2FA on' : '2FA off'}
                    {u.isWithdrawalSuspended && ' · wd-restricted'}
                    {u.adminRole && ` · ${u.adminRole}`}
                  </td>
                  <td>
                    <span className={`admin-status-pill ${u.isSuspended ? 'critical' : 'healthy'}`}>
                      {u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="admin-muted-cell">{formatDateTime(u.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {canManageUsers && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#fcd535', borderColor: 'rgba(252, 213, 53, 0.3)' }}
                            onClick={() => setAdjustingUser(u)}
                            title="Add / Edit user balance"
                          >
                            <Wallet size={12} /> Balance
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#0ecb81', borderColor: 'rgba(14, 203, 129, 0.3)' }}
                            onClick={() => setIngestingUser(u)}
                            title="Ingest custom deposit or payment record"
                          >
                            + Ingest
                          </button>
                        </>
                      )}
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setDetailUser(u)}>
                        <Eye size={12} /> Detail
                      </button>
                      {canManageUsers && u.isSuspended && (
                        <span title="Suspended account" style={{ marginLeft: 4 }}><Ban size={13} color="var(--sell-red)" /></span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {query.data && query.data.totalPages > 1 && (
          <AdminPagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} onPageChange={setPage} />
        )}
      </AdminDataState>

      {detailUser && (
        <UserDetailDrawer
          userId={detailUser.id}
          canManageUsers={canManageUsers}
          onClose={() => {
            setDetailUser(null);
            query.refresh();
          }}
        />
      )}

      {adjustingUser && (
        <AdjustBalanceModal
          userId={adjustingUser.id}
          userEmail={adjustingUser.email}
          userName={adjustingUser.fullName}
          initialAsset="USDT"
          onClose={() => setAdjustingUser(null)}
          onSuccess={() => {
            setAdjustingUser(null);
            query.refresh();
          }}
        />
      )}

      {ingestingUser && (
        <IngestTransactionModal
          user={ingestingUser}
          onClose={() => setIngestingUser(null)}
          onSuccess={() => {
            setIngestingUser(null);
            query.refresh();
          }}
        />
      )}
    </div>
  );
};
