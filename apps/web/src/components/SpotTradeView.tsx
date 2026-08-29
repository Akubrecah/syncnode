import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, ChevronDown, Clock, Search,
  SlidersHorizontal, Check, AlertCircle, RefreshCw, Layers, ShieldCheck,
  Maximize2, BarChart2, Radio, HelpCircle, FileText, ChevronRight, X
} from 'lucide-react';
import { TradingChart } from './TradingChart';

interface SpotTradeViewProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  ticker: any;
  markets: any[];
  depth: { bids: [string, string][]; asks: [string, string][] };
  trades: any[];
  balances: any[];
  userOrders: any[];
  userTrades: any[];
  onOrderSubmitted: () => void;
  user: any;
  onOpenAuth: () => void;
}

export const SpotTradeView: React.FC<SpotTradeViewProps> = ({
  symbol,
  onSelectSymbol,
  ticker,
  markets,
  depth,
  trades,
  balances,
  userOrders,
  userTrades,
  onOrderSubmitted,
  user,
  onOpenAuth
}) => {
  const [baseAsset, quoteAsset] = symbol.includes('/') ? symbol.split('/') : ['BTC', 'USDT'];
  const [tradeTab, setTradeTab] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LIMIT'>('LIMIT');
  const [price, setPrice] = useState(ticker?.lastPrice ? String(ticker.lastPrice) : '95450.00');
  const [quantity, setQuantity] = useState('0.05');
  const [stopPrice, setStopPrice] = useState('94000.00');
  const [percentSlider, setPercentSlider] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Right sidebar tab
  const [rightPanelTab, setRightPanelTab] = useState<'MARKET_TRADES' | 'MY_TRADES'>('MARKET_TRADES');

  // Bottom table tab
  const [bottomTab, setBottomTab] = useState<'OPEN_ORDERS' | 'ORDER_HISTORY' | 'TRADE_HISTORY' | 'FUNDS'>('OPEN_ORDERS');

  // Mobile Trading Sub-Navigation Tab
  const [mobileTradeTab, setMobileTradeTab] = useState<'trade' | 'chart' | 'orderbook' | 'trades'>('trade');

  // Timeframe
  const [timeframe, setTimeframe] = useState<'1m' | '15m' | '1h' | '4h' | '1D' | '1W'>('15m');

  // Selected Orderbook row price
  const handleSelectPrice = (p: string) => {
    setPrice(p);
  };

  useEffect(() => {
    if (ticker?.lastPrice && (!price || price === '95450.00')) {
      setPrice(String(ticker.lastPrice));
    }
  }, [ticker?.lastPrice]);

  const baseBal = useMemo(() => {
    const found = balances.find((b: any) => b.asset === baseAsset);
    return found ? parseFloat(found.available || '0') : 0;
  }, [balances, baseAsset]);

  const quoteBal = useMemo(() => {
    const found = balances.find((b: any) => b.asset === quoteAsset);
    return found ? parseFloat(found.available || '0') : 0;
  }, [balances, quoteAsset]);

  const isPositive = ticker?.priceChangePercent && !ticker.priceChangePercent.startsWith('-');

  const notionalTotal = useMemo(() => {
    const p = parseFloat(price) || 0;
    const q = parseFloat(quantity) || 0;
    return (p * q).toFixed(2);
  }, [price, quantity]);

  const handlePercentagePick = (pct: number) => {
    setPercentSlider(pct);
    if (tradeTab === 'BUY') {
      const budget = quoteBal * (pct / 100);
      const p = parseFloat(price) || 1;
      setQuantity((budget / p).toFixed(5));
    } else {
      const maxBase = baseBal * (pct / 100);
      setQuantity(maxBase.toFixed(5));
    }
  };

  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setOrderError(null);
    setOrderSuccess(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          market: symbol,
          side: tradeTab,
          type: orderType,
          price: orderType === 'MARKET' ? String(ticker?.lastPrice || price) : price,
          quantity: quantity.trim()
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Order placement failed');
      }

      setOrderSuccess(`${tradeTab} order executed successfully!`);
      onOrderSubmitted();
      setTimeout(() => setOrderSuccess(null), 3000);
    } catch (err: any) {
      setOrderError(err.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      await fetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onOrderSubmitted();
    } catch (err) {
      console.error(err);
    }
  };

  // Order Book depth calculations
  const maxAskTotal = useMemo(() => {
    const asks = (depth.asks || []).slice(0, 14);
    return asks.reduce((acc, [, q]) => acc + parseFloat(q), 0) || 1;
  }, [depth.asks]);

  const maxBidTotal = useMemo(() => {
    const bids = (depth.bids || []).slice(0, 14);
    return bids.reduce((acc, [, q]) => acc + parseFloat(q), 0) || 1;
  }, [depth.bids]);

  return (
    <div className="spot-trade-layout" style={{ background: '#0b0e11', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', color: '#eaecef', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. TOP 24H TICKER & PAIR HEADER */}
      <div className="spot-ticker-header" style={{
        background: '#181a20',
        borderBottom: '1px solid #2b313a',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div className="spot-ticker-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Symbol Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={symbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="spot-symbol-select"
              style={{
                background: '#202630',
                color: '#eaecef',
                border: '1px solid #2b313a',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            >
              {markets.map((m) => (
                <option key={m.symbol} value={m.symbol}>
                  {m.symbol} Spot
                </option>
              ))}
            </select>
          </div>

          {/* Last Price & Change */}
          <div className="spot-price-block" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 900,
              color: isPositive ? '#0ecb81' : '#f6465d',
              fontFamily: 'monospace'
            }}>
              ${ticker?.lastPrice ? parseFloat(ticker.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '95,450.00'}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isPositive ? '#0ecb81' : '#f6465d',
              background: isPositive ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {isPositive ? '+' : ''}{ticker?.priceChangePercent || '0.00%'}
            </span>
          </div>

          {/* 24h Stats */}
          <div className="spot-stats-row" style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            <div>
              <div style={{ color: '#848e9c', fontSize: '10px' }}>24h High</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#eaecef' }}>
                ${ticker?.high24h ? parseFloat(ticker.high24h).toLocaleString() : '96,200.00'}
              </div>
            </div>
            <div>
              <div style={{ color: '#848e9c', fontSize: '10px' }}>24h Low</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#eaecef' }}>
                ${ticker?.low24h ? parseFloat(ticker.low24h).toLocaleString() : '93,800.00'}
              </div>
            </div>
            <div className="desktop-only">
              <div style={{ color: '#848e9c', fontSize: '10px' }}>24h Vol ({baseAsset})</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#eaecef' }}>
                {ticker?.volume24h ? parseFloat(ticker.volume24h).toLocaleString() : '24,180.45'}
              </div>
            </div>
            <div className="desktop-only">
              <div style={{ color: '#848e9c', fontSize: '10px' }}>24h Turnover ({quoteAsset})</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#eaecef' }}>
                ${ticker?.quoteVolume24h ? parseFloat(ticker.quoteVolume24h).toLocaleString() : '2,308,450,120.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Right tags */}
        <div className="spot-header-tags desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: '#848e9c' }}>Spread:</span>
          <span style={{ color: '#0ecb81', fontWeight: 700, fontFamily: 'monospace' }}>
            {ticker?.spread ? `$${parseFloat(ticker.spread).toFixed(2)}` : '$0.50'}
          </span>
          <span style={{ background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
            0.1% Fee
          </span>
        </div>
      </div>

      {/* MOBILE SUB-NAVIGATION BAR (SWITCHER) */}
      <div className="spot-mobile-nav-bar">
        <button
          type="button"
          className={`spot-mobile-nav-tab ${mobileTradeTab === 'trade' ? 'active' : ''}`}
          onClick={() => setMobileTradeTab('trade')}
        >
          ⚡ Trade Form
        </button>
        <button
          type="button"
          className={`spot-mobile-nav-tab ${mobileTradeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setMobileTradeTab('chart')}
        >
          📈 Live Chart
        </button>
        <button
          type="button"
          className={`spot-mobile-nav-tab ${mobileTradeTab === 'orderbook' ? 'active' : ''}`}
          onClick={() => setMobileTradeTab('orderbook')}
        >
          📖 Order Book
        </button>
        <button
          type="button"
          className={`spot-mobile-nav-tab ${mobileTradeTab === 'trades' ? 'active' : ''}`}
          onClick={() => setMobileTradeTab('trades')}
        >
          🕒 Market Trades
        </button>
      </div>

      {/* 2. MAIN 4-COLUMN TRADING GRID */}
      <div className="spot-terminal-grid" style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 340px 280px',
        flex: 1,
        minHeight: '620px',
        borderBottom: '1px solid #2b313a'
      }}>
        
        {/* COLUMN 1: ORDER BOOK */}
        <div className={`spot-col-orderbook ${mobileTradeTab === 'orderbook' ? 'mobile-active' : ''}`} style={{ background: '#181a20', borderRight: '1px solid #2b313a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2b313a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>Order Book</span>
            <div style={{ fontSize: '11px', color: '#848e9c' }}>0.01 Precision</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', fontSize: '11px', color: '#848e9c', borderBottom: '1px solid rgba(43, 49, 58, 0.5)' }}>
            <span>Price ({quoteAsset})</span>
            <span>Size ({baseAsset})</span>
            <span>Total</span>
          </div>

          {/* Asks (Sell Orders - Red, Top-down) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
            {(depth.asks || []).slice(0, 11).map(([p, q], i) => {
              const depthPct = Math.min(100, (parseFloat(q) / maxAskTotal) * 100 * 2.5);
              return (
                <div
                  key={`ask_${i}`}
                  onClick={() => handleSelectPrice(p)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 14px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  className="orderbook-row"
                >
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(246, 70, 93, 0.12)', zIndex: 0 }} />
                  <span style={{ color: '#f6465d', fontWeight: 700, zIndex: 1 }}>{parseFloat(p).toFixed(2)}</span>
                  <span style={{ color: '#eaecef', zIndex: 1 }}>{parseFloat(q).toFixed(4)}</span>
                  <span style={{ color: '#848e9c', zIndex: 1 }}>{(parseFloat(p) * parseFloat(q)).toFixed(1)}</span>
                </div>
              );
            })}
          </div>

          {/* Mid Market Price Badge */}
          <div style={{ padding: '8px 14px', background: '#202630', borderTop: '1px solid #2b313a', borderBottom: '1px solid #2b313a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: isPositive ? '#0ecb81' : '#f6465d', fontFamily: 'monospace' }}>
              ${ticker?.lastPrice ? parseFloat(ticker.lastPrice).toFixed(2) : '95,450.00'}
            </span>
            <span style={{ fontSize: '11px', color: '#848e9c' }}>Index $95,448.20</span>
          </div>

          {/* Bids (Buy Orders - Green) */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(depth.bids || []).slice(0, 11).map(([p, q], i) => {
              const depthPct = Math.min(100, (parseFloat(q) / maxBidTotal) * 100 * 2.5);
              return (
                <div
                  key={`bid_${i}`}
                  onClick={() => handleSelectPrice(p)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 14px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  className="orderbook-row"
                >
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: 'rgba(14, 203, 129, 0.12)', zIndex: 0 }} />
                  <span style={{ color: '#0ecb81', fontWeight: 700, zIndex: 1 }}>{parseFloat(p).toFixed(2)}</span>
                  <span style={{ color: '#eaecef', zIndex: 1 }}>{parseFloat(q).toFixed(4)}</span>
                  <span style={{ color: '#848e9c', zIndex: 1 }}>{(parseFloat(p) * parseFloat(q)).toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CANDLESTICK CHART */}
        <div className={`spot-col-chart ${mobileTradeTab === 'chart' ? 'mobile-active' : ''}`} style={{ background: '#12161c', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2b313a' }}>
          {/* Chart Header Tools */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #2b313a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#181a20' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['1m', '15m', '1h', '4h', '1D', '1W'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    background: timeframe === tf ? '#29313d' : 'transparent',
                    color: timeframe === tf ? '#fcd535' : '#848e9c',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#848e9c' }}>
              <span>TradingView Pro</span>
              <span>Indicators</span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '450px' }}>
            <TradingChart symbol={symbol} />
          </div>
        </div>

        {/* COLUMN 3: SPOT ORDER ENTRY FORM */}
        <div className={`spot-col-tradeform ${mobileTradeTab === 'trade' ? 'mobile-active' : ''}`} style={{ background: '#181a20', borderRight: '1px solid #2b313a', display: 'flex', flexDirection: 'column', padding: '16px' }}>
          {/* Buy / Sell Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setTradeTab('BUY')}
              style={{
                background: tradeTab === 'BUY' ? '#0ecb81' : '#202630',
                color: tradeTab === 'BUY' ? '#ffffff' : '#848e9c',
                fontWeight: 800,
                fontSize: '14px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Buy {baseAsset}
            </button>
            <button
              type="button"
              onClick={() => setTradeTab('SELL')}
              style={{
                background: tradeTab === 'SELL' ? '#f6465d' : '#202630',
                color: tradeTab === 'SELL' ? '#ffffff' : '#848e9c',
                fontWeight: 800,
                fontSize: '14px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Sell {baseAsset}
            </button>
          </div>

          {/* Order Type Tabs */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #2b313a', paddingBottom: '10px', marginBottom: '14px', fontSize: '13px' }}>
            {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: orderType === t ? '#fcd535' : '#848e9c',
                  fontWeight: orderType === t ? 700 : 500,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Available Balances */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px', color: '#848e9c' }}>
            <span>Available:</span>
            <span style={{ fontWeight: 700, color: '#eaecef', fontFamily: 'monospace' }}>
              {tradeTab === 'BUY' ? `${quoteBal.toFixed(2)} ${quoteAsset}` : `${baseBal.toFixed(4)} ${baseAsset}`}
            </span>
          </div>

          {orderError && (
            <div style={{ background: 'rgba(246, 70, 93, 0.15)', border: '1px solid #f6465d', borderRadius: '6px', padding: '8px 12px', color: '#f6465d', fontSize: '12px', marginBottom: '12px' }}>
              {orderError}
            </div>
          )}

          {orderSuccess && (
            <div style={{ background: 'rgba(14, 203, 129, 0.15)', border: '1px solid #0ecb81', borderRadius: '6px', padding: '8px 12px', color: '#0ecb81', fontSize: '12px', marginBottom: '12px' }}>
              {orderSuccess}
            </div>
          )}

          <form onSubmit={handleExecuteOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Price Input (if not Market) */}
            {orderType !== 'MARKET' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#848e9c', marginBottom: '4px' }}>Price</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#202630',
                      border: '1px solid #2b313a',
                      borderRadius: '8px',
                      padding: '10px 50px 10px 12px',
                      color: '#eaecef',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#848e9c', fontSize: '12px', fontWeight: 700 }}>
                    {quoteAsset}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#848e9c', marginBottom: '4px' }}>Amount</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#202630',
                    border: '1px solid #2b313a',
                    borderRadius: '8px',
                    padding: '10px 50px 10px 12px',
                    color: '#eaecef',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#848e9c', fontSize: '12px', fontWeight: 700 }}>
                  {baseAsset}
                </span>
              </div>
            </div>

            {/* Percentage Pills (25%, 50%, 75%, 100%) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentagePick(pct)}
                  style={{
                    background: percentSlider === pct ? '#29313d' : '#202630',
                    color: percentSlider === pct ? '#fcd535' : '#848e9c',
                    border: '1px solid #2b313a',
                    borderRadius: '4px',
                    padding: '4px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Order Value Total */}
            <div style={{ background: '#202630', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', border: '1px solid #2b313a' }}>
              <span style={{ color: '#848e9c' }}>Total Value:</span>
              <span style={{ fontWeight: 800, color: '#eaecef', fontFamily: 'monospace' }}>
                ${notionalTotal} {quoteAsset}
              </span>
            </div>

            {/* Submit Button */}
            {!user ? (
              <button
                type="button"
                onClick={onOpenAuth}
                style={{
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Log In / Register to Trade
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: tradeTab === 'BUY' ? '#0ecb81' : '#f6465d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '4px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Executing...' : `${tradeTab} ${baseAsset}`}
              </button>
            )}
          </form>
        </div>

        {/* COLUMN 4: MARKET TRADES & MY TRADES */}
        <div className={`spot-col-trades ${mobileTradeTab === 'trades' ? 'mobile-active' : ''}`} style={{ background: '#181a20', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2b313a', display: 'flex', gap: '14px' }}>
            <button
              onClick={() => setRightPanelTab('MARKET_TRADES')}
              style={{
                background: 'transparent',
                border: 'none',
                color: rightPanelTab === 'MARKET_TRADES' ? '#fcd535' : '#848e9c',
                fontWeight: rightPanelTab === 'MARKET_TRADES' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Market Trades
            </button>
            <button
              onClick={() => setRightPanelTab('MY_TRADES')}
              style={{
                background: 'transparent',
                border: 'none',
                color: rightPanelTab === 'MY_TRADES' ? '#fcd535' : '#848e9c',
                fontWeight: rightPanelTab === 'MY_TRADES' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              My Trades
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', fontSize: '11px', color: '#848e9c', borderBottom: '1px solid rgba(43, 49, 58, 0.5)' }}>
            <span>Price ({quoteAsset})</span>
            <span>Amount ({baseAsset})</span>
            <span>Time</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightPanelTab === 'MARKET_TRADES' ? (
              (trades || []).slice(0, 30).map((t, i) => (
                <div
                  key={t.id || i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 14px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                >
                  <span style={{ color: t.taker_side === 'BUY' || t.side === 'BUY' ? '#0ecb81' : '#f6465d', fontWeight: 700 }}>
                    {parseFloat(t.price || '0').toFixed(2)}
                  </span>
                  <span style={{ color: '#eaecef' }}>{parseFloat(t.quantity || t.qty || '0').toFixed(4)}</span>
                  <span style={{ color: '#848e9c', fontSize: '11px' }}>
                    {new Date(t.created_at || t.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : !user ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ color: '#848e9c', fontSize: '12px', marginBottom: '12px' }}>
                  Log in to view your execution trade history.
                </div>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  style={{
                    background: '#fcd535',
                    color: '#181a20',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Log In
                </button>
              </div>
            ) : (
              (userTrades || []).length > 0 ? (
                userTrades.slice(0, 30).map((ut, i) => (
                  <div
                    key={ut.id || i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '3px 14px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: ut.side === 'BUY' ? '#0ecb81' : '#f6465d', fontWeight: 700 }}>
                      {parseFloat(ut.price || '0').toFixed(2)}
                    </span>
                    <span style={{ color: '#eaecef' }}>{parseFloat(ut.quantity || '0').toFixed(4)}</span>
                    <span style={{ color: '#848e9c', fontSize: '11px' }}>
                      {new Date(ut.created_at || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '30px 14px', textAlign: 'center', color: '#848e9c', fontSize: '12px' }}>
                  No trade executions found.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ORDERS & POSITIONS LEDGER */}
      <div id="basictable" style={{ background: '#181a20', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #2b313a', display: 'flex', gap: '20px', fontSize: '13px' }}>
          <button
            onClick={() => setBottomTab('OPEN_ORDERS')}
            style={{
              background: 'transparent',
              border: 'none',
              color: bottomTab === 'OPEN_ORDERS' ? '#fcd535' : '#848e9c',
              fontWeight: bottomTab === 'OPEN_ORDERS' ? 700 : 500,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Open Orders ({(userOrders || []).filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED').length})
          </button>
          <button
            onClick={() => setBottomTab('ORDER_HISTORY')}
            style={{
              background: 'transparent',
              border: 'none',
              color: bottomTab === 'ORDER_HISTORY' ? '#fcd535' : '#848e9c',
              fontWeight: bottomTab === 'ORDER_HISTORY' ? 700 : 500,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Order History
          </button>
          <button
            onClick={() => setBottomTab('TRADE_HISTORY')}
            style={{
              background: 'transparent',
              border: 'none',
              color: bottomTab === 'TRADE_HISTORY' ? '#fcd535' : '#848e9c',
              fontWeight: bottomTab === 'TRADE_HISTORY' ? 700 : 500,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Trade History
          </button>
          <button
            onClick={() => setBottomTab('FUNDS')}
            style={{
              background: 'transparent',
              border: 'none',
              color: bottomTab === 'FUNDS' ? '#fcd535' : '#848e9c',
              fontWeight: bottomTab === 'FUNDS' ? 700 : 500,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Assets
          </button>
        </div>

        <div style={{ flex: 1, padding: '12px 20px', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!user ? (
            <div style={{ flex: 1, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', marginBottom: '6px' }}>
                Log in to view your orders and portfolio
              </div>
              <div style={{ fontSize: '13px', color: '#848e9c', marginBottom: '18px', maxWidth: '420px' }}>
                Access real-time position updates, spot execution orders, order history, and asset balances.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onOpenAuth}
                  style={{
                    background: '#fcd535',
                    color: '#181a20',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Log In
                </button>
                <button
                  onClick={onOpenAuth}
                  style={{
                    background: '#202630',
                    color: '#eaecef',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    border: '1px solid #2b313a',
                    cursor: 'pointer'
                  }}
                >
                  Register Now
                </button>
              </div>
            </div>
          ) : bottomTab === 'OPEN_ORDERS' ? (
            <div className="bn-table-wrapper">
              <table className="bn-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Filled</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(userOrders || [])
                    .filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED')
                    .map((o) => (
                      <tr key={o.id}>
                        <td className="admin-muted-cell">{new Date(o.created_at).toLocaleString()}</td>
                        <td><strong>{o.market}</strong></td>
                        <td>{o.type}</td>
                        <td style={{ color: o.side === 'BUY' ? '#0ecb81' : '#f6465d', fontWeight: 700 }}>{o.side}</td>
                        <td className="mono">${parseFloat(o.price).toFixed(2)}</td>
                        <td className="mono">{o.quantity}</td>
                        <td className="mono">{o.filled_quantity || '0.00'}</td>
                        <td className="mono">${(parseFloat(o.price) * parseFloat(o.quantity)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleCancelOrder(o.id)}
                            style={{ background: 'transparent', border: '1px solid #f6465d', color: '#f6465d', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  {(userOrders || []).filter((o) => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED').length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#848e9c' }}>
                        No open orders on {symbol}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : bottomTab === 'ORDER_HISTORY' ? (
            <div className="bn-table-wrapper">
              <table className="bn-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(userOrders || []).map((o) => (
                    <tr key={o.id}>
                      <td className="admin-muted-cell">{new Date(o.created_at).toLocaleString()}</td>
                      <td><strong>{o.market}</strong></td>
                      <td>{o.type}</td>
                      <td style={{ color: o.side === 'BUY' ? '#0ecb81' : '#f6465d', fontWeight: 700 }}>{o.side}</td>
                      <td className="mono">${parseFloat(o.price).toFixed(2)}</td>
                      <td className="mono">{o.quantity}</td>
                      <td>
                        <span className={`admin-status-pill ${o.status === 'FILLED' ? 'healthy' : o.status === 'CANCELLED' ? 'critical' : 'warning'}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : bottomTab === 'TRADE_HISTORY' ? (
            <div className="bn-table-wrapper">
              <table className="bn-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Side</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(userTrades || []).map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td className="admin-muted-cell">{new Date(t.created_at || Date.now()).toLocaleString()}</td>
                      <td><strong>{symbol}</strong></td>
                      <td style={{ color: t.side === 'BUY' ? '#0ecb81' : '#f6465d', fontWeight: 700 }}>{t.side}</td>
                      <td className="mono">${parseFloat(t.price || '0').toFixed(2)}</td>
                      <td className="mono">{t.quantity || t.qty}</td>
                      <td className="mono">${(parseFloat(t.price || '0') * parseFloat(t.quantity || t.qty || '0')).toFixed(2)}</td>
                    </tr>
                  ))}
                  {(userTrades || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#848e9c' }}>
                        No trade history records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {(balances || []).map((b: any) => (
                <div key={b.asset} style={{ background: '#202630', padding: '12px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                  <div style={{ fontSize: '11px', color: '#848e9c' }}>{b.asset} Balance</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#eaecef', fontFamily: 'monospace', marginTop: '4px' }}>
                    {parseFloat(b.available || '0').toFixed(4)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>
                    Locked: {parseFloat(b.locked || '0').toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. FIXED BOTTOM STATUS FOOTER BAR */}
      <div className="spot-bottom-status-bar" style={{
        background: '#12161c',
        borderTop: '1px solid #2b313a',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#848e9c',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0ecb81' }} />
            <span style={{ color: '#0ecb81', fontWeight: 600 }}>Operational (24ms)</span>
          </div>
          <span className="desktop-only">Announcements: CryptoBridge Institutional Staking &amp; Yield Pools Live</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ cursor: 'pointer' }} className="desktop-only">Cookie Preferences</span>
          <span style={{ cursor: 'pointer' }}>Online Support</span>
        </div>
      </div>
    </div>
  );
};
