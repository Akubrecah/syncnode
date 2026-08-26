import React, { useState } from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState, AdminPagination } from '../shared/AdminPrimitives';
import { TransferRecord } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface TransfersResponse extends Record<string, unknown> {
  success: boolean;
  transfers: TransferRecord[];
  page: number;
  total: number;
  totalPages: number;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'warning',
  COMPLETED: 'healthy',
  FAILED: 'critical',
  CANCELLED: ''
};

/** Internal user-to-user transfer ledger with type filter and pagination. */
export const InternalTransfers: React.FC = () => {
  const [type, setType] = useState('INTERNAL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (type) params.set('type', type);

  const query = useAdminQuery<TransfersResponse>(`/api/v1/admin/transfers?${params.toString()}`, { refreshInterval: 30000 });
  const transfers = query.data?.transfers || [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Internal Transfers"
        subtitle={`${query.data?.total?.toLocaleString() ?? '--'} transfer records`}
      />

      <div className="admin-filters-row">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by transfer type" className="input-field admin-filter-select">
          <option value="">All types</option>
          <option value="INTERNAL">Internal</option>
          <option value="EXTERNAL_CRYPTO">External (crypto)</option>
          <option value="EXTERNAL_FIAT">External (fiat)</option>
        </select>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={transfers.length === 0}
        emptyMessage="No transfers match the current filter."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>ID</th><th>Type</th><th>Sender</th><th>Recipient</th><th>Asset</th><th>Amount</th><th>Fee</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="mono" title={t.id}>{t.id.slice(0, 14)}…</td>
                  <td>{t.type.replace(/_/g, ' ')}</td>
                  <td>{t.senderEmail || t.senderUserId}</td>
                  <td>{t.recipientEmail || t.recipientIdentifier}</td>
                  <td><strong>{t.asset}</strong></td>
                  <td>{t.amount}</td>
                  <td className="admin-muted-cell">{t.fee}</td>
                  <td><span className={`admin-status-pill ${STATUS_TONE[t.status] || ''}`}>{t.status}</span></td>
                  <td className="admin-muted-cell">{formatDateTime(t.createdAt)}</td>
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