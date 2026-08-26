import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState, AdminPagination,
  ConfirmActionModal, ConfirmActionConfig, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { WithdrawalRequest } from '../../../types/admin';
import { formatDateTime, truncateMiddle } from '../../../utils/adminHelpers';

interface WithdrawalsResponse extends Record<string, unknown> {
  success: boolean;
  withdrawals: WithdrawalRequest[];
  page: number;
  total: number;
  totalPages: number;
}

const PENDING_STATUSES = ['REQUESTED', 'PENDING_2FA', 'RISK_REVIEW', 'APPROVED', 'PROCESSING'];

const STATUS_TONE: Record<string, string> = {
  REQUESTED: 'warning',
  PENDING_2FA: 'warning',
  RISK_REVIEW: 'warning',
  APPROVED: 'healthy',
  PROCESSING: 'healthy',
  BROADCASTED: 'healthy',
  CONFIRMED: 'healthy',
  REJECTED: 'critical',
  CANCELED: ''
};

/**
 * Withdrawal risk queue. Approval and rejection are restricted to
 * SUPER_ADMIN / FINANCE_OFFICER server-side; both require a documented
 * reason which is written to the audit trail.
 */
export const WithdrawalQueue: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<ConfirmActionConfig | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (statusFilter) params.set('status', statusFilter);
  else if (highRiskOnly) params.set('minRiskScore', '60');

  const query = useAdminQuery<WithdrawalsResponse>(`/api/v1/admin/withdrawals?${params.toString()}`, { refreshInterval: 10000 });

  const approveMutation = useAdminMutation<{ id: string; reason: string }, unknown>(
    (b) => `/api/v1/admin/withdrawals/${b?.id}/approve`, 'POST'
  );
  const rejectMutation = useAdminMutation<{ id: string; reason: string }, unknown>(
    (b) => `/api/v1/admin/withdrawals/${b?.id}/reject`, 'POST'
  );

  const withdrawals = query.data?.withdrawals || [];
  const actionable = (w: WithdrawalRequest) => PENDING_STATUSES.includes(w.status);

  const openDecision = (w: WithdrawalRequest, approve: boolean) => {
    setConfirm({
      title: approve ? `Approve withdrawal ${truncateMiddle(w.id, 10)}` : `Reject withdrawal ${truncateMiddle(w.id, 10)}`,
      description: approve
        ? `${w.amount} ${w.asset} to ${truncateMiddle(w.destinationAddress, 12)} will be queued for broadcast. Risk score: ${w.riskScore}.`
        : `${w.amount} ${w.asset} will be returned to the user's available balance. The rejection reason becomes part of the audit record.`,
      confirmLabel: approve ? 'Approve Withdrawal' : 'Reject Withdrawal',
      danger: !approve,
      requireReason: true,
      onConfirm: async (payload) => {
        const mutation = approve ? approveMutation : rejectMutation;
        const result = await mutation.execute({ id: w.id, reason: String(payload.reason || '') });
        if (result !== null) {
          setToast({ kind: 'success', message: approve ? 'Withdrawal approved' : 'Withdrawal rejected' });
          query.refresh();
        } else {
          setToast({ kind: 'failed', message: mutation.error || 'Action failed' });
        }
      },
      onClose: () => setConfirm(null)
    });
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Withdrawal Queue"
        subtitle={`${query.data?.total?.toLocaleString() ?? '--'} withdrawal requests`}
        actions={
          <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      <div className="admin-filters-row">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setHighRiskOnly(false); setPage(1); }} aria-label="Filter by status" className="input-field admin-filter-select">
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={highRiskOnly}
            onChange={(e) => { setHighRiskOnly(e.target.checked); setStatusFilter(''); setPage(1); }}
          />
          High risk only (score ≥ 60)
        </label>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={withdrawals.length === 0}
        emptyMessage="No withdrawal requests match the current filters."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>ID</th><th>User</th><th>Asset</th><th>Amount</th><th>Fee</th><th>Destination</th><th>Risk</th><th>Status</th><th>Requested</th><th></th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="mono" title={w.id}>{truncateMiddle(w.id, 8)}</td>
                  <td>{w.userEmail}</td>
                  <td><strong>{w.asset}</strong></td>
                  <td>{w.amount}</td>
                  <td className="admin-muted-cell">{w.fee}</td>
                  <td className="mono admin-muted-cell" title={w.destinationAddress}>{truncateMiddle(w.destinationAddress, 10)}</td>
                  <td>
                    <span className={`admin-status-pill ${w.riskScore >= 60 ? 'critical' : w.riskScore >= 30 ? 'warning' : 'healthy'}`}>
                      {w.riskScore}
                    </span>
                  </td>
                  <td><span className={`admin-status-pill ${STATUS_TONE[w.status] || ''}`}>{w.status.replace(/_/g, ' ')}</span></td>
                  <td className="admin-muted-cell">{formatDateTime(w.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {actionable(w) && (
                      <>
                        <button className="btn btn-buy" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => openDecision(w, true)}>
                          Approve
                        </button>
                        <button className="btn btn-sell" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: 6 }} onClick={() => openDecision(w, false)}>
                          Reject
                        </button>
                      </>
                    )}
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

      {confirm && <ConfirmActionModal {...confirm} />}
    </div>
  );
};