import React, { useState } from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminOrder, AdminMarket } from '../../../types/admin';
import { AdminDataState } from '../shared/AdminPrimitives';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';
import { roleHasPermission } from '../../../types/admin';

interface MarketsResponse {
  markets: AdminMarket[];
}

interface OrdersResponse {
  orders: AdminOrder[];
}

export const VelocityMonitor: React.FC = () => {
  const marketsQuery = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', {
    enabled: roleHasPermission('SUPER_ADMIN', 'viewDashboard') || roleHasPermission('RISK_ANALYST', 'viewDashboard'),
  });

  const markets = marketsQuery.data?.markets || [];
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');

  const ws = useAdminWebSocket({
    channels: selectedSymbol ? [`trades@${selectedSymbol}`] : []
  });

  const ordersQuery = useAdminQuery<OrdersResponse>(`/api/v1/admin/orders?symbol=${selectedSymbol}`, {
    enabled: !!selectedSymbol,
    refreshInterval: 10000
  });

  const openOrders = ordersQuery.data?.orders || [];
  const recent50 = openOrders.slice(0, 50);
  const buyCount = recent50.filter((o) => o.side === 'BUY').length;
  const sellCount = recent50.filter((o) => o.side === 'SELL').length;
  const totalRecent = recent50.length;
  const velocityRatio = totalRecent > 0 ? (buyCount / totalRecent).toFixed(2) : '0.50';

  return (
    <AdminDataState
      status={marketsQuery.status}
      error={marketsQuery.error}
      isForbidden={marketsQuery.isForbidden}
      onRetry={marketsQuery.refresh}
      isEmpty={markets.length === 0}
      emptyMessage="No markets available for velocity monitoring."
    >
      <div className="velocity-monitor-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Order Velocity &amp; Flow Monitor</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#848E9C' }}>Feed State:</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              background: ws.feedState === 'LIVE' ? 'rgba(46,189,133,0.15)' : 'rgba(246,70,93,0.15)',
              color: ws.feedState === 'LIVE' ? '#2ebd85' : '#f6465d'
            }}>
              {ws.feedState}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={{ background: '#10121a', border: '1px solid #29313D', padding: '6px 12px', borderRadius: '6px', color: '#EAECEF' }}
          >
            {markets.map((m) => (
              <option key={m.symbol} value={m.symbol}>
                {m.symbol}
              </option>
            ))}
          </select>
        </div>

        <AdminDataState
          status={ordersQuery.status}
          error={ordersQuery.error}
          isForbidden={ordersQuery.isForbidden}
          onRetry={ordersQuery.refresh}
          isEmpty={openOrders.length === 0}
          emptyMessage="No orders in velocity window."
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#202630', padding: '16px', borderRadius: '8px', border: '1px solid #29313D' }}>
              <div style={{ fontSize: '12px', color: '#848E9C' }}>Buy Order Count (Last 50)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2ebd85', marginTop: '4px' }}>{buyCount}</div>
            </div>
            <div style={{ background: '#202630', padding: '16px', borderRadius: '8px', border: '1px solid #29313D' }}>
              <div style={{ fontSize: '12px', color: '#848E9C' }}>Sell Order Count (Last 50)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f6465d', marginTop: '4px' }}>{sellCount}</div>
            </div>
          </div>
        </AdminDataState>
      </div>
    </AdminDataState>
  );
};