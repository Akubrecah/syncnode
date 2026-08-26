import React from 'react';
import { RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { ProofOfReservesAudit } from '../../../types/admin';
import { formatNumber, formatDateTime } from '../../../utils/adminHelpers';

interface PoRResponse { success: boolean; audit: ProofOfReservesAudit }

/**
 * Proof of Reserves. All figures come verbatim from the ledger service's
 * double-entry audit; nothing is computed or inferred in the browser.
 */
export const ProofOfReserves: React.FC = () => {
  const query = useAdminQuery<PoRResponse>('/api/v1/admin/proof-of-reserves', { refreshInterval: 60000 });
  const audit = query.data?.audit;
  const assets = audit ? Object.entries(audit.assets) : [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Proof of Reserves"
        subtitle={audit ? `Audit generated ${formatDateTime(audit.timestamp)}` : 'Ledger solvency attestation'}
        actions={
          <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
            <RefreshCw size={14} /> Run fresh audit
          </button>
        }
      />

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={!audit}
        emptyMessage="No proof-of-reserves audit available yet."
        onRetry={query.refresh}
      >
        {audit && (
          <>
            <div className={`admin-card ${audit.isSolvent ? '' : 'admin-card-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {audit.isSolvent ? <ShieldCheck size={28} color="var(--buy-green)" /> : <ShieldX size={28} color="var(--sell-red)" />}
              <div>
                <h3 style={{ margin: 0 }}>
                  Solvency Status:{' '}
                  <span className={`admin-status-pill ${audit.isSolvent ? 'healthy' : 'critical'}`}>
                    {audit.isSolvent ? 'SOLVENT' : 'INSOLVENT'}
                  </span>
                </h3>
                <small className="admin-muted">
                  Every asset's exchange-held balance covers 100% of user liabilities per the double-entry ledger.
                </small>
              </div>
            </div>

            <div className="bn-table-wrapper">
              <table className="bn-table admin-users-table">
                <thead>
                  <tr>
                    <th>Asset</th><th>Total Assets (Hot + Cold)</th><th>User Liabilities</th><th>Surplus</th><th>Reserve Ratio</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(([asset, row]) => {
                    const ratio = Number(row.ratio);
                    const ok = ratio >= 1;
                    return (
                      <tr key={asset}>
                        <td><strong>{asset}</strong></td>
                        <td>{formatNumber(row.totalAssets)}</td>
                        <td>{formatNumber(row.totalLiabilities)}</td>
                        <td style={{ color: Number(row.surplus) >= 0 ? 'var(--buy-green)' : 'var(--sell-red)' }}>
                          {formatNumber(row.surplus)}
                        </td>
                        <td>{(ratio * 100).toFixed(2)}%</td>
                        <td>
                          <span className={`admin-status-pill ${ok ? 'healthy' : 'critical'}`}>{ok ? 'COVERED' : 'SHORTFALL'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminDataState>
    </div>
  );
};