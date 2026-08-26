import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import {
  AdminSectionHeader, AdminDataState,
  ConfirmActionModal, ConfirmActionConfig, ToastBar, AdminToast
} from '../shared/AdminPrimitives';
import { P2PEscrowTrade } from '../../../types/admin';
import { formatDateTime } from '../../../utils/adminHelpers';

interface EscrowsResponse { success: boolean; escrows: P2PEscrowTrade[] }

const STATUSES = ['CREATED', 'ESCROW_LOCKED', 'FIAT_MARKED_PAID', 'RELEASED', 'DISPUTED', 'CANCELED'] as const;

const STATUS_TONE: Record<string, string> = {
  CREATED: 'warning',
  ESCROW_LOCKED: 'healthy',
  FIAT_MARKED_PAID: 'warning',
  RELEASED: 'healthy',
  DISPUTED: 'critical',
  CANCELED: ''
};

/**
 * P2P escrow oversight. Disputed escrows can be force-released to the buyer
 * or cancelled back to the seller; both outcomes settle through the ledger
 * and require a documented reason recorded in the audit trail.
 */
export const EscrowMonitor: React.FC<{ initialStatus?: string }> = ({ initialStatus = '' }) => {
  const [status, setStatus] = useState(initialStatus);
  const [confirm, setConfirm] = useState<ConfirmActionConfig | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);

  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  const query = useAdminQuery<EscrowsResponse>(`/api/v1/admin/p2p/escrows${params}`, { refreshInterval: 10000 });

  const resolveMutation = useAdminMutation<{ id: string; action: 'RELEASE' | 'CANCEL'; reason: string }, unknown>(
    (b) => `/api/v1/admin/p2p/escrows/${b?.id}/resolve`, 'POST'
  );

  const escrows = query.data?.escrows || [];

  const openResolution = (t: P2PEscrowTrade, action: 'RELEASE' | 'CANCEL') => {
    setConfirm({
      title: action === 'RELEASE' ? `Force-release escrow ${t.id}` : `Cancel escrow ${t.id}`,
      description: action === 'RELEASE'
        ? `${t.cryptoAmount} ${t.asset} will be released from escrow to the BUYER (${t.buyerEmail}).`
        : `${t.cryptoAmount} ${t.asset} will be returned from escrow to the SELLER (${t.sellerEmail}).`,
      confirmLabel: action === 'RELEASE' ? 'Release to Buyer' : 'Cancel & Return',
      danger: true,
      requireReason: true,
      onConfirm: async (payload) => {
        const result = await resolveMutation.execute({
          id: t.id,
          action,
          reason: String(payload.reason || '')
        });
        if (result !== null) {
          setToast({ kind: 'success', message: action === 'RELEASE' ? 'Escrow released to buyer' : 'Escrow cancelled and returned' });
          query.refresh();
        } else {
          setToast({ kind: 'failed', message: resolveMutation.error || 'Escrow resolution failed' });
        }
      },
      onClose: () => setConfirm(null)
    });
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title={initialStatus === 'DISPUTED' ? 'Dispute Resolution' : 'P2P Escrow Monitor'}
        subtitle={`${escrows.length} escrow record(s)`}
        actions={
          <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <ToastBar toast={toast} onDismiss={() => setToast(null)} />

      <div className="admin-filters-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by escrow status" className="input-field admin-filter-select">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={escrows.length === 0}
        emptyMessage="No escrow trades match the current filter."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Escrow ID</th><th>Buyer</th><th>Seller</th><th>Asset</th><th>Crypto</th><th>Fiat</th><th>Method</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((t) => (
                <tr key={t.id}>
                  <td className="mono" title={t.id}>{t.id.slice(0, 14)}…</td>
                  <td>{t.buyerEmail}</td>
                  <td>{t.sellerEmail}</td>
                  <td><strong>{t.asset}</strong></td>
                  <td>{t.cryptoAmount}</td>
                  <td>{t.fiatAmount} {t.fiatCurrency}</td>
                  <td className="admin-muted-cell">{t.paymentMethod}</td>
                  <td>
                    <span className={`admin-status-pill ${STATUS_TONE[t.status] || ''}`}>{t.status.replace(/_/g, ' ')}</span>
                    {t.disputeReason && <small className="admin-muted" title={t.disputeReason} style={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.disputeReason}</small>}
                  </td>
                  <td className="admin-muted-cell">{formatDateTime(t.updatedAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {(t.status === 'DISPUTED' || t.status === 'FIAT_MARKED_PAID') && (
                      <>
                        <button className="btn btn-buy" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => openResolution(t, 'RELEASE')}>
                          Release
                        </button>
                        <button className="btn btn-sell" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: 6 }} onClick={() => openResolution(t, 'CANCEL')}>
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminDataState>

      {confirm && <ConfirmActionModal {...confirm} />}
    </div>
  );
};