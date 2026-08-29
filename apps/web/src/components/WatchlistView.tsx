import React, { useState } from 'react';
import {
  Star,
  Plus,
  Bell,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  X,
  Check,
  Activity,
  Layers
} from 'lucide-react';
import { PriceAlertModal, PriceAlertData } from './PriceAlertModal';
import { TradingViewMarketQuotes } from './TradingViewMarketQuotes';
import { TradingViewMiniChart } from './TradingViewMiniChart';
import { Footer } from './Footer';

interface WatchlistStock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  marketCap: string;
  peRatio: string;
}

interface StockAlert {
  id: string;
  symbol: string;
  companyName: string;
  currentPrice: string;
  change: string;
  isPositive: boolean;
  condition: 'Price >' | 'Price <' | 'Price =';
  targetPrice: string;
  frequency: 'Once per minute' | 'Once per hour' | 'Once per day';
  logoType?: 'apple' | 'tesla' | 'meta' | 'microsoft';
}

interface NewsItem {
  id: string;
  ticker: string;
  title: string;
  source: string;
  timeAgo: string;
  summary: string;
  link?: string;
}

interface WatchlistViewProps {
  watchlistSymbols?: string[];
  onToggleWatchlist?: (symbol: string) => void;
  onNavigateToStock?: (symbol: string) => void;
  onOpenSearch?: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlistSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ORCL', 'CRM', 'INTC', 'JNJ', 'RDD', 'UBER', 'ADBE'],
  onToggleWatchlist,
  onNavigateToStock,
  onOpenSearch
}) => {
  const [watchlistMode, setWatchlistMode] = useState<'quotes' | 'mini-charts' | 'table'>('quotes');
  // Mock Watchlist data matching reference screenshot
  const [stocks, setStocks] = useState<WatchlistStock[]>([
    { symbol: 'AAPL', name: 'Apple Inc', price: '$233.16', change: '+1.54%', isPositive: true, marketCap: '$3.56T', peRatio: '35.5' },
    { symbol: 'MSFT', name: 'Microsoft Corp', price: '$520.42', change: '-0.24%', isPositive: false, marketCap: '$3.75T', peRatio: '32.6' },
    { symbol: 'GOOGL', name: 'Alphabet Inc', price: '$201.56', change: '+2.65%', isPositive: true, marketCap: '$2.52T', peRatio: '21.5' },
    { symbol: 'AMZN', name: 'Amazon.com Inc', price: '$244.16', change: '-1.53%', isPositive: false, marketCap: '$1.45T', peRatio: '33.5' },
    { symbol: 'TSLA', name: 'Tesla Inc', price: '$339.62', change: '+1.72%', isPositive: true, marketCap: '$1.56T', peRatio: '161.2' },
    { symbol: 'META', name: 'Meta Platforms Inc', price: '$762.96', change: '-2.54%', isPositive: false, marketCap: '$2.63T', peRatio: '45.6' },
    { symbol: 'NVDA', name: 'NVIDIA Corp', price: '$181.46', change: '+2.21%', isPositive: true, marketCap: '$1.36T', peRatio: '16.8' },
    { symbol: 'NFLX', name: 'Netflix Inc', price: '$1214.45', change: '-2.62%', isPositive: false, marketCap: '$4.74T', peRatio: '45.9' },
    { symbol: 'ORCL', name: 'Oracle Corp', price: '$244.63', change: '+1.78%', isPositive: true, marketCap: '$265.1B', peRatio: '58.9' },
    { symbol: 'CRM', name: 'Salesforce Inc', price: '$254.45', change: '+1.72%', isPositive: true, marketCap: '$1.45T', peRatio: '58.9' },
    { symbol: 'INTC', name: 'Intel Corporation', price: '$254.45', change: '-2.54%', isPositive: false, marketCap: '$1.56T', peRatio: '16.8' },
    { symbol: 'JNJ', name: 'Johnson & Johns...', price: '$254.45', change: '+2.21%', isPositive: true, marketCap: '$2.63T', peRatio: '45.9' },
    { symbol: 'RDD', name: 'Reddit', price: '$254.45', change: '-2.62%', isPositive: false, marketCap: '$1.36T', peRatio: '58.9' },
    { symbol: 'UBER', name: 'Uber Technologie...', price: '$254.45', change: '+1.78%', isPositive: true, marketCap: '$4.74T', peRatio: '58.9' },
    { symbol: 'ADBE', name: 'Adobe Inc.', price: '$254.45', change: '+1.78%', isPositive: true, marketCap: '$265.1B', peRatio: '58.9' }
  ]);

  // Continuously sync with live market ticker feeds
  React.useEffect(() => {
    const fetchLiveQuotes = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, { price: string; change: string; isPositive: boolean }> = {};
            data.forEach((item: any) => {
              if (item.symbol && item.symbol.endsWith('USDT')) {
                const base = item.symbol.replace('USDT', '');
                const numPrice = parseFloat(item.lastPrice) || 0;
                const numChg = parseFloat(item.priceChangePercent) || 0;
                map[base] = {
                  price: numPrice > 1 ? `$${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${numPrice.toFixed(4)}`,
                  change: `${numChg >= 0 ? '+' : ''}${numChg.toFixed(2)}%`,
                  isPositive: numChg >= 0
                };
              }
            });

            setStocks((prev) =>
              prev.map((s) => {
                if (map[s.symbol]) {
                  return {
                    ...s,
                    price: map[s.symbol].price,
                    change: map[s.symbol].change,
                    isPositive: map[s.symbol].isPositive
                  };
                }
                return s;
              })
            );

            setAlerts((prev) =>
              prev.map((a) => {
                if (map[a.symbol]) {
                  return {
                    ...a,
                    currentPrice: map[a.symbol].price,
                    change: map[a.symbol].change,
                    isPositive: map[a.symbol].isPositive
                  };
                }
                return a;
              })
            );
          }
        }
      } catch {
        // Silent fallback
      }
    };
    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 5000);
    return () => clearInterval(interval);
  }, []);

  // Active Alerts List matching screenshot
  const [alerts, setAlerts] = useState<StockAlert[]>([
    {
      id: 'alt-1',
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      currentPrice: '$229.65',
      change: '+1.4%',
      isPositive: true,
      condition: 'Price >',
      targetPrice: '$240.60',
      frequency: 'Once per day',
      logoType: 'apple'
    },
    {
      id: 'alt-2',
      symbol: 'TSLA',
      companyName: 'Tesla, Inc.',
      currentPrice: '$340.84',
      change: '-2.53%',
      isPositive: false,
      condition: 'Price =',
      targetPrice: '$300.80',
      frequency: 'Once per minute',
      logoType: 'tesla'
    },
    {
      id: 'alt-3',
      symbol: 'META',
      companyName: 'Meta Platforms Inc.',
      currentPrice: '$790.00',
      change: '+1.4%',
      isPositive: true,
      condition: 'Price <',
      targetPrice: '$700.40',
      frequency: 'Once per hour',
      logoType: 'meta'
    },
    {
      id: 'alt-4',
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      currentPrice: '$529.24',
      change: '+1.4%',
      isPositive: true,
      condition: 'Price >',
      targetPrice: '$540.13',
      frequency: 'Once per day',
      logoType: 'microsoft'
    },
    {
      id: 'alt-5',
      symbol: 'TSLA',
      companyName: 'Tesla, Inc.',
      currentPrice: '$340.84',
      change: '-2.53%',
      isPositive: false,
      condition: 'Price =',
      targetPrice: '$300.80',
      frequency: 'Once per minute',
      logoType: 'tesla'
    }
  ]);

  // News Items matching screenshot
  const newsItems: NewsItem[] = [
    {
      id: 'news-1',
      ticker: 'GOOGL',
      title: "If Alphabet 'Missed The AI Boat', What Does That Mean For Microsoft?",
      source: 'The Wall Street Journal',
      timeAgo: '12 minutes ago',
      summary: 'Nearly three years after the launch of ChatGPT, most investors view MSFT as the winner relative to GOOGL. But has MSFT really outperformed GOOG?'
    },
    {
      id: 'news-2',
      ticker: 'AAPL',
      title: 'Apple Prepares Major iPhone Redesign for 2026...',
      source: 'Bloomberg',
      timeAgo: '24 minutes ago',
      summary: 'Analysts suggest Apple is betting on foldable displays, a move that could shake up the premium smartphone market.'
    },
    {
      id: 'news-3',
      ticker: 'TSLA',
      title: 'Tesla Announces Affordable EV Model for Global Markets...',
      source: 'CNBC',
      timeAgo: '27 minutes ago',
      summary: 'Elon Musk confirms a sub-$25,000 electric vehicle aimed at emerging economies, with production expected in 2027.'
    },
    {
      id: 'news-4',
      ticker: 'NVDA',
      title: 'Nvidia Faces Growing Competition in AI Chips...',
      source: 'The Wall Street Journal',
      timeAgo: '37 minutes ago',
      summary: 'While Nvidia dominates the GPU market, rivals are pushing new architectures that could challenge its leadership.'
    },
    {
      id: 'news-5',
      ticker: 'GOOGL',
      title: 'Tesla Announces Affordable EV Model for Global Markets...',
      source: 'CNBC',
      timeAgo: '53 minutes ago',
      summary: 'Tesla has confirmed plans to produce a low-cost EV priced around $25,000. Designed for markets in Asia, South America, and Africa, the vehicle will use a new batt...'
    },
    {
      id: 'news-6',
      ticker: 'MSFT',
      title: 'Microsoft Expands AI Integration Across Office Suite...',
      source: 'Reuters',
      timeAgo: '56 minutes ago',
      summary: 'The company is rolling out new productivity features powered by its Azure AI platform, aiming to boost enterprise adoption.'
    },
    {
      id: 'news-7',
      ticker: 'META',
      title: 'Meta Platforms Sees Surge in VR Headset Sales...',
      source: 'The Verge',
      timeAgo: '1 hour ago',
      summary: "Meta's new Quest Pro headset has exceeded early sales expectations, with shipments doubling in Q2 compared to last year. The company sees the momentum as validatio..."
    },
    {
      id: 'news-8',
      ticker: 'AMZN',
      title: 'Amazon Tests Drone Deliveries in Suburban Areas...',
      source: 'New York Times',
      timeAgo: '1 hour ago',
      summary: 'Amazon has expanded its drone delivery program into several suburban neighborhoods in California and Texas. Customers in test zones can receive packages weighing...'
    }
  ];

  // Alert Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [stockForAlert, setStockForAlert] = useState<{ symbol: string; name: string; price: string }>({
    symbol: 'AAPL',
    name: 'Apple Inc',
    price: '229.65'
  });

  const handleSaveAlert = (data: PriceAlertData) => {
    const stockMatch = stocks.find(s => s.symbol === data.symbol) || {
      name: data.stockIdentifier,
      price: `$${data.thresholdValue}`,
      change: '+1.2%',
      isPositive: true
    };

    const condMap: Record<string, 'Price >' | 'Price <' | 'Price ='> = {
      'Greater than (>)': 'Price >',
      'Less than (<)': 'Price <',
      'Equal to (=)': 'Price ='
    };

    const newAlert: StockAlert = {
      id: `alt-${Date.now()}`,
      symbol: data.symbol,
      companyName: stockMatch.name,
      currentPrice: stockMatch.price,
      change: stockMatch.change,
      isPositive: stockMatch.isPositive,
      condition: condMap[data.condition] || 'Price >',
      targetPrice: `$${data.thresholdValue}`,
      frequency: data.frequency
    };

    setAlerts([newAlert, ...alerts]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const openAddAlertForStock = (symbol: string, currentPrice: string) => {
    const match = stocks.find(s => s.symbol === symbol) || { name: `${symbol} Inc`, price: currentPrice };
    setStockForAlert({
      symbol,
      name: match.name,
      price: currentPrice.replace('$', '')
    });
    setIsAlertModalOpen(true);
  };

  return (
    <div className="wl-page-container">
      {/* TOP SECTION: Watchlist Table & Alerts Stack */}
      <div className="wl-top-grid">
        
        {/* Left Column: Watchlist Table & Live TradingView Widgets */}
        <div className="wl-table-card">
          <div className="wl-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="wl-card-title">Watchlist &amp; Screener</h1>
              <div style={{ display: 'flex', background: '#12141c', border: '1px solid #232734', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setWatchlistMode('quotes')}
                  style={{
                    background: watchlistMode === 'quotes' ? '#fcd535' : 'transparent',
                    color: watchlistMode === 'quotes' ? '#181a20' : '#848e9c',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Live Quotes
                </button>
                <button
                  onClick={() => setWatchlistMode('mini-charts')}
                  style={{
                    background: watchlistMode === 'mini-charts' ? '#fcd535' : 'transparent',
                    color: watchlistMode === 'mini-charts' ? '#181a20' : '#848e9c',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Sparklines
                </button>
                <button
                  onClick={() => setWatchlistMode('table')}
                  style={{
                    background: watchlistMode === 'table' ? '#fcd535' : 'transparent',
                    color: watchlistMode === 'table' ? '#181a20' : '#848e9c',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Custom List
                </button>
              </div>
            </div>

            <button
              className="wl-btn-add-stock"
              onClick={() => onOpenSearch && onOpenSearch()}
            >
              Add Asset / Search
            </button>
          </div>

          {watchlistMode === 'quotes' && (
            <div style={{ width: '100%', minHeight: '520px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewMarketQuotes category="all" height={520} theme="dark" />
            </div>
          )}

          {watchlistMode === 'mini-charts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px', padding: '16px' }}>
              {watchlistSymbols.slice(0, 8).map((sym) => (
                <div
                  key={sym}
                  style={{
                    background: '#12141c',
                    border: '1px solid #1f232e',
                    borderRadius: '12px',
                    padding: '10px',
                    cursor: 'pointer',
                    minHeight: '225px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fcd535';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1f232e';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => onNavigateToStock && onNavigateToStock(sym)}
                >
                  <TradingViewMiniChart symbol={sym} theme="dark" height={210} dateRange="1D" />
                </div>
              ))}
            </div>
          )}

          {watchlistMode === 'table' && (
          <div className="wl-table-wrap">
            <table className="wl-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Market Cap</th>
                  <th>P/E Ratio</th>
                  <th style={{ textAlign: 'right' }}>Alert</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    onClick={() => onNavigateToStock && onNavigateToStock(stock.symbol)}
                  >
                    <td>
                      <div className="wl-company-cell">
                        <button
                          className="wl-star-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleWatchlist) onToggleWatchlist(stock.symbol);
                          }}
                        >
                          <Star size={15} fill="#fcd535" color="#fcd535" />
                        </button>
                        <span className="wl-company-name">{stock.name}</span>
                      </div>
                    </td>
                    <td className="wl-symbol-cell mono">{stock.symbol}</td>
                    <td className="wl-price-cell mono">{stock.price}</td>
                    <td>
                      <span className={`wl-change-cell mono ${stock.isPositive ? 'positive' : 'negative'}`}>
                        {stock.change}
                      </span>
                    </td>
                    <td className="wl-muted-cell mono">{stock.marketCap}</td>
                    <td className="wl-muted-cell mono">{stock.peRatio}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="wl-btn-add-alert"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddAlertForStock(stock.symbol, stock.price);
                        }}
                      >
                        Add Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Right Column: Alerts Stack */}
        <div className="wl-alerts-card">
          <div className="wl-card-header">
            <h1 className="wl-card-title">Alerts</h1>
            <button
              className="wl-btn-add-stock"
              onClick={() => {
                setStockForAlert({ symbol: 'AAPL', name: 'Apple Inc', price: '229.65' });
                setIsAlertModalOpen(true);
              }}
            >
              Create Alert
            </button>
          </div>

          <div className="wl-alerts-list">
            {alerts.map((alt) => (
              <div key={alt.id} className="wl-alert-item">
                <div className="wl-alert-top">
                  <div className="wl-alert-company-info">
                    <div className="wl-alert-logo">
                      {alt.symbol === 'AAPL' ? (
                        <span>AAPL</span>
                      ) : alt.symbol === 'TSLA' ? (
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>TSLA</span>
                      ) : alt.symbol === 'META' ? (
                        <span style={{ color: '#3b82f6', fontWeight: 800 }}>META</span>
                      ) : alt.symbol === 'MSFT' ? (
                        <span>MSFT</span>
                      ) : (
                        <span>{alt.symbol.slice(0, 4)}</span>
                      )}
                    </div>
                    <div>
                      <div className="wl-alert-name">{alt.companyName}</div>
                      <div className="wl-alert-price mono">{alt.currentPrice}</div>
                    </div>
                  </div>

                  <div className="wl-alert-right-head">
                    <div className="wl-alert-sym mono">{alt.symbol}</div>
                    <div className={`wl-alert-chg mono ${alt.isPositive ? 'positive' : 'negative'}`}>
                      {alt.change}
                    </div>
                  </div>
                </div>

                <div className="wl-alert-rule-row">
                  <div className="wl-alert-rule-text">
                    <span style={{ color: '#848e9c', fontSize: '11px' }}>Alert:</span>{' '}
                    <strong>{alt.condition} {alt.targetPrice}</strong>
                  </div>

                  <div className="wl-alert-actions">
                    <button
                      className="wl-alert-icon-btn"
                      title="Edit Alert"
                      onClick={() => openAddAlertForStock(alt.symbol, alt.currentPrice)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="wl-alert-icon-btn delete"
                      title="Delete Alert"
                      onClick={() => handleDeleteAlert(alt.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="wl-alert-footer">
                  <span className="wl-freq-pill">{alt.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: News Grid */}
      <div className="wl-news-section">
        <h2 className="wl-news-title">News</h2>

        <div className="wl-news-grid">
          {newsItems.map((news) => (
            <div
              key={news.id}
              className="wl-news-card"
              onClick={() => onNavigateToStock && onNavigateToStock(news.ticker)}
            >
              <div className="wl-news-top">
                <span className="wl-news-tag">{news.ticker}</span>
              </div>

              <h3 className="wl-news-headline">{news.title}</h3>

              <div className="wl-news-meta">
                <span>{news.source}</span>
                <span>•</span>
                <span>{news.timeAgo}</span>
              </div>

              <p className="wl-news-summary">{news.summary}</p>

              <div className="wl-news-readmore">
                Read More <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />

      {/* DEDICATED PRICE ALERT MODAL (Exact Reference Layout) */}
      <PriceAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        initialStock={stockForAlert}
        onSaveAlert={handleSaveAlert}
      />
    </div>
  );
};
