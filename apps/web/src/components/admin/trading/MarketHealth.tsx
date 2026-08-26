import React from 'react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import { AdminMarket } from '../../../types/admin';
import { AdminDataState } from '../shared/AdminPrimitives';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';
import { roleHasPermission } from '../../../types/admin';

interface MarketsResponse {
  markets: AdminMarket[];
}

export const MarketHealth: React.FC = () => {
  const marketsQuery = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', {
    enabled: roleHasPermission('SUPER_ADMIN', 'viewDashboard') || roleHasPermission('RISK_ANALYST', 'viewDashboard'),
    refreshInterval: 15000
  });

  const haltMutation = useAdminMutation<{ halt: boolean; reason: string }, unknown>('/api/v1/admin/circuit-breakers/global-halt', 'POST');

  const ws = useAdminWebSocket({
    channels: ['markets@all']
  });

  const markets = marketsQuery.data?.markets || [];

  const handleHaltGlobal = async () => {
    if (!window.confirm('Are you sure you want to globally halt trading?')) return;
    await haltMutation.execute({ halt: true, reason: 'Global halt activated from market health console' });
    marketsQuery.refresh();
  };

  const handleResumeGlobal = async () => {
    if (!window.confirm('Are you sure you want to resume global trading?')) return;
    await haltMutation.execute({ halt: false, reason: 'Global trading resumed from market health console' });
    marketsQuery.refresh();
  };

  return (
    <AdminDataState
      status={marketsQuery.status}
      error={marketsQuery.error}
      isForbidden={marketsQuery.isForbidden}
      onRetry={marketsQuery.refresh}
      isEmpty={markets.length === 0}
      emptyMessage="No markets configured."
    >
      <div className="market-health-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Market Health &amp; Surveillance</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleHaltGlobal}
              style={{ background: '#f6465d', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
            >
              Emergency Halt Global
            </button>
            <button
              onClick={handleResumeGlobal}
              style={{ background: '#2ebd85', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
            >
              Resume Global
            </button>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Status</th>
              <th>Maker Fee</th>
              <th>Taker Fee</th>
              <th>Min Notional</th>
              <th>Price Band</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.symbol}>
                <td><strong>{m.symbol}</strong></td>
                <td>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    background: m.isTradingEnabled ? 'rgba(46,189,133,0.15)' : 'rgba(246,70,93,0.15)',
                    color: m.isTradingEnabled ? '#2ebd85' : '#f6465d'
                  }}>
                    {m.isTradingEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </td>
                <td>{m.makerFeeRate}</td>
                <td>{m.takerFeeRate}</td>
                <td>{m.minNotional}</td>
                <td>{m.priceBandPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminDataState>
  );
};