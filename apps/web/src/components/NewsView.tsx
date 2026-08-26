import React, { useState } from 'react';
import { Search, Flame, TrendingUp, Globe, Clock, ExternalLink, Bookmark, Share2 } from 'lucide-react';

interface NewsViewProps {
  onNavigateToStock?: (sym: string) => void;
  onNavigateToTrade?: (sym?: string) => void;
}

export const NewsView: React.FC<NewsViewProps> = ({ onNavigateToStock, onNavigateToTrade }) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Top Stories' | 'Stocks & Earnings' | 'Economy & Fed' | 'Tech & AI' | 'Crypto'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredStory = {
    source: 'The Wall Street Journal',
    time: '25 minutes ago',
    category: 'Economy & Fed',
    headline: 'Fed Officials Signal Potential Interest Rate Pivot as Inflation Cools Toward 2% Target',
    summary: 'Policymakers at the Federal Reserve indicate growing openness to easing borrowing costs as latest labor market data and consumer price indexes show steady normalization.',
    author: 'Nick Timiraos',
    ticker: 'SPY',
    change: '+1.42%',
    isPositive: true,
    bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
  };

  const newsArticles = [
    {
      id: 1,
      source: 'The Wall Street Journal',
      time: '37 minutes ago',
      category: 'Stocks & Earnings',
      headline: "Exclusive | Walmart's New Employee Perk Takes a Bite Out of Workers' Grocery Bills",
      summary: 'Retail giant rolls out employee discount expansions covering essential food items and grocery staples.',
      ticker: 'WMT',
      change: '-1.74%',
      isPositive: false,
      thumbBg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
    },
    {
      id: 2,
      source: 'Yahoo Finance',
      time: '42 minutes ago',
      category: 'Top Stories',
      headline: 'Stock Market Today: Dow Pops 300 Points, S&P 500 & Nasdaq Surge as Tech Rebounds',
      summary: 'Semiconductor manufacturers and megacap tech leaders drive broader indexes to fresh record territory.',
      ticker: 'NVDA',
      change: '+2.21%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #022c22, #059669)'
    },
    {
      id: 3,
      source: 'Bloomberg',
      time: '1 hour ago',
      category: 'Tech & AI',
      headline: 'Nvidia Corp (NVDA) Outlines Next-Gen Blackwell Architecture Delivery Roadmap',
      summary: 'Data center supply constraints begin easing as high-bandwidth memory production scales rapidly.',
      ticker: 'NVDA',
      change: '+1.52%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #713f12, #ca8a04)'
    },
    {
      id: 4,
      source: 'New York Post',
      time: '2 hours ago',
      category: 'Stocks & Earnings',
      headline: "Ex-Kroger CEO Must Reveal Details About Abrupt Exit in Ongoing Supermarket Merger Trial",
      summary: 'Federal antitrust proceedings scrutinize executive communications and internal divestiture models.',
      ticker: 'KR',
      change: '-2.15%',
      isPositive: false,
      thumbBg: 'linear-gradient(135deg, #374151, #4b5563)'
    },
    {
      id: 5,
      source: 'Reuters',
      time: '2 hours ago',
      category: 'Economy & Fed',
      headline: 'Treasury Yields Pull Back Across the Curve Following Soft Jobs & Manufacturing Readings',
      summary: '10-year US Treasury yield dips to 3.85% as bond traders price in three rate reductions before year end.',
      ticker: 'TLT',
      change: '+0.88%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #312e81, #6366f1)'
    },
    {
      id: 6,
      source: 'CNBC',
      time: '3 hours ago',
      category: 'Tech & AI',
      headline: 'Apple Eyes AI Search Partnerships and Siri Overhaul Ahead of Fall Hardware Keynote',
      summary: 'Cupertino company integrates on-device neural processing engine with private cloud compute safeguard.',
      ticker: 'AAPL',
      change: '+1.54%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #1e293b, #334155)'
    },
    {
      id: 7,
      source: 'CoinDesk',
      time: '3 hours ago',
      category: 'Crypto',
      headline: 'Bitcoin Holds $64,000 Range as Spot ETF Institutional Inflows Re-accelerate',
      summary: 'Asset managers report positive net flows for fifth consecutive session with over $450M in fresh capital.',
      ticker: 'BTC/USDT',
      change: '+3.14%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #7c2d12, #ea580c)'
    },
    {
      id: 8,
      source: 'Financial Times',
      time: '4 hours ago',
      category: 'Top Stories',
      headline: 'Global Central Banks Coordinate Liquidity Swap Facilities Amid European Sovereign Debt Moves',
      summary: 'ECB and Bank of England reaffirm commitment to orderly FX stability with multi-currency credit lines.',
      ticker: 'EUR/USD',
      change: '+0.32%',
      isPositive: true,
      thumbBg: 'linear-gradient(135deg, #134e4a, #0d9488)'
    }
  ];

  const filteredArticles = newsArticles.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesQuery = !searchQuery || 
      item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleStockClick = (ticker: string) => {
    const clean = ticker.replace('/USDT', '');
    if (onNavigateToStock) {
      onNavigateToStock(clean);
    } else if (onNavigateToTrade) {
      onNavigateToTrade(ticker);
    }
  };

  return (
    <div className="news-page-container">
      <div className="news-page-wrapper">
        
        {/* HEADER & CONTROLS */}
        <div className="news-page-header">
          <div>
            <h1 className="news-page-title">Financial &amp; Market News</h1>
            <p className="news-page-subtitle">
              Live intelligence, breaking corporate updates, macroeconomic analysis, and earnings reports.
            </p>
          </div>

          <div className="news-search-box">
            <Search size={15} color="#848e9c" />
            <input
              type="text"
              placeholder="Search news by topic, company, or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="news-search-input"
            />
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="news-categories-bar">
          {(['All', 'Top Stories', 'Stocks & Earnings', 'Economy & Fed', 'Tech & AI', 'Crypto'] as const).map((cat) => (
            <button
              key={cat}
              className={`news-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* HERO FEATURED STORY */}
        {!searchQuery && activeCategory === 'All' && (
          <div className="news-featured-card" onClick={() => handleStockClick(featuredStory.ticker)}>
            <div className="news-featured-content">
              <div className="news-featured-badge-row">
                <span className="featured-pill">FEATURED REPORT</span>
                <span className="featured-cat">{featuredStory.category}</span>
                <span className="featured-time">{featuredStory.source} • {featuredStory.time}</span>
              </div>

              <h2 className="news-featured-headline">{featuredStory.headline}</h2>
              <p className="news-featured-summary">{featuredStory.summary}</p>

              <div className="news-featured-footer">
                <span className={`news-ticker-pill ${featuredStory.isPositive ? 'positive' : 'negative'} mono`}>
                  {featuredStory.ticker} {featuredStory.change}
                </span>
                <span className="news-read-action">
                  Full Coverage <ExternalLink size={13} style={{ marginLeft: '4px' }} />
                </span>
              </div>
            </div>

            <div className="news-featured-graphic" style={{ background: featuredStory.bg }}>
              <div style={{ textAlign: 'center', color: '#ffffff' }}>
                <Globe size={40} style={{ opacity: 0.8, marginBottom: '8px' }} />
                <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>MACRO INTELLIGENCE</div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Real-time Fed Sentiment Index</div>
              </div>
            </div>
          </div>
        )}

        {/* ARTICLES GRID */}
        <div className="news-articles-grid">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="news-grid-card"
              onClick={() => handleStockClick(article.ticker)}
            >
              <div className="news-card-top">
                <span className="news-card-source">{article.source}</span>
                <span className="news-card-time">{article.time}</span>
              </div>

              <h3 className="news-card-headline">{article.headline}</h3>
              <p className="news-card-summary">{article.summary}</p>

              <div className="news-card-footer">
                <span className={`news-ticker-pill ${article.isPositive ? 'positive' : 'negative'} mono`}>
                  {article.ticker} {article.change}
                </span>
                <button
                  className="news-bookmark-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="Bookmark"
                >
                  <Bookmark size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
