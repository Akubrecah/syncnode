import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  DollarSign,
  CreditCard,
  Building2,
  Users,
  Coins,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Flame,
  Star,
  RefreshCw,
  Search,
  Send,
  Newspaper,
  Sliders
} from 'lucide-react';
import { TradingViewTickerTape } from './TradingViewTickerTape';
import { TradingViewMarketOverview } from './TradingViewMarketOverview';
import { TradingViewMiniChart } from './TradingViewMiniChart';
import { Footer } from './Footer';

interface HomeViewProps {
  markets: any[];
  onSelectSymbol: (sym: string) => void;
  onNavigateToTrade: (sym?: string) => void;
  onNavigateToP2P: () => void;
  onOpenAuth: () => void;
  user: any;
}

export const HomeView: React.FC<HomeViewProps> = ({
  markets,
  onSelectSymbol,
  onNavigateToTrade,
  onNavigateToP2P,
  onOpenAuth,
  user
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [activeMarketTab, setActiveMarketTab] = useState<'hot' | 'gainers' | 'new' | 'volume' | 'tradingview'>('hot');
  const [convertAmount, setConvertAmount] = useState('1000');
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('BTC');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number; isPositive: boolean; vol: string }>>({});

  // Continuously fetch live quotes from Binance Public API
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: Record<string, { price: number; change: number; isPositive: boolean; vol: string }> = {};
          data.forEach((item: any) => {
            if (item.symbol && (item.symbol.endsWith('USDT') || item.symbol.endsWith('FDUSD'))) {
              const base = item.symbol.replace('USDT', '').replace('FDUSD', '');
              const numPrice = parseFloat(item.lastPrice) || 0;
              const numChg = parseFloat(item.priceChangePercent) || 0;
              const quoteVol = parseFloat(item.quoteVolume) || 0;
              map[base] = {
                price: numPrice,
                change: numChg,
                isPositive: numChg >= 0,
                vol: quoteVol > 1e9 ? `$${(quoteVol / 1e9).toFixed(2)}B` : `$${(quoteVol / 1e6).toFixed(1)}M`
              };
            }
          });
          // Ensure standard stablecoin quotes
          map['USDT'] = { price: 1.00, change: 0.01, isPositive: true, vol: '$45.2B' };
          map['USDC'] = { price: 1.00, change: 0.00, isPositive: true, vol: '$8.4B' };
          map['FDUSD'] = { price: 1.00, change: 0.01, isPositive: true, vol: '$4.1B' };
          setLivePrices(map);
        }
      } catch (e) {
        console.warn('Live ticker polling fallback:', e);
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 3000);
    return () => clearInterval(interval);
  }, []);

  // Base assets data
  const baseCoins = [
    { id: 'BTC', name: 'Bitcoin', symbol: 'BTC/USDT', defaultPrice: 96450.20, defaultChange: 2.85, defaultVol: '$42.8B', marketCap: '$1.91T', logo: '₿', color: '#f7931a' },
    { id: 'ETH', name: 'Ethereum', symbol: 'ETH/USDT', defaultPrice: 2785.40, defaultChange: 3.42, defaultVol: '$19.4B', marketCap: '$335.2B', logo: 'Ξ', color: '#627eea' },
    { id: 'SOL', name: 'Solana', symbol: 'SOL/USDT', defaultPrice: 188.75, defaultChange: 6.14, defaultVol: '$8.6B', marketCap: '$88.4B', logo: '◎', color: '#14f195' },
    { id: 'BNB', name: 'BNB', symbol: 'BNB/USDT', defaultPrice: 624.10, defaultChange: 1.75, defaultVol: '$2.1B', marketCap: '$93.8B', logo: 'BNB', color: '#f3ba2f' },
    { id: 'XRP', name: 'Ripple', symbol: 'XRP/USDT', defaultPrice: 2.34, defaultChange: -0.85, defaultVol: '$5.4B', marketCap: '$134.1B', logo: '✕', color: '#23292f' },
    { id: 'DOGE', name: 'Dogecoin', symbol: 'DOGE/USDT', defaultPrice: 0.285, defaultChange: 12.40, defaultVol: '$4.7B', marketCap: '$41.8B', logo: 'Ð', color: '#c2a633' },
    { id: 'ADA', name: 'Cardano', symbol: 'ADA/USDT', defaultPrice: 0.82, defaultChange: 4.15, defaultVol: '$1.8B', marketCap: '$29.4B', logo: '₳', color: '#0033ad' },
    { id: 'AVAX', name: 'Avalanche', symbol: 'AVAX/USDT', defaultPrice: 34.60, defaultChange: 5.80, defaultVol: '$1.4B', marketCap: '$14.2B', logo: 'AVAX', color: '#e84142' },
    { id: 'SUI', name: 'Sui', symbol: 'SUI/USDT', defaultPrice: 3.45, defaultChange: 8.90, defaultVol: '$2.3B', marketCap: '$9.8B', logo: 'SUI', color: '#4da2ff' },
    { id: 'NEAR', name: 'NEAR Protocol', symbol: 'NEAR/USDT', defaultPrice: 6.80, defaultChange: 7.25, defaultVol: '$980M', marketCap: '$8.1B', logo: 'Ⓝ', color: '#000000' }
  ];

  const liveMarketData = baseCoins.map((coin) => {
    const live = livePrices[coin.id];
    const price = live ? live.price : coin.defaultPrice;
    const change = live ? live.change : coin.defaultChange;
    const isPositive = change >= 0;
    const volume24h = live ? live.vol : coin.defaultVol;
    const formattedPrice = price >= 10
      ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toFixed(4)}`;
    return {
      ...coin,
      priceNum: price,
      price: formattedPrice,
      changeNum: change,
      change24h: `${isPositive ? '+' : ''}${change.toFixed(2)}%`,
      isPositive,
      volume24h
    };
  });

  const calculateConverted = () => {
    const amt = parseFloat(convertAmount) || 0;
    const btcRate = livePrices['BTC']?.price || 96450;
    const ethRate = livePrices['ETH']?.price || 2785;
    const solRate = livePrices['SOL']?.price || 188;

    if (convertTo === 'BTC') return (amt / btcRate).toFixed(6);
    if (convertTo === 'ETH') return (amt / ethRate).toFixed(5);
    if (convertTo === 'SOL') return (amt / solRate).toFixed(4);
    if (convertTo === 'USDT') return amt.toFixed(2);
    return amt.toFixed(2);
  };

  const getFilteredMarketData = () => {
    let data = [...liveMarketData];
    if (searchQuery.trim()) {
      data = data.filter(
        (c) =>
          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeMarketTab === 'gainers') {
      return data.sort((a, b) => b.changeNum - a.changeNum);
    }
    if (activeMarketTab === 'volume') {
      return data.sort((a, b) => b.priceNum - a.priceNum);
    }
    if (activeMarketTab === 'new') {
      return [data[2], data[8], data[9], data[5], data[7], data[3]];
    }
    return data; // 'hot' default
  };

  const currentDisplayMarkets = getFilteredMarketData();

  const faqs = [
    {
      q: 'What is CryptoBridge and how does the exchange work?',
      a: 'CryptoBridge is an institutional digital asset exchange engineered with a high-throughput deterministic matching engine (Price-Time FIFO), a strict double-entry ledger architecture, deep spot and P2P liquidity, 100% verified Proof of Reserves, and multi-sig cold vault custody.'
    },
    {
      q: 'How do I deposit funds and are there zero-fee transfer options?',
      a: 'You can fund your account via direct on-chain blockchain deposits (BTC, ETH, SOL, USDT), fiat bank payments via the P2P Escrow market, or receive instant zero-fee Internal Transfers from any other CryptoBridge user with sub-millisecond settlement.'
    },
    {
      q: 'How does the zero-fee Instant Internal Transfer work?',
      a: 'Internal transfers allow you to send any cryptocurrency to another CryptoBridge user instantly by entering their User ID or registered Email. Because settlement occurs directly on our core double-entry ledger, there are 0% network gas fees and zero blockchain confirmation wait times.'
    },
    {
      q: 'How does the P2P Escrow system guarantee seller and buyer safety?',
      a: 'When a P2P trade is opened, the seller’s crypto is automatically locked into CryptoBridge’s cryptographic escrow vault. The seller cannot double-spend or withdraw the crypto until the buyer sends payment and release is confirmed. In case of dispute, 24/7 compliance officers inspect proof and resolve the escrow.'
    },
    {
      q: 'How does Proof of Reserves guarantee 100% full solvency?',
      a: 'CryptoBridge enforces strict mathematical double-entry accounting where customer liabilities are 100% backed 1:1 by segregated exchange vault assets. Anyone can verify in real time that total exchange vault holdings equal or exceed total customer balances.'
    },
    {
      q: 'How do I access Stock & Equity Intelligence?',
      a: 'Navigate to Stock Intelligence to view real-time interactive TradingView charts, multi-timeframe RSI and Moving Average technical gauges, earnings/financial statement overviews, and live macroeconomic timelines for top tech equities (NVDA, AAPL, TSLA) and commodities (Gold, Silver, Crude Oil).'
    },
    {
      q: 'What trading fees apply on CryptoBridge?',
      a: 'CryptoBridge offers ultra-low maker/taker fees starting at 0.08% / 0.10% for spot markets, 0.00% fees on all Internal Transfers, 0% platform fees on P2P escrow trades, and zero deposit fees on all supported crypto assets.'
    },
    {
      q: 'How does CryptoBridge protect user accounts and funds (SAFU)?',
      a: 'User accounts are secured with TOTP-based Two-Factor Authentication (2FA), Argon2id/PBKDF2 password hashing, and session anomaly detection. Over 95% of digital assets are stored in air-gapped, geographically distributed cold hardware vaults backed by our $1 Billion SAFU insurance fund.'
    }
  ];

  return (
    <div style={{ background: '#181a20', color: '#eaecef', minHeight: '100vh' }}>
      {/* Real-time Ticker Tape Banner */}
      <div style={{ borderBottom: '1px solid #2b313a', background: '#12141a' }}>
        <TradingViewTickerTape theme="dark" />
      </div>

      <div className="home-main-wrapper" style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
        {/* =========================================================================
            1. HERO SECTION (CLEAN INSTITUTIONAL FLAT SURFACE)
            ========================================================================= */}
        <section
          className="hero-section-card"
          style={{
            background: '#181a20',
            borderRadius: '20px',
            border: '1px solid #2b313a',
            padding: '44px 40px',
            marginBottom: '28px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '36px', alignItems: 'center' }}>
            {/* Hero Left Content */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#202630',
                  border: '1px solid #2b313a',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#fcd535',
                  marginBottom: '18px',
                  letterSpacing: '0.5px'
                }}
              >
                <span>CRYPTOBRIDGE INSTITUTIONAL SPOT &amp; P2P LIQUIDITY</span>
              </div>

              <h1
                style={{
                  fontSize: '40px',
                  fontWeight: 800,
                  lineHeight: '1.2',
                  color: '#ffffff',
                  margin: '0 0 16px 0',
                  letterSpacing: '-0.5px'
                }}
              >
                Institutional-Grade <br />
                <span style={{ color: '#fcd535' }}>
                  Digital Asset Exchange
                </span>
              </h1>

              <p style={{ fontSize: '14px', color: '#848e9c', lineHeight: '1.6', margin: '0 0 24px 0', maxWidth: '520px' }}>
                High-throughput deterministic matching engine with 0.10% spot fees, double-entry ledger settlement, and cryptographic Proof-of-Reserves.
              </p>

              {/* Quick Registration / Authenticated Action Card */}
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      window.location.hash = '#/dashboard';
                    }}
                    style={{
                      background: '#fcd535',
                      color: '#181a20',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 28px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => onNavigateToTrade('BTC/USDT')}
                    style={{
                      background: '#202630',
                      color: '#eaecef',
                      border: '1px solid #2b313a',
                      borderRadius: '12px',
                      padding: '14px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Trade BTC/USDT</span>
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      background: '#181a20',
                      borderRadius: '16px',
                      border: '1px solid #2b313a',
                      padding: '8px 8px 8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      maxWidth: '480px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Email or Phone number"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#eaecef',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={onOpenAuth}
                      style={{
                        background: '#fcd535',
                        color: '#181a20',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>Sign Up</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Social login pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                    <span style={{ fontSize: '12px', color: '#848e9c' }}>Or continue with:</span>
                    <button
                      onClick={onOpenAuth}
                      style={{
                        background: '#202630',
                        border: '1px solid #2b313a',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        color: '#eaecef',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Google
                    </button>
                    <button
                      onClick={onOpenAuth}
                      style={{
                        background: '#202630',
                        border: '1px solid #2b313a',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        color: '#eaecef',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Apple
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hero Right: 4-Grid of Live Mini-Chart Rounded Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { sym: 'BTCUSDT', pair: 'BTC/USDT', id: 'BTC', name: 'Bitcoin' },
                { sym: 'ETHUSDT', pair: 'ETH/USDT', id: 'ETH', name: 'Ethereum' },
                { sym: 'SOLUSDT', pair: 'SOL/USDT', id: 'SOL', name: 'Solana' },
                { sym: 'BNBUSDT', pair: 'BNB/USDT', id: 'BNB', name: 'BNB' }
              ].map((item) => {
                const live = livePrices[item.id];
                const price = live ? live.price : (item.id === 'BTC' ? 96450 : 2785);
                const chg = live ? live.change : 0;
                const isPos = chg >= 0;
                return (
                  <div
                    key={item.sym}
                    onClick={() => {
                      onSelectSymbol(item.pair);
                      onNavigateToTrade(item.pair);
                    }}
                    style={{
                      background: '#181a20',
                      borderRadius: '16px',
                      border: '1px solid #2b313a',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '170px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#fcd535';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2b313a';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>{item.pair}</span>
                          <span style={{ fontSize: '11px', color: '#848e9c', marginLeft: '6px' }}>{item.name}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isPos ? '#2ebd85' : '#f6465d',
                            background: isPos ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {live ? (isPos ? `+${chg.toFixed(2)}%` : `${chg.toFixed(2)}%`) : '--'}
                        </span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef', fontFamily: 'monospace', marginBottom: '4px' }}>
                        {live ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$--'}
                      </div>
                      {live?.vol && (
                        <div style={{ fontSize: '11px', color: '#848e9c', marginBottom: '8px' }}>
                          24h Vol: <span style={{ color: '#eaecef' }}>{live.vol}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ height: '75px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                      <TradingViewMiniChart symbol={item.sym} height={75} theme="dark" dateRange="1D" chartOnly={true} noTimeScale={true} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4 Horizontal Rounded Metric Cards on Hero Bottom */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '16px',
              marginTop: '36px',
              paddingTop: '28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {[
              {
                label: '24h Global Volume',
                val: Object.keys(livePrices).length > 0 ? '$78.4B' : 'Active',
                sub: `Across ${liveMarketData.length * 35}+ verified markets`
              },
              {
                label: 'Matching Engine Latency',
                val: '< 50 µs',
                sub: 'Deterministic ultra-low latency CLOB'
              },
              {
                label: 'Proof of Reserves',
                val: '100% Solvency',
                sub: '1:1 Segregated cryptographic custody'
              },
              {
                label: 'Institutional Fee Tier',
                val: '0.00% - 0.08%',
                sub: 'Zero fee maker tiers available'
              }
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: '#181a20',
                  borderRadius: '14px',
                  border: '1px solid #2b313a',
                  padding: '16px 20px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#848e9c', fontWeight: 500 }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#eaecef', margin: '4px 0 2px 0' }}>{stat.val}</div>
                <div style={{ fontSize: '11px', color: '#fcd535' }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            2. TOP TRENDING & GAINERS (4 ROUNDED RECTANGLE SHOWCASE CARDS)
            ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '32px' }}>
          {/* Card 1: Hot Coins */}
          <div
            style={{
              background: '#202630',
              borderRadius: '20px',
              border: '1px solid #2b313a',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} color="#fcd535" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Hot Coins</h3>
              </div>
              <span style={{ fontSize: '12px', color: '#848e9c' }}>24h Volume</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveMarketData.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateToTrade(c.symbol)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2b313a')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#202630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: c.color, fontSize: '13px' }}>
                      {c.logo}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>{c.id}</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>{c.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{c.price}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: c.isPositive ? '#2ebd85' : '#f6465d' }}>{c.change24h}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Top Gainers */}
          <div
            style={{
              background: '#202630',
              borderRadius: '20px',
              border: '1px solid #2b313a',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#2ebd85" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Top Gainers</h3>
              </div>
              <span style={{ fontSize: '12px', color: '#2ebd85', fontWeight: 600 }}>Highest 24h ROI</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...liveMarketData].sort((a, b) => b.changeNum - a.changeNum).slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateToTrade(c.symbol)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2ebd85')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2b313a')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#202630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: c.color, fontSize: '13px' }}>
                      {c.logo}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>{c.id}</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>{c.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{c.price}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#2ebd85' }}>{c.change24h}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Top Yield Staking */}
          <div
            style={{
              background: '#202630',
              borderRadius: '20px',
              border: '1px solid #2b313a',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#2ebd85" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>CryptoBridge Vault &amp; Transfers</h3>
              </div>
              <a href="#/wallet" style={{ fontSize: '12px', color: '#fcd535', textDecoration: 'none', fontWeight: 600 }}>
                Transfer
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Instant Transfers', desc: 'Zero Network Fees', val: '0.00% FEE', color: '#2ebd85' },
                { label: 'Proof of Reserves', desc: 'Full 1:1 Solvency', val: '100% BACKED', color: '#fcd535' },
                { label: 'Cold Storage Vault', desc: 'Multi-Sig Segregated', val: 'SAFU SECURE', color: '#3b82f6' }
              ].map((e) => (
                <div
                  key={e.label}
                  onClick={() => (window.location.hash = '#/wallet')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#202630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: e.color, fontSize: '12px' }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>{e.label}</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>{e.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: e.color }}>{e.val}</div>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>Verified</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. POPULAR CRYPTOCURRENCIES (ROUNDED RECTANGLE CARD TABLE)
            ========================================================================= */}
        <section
          style={{
            background: '#202630',
            borderRadius: '24px',
            border: '1px solid #2b313a',
            padding: '32px',
            marginBottom: '32px'
          }}
        >
          {/* Header & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', margin: '0 0 6px 0' }}>
                Popular Markets &amp; Real-Time Prices
              </h2>
              <p style={{ fontSize: '13px', color: '#848e9c', margin: 0 }}>
                Trade 350+ digital assets with microsecond deterministic matching and live L2 liquidity.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={16} color="#848e9c" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '12px',
                  padding: '8px 12px 8px 36px',
                  color: '#eaecef',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              { id: 'hot', label: 'Hot Markets' },
              { id: 'gainers', label: 'Top Gainers' },
              { id: 'volume', label: '24h Volume' },
              { id: 'new', label: 'New Listings' },
              { id: 'tradingview', label: 'TradingView Screener' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMarketTab(tab.id as any)}
                style={{
                  background: activeMarketTab === tab.id ? '#fcd535' : '#181a20',
                  color: activeMarketTab === tab.id ? '#181a20' : '#848e9c',
                  border: '1px solid #2b313a',
                  borderRadius: '12px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Market Table */}
          {activeMarketTab === 'tradingview' ? (
            <div style={{ background: '#181a20', border: '1px solid #2b313a', borderRadius: '16px', padding: '16px', overflow: 'hidden', minHeight: '580px' }}>
              <TradingViewMarketOverview height={560} theme="dark" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ color: '#848e9c', borderBottom: '1px solid #2b313a' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 500 }}>Pair</th>
                    <th style={{ padding: '14px 16px', fontWeight: 500 }}>Last Price</th>
                    <th style={{ padding: '14px 16px', fontWeight: 500 }}>24h Change</th>
                    <th style={{ padding: '14px 16px', fontWeight: 500 }}>24h Volume</th>
                    <th style={{ padding: '14px 16px', fontWeight: 500 }}>Market Cap</th>
                    <th style={{ padding: '14px 16px', fontWeight: 500, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDisplayMarkets.map((coin) => (
                    <tr
                      key={coin.id}
                      onClick={() => {
                        onSelectSymbol(coin.symbol);
                        onNavigateToTrade(coin.symbol);
                      }}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#181a20',
                              border: `1px solid ${coin.color}`,
                              color: coin.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '15px'
                            }}
                          >
                            {coin.logo}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#eaecef' }}>{coin.id}</div>
                            <div style={{ fontSize: '12px', color: '#848e9c' }}>{coin.name}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 700, color: '#eaecef' }}>
                        {coin.price}
                      </td>

                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: coin.isPositive ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                            color: coin.isPositive ? '#2ebd85' : '#f6465d',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}
                        >
                          {coin.change24h}
                        </span>
                      </td>

                      <td style={{ padding: '16px', color: '#848e9c', fontFamily: 'monospace' }}>{coin.volume24h}</td>
                      <td style={{ padding: '16px', color: '#848e9c', fontFamily: 'monospace' }}>{coin.marketCap}</td>

                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(coin.symbol);
                            onNavigateToTrade(coin.symbol);
                          }}
                          style={{
                            background: '#fcd535',
                            color: '#181a20',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 18px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =========================================================================
            4. INSTANT BUY / CONVERT CALCULATOR (SIDE-BY-SIDE ROUNDED CARDS)
            ========================================================================= */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}
        >
          {/* Card Left: Payment Features */}
          <div
            style={{
              background: '#202630',
              borderRadius: '24px',
              border: '1px solid #2b313a',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <span
                style={{
                  background: 'rgba(252, 213, 53, 0.15)',
                  color: '#fcd535',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.5px'
                }}
              >
                ZERO-FEE CONVERSION &amp; ON-RAMPS
              </span>

              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#eaecef', margin: '16px 0 12px 0', lineHeight: '1.3' }}>
                Buy Crypto in Seconds with Card, Bank or P2P
              </h2>

              <p style={{ fontSize: '14px', color: '#848e9c', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                Instant fiat settlement supporting USD, EUR, GBP, AUD, and 50+ sovereign currencies with 0% deposit fees.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: CreditCard, title: 'Visa & Mastercard', sub: 'Instant card payment' },
                { icon: Building2, title: 'SEPA & Wire', sub: '0% bank deposit fee' },
                { icon: Users, title: 'P2P Escrow', sub: '100+ local methods' },
                { icon: DollarSign, title: 'Apple & Google Pay', sub: 'One-tap checkout' }
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    style={{
                      background: '#181a20',
                      borderRadius: '14px',
                      border: '1px solid #2b313a',
                      padding: '14px'
                    }}
                  >
                    <Icon size={20} color="#fcd535" style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>{p.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Right: Interactive Converter */}
          <div
            style={{
              background: '#202630',
              borderRadius: '24px',
              border: '1px solid #2b313a',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>Quick Convert / Buy</span>
              <span style={{ background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                Instant Settlement
              </span>
            </div>

            {/* You Pay Input */}
            <div style={{ background: '#181a20', borderRadius: '16px', border: '1px solid #2b313a', padding: '14px 18px' }}>
              <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '6px' }}>You Pay</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#eaecef',
                    fontFamily: 'monospace'
                  }}
                />
                <select
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value)}
                  style={{
                    background: '#202630',
                    border: '1px solid #2b313a',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#eaecef',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>

            {/* Swap Divider */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#181a20', border: '1px solid #2b313a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fcd535' }}>
                <Zap size={18} />
              </div>
            </div>

            {/* You Receive Input */}
            <div style={{ background: '#181a20', borderRadius: '16px', border: '1px solid #2b313a', padding: '14px 18px' }}>
              <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '6px' }}>You Receive (Estimated)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  readOnly
                  value={calculateConverted()}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#2ebd85',
                    fontFamily: 'monospace'
                  }}
                />
                <select
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value)}
                  style={{
                    background: '#202630',
                    border: '1px solid #2b313a',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#eaecef',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                if (user) onNavigateToTrade(`${convertTo}/USDT`);
                else onOpenAuth();
              }}
              style={{
                background: '#fcd535',
                color: '#181a20',
                border: 'none',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {user ? `Buy ${convertTo} Now` : 'Sign Up to Buy Crypto'}
            </button>
          </div>
        </section>

        {/* =========================================================================
            5. ECOSYSTEM & CORE PRODUCTS (ROUNDED RECTANGLE 8-CARD GRID)
            ========================================================================= */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#eaecef', margin: '0 0 8px 0' }}>
              Explore the CryptoBridge Ecosystem
            </h2>
            <p style={{ fontSize: '14px', color: '#848e9c', margin: 0 }}>
              Institutional-grade products engineered for high performance, deep liquidity, and maximum security.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: '20px'
            }}
          >
            {[
              {
                title: 'Spot Exchange',
                desc: 'Trade 350+ digital assets with microsecond deterministic matching and L2 order books.',
                icon: BarChart3,
                color: '#fcd535',
                action: () => onNavigateToTrade('BTC/USDT')
              },
              {
                title: 'Instant Internal Transfers',
                desc: 'Zero network fees and sub-millisecond instant balance settlement between CryptoBridge accounts.',
                icon: Send,
                color: '#2ebd85',
                action: () => (window.location.hash = '#/wallet')
              },
              {
                title: 'P2P Escrow Market',
                desc: 'Zero platform fees with 100+ local payment methods backed by cryptographic escrow.',
                icon: Users,
                color: '#3b82f6',
                action: onNavigateToP2P
              },
              {
                title: 'Stock Intelligence',
                desc: 'Live technicals, financials, and symbol intelligence for NASDAQ:NVDA, AAPL & TSLA.',
                icon: Activity,
                color: '#0284c7',
                action: () => (window.location.hash = '#/stock/NVDA')
              },
              {
                title: 'Proof of Reserves',
                desc: '100% full-reserve backing on all customer assets audited on-chain in real time.',
                icon: ShieldCheck,
                color: '#2ebd85',
                action: () => (window.location.hash = '#/dashboard')
              },
              {
                title: 'SAFU Vault Custody',
                desc: 'Segregated cold storage, multi-sig pipelines, and $1 Billion SAFU user protection.',
                icon: Lock,
                color: '#ef4444',
                action: () => (window.location.hash = '#/security')
              },
              {
                title: 'Executive Admin Console',
                desc: 'Live risk governance, circuit breakers, user fund credit controls, and compliance queue.',
                icon: Sliders,
                color: '#f59e0b',
                action: () => window.open('/admin', '_blank')
              },
              {
                title: 'Live Market News',
                desc: 'Real-time breaking financial news, macroeconomic updates, and institutional flow intelligence.',
                icon: Newspaper,
                color: '#8b5cf6',
                action: () => (window.location.hash = '#/news')
              }
            ].map((prod) => {
              const Icon = prod.icon;
              return (
                <div
                  key={prod.title}
                  onClick={prod.action}
                  style={{
                    background: '#202630',
                    borderRadius: '20px',
                    border: '1px solid #2b313a',
                    padding: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = prod.color;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2b313a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: `rgba(${prod.color === '#fcd535' ? '252, 213, 53' : prod.color === '#2ebd85' ? '46, 189, 133' : '59, 130, 246'}, 0.15)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}
                    >
                      <Icon size={24} color={prod.color} />
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#eaecef', margin: '0 0 6px 0' }}>{prod.title}</h3>
                    <p style={{ fontSize: '13px', color: '#848e9c', lineHeight: '1.5', margin: 0 }}>{prod.desc}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: prod.color, fontSize: '13px', fontWeight: 700 }}>
                    <span>Launch</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            6. SECURITY & SAFU TRUST BANNER (ROUNDED RECTANGLE CARD)
            ========================================================================= */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1c222b 0%, #15181f 100%)',
            borderRadius: '24px',
            border: '1px solid #2b313a',
            padding: '40px',
            marginBottom: '32px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'rgba(252, 213, 53, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield size={32} color="#fcd535" />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#eaecef', margin: '0 0 4px 0' }}>Your Funds are SAFU</h2>
              <p style={{ fontSize: '14px', color: '#848e9c', margin: 0 }}>
                CryptoBridge protects user assets with an institutional $1 Billion Secure Asset Fund for Users (SAFU) and ISO 27001 certified zero-trust infrastructure.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px' }}>
            {[
              { title: 'Cold Vault Segregation', desc: 'Over 95% of digital assets are stored in air-gapped, geographically distributed cold hardware vaults.' },
              { title: '1:1 Proof of Reserves', desc: 'Cryptographically verified on-chain reserve backing ensures all customer balances are available on demand.' },
              { title: 'Multi-Factor 2FA & AML', desc: 'RFC 6238 TOTP authenticators, anti-phishing codes, automated velocity limits, and global AML screening.' }
            ].map((p) => (
              <div
                key={p.title}
                style={{
                  background: '#202630',
                  borderRadius: '16px',
                  border: '1px solid #2b313a',
                  padding: '20px'
                }}
              >
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fcd535', margin: '0 0 6px 0' }}>{p.title}</h4>
                <p style={{ fontSize: '12px', color: '#848e9c', lineHeight: '1.5', margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            7. FAQ ACCORDION CARDS (ROUNDED RECTANGLES)
            ========================================================================= */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#eaecef', margin: '0 0 6px 0' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '13px', color: '#848e9c', margin: 0 }}>
              Got questions about trading, safety, or fees on CryptoBridge? Find your answers below.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '900px', margin: '0 auto' }}>
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  style={{
                    background: '#202630',
                    borderRadius: '16px',
                    border: '1px solid #2b313a',
                    padding: '18px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>{faq.q}</span>
                    {isOpen ? <ChevronUp size={20} color="#fcd535" /> : <ChevronDown size={20} color="#848e9c" />}
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <p style={{ fontSize: '13px', color: '#848e9c', lineHeight: '1.6', margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            8. BOTTOM CTA CARD (CLEAN INSTITUTIONAL TERMINAL CTA)
            ========================================================================= */}
        <section
          style={{
            background: '#181a20',
            borderRadius: '20px',
            border: '1px solid #2b313a',
            padding: '44px 36px',
            textAlign: 'center',
            color: '#eaecef',
            marginBottom: '32px'
          }}
        >
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
            Start Trading on CryptoBridge
          </h2>
          <p style={{ fontSize: '14px', color: '#848e9c', margin: '0 0 24px 0' }}>
            Deterministic matching engine. 0.10% standard spot fee tier. Instant zero-fee internal transfers.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (user) onNavigateToTrade('BTC/USDT');
                else onOpenAuth();
              }}
              style={{
                background: '#fcd535',
                color: '#181a20',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{user ? 'Open Trading Terminal' : 'Sign Up Free'}</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onNavigateToTrade('BTC/USDT')}
              style={{
                background: '#202630',
                color: '#eaecef',
                border: '1px solid #2b313a',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Explore Live Markets
            </button>
          </div>
        </section>
      </div>

      {/* Unified Institutional Footer without Community */}
      <Footer
        onNavigateToTrade={onNavigateToTrade}
        onNavigateToP2P={onNavigateToP2P}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};
