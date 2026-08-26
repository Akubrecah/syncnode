import React, { useState } from 'react';
import { useAdminQuery, useAdminMutation } from '../../../hooks/useAdminApi';
import { AdminMarket } from '../../../types/admin';
import { AdminDataState } from '../shared/AdminPrimitives';
import { roleHasPermission } from '../../../types/admin';

interface MarketsResponse {
  markets: AdminMarket[];
}

export const RiskParameters: React.FC = () => {
  const marketsQuery = useAdminQuery<MarketsResponse>('/api/v1/admin/markets', {
    enabled: roleHasPermission('SUPER_ADMIN', 'configureMarkets') || roleHasPermission('RISK_ANALYST', 'configureMarkets'),
  });

  const updateMutation = useAdminMutation((body: any) => `/api/v1/admin/markets/${body?.symbol}`, 'PUT');
  const markets = marketsQuery.data?.markets || [];
  const [selectedMarket, setSelectedMarket] = useState<string>('BTC/USDT');

  const market = markets.find((m) => m.symbol === selectedMarket) || markets[0];

  const [priceBandPercent, setPriceBandPercent] = useState<number>(10);
  const [makerFeeRate, setMakerFeeRate] = useState<string>('0.002');
  const [takerFeeRate, setTakerFeeRate] = useState<string>('0.003');

  const handleUpdate = async () => {
    if (!market) return;
    await updateMutation.execute({
      symbol: market.symbol,
      priceBandPercent,
      makerFeeRate,
      takerFeeRate
    });
    marketsQuery.refresh();
  };

  return (
    <AdminDataState
      status={marketsQuery.status}
      error={marketsQuery.error}
      isForbidden={marketsQuery.isForbidden}
      onRetry={marketsQuery.refresh}
      isEmpty={markets.length === 0}
      emptyMessage="No markets available for configuration."
    >
      <div className="risk-parameters-container">
        <h2>Risk Management Parameters</h2>

        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            style={{ background: '#10121a', border: '1px solid #29313D', padding: '6px 12px', borderRadius: '6px', color: '#EAECEF' }}
          >
            {markets.map((m) => (
              <option key={m.symbol} value={m.symbol}>
                {m.symbol}
              </option>
            ))}
          </select>
        </div>

        {market && (
          <div style={{ background: '#202630', padding: '20px', borderRadius: '8px', border: '1px solid #29313D', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#848E9C' }}>Price Band Limit (%)</label>
              <input
                type="number"
                value={priceBandPercent}
                onChange={(e) => setPriceBandPercent(Number(e.target.value))}
                style={{ width: '100%', background: '#10121a', border: '1px solid #29313D', padding: '8px 12px', borderRadius: '6px', color: '#EAECEF', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#848E9C' }}>Maker Fee Rate</label>
              <input
                type="text"
                value={makerFeeRate}
                onChange={(e) => setMakerFeeRate(e.target.value)}
                style={{ width: '100%', background: '#10121a', border: '1px solid #29313D', padding: '8px 12px', borderRadius: '6px', color: '#EAECEF', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#848E9C' }}>Taker Fee Rate</label>
              <input
                type="text"
                value={takerFeeRate}
                onChange={(e) => setTakerFeeRate(e.target.value)}
                style={{ width: '100%', background: '#10121a', border: '1px solid #29313D', padding: '8px 12px', borderRadius: '6px', color: '#EAECEF', marginTop: '4px' }}
              />
            </div>

            <button
              onClick={handleUpdate}
              style={{ background: '#2ebd85', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}
            >
              Save Risk Parameters
            </button>
          </div>
        )}
      </div>
    </AdminDataState>
  );
};