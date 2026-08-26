import React from 'react';

interface RecentTradesProps {
  trades: any[];
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ trades }) => {
  return (
    <div className="panel" style={{ height: '100%', borderLeft: '1px solid var(--border-color)' }}>
      <div className="panel-header">
        <span>MARKET TRADES</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time Feed</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        <span>Price (USDT)</span>
        <span>Size</span>
        <span>Time</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {trades.map((t) => {
          const isBuy = t.makerSide === 'SELL'; // Taker is BUY
          const date = new Date(t.timestamp);
          const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

          return (
            <div
              key={t.id}
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 12px',
                fontSize: '12px'
              }}
            >
              <span style={{ color: isBuy ? 'var(--buy-green)' : 'var(--sell-red)', fontWeight: 600 }}>
                {Number(t.price).toFixed(2)}
              </span>
              <span>{Number(t.quantity).toFixed(4)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
