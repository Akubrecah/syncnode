import React, { useState } from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState, AdminPagination } from '../shared/AdminPrimitives';
import { DepositRecord } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface DepositsResponse extends Record<string, unknown> {
  success: boolean;
  deposits: DepositRecord[];
  page: number;
  total: number;
  totalPages: number;
}

const STATUS_TONE: Record<string, string> = {
  DETECTED: 'warning',
  CONFIRMING: 'warning',
  CONFIRMED: 'healthy',
  CREDITED: 'healthy',
  FAILED: 'critical'
};

/** Blockchain deposit monitor with status/asset filters and pagination. */
export const DepositMonitor: React.FC = () => {
  const [status, setStatus] = useState('');
  const [asset, setAsset] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);
  if (asset) params.set('asset', asset);

  const query = useAdminQuery<DepositsResponse>(`/api/v1/admin/deposits?${params.toString()}`, { refreshInterval: 10000 });
  const deposits = query.data?.deposits || [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Deposit Monitor"
        subtitle={`${query.data?.total?.toLocaleString() ?? '--'} deposit records`}
      />

      <div className="admin-filters-row">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="input-field admin-filter-select">
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={asset} onChange={(e) => { setAsset(e.target.value); setPage(1); }} aria-label="Filter by asset" className="input-field admin-filter-select">
          <option value="">All assets</option>
          {['BTC', 'ETH', 'SOL', 'USDT', 'USDC'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={deposits.length === 0}
        emptyMessage="No deposits match the current filters."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Deposit ID</th><th>User</th><th>Asset</th><th>Amount</th><th>Confirmations</th><th>Status</th><th>Tx Hash</th><th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="mono" title={d.id}>{d.id.slice(0, 14)}…</td>
                  <td>{d.userEmail}</td>
                  <td><strong>{d.asset}</strong></td>
                  <td>{d.amount}</td>
                  <td className={d.confirmations >= d.requiredConfirmations ? '' : 'admin-muted-cell'}>
                    {d.confirmations}/{d.requiredConfirmations}
                  </td>
                  <td>
                    <span className={`admin-status-pill ${STATUS_TONE[d.status] || ''}`}>{d.status}</span>
                  </td>
                  <td className="mono admin-muted-cell" title={d.txHash}>{d.txHash ? `${d.txHash.slice(0, 10)}…${d.txHash.slice(-6)}` : '—'}</td>
                  <td className="admin-muted-cell">{formatDateTime(d.createdAt)}</td>
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