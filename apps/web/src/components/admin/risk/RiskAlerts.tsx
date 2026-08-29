import React from 'react';
import { useAdminQuery } from '../../../hooks/useAdminApi';
import { AdminDataState } from '../shared/AdminPrimitives';
import { AdminMarket, CircuitBreakersState } from '../../../types/admin';
import { roleHasPermission } from '../../../types/admin';

interface RiskAlertsProps {
  circuitBreakers?: CircuitBreakersState;
}

interface MarketsResponse {
  markets: AdminMarket[];
}

export const RiskAlerts: React.FC<RiskAlertsProps> = ({ circuitBreakers }) => {
  const marketsQuery = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', {
    enabled: roleHasPermission('SUPER_ADMIN', 'viewDashboard') || roleHasPermission('RISK_ANALYST', 'viewDashboard'),
  });

  const markets = marketsQuery.data?.markets || [];
  const haltedMarkets = Object.keys(circuitBreakers?.haltedMarkets || {}).filter(k => circuitBreakers?.haltedMarkets[k]);

  return (
    <AdminDataState
      status={marketsQuery.status}
      error={marketsQuery.error}
      isForbidden={marketsQuery.isForbidden}
      onRetry={marketsQuery.refresh}
      isEmpty={false}
    >
      <div className="risk-alerts-container" style={{ marginTop: '16px', background: '#202630', padding: '16px', borderRadius: '8px', border: '1px solid #29313D' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Operational Risk &amp; Market Alerts</h3>
        
        {circuitBreakers?.isGlobalTradingHalted && (
          <div style={{ background: 'rgba(246,70,93,0.15)', border: '1px solid #f6465d', color: '#f6465d', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px', fontWeight: 700 }}>
            Global Trading is currently HALTED across all order books.
          </div>
        )}

        {haltedMarkets.length > 0 ? (
          haltedMarkets.map((sym) => (
            <div key={sym} style={{ background: 'rgba(252,213,53,0.1)', border: '1px solid #FCD535', color: '#FCD535', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>
              Market <strong>{sym}</strong> is halted by Circuit Breaker.
            </div>
          ))
        ) : (
          <div style={{ color: '#2ebd85', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✓ All active order books operating within normal volatility &amp; risk tolerances.
          </div>
        )}
      </div>
    </AdminDataState>
  );
};