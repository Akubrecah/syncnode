import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface TickerBarProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  ticker: any;
  markets: any[];
}

export const TickerBar: React.FC<TickerBarProps> = ({
  symbol,
  onSelectSymbol,
  ticker,
  markets
}) => {
  const isPositive = ticker?.priceChangePercent && !ticker.priceChangePercent.startsWith('-');

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-color)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <select
          value={symbol}
          onChange={(e) => onSelectSymbol(e.target.value)}
          className="mono"
          style={{
            background: 'var(--bg-card-subtle)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {markets.map((m) => (
            <option key={m.symbol} value={m.symbol}>
              {m.symbol}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: isPositive ? 'var(--buy-green)' : 'var(--sell-red)' }}>
            ${ticker ? Number(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '---'}
          </span>
          <span
            className="badge mono"
            style={{
              background: isPositive ? 'var(--buy-green-bg)' : 'var(--sell-red-bg)',
              color: isPositive ? 'var(--buy-green)' : 'var(--sell-red)'
            }}
          >
            {isPositive ? '+' : ''}{ticker?.priceChangePercent || '0.00%'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>24h High</div>
            <div className="mono" style={{ fontWeight: 600 }}>${ticker ? Number(ticker.high24h).toLocaleString() : '---'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>24h Low</div>
            <div className="mono" style={{ fontWeight: 600 }}>${ticker ? Number(ticker.low24h).toLocaleString() : '---'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>24h Volume (Base)</div>
            <div className="mono" style={{ fontWeight: 600 }}>{ticker ? Number(ticker.volume24h).toLocaleString() : '---'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>24h Volume (Quote)</div>
            <div className="mono" style={{ fontWeight: 600 }}>${ticker ? Number(ticker.quoteVolume24h).toLocaleString() : '---'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Spread:</span>
        <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
          {ticker?.spread ? `$${Number(ticker.spread).toFixed(2)}` : '---'}
        </span>
      </div>
    </div>
  );
};
