import React from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState } from '../shared/AdminPrimitives';
import { TreasuryAssetSummary, Fees24h } from '../../../types/admin';
import { formatNumber, formatDateTime, downloadCsv } from '../../../utils/adminHelpers';

interface TreasuryResponse extends Record<string, unknown> {
  success: boolean;
  treasury: Record<string, TreasuryAssetSummary>;
  timestamp: number;
  fees24h: Record<string, Fees24h>;
}

/**
 * Treasury dashboard. Balances, liabilities, reserve ratios and fee revenue
 * are authoritative figures computed server-side by the ledger service.
 */
export const TreasuryView: React.FC = () => {
  const query = useAdminQuery<TreasuryResponse>('/api/v1/admin/wallet/balances', { refreshInterval: 30000 });
  const assets = query.data ? Object.entries(query.data.treasury) : [];
  const fees = query.data?.fees24h || {};

  const exportSnapshot = () => {
    if (!query.data) return;
    downloadCsv(
      `syncnode-treasury-${Date.now()}.csv`,
      ['Asset', 'Hot Wallet', 'Cold Storage', 'Total Exchange Assets', 'User Liabilities', 'Reserve Ratio', 'Solvent', 'Trading Fees 24h'],
      assets.map(([asset, a]) => [
        asset,
        a.hotWallet,
        a.coldStorage,
        a.totalExchangeAssets,
        a.liabilities.total,
        a.reserveRatio,
        a.isSolvent ? 'YES' : 'NO',
        fees[asset] ? String(Number(fees[asset].baseFees) + Number(fees[asset].quoteFees)) : '0'
      ])
    );
  };

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Treasury & Fee Revenue"
        subtitle={query.data ? `Ledger snapshot ${formatDateTime(query.data.timestamp)}` : 'Exchange-held assets vs user liabilities'}
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportSnapshot} disabled={!query.data}>
              <Download size={14} /> Snapshot CSV
            </button>
            <button className="btn btn-secondary" onClick={query.refresh} disabled={query.status === 'LOADING'}>
              <RefreshCw size={14} /> Refresh
            </button>
          </>
        }
      />

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={assets.length === 0}
        emptyMessage="No treasury data available."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Asset</th><th>Hot Wallet</th><th>Cold Storage</th><th>Total Assets</th>
                <th>User Liabilities</th><th>Liquidity Ratio</th><th>Solvency</th><th>Fees 24h</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(([asset, a]) => (
                <tr key={asset}>
                  <td><strong>{asset}</strong></td>
                  <td>{formatNumber(a.hotWallet)}</td>
                  <td>{formatNumber(a.coldStorage)}</td>
                  <td>{formatNumber(a.totalExchangeAssets)}</td>
                  <td>{formatNumber(a.liabilities.total)}</td>
                  <td>{a.withdrawalCapacityRatio}</td>
                  <td>
                    <span className={`admin-status-pill ${a.isSolvent ? 'healthy' : 'critical'}`}>
                      {a.isSolvent ? 'SOLVENT' : 'INSOLVENT'}
                    </span>
                  </td>
                  <td>
                    {fees[asset]
                      ? `${formatNumber(Number(fees[asset].baseFees) + Number(fees[asset].quoteFees))} ${asset}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="admin-muted" style={{ marginTop: 12 }}>
          Liability breakdown per asset includes available, locked (open orders), pending withdrawals and P2P escrow holdings.
          Solvency is attested by the ledger's double-entry proof-of-reserves audit — never inferred client-side.
        </p>
      </AdminDataState>
    </div>
  );
};