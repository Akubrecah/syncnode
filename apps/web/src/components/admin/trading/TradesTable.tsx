import React, { useState } from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminSectionHeader, AdminDataState, AdminPagination } from '../shared/AdminPrimitives';
import { AdminTrade } from '../../../types/admin';
import { formatDateTime, formatPrice } from '../../../utils/adminHelpers';

interface TradesResponse extends Record<string, unknown> {
  success: boolean;
  trades: AdminTrade[];
  page: number;
  total: number;
  totalPages: number;
}

const MARKETS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ETH/BTC'];

/** Executed trade blotter with server-side pagination and symbol filter. */
export const TradesTable: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (symbol) params.set('symbol', symbol);

  const query = useAdminQuery<TradesResponse>(`/api/v1/admin/trades?${params.toString()}`, { refreshInterval: 10000 });
  const trades = query.data?.trades || [];

  return (
    <div className="admin-section">
      <AdminSectionHeader
        title="Executed Trades"
        subtitle={`${query.data?.total?.toLocaleString() ?? '--'} trades on record`}
      />

      <div className="admin-filters-row">
        <select
          value={symbol}
          onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
          aria-label="Filter by market"
          className="input-field admin-filter-select"
        >
          <option value="">All markets</option>
          {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <AdminDataState
        status={query.status}
        error={query.error}
        isForbidden={query.isForbidden}
        isEmpty={trades.length === 0}
        emptyMessage="No executed trades match the current filter."
        onRetry={query.refresh}
      >
        <div className="bn-table-wrapper">
          <table className="bn-table admin-users-table">
            <thead>
              <tr>
                <th>Trade ID</th><th>Market</th><th>Price</th><th>Quantity</th><th>Quote Qty</th>
                <th>Maker Side</th><th>Buy Fee</th><th>Sell Fee</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="mono" title={t.id}>{t.id.slice(0, 14)}…</td>
                  <td><strong>{t.symbol}</strong></td>
                  <td>{formatPrice(t.price)}</td>
                  <td>{t.quantity}</td>
                  <td>{t.quoteQuantity}</td>
                  <td>
                    <span style={{ color: t.makerSide === 'BUY' ? 'var(--buy-green)' : 'var(--sell-red)', fontWeight: 700 }}>
                      {t.makerSide}
                    </span>
                  </td>
                  <td className="admin-muted-cell">{t.buyerFee} {t.buyerFeeAsset}</td>
                  <td className="admin-muted-cell">{t.sellerFee} {t.sellerFeeAsset}</td>
                  <td className="admin-muted-cell">{formatDateTime(t.timestamp)}</td>
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