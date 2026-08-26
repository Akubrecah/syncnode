import React, { useState } from 'react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import { AdminMarket } from '../../../types/admin';
import { AdminDataState } from '../shared/AdminPrimitives';
import { roleHasPermission } from '../../../types/admin';

interface MarketsResponse {
  markets: AdminMarket[];
}

export const MarketsConfig: React.FC = () => {
  const marketsQuery = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', {
    enabled: roleHasPermission('SUPER_ADMIN', 'configureMarkets') || roleHasPermission('FINANCE_OFFICER', 'configureMarkets'),
  });

  const createMutation = useAdminMutation('/api/v1/admin/markets', 'POST');
  const [newSymbol, setNewSymbol] = useState('');

  const handleNewMarket = async () => {
    if (!newSymbol.trim()) return;
    try {
      await createMutation.execute({ symbol: newSymbol.trim() });
      setNewSymbol('');
      marketsQuery.refresh();
    } catch {
      // ignore
    }
  };

  const markets = marketsQuery.data?.markets || [];

  return (
    <AdminDataState
      status={marketsQuery.status}
      error={marketsQuery.error}
      isForbidden={marketsQuery.isForbidden}
      onRetry={marketsQuery.refresh}
      isEmpty={markets.length === 0}
      emptyMessage="No markets configured."
    >
      <div className="markets-config-container">
        <h2>Markets Configuration</h2>

        <div className="markets-create-bar" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="New market symbol (e.g. SOL/USDT)"
            className="markets-input"
            disabled={!roleHasPermission('SUPER_ADMIN', 'configureMarkets')}
            style={{ background: '#10121a', border: '1px solid #29313D', padding: '6px 12px', borderRadius: '6px', color: '#EAECEF' }}
          />
          <button
            className="btn btn-buy"
            onClick={handleNewMarket}
            disabled={!roleHasPermission('SUPER_ADMIN', 'configureMarkets')}
            style={{ background: '#2ebd85', border: 'none', padding: '6px 16px', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Create
          </button>
        </div>

        <table className="admin-table markets-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Base/Quote</th>
              <th>Enabled</th>
              <th>Price Band</th>
              <th>Maker/Taker</th>
              <th>Limits</th>
              <th>Halted</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.symbol}>
                <td>{m.symbol}</td>
                <td>{m.baseAsset}/{m.quoteAsset}</td>
                <td>
                  <span className={`badge ${m.isTradingEnabled ? 'badge-green' : 'badge-amber'}`}>
                    {m.isTradingEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </td>
                <td>{m.priceBandPercent}%</td>
                <td>
                  <span>{m.makerFeeRate}</span> / <span>{m.takerFeeRate}</span>
                </td>
                <td>
                  <span>{m.minNotional}</span> / <span>{m.minQty}</span> / <span>{m.maxQty}</span>
                </td>
                <td>
                  <span className={`badge ${m.isTradingEnabled ? 'badge-green' : 'badge-red'}`}>
                    {m.isTradingEnabled ? 'ACTIVE' : 'HALTED'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDataState>
  );
};