import React, { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';

interface OrderEntryFormProps {
  symbol: string;
  selectedPrice?: string;
  balances: any[];
  onOrderSubmitted: () => void;
  user: any;
  onOpenAuth: () => void;
}

export const OrderEntryForm: React.FC<OrderEntryFormProps> = ({
  symbol,
  selectedPrice,
  balances,
  onOrderSubmitted,
  user,
  onOpenAuth
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LIMIT'>('LIMIT');
  const [price, setPrice] = useState(selectedPrice || '94250.00');
  const [quantity, setQuantity] = useState('0.1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedPrice) {
      setPrice(selectedPrice);
    }
  }, [selectedPrice]);

  const [baseAsset, quoteAsset] = symbol.split('/');
  const baseBal = balances.find((b) => b.asset === baseAsset)?.available || '0';
  const quoteBal = balances.find((b) => b.asset === quoteAsset)?.available || '0';

  const notional = (parseFloat(price || '0') * parseFloat(quantity || '0')).toFixed(2);
  const feeRate = 0.0015; // 0.15% taker
  const estFee = (parseFloat(notional) * feeRate).toFixed(2);

  const handlePercentagePick = (pct: number) => {
    if (side === 'BUY') {
      const maxQuote = parseFloat(quoteBal);
      const availableBudget = maxQuote * (pct / 100);
      const p = parseFloat(price) || 1;
      setQuantity((availableBudget / p).toFixed(4));
    } else {
      const maxBase = parseFloat(baseBal);
      setQuantity((maxBase * (pct / 100)).toFixed(4));
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol,
          side,
          type: orderType,
          price: orderType === 'MARKET' ? undefined : price,
          quantity
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Order placement failed');
      }

      onOrderSubmitted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ height: '100%', padding: '16px', borderLeft: '1px solid var(--border-color)' }}>
      <div className="panel-header" style={{ padding: '0 0 12px 0', borderBottom: 'none' }}>
        <span>ORDER ENTRY</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: orderType === t ? 'var(--bg-card-subtle)' : 'transparent',
                color: orderType === t ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Buy / Sell Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <button
          className="btn"
          style={{
            background: side === 'BUY' ? 'var(--buy-green)' : 'var(--bg-card-subtle)',
            color: side === 'BUY' ? '#000' : 'var(--text-secondary)'
          }}
          onClick={() => setSide('BUY')}
        >
          Buy {baseAsset}
        </button>
        <button
          className="btn"
          style={{
            background: side === 'SELL' ? 'var(--sell-red)' : 'var(--bg-card-subtle)',
            color: side === 'SELL' ? '#fff' : 'var(--text-secondary)'
          }}
          onClick={() => setSide('SELL')}
        >
          Sell {baseAsset}
        </button>
      </div>

      <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orderType !== 'MARKET' && (
          <div className="input-group">
            <div className="input-label">
              <span>Price</span>
              <span className="mono">{quoteAsset}</span>
            </div>
            <input
              type="text"
              className="input-field"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        )}

        <div className="input-group">
          <div className="input-label">
            <span>Amount</span>
            <span className="mono">{baseAsset}</span>
          </div>
          <input
            type="text"
            className="input-field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Percentage Pickers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn btn-secondary mono"
              style={{ padding: '4px', fontSize: '11px' }}
              onClick={() => handlePercentagePick(pct)}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Balance & Fee Summaries */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '10px', borderRadius: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Avail {side === 'BUY' ? quoteAsset : baseAsset}:</span>
            <span className="mono" style={{ fontWeight: 600 }}>{side === 'BUY' ? quoteBal : baseBal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Order Value:</span>
            <span className="mono" style={{ fontWeight: 600 }}>${notional} {quoteAsset}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Est. Fee (0.15%):</span>
            <span className="mono">${estFee}</span>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--sell-red)', fontSize: '12px', background: 'var(--sell-red-bg)', padding: '8px', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
          style={{ width: '100%', marginTop: '8px', padding: '12px' }}
        >
          {loading ? 'Processing...' : user ? `${side === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}` : 'Sign In to Trade'}
        </button>
      </form>
    </div>
  );
};
