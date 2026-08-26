import React from 'react';

interface OrderBookProps {
  depth: { bids: [string, string][]; asks: [string, string][] };
  onSelectPrice: (price: string) => void;
  lastPrice?: string;
  spread?: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  depth,
  onSelectPrice,
  lastPrice,
  spread
}) => {
  const bids = depth?.bids || [];
  const asks = depth?.asks || [];

  // Calculate cumulative max quantity for visual depth bar scaling
  let maxCumulative = 0;
  const asksWithTotal: Array<{ price: string; qty: string; total: number }> = [];
  let askSum = 0;
  for (const [price, qty] of asks.slice(0, 12).reverse()) {
    askSum += parseFloat(qty);
    asksWithTotal.unshift({ price, qty, total: askSum });
    if (askSum > maxCumulative) maxCumulative = askSum;
  }

  const bidsWithTotal: Array<{ price: string; qty: string; total: number }> = [];
  let bidSum = 0;
  for (const [price, qty] of bids.slice(0, 12)) {
    bidSum += parseFloat(qty);
    bidsWithTotal.push({ price, qty, total: bidSum });
    if (bidSum > maxCumulative) maxCumulative = bidSum;
  }

  return (
    <div className="panel" style={{ height: '100%', borderRight: '1px solid var(--border-color)' }}>
      <div className="panel-header">
        <span>ORDER BOOK</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>L2 Real-time</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        <span>Price (USDT)</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Asks (Sells) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflowY: 'auto' }}>
        {asksWithTotal.map(({ price, qty, total }) => {
          const depthPercent = maxCumulative ? (total / maxCumulative) * 100 : 0;
          return (
            <div
              key={`ask_${price}`}
              className="orderbook-row mono"
              onClick={() => onSelectPrice(price)}
            >
              <div
                className="depth-bar ask"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-sell" style={{ fontWeight: 600 }}>{Number(price).toFixed(2)}</span>
              <span>{Number(qty).toFixed(4)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{total.toFixed(4)}</span>
            </div>
          );
        })}
      </div>

      {/* Middle Spread & Last Price Bar */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-card-subtle)',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span className="mono" style={{ fontSize: '15px', fontWeight: 800 }}>
          ${lastPrice ? Number(lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '---'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Spread: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>${spread ? Number(spread).toFixed(2) : '0.00'}</span>
        </span>
      </div>

      {/* Bids (Buys) */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {bidsWithTotal.map(({ price, qty, total }) => {
          const depthPercent = maxCumulative ? (total / maxCumulative) * 100 : 0;
          return (
            <div
              key={`bid_${price}`}
              className="orderbook-row mono"
              onClick={() => onSelectPrice(price)}
            >
              <div
                className="depth-bar bid"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-buy" style={{ fontWeight: 600 }}>{Number(price).toFixed(2)}</span>
              <span>{Number(qty).toFixed(4)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{total.toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
