import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  BarChart2,
  Globe,
  Coins,
  DollarSign,
  Zap,
  TrendingUp
} from 'lucide-react';
import { TradingViewWidget, resolveTradingViewSymbol } from './TradingViewWidget';
import { TradingViewTechnicalAnalysis } from './TradingViewTechnicalAnalysis';
import { TradingViewSymbolProfile } from './TradingViewSymbolProfile';
import { TradingViewTimeline } from './TradingViewTimeline';
import { TradingViewFinancials } from './TradingViewFinancials';
import { Footer } from './Footer';

interface StockDetailViewProps {
  stockSymbol?: string;
  onNavigateToTrade?: (sym?: string) => void;
  onSelectStock?: (sym: string) => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  stockSymbol = 'BTC',
  onNavigateToTrade,
  onSelectStock
}) => {
  const [activeSymbol, setActiveSymbol] = useState<string>(stockSymbol || 'BTC');
  const [activeInterval, setActiveInterval] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W'>('15m');
  const [searchInput, setSearchInput] = useState<string>('');

  // Sync prop changes into local state
  useEffect(() => {
    if (stockSymbol && stockSymbol !== activeSymbol) {
      setActiveSymbol(stockSymbol);
    }
  }, [stockSymbol]);

  const handleSelectSymbol = (sym: string) => {
    if (!sym || !sym.trim()) return;
    const clean = sym.trim().toUpperCase().replace('/', '').replace('-', '');
    if (clean.includes('TV-WIDGET') || clean.includes('LOAD') || clean.includes('RESIZE') || clean.length > 25) {
      return;
    }
    setActiveSymbol(clean);
    setSearchInput('');
    if (onSelectStock) {
      onSelectStock(clean);
    }
    window.location.hash = `#/stock/${clean}`;
  };

  const currentSym = activeSymbol || 'BTC';
  const tvFormatted = resolveTradingViewSymbol(currentSym);

  const POPULAR_ASSETS = [
    { label: 'BTC/USDT', sym: 'BTC', type: 'Crypto' },
    { label: 'ETH/USDT', sym: 'ETH', type: 'Crypto' },
    { label: 'SOL/USDT', sym: 'SOL', type: 'Crypto' },
    { label: 'NVDA', sym: 'NVDA', type: 'Stock' },
    { label: 'AAPL', sym: 'AAPL', type: 'Stock' },
    { label: 'TSLA', sym: 'TSLA', type: 'Stock' },
    { label: 'GOLD (XAU)', sym: 'GOLD', type: 'Commodity' },
    { label: 'SILVER (XAG)', sym: 'SILVER', type: 'Commodity' },
    { label: 'OIL (WTI)', sym: 'OIL', type: 'Commodity' },
    { label: 'BRENT OIL', sym: 'BRENT', type: 'Commodity' },
    { label: 'NAT GAS', sym: 'NATGAS', type: 'Commodity' },
    { label: 'EUR/USD', sym: 'EURUSD', type: 'Forex' }
  ];

  return (
    <div className="stock-detailed-page" style={{ padding: '20px 24px', background: '#181A20', minHeight: 'calc(100vh - 64px)' }}>
      <div className="stock-detailed-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* UNIFIED SYMBOL & TIMEFRAME CONTROLLER BAR (Controls Chart + Technical Analysis Sync) */}
        <div style={{
          background: '#202630',
          borderRadius: '12px',
          border: '1px solid #29313D',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left: Quick Selector Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#848E9C', marginRight: '4px' }}>
              Market:
            </span>
            {POPULAR_ASSETS.map((asset) => {
              const isSelected = currentSym.toUpperCase().replace('/', '').replace('-', '') === asset.sym.toUpperCase();
              return (
                <button
                  key={asset.sym}
                  onClick={() => handleSelectSymbol(asset.sym)}
                  style={{
                    background: isSelected ? '#FCD535' : '#29313D',
                    color: isSelected ? '#181A20' : '#EAECEF',
                    border: isSelected ? '1px solid #FCD535' : '1px solid #333B47',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {asset.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search + Timeframe Interval */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Timeframe interval buttons */}
            <div style={{ display: 'flex', background: '#10121a', padding: '3px', borderRadius: '6px', border: '1px solid #29313D', gap: '2px' }}>
              {(['1m', '5m', '15m', '1h', '4h', '1D', '1W'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveInterval(tf)}
                  style={{
                    background: activeInterval === tf ? '#FCD535' : 'transparent',
                    color: activeInterval === tf ? '#181A20' : '#848E9C',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Instant Search input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) handleSelectSymbol(searchInput);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '9px', top: '8px', color: '#707A8A' }} />
                <input
                  type="text"
                  placeholder="Enter ticker (e.g. BTC, NVDA, GOLD)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    background: '#10121a',
                    border: '1px solid #333B47',
                    borderRadius: '6px',
                    padding: '5px 10px 5px 28px',
                    color: '#EAECEF',
                    fontSize: '12px',
                    width: '200px',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: '#29313D',
                  border: '1px solid #333B47',
                  borderRadius: '6px',
                  color: '#FCD535',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Go
              </button>
            </form>
          </div>
        </div>

        {/* TOP ROW: MAIN INTERACTIVE TRADINGVIEW CHART (Left) + TECHNICAL ANALYSIS GAUGE (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
          
          {/* Main Chart Card */}
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '16px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '620px', background: '#10121a', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewWidget
                key={`chart-${tvFormatted}-${activeInterval}`}
                symbol={tvFormatted}
                interval={activeInterval}
                theme="dark"
                autosize={true}
                allowSymbolChange={true}
                hideSideToolbar={false}
                withdateranges={true}
                onSymbolChange={handleSelectSymbol}
              />
            </div>
          </div>

          {/* Right Column: Live Technical Analysis Gauge (Fully Synced with Active Symbol & Interval) */}
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#EAECEF' }}>
                Technical Analysis: <span style={{ color: '#FCD535' }}>{currentSym.toUpperCase()}</span>
              </span>
              <span style={{ fontSize: '11px', background: '#29313D', color: '#2EBD85', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {activeInterval} Live Gauge
              </span>
            </div>

            <div style={{ width: '100%', height: '560px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewTechnicalAnalysis
                key={`gauge-${tvFormatted}-${activeInterval}`}
                symbol={tvFormatted}
                theme="dark"
                interval={activeInterval}
                height={560}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM 3-COLUMN ANALYSIS: Live Company/Asset Profile | Financial News Timeline | Financial Statement Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* Column 1: Live Profile */}
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#EAECEF', marginBottom: '14px' }}>
              Asset Profile: <span style={{ color: '#FCD535' }}>{currentSym.toUpperCase()}</span>
            </div>
            <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewSymbolProfile
                key={`profile-${tvFormatted}`}
                symbol={tvFormatted}
                theme="dark"
                height={420}
              />
            </div>
          </div>

          {/* Column 2: Live Market Timeline */}
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#EAECEF', marginBottom: '14px' }}>
              Real-Time Market Timeline
            </div>
            <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewTimeline
                theme="dark"
                height={420}
                feedMode="all_symbols"
              />
            </div>
          </div>

          {/* Column 3: Fundamentals & Financial Overview */}
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#EAECEF', marginBottom: '14px' }}>
              Financials &amp; Fundamentals: <span style={{ color: '#FCD535' }}>{currentSym.toUpperCase()}</span>
            </div>
            <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewFinancials
                key={`fin-${tvFormatted}`}
                symbol={tvFormatted}
                theme="dark"
                height={420}
              />
            </div>
          </div>
        </div>

      </div>
      <div style={{ marginTop: '40px' }}>
        <Footer onNavigateToTrade={onNavigateToTrade} />
      </div>
    </div>
  );
};
