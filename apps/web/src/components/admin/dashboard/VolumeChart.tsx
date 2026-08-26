import React from 'react';
import { AdminMarket } from '../../../types/admin';

/**
 * 24h volume per market rendered as horizontal bars. All figures come from the
 * backend's authoritative /admin/markets statistics - nothing is fabricated.
 */
export const VolumeChart: React.FC<{ markets: AdminMarket[] }> = ({ markets }) => {
  const withVolume = markets.filter((m) => parseFloat(m.stats.volume24h) > 0);
  if (withVolume.length === 0) {
    return <p className="admin-muted">No executed trade volume in the last 24 hours.</p>;
  }
  const maxVol = Math.max(...withVolume.map((m) => parseFloat(m.stats.volume24h)));

  return (
    <div className="admin-volume-chart" role="img" aria-label="24 hour traded volume by market">
      {withVolume.map((m) => {
        const vol = parseFloat(m.stats.volume24h);
        const pct = Math.max(2, (vol / maxVol) * 100);
        return (
          <div key={m.symbol} className="admin-volume-row">
            <span className="admin-volume-symbol">{m.symbol}</span>
            <div className="admin-volume-bar-track">
              <div className="admin-volume-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="admin-volume-value">{vol.toLocaleString('en-US', { maximumFractionDigits: 4 })} {m.baseAsset}</span>
          </div>
        );
      })}
    </div>
  );
};
