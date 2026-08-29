import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Star, Globe, DollarSign, Activity } from 'lucide-react';

export interface SearchStockItem {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  category?: 'Stock' | 'Crypto' | 'Forex' | 'Index' | 'Commodity';
  isPopular?: boolean;
}

const STOCK_DATABASE: SearchStockItem[] = [
  // Major Stocks
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Semiconductors & AI', category: 'Stock', isPopular: true },
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', sector: 'Consumer Electronics', category: 'Stock', isPopular: true },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Software & Cloud', category: 'Stock', isPopular: true },
  { symbol: 'AMZN', name: 'Amazon.com Inc', exchange: 'NASDAQ', sector: 'Internet Retail & Cloud', category: 'Stock', isPopular: true },
  { symbol: 'GOOGL', name: 'Alphabet Inc Class A', exchange: 'NASDAQ', sector: 'Internet & AI', category: 'Stock', isPopular: true },
  { symbol: 'META', name: 'Meta Platforms Inc', exchange: 'NASDAQ', sector: 'Social Media & VR', category: 'Stock', isPopular: true },
  { symbol: 'TSLA', name: 'Tesla Inc', exchange: 'NASDAQ', sector: 'Auto & Clean Energy', category: 'Stock', isPopular: true },
  { symbol: 'NFLX', name: 'Netflix Inc', exchange: 'NASDAQ', sector: 'Entertainment Streaming', category: 'Stock', isPopular: true },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Semiconductors', category: 'Stock', isPopular: true },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc', exchange: 'NYSE', sector: 'AI & Defense Software', category: 'Stock', isPopular: true },
  { symbol: 'COIN', name: 'Coinbase Global Inc', exchange: 'NASDAQ', sector: 'Financial Technology', category: 'Stock', isPopular: true },
  { symbol: 'AVGO', name: 'Broadcom Inc', exchange: 'NASDAQ', sector: 'Semiconductors', category: 'Stock', isPopular: true },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Mfg', exchange: 'NYSE', sector: 'Semiconductor Foundry', category: 'Stock', isPopular: true },
  { symbol: 'ASML', name: 'ASML Holding NV', exchange: 'NASDAQ', sector: 'Lithography Equipment', category: 'Stock' },
  { symbol: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', sector: 'Semiconductor IP', category: 'Stock' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', exchange: 'NYSE', sector: 'E-Commerce', category: 'Stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc', exchange: 'NYSE', sector: 'Financial Conglomerate', category: 'Stock' },
  { symbol: 'LLY', name: 'Eli Lilly and Co', exchange: 'NYSE', sector: 'Pharmaceuticals', category: 'Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', exchange: 'NYSE', sector: 'Investment Banking', category: 'Stock' },
  { symbol: 'WMT', name: 'Walmart Inc', exchange: 'NYSE', sector: 'Retail & Consumer Goods', category: 'Stock' },

  // Global Indices & ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', sector: 'Broad Market Index', category: 'Index', isPopular: true },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', exchange: 'NASDAQ', sector: 'Technology Index', category: 'Index', isPopular: true },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', exchange: 'NYSE Arca', sector: 'Industrial Index', category: 'Index' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE Arca', sector: 'Small-Cap Index', category: 'Index' },
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF', exchange: 'NASDAQ', sector: 'Semiconductor Sector', category: 'Index' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE Arca', sector: 'Precious Metals Commodity', category: 'Commodity', isPopular: true },
  { symbol: 'SLV', name: 'iShares Silver Trust', exchange: 'NYSE Arca', sector: 'Precious Metals Commodity', category: 'Commodity' },
  { symbol: 'USO', name: 'United States Oil Fund', exchange: 'NYSE Arca', sector: 'Energy Commodity', category: 'Commodity' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', exchange: 'NASDAQ', sector: 'Fixed Income & Rates', category: 'Index' },

  // Major World Forex Currencies
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', exchange: 'FOREX', sector: 'Major Currency Pair', category: 'Forex', isPopular: true },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', exchange: 'FOREX', sector: 'Major Currency Pair', category: 'Forex', isPopular: true },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', exchange: 'FOREX', sector: 'Major Currency Pair', category: 'Forex', isPopular: true },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', exchange: 'FOREX', sector: 'Major Currency Pair', category: 'Forex' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', exchange: 'FOREX', sector: 'Commodity Currency', category: 'Forex', isPopular: true },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', exchange: 'FOREX', sector: 'Major Currency Pair', category: 'Forex' },
  { symbol: 'USD/CNH', name: 'US Dollar / Chinese Yuan (Offshore)', exchange: 'FOREX', sector: 'Emerging Market Currency', category: 'Forex' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', exchange: 'FOREX', sector: 'Emerging Market Currency', category: 'Forex' },
  { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', exchange: 'FOREX', sector: 'Emerging Market Currency', category: 'Forex' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', exchange: 'FOREX', sector: 'Asian Currency', category: 'Forex' },
  { symbol: 'USD/AED', name: 'US Dollar / UAE Dirham', exchange: 'FOREX', sector: 'Middle East Currency', category: 'Forex' },
  { symbol: 'USD/SAR', name: 'US Dollar / Saudi Riyal', exchange: 'FOREX', sector: 'Middle East Currency', category: 'Forex' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', exchange: 'FOREX', sector: 'Cross Currency Pair', category: 'Forex' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', exchange: 'FOREX', sector: 'Cross Currency Pair', category: 'Forex' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', exchange: 'FOREX', sector: 'Cross Currency Pair', category: 'Forex' },

  // Major Cryptocurrencies
  { symbol: 'BTC/USDT', name: 'Bitcoin / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Layer 1 Store of Value', category: 'Crypto', isPopular: true },
  { symbol: 'ETH/USDT', name: 'Ethereum / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Smart Contract Platform', category: 'Crypto', isPopular: true },
  { symbol: 'SOL/USDT', name: 'Solana / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'High-Throughput L1', category: 'Crypto', isPopular: true },
  { symbol: 'XRP/USDT', name: 'Ripple / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Cross-Border Payments', category: 'Crypto', isPopular: true },
  { symbol: 'BNB/USDT', name: 'BNB / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Exchange Ecosystem', category: 'Crypto', isPopular: true },
  { symbol: 'DOGE/USDT', name: 'Dogecoin / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Meme & Payment Asset', category: 'Crypto', isPopular: true },
  { symbol: 'ADA/USDT', name: 'Cardano / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Proof of Stake L1', category: 'Crypto' },
  { symbol: 'AVAX/USDT', name: 'Avalanche / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Subnet Ecosystem', category: 'Crypto' },
  { symbol: 'SUI/USDT', name: 'Sui Network / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Move-based L1', category: 'Crypto' },
  { symbol: 'NEAR/USDT', name: 'NEAR Protocol / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Sharded L1 & AI', category: 'Crypto' },
  { symbol: 'LINK/USDT', name: 'Chainlink / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Decentralized Oracle', category: 'Crypto' },
  { symbol: 'TON/USDT', name: 'Toncoin / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Telegram Ecosystem', category: 'Crypto' },
  { symbol: 'PEPE/USDT', name: 'Pepe / TetherUS', exchange: 'BINANCE / CRYPTOBRIDGE', sector: 'Community Meme Token', category: 'Crypto' }
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (symbol: string) => void;
  watchlist?: string[];
  onToggleWatchlist?: (symbol: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  watchlist = ['AAPL', 'GOOGL', 'NVDA'],
  onToggleWatchlist
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Stock' | 'Crypto' | 'Forex' | 'Index'>('All');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setActiveCategory('All');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  let filtered = STOCK_DATABASE.filter((s) => {
    if (activeCategory !== 'All' && s.category !== activeCategory) return false;
    if (!cleanQuery) return s.isPopular || activeCategory !== 'All';
    return (
      s.symbol.toLowerCase().includes(cleanQuery) ||
      s.name.toLowerCase().includes(cleanQuery) ||
      s.sector.toLowerCase().includes(cleanQuery) ||
      s.exchange.toLowerCase().includes(cleanQuery)
    );
  });

  // If search query has no exact match in database, allow direct navigation to that symbol
  const hasExactMatch = filtered.some((s) => s.symbol.toLowerCase() === cleanQuery);
  const showCustomItem = cleanQuery.length > 0 && !hasExactMatch;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="search-input-header">
          <Search size={18} className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input-field"
            placeholder="Search all global stocks, currencies, crypto, forex, ETFs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery('')}
              style={{ marginRight: '8px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#848e9c' }}
            >
              Clear
            </button>
          )}
          <button className="search-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Categories Bar */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '1px solid #1c202d', background: '#0e1017' }}>
          {(['All', 'Stock', 'Crypto', 'Forex', 'Index'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? '#fcd535' : '#141722',
                color: activeCategory === cat ? '#181a20' : '#848e9c',
                border: `1px solid ${activeCategory === cat ? '#fcd535' : '#232838'}`,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {cat === 'All' ? 'All Assets' : cat === 'Stock' ? 'Stocks' : cat === 'Crypto' ? 'Crypto' : cat === 'Forex' ? 'Currencies / FX' : 'Indices'}
            </button>
          ))}
        </div>

        {/* Stock & Currency Results */}
        <div className="search-results-list">
          {showCustomItem && (
            <div
              className="search-stock-item"
              onClick={() => {
                onSelectStock(query.trim().toUpperCase());
                onClose();
              }}
              style={{ background: 'rgba(252, 213, 53, 0.05)', border: '1px dashed rgba(252, 213, 53, 0.3)' }}
            >
              <div className="search-stock-avatar" style={{ background: '#fcd535', color: '#181a20' }}>
                <TrendingUp size={16} />
              </div>
              <div className="search-stock-info">
                <div className="search-stock-symbol-row">
                  <span className="search-stock-symbol" style={{ color: '#fcd535' }}>{query.trim().toUpperCase()}</span>
                  <span className="search-stock-badge">Live Global Search</span>
                </div>
                <div className="search-stock-name">
                  Open live interactive candlestick chart for {query.trim().toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {filtered.map((item) => {
            const isWatchlisted = watchlist.includes(item.symbol);
            return (
              <div
                key={item.symbol}
                className="search-stock-item"
                onClick={() => {
                  onSelectStock(item.symbol);
                  onClose();
                }}
              >
                <div className="search-stock-avatar">
                  {item.symbol.slice(0, 3)}
                </div>

                <div className="search-stock-info">
                  <div className="search-stock-symbol-row">
                    <span className="search-stock-symbol">{item.symbol}</span>
                    <span className="search-stock-badge">{item.exchange}</span>
                    {item.category && (
                      <span style={{ fontSize: '10px', color: '#848e9c', marginLeft: '4px', fontWeight: 600 }}>
                        • {item.category}
                      </span>
                    )}
                  </div>
                  <div className="search-stock-name">{item.name}</div>
                </div>

                <div className="search-stock-actions">
                  <span className="search-stock-sector">{item.sector}</span>
                  {onToggleWatchlist && (
                    <button
                      className={`search-star-btn ${isWatchlisted ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(item.symbol);
                      }}
                      title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <Star
                        size={16}
                        fill={isWatchlisted ? '#fcd535' : 'none'}
                        color={isWatchlisted ? '#fcd535' : '#717a88'}
                      />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !showCustomItem && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#848e9c' }}>
              <Globe size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>No direct asset matches</div>
              <div style={{ fontSize: '12px' }}>Type any ticker (e.g. NVDA, BTC, EURUSD, AAPL) to load live market data.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
