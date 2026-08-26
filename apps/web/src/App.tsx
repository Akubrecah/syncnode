import React, { useState, useEffect, useRef } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WatchlistView } from './components/WatchlistView';
import { NewsView } from './components/NewsView';
import { StockDetailView } from './components/StockDetailView';
import { EmailTemplatesView } from './components/EmailTemplatesView';
import { SearchModal } from './components/SearchModal';
import { HomeView } from './components/HomeView';
import { TickerBar } from './components/TickerBar';
import { TradingChart } from './components/TradingChart';
import { OrderBook } from './components/OrderBook';
import { RecentTrades } from './components/RecentTrades';
import { OrderEntryForm } from './components/OrderEntryForm';
import { UserOrdersTable } from './components/UserOrdersTable';
import { WalletView } from './components/WalletView';
import { P2PView } from './components/P2PView';
import { SecurityView } from './components/SecurityView';
import { MarketsOverviewView } from './components/MarketsOverviewView';
import { EarnView } from './components/EarnView';
import { AdminConsole } from './components/admin/AdminConsole';
import { SignupView } from './components/SignupView';

function parseUrlHash(): { tab: TabType; symbol: string; stockSymbol: string; isSearch: boolean } {
  const defaultSymbol = localStorage.getItem('syncnode_active_symbol') || 'BTC/USDT';
  const defaultStock = localStorage.getItem('syncnode_active_stock') || 'NVDA';
  
  let raw = '';
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
    raw = hash || pathname;
  }

  // Filter out any corrupted widget event strings
  if (raw.includes('TV-WIDGET') || raw.includes('LOAD')) {
    raw = 'stock';
  }

  if (!raw || raw === 'home') {
    return { tab: 'home', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  // Support /stock, /stock/NVDA, /stock/GOLD, #/stock/AAPL
  if (raw.startsWith('stock/') || raw.startsWith('stocks/')) {
    let symPart = raw.replace(/^stocks?\//i, '').toUpperCase().trim();
    if (symPart.includes('TV-WIDGET') || symPart.includes('LOAD') || symPart.length === 0) {
      symPart = defaultStock;
    }
    return { tab: 'stock', symbol: defaultSymbol, stockSymbol: symPart, isSearch: false };
  }

  if (raw === 'stock' || raw === 'stocks') {
    return { tab: 'stock', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  // Support #/trade/BTC-USDT or #/trade/ETH-USDT
  if (raw.startsWith('trade/')) {
    const symPart = raw.replace('trade/', '').replace('-', '/').toUpperCase();
    return { tab: 'spot', symbol: symPart || defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw.startsWith('spot')) {
    const queryIdx = raw.indexOf('?');
    if (queryIdx !== -1) {
      const params = new URLSearchParams(raw.slice(queryIdx));
      const sym = params.get('symbol');
      if (sym) return { tab: 'spot', symbol: sym.toUpperCase(), stockSymbol: defaultStock, isSearch: false };
    }
    return { tab: 'spot', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (
    raw === 'markets' ||
    raw.startsWith('markets') ||
    raw === 'futures' ||
    raw.startsWith('futures') ||
    raw === 'coin-m' ||
    raw.startsWith('coin-m') ||
    raw.includes('quarterly')
  ) {
    return { tab: 'markets', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'dashboard') {
    return { tab: 'dashboard', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'search') {
    return { tab: 'dashboard', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: true };
  }

  if (raw === 'watchlist') {
    return { tab: 'watchlist', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'news') {
    return { tab: 'news', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'admin' || raw.startsWith('admin/')) {
    return { tab: 'admin', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'earn' || raw.startsWith('earn')) {
    return { tab: 'earn', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (['home', 'dashboard', 'watchlist', 'news', 'stock', 'spot', 'earn', 'p2p', 'wallet', 'security', 'admin', 'signup', 'login'].includes(raw)) {
    return { tab: raw as TabType, symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  return { tab: 'home', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
}

export const App: React.FC = () => {
  const initialRoute = parseUrlHash();
  const [activeTab, setActiveTabState] = useState<TabType>(initialRoute.tab);
  const [symbol, setSymbolState] = useState<string>(initialRoute.symbol);
  const [stockSymbol, setStockSymbolState] = useState<string>(initialRoute.stockSymbol);
  const [isSearchOpen, setIsSearchOpen] = useState(initialRoute.isSearch);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('syncnode_watchlist');
      return saved ? JSON.parse(saved) : ['AAPL', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META'];
    } catch {
      return ['AAPL', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META'];
    }
  });

  const [markets, setMarkets] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any | null>(null);
  const [depth, setDepth] = useState<any>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string | undefined>(undefined);

  const toggleWatchlist = (sym: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      localStorage.setItem('syncnode_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const setActiveTab = (tab: TabType, targetSymbol?: string) => {
    setActiveTabState(tab);
    localStorage.setItem('syncnode_active_tab', tab);
    if (tab === 'spot') {
      const sym = targetSymbol || symbol;
      window.location.hash = `#/trade/${sym.replace('/', '-')}`;
    } else if (tab === 'stock') {
      const sym = targetSymbol || stockSymbol;
      setStockSymbolState(sym);
      localStorage.setItem('syncnode_active_stock', sym);
      window.location.hash = `#/stock/${sym}`;
    } else {
      window.location.hash = `#/${tab}`;
    }
  };

  const setSymbol = (newSymbol: string) => {
    setSymbolState(newSymbol);
    localStorage.setItem('syncnode_active_symbol', newSymbol);
    if (activeTab === 'spot') {
      window.location.hash = `#/trade/${newSymbol.replace('/', '-')}`;
    }
  };

  const setStockSymbol = (newStock: string) => {
    setStockSymbolState(newStock);
    localStorage.setItem('syncnode_active_stock', newStock);
    if (activeTab === 'stock') {
      window.location.hash = `#/stock/${newStock}`;
    }
  };

  // Keyboard shortcut Cmd+K or Ctrl+K for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize on browser Back/Forward/hashchange
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname.length > 1) {
      window.history.replaceState(null, '', window.location.hash || `#/stock/${initialRoute.stockSymbol}`);
    }

    if (!window.location.hash) {
      if (initialRoute.tab === 'spot') {
        window.location.hash = `#/trade/${initialRoute.symbol.replace('/', '-')}`;
      } else if (initialRoute.tab === 'stock') {
        window.location.hash = `#/stock/${initialRoute.stockSymbol}`;
      } else {
        window.location.hash = `#/${initialRoute.tab}`;
      }
    }

    const handleHashChange = () => {
      const route = parseUrlHash();
      setActiveTabState(route.tab);
      localStorage.setItem('syncnode_active_tab', route.tab);
      if (route.symbol) {
        setSymbolState(route.symbol);
        localStorage.setItem('syncnode_active_symbol', route.symbol);
      }
      if (route.stockSymbol) {
        setStockSymbolState(route.stockSymbol);
        localStorage.setItem('syncnode_active_stock', route.stockSymbol);
      }
      if (route.isSearch) {
        setIsSearchOpen(true);
      }
    };

    // Global link interceptor: Prevent external redirects from widgets or chart links
    const handleGlobalClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || anchor.href || '';
        if (
          href.includes('tradingview.com') ||
          href.includes('tradeview')
        ) {
          e.preventDefault();
          e.stopPropagation();
          const match = href.match(/symbols\/([a-zA-Z0-9_\-:]+)/i);
          if (match && match[1]) {
            const raw = match[1].toUpperCase().replace(/^.*:/, '').replace('/', '-');
            if (raw.endsWith('USDT') || raw.includes('BTC') || raw.includes('ETH') || raw.includes('SOL') || raw.includes('BNB')) {
              setActiveTab('spot', raw.replace('-', '/'));
            } else {
              setActiveTab('stock', raw);
            }
          } else {
            setActiveTab('spot');
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  // User and Auth State
  const [user, setUser] = useState<any | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<any>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/v1/markets');
      const json = await res.json();
      if (json.success) setMarkets(json.markets);
    } catch (e: any) {
      console.warn('Failed to fetch markets:', e?.message || e);
    }
  };

  const fetchTicker = async () => {
    try {
      const res = await fetch(`/api/v1/markets/${encodeURIComponent(symbol)}/ticker`);
      const json = await res.json();
      if (json.success) setTicker(json.ticker);
    } catch (e: any) {
      console.warn(`Failed to fetch ticker for ${symbol}:`, e?.message || e);
    }
  };

  const fetchDepth = async () => {
    try {
      const res = await fetch(`/api/v1/markets/${encodeURIComponent(symbol)}/depth?limit=20`);
      const json = await res.json();
      if (json.success) setDepth(json.depth);
    } catch (e: any) {
      console.warn(`Failed to fetch depth for ${symbol}:`, e?.message || e);
    }
  };

  const fetchRecentTrades = async () => {
    try {
      const res = await fetch(`/api/v1/markets/${encodeURIComponent(symbol)}/trades?limit=40`);
      const json = await res.json();
      if (json.success) setRecentTrades(json.trades);
    } catch (e: any) {
      console.warn(`Failed to fetch trades for ${symbol}:`, e?.message || e);
    }
  };

  const fetchUserData = async () => {
    const token = localStorage.getItem('syncnode_token');
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const [meRes, balRes, ordRes, trdRes, cbRes] = await Promise.all([
        fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/balances', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/trades/my', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/circuit-breakers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const meJson = await meRes.json();
      const balJson = await balRes.json();
      const ordJson = await ordRes.json();
      const trdJson = await trdRes.json();
      const cbJson = await cbRes.json();

      if (meJson.success) setUser(meJson.user);
      if (balJson.success) setBalances(balJson.balances);
      if (ordJson.success) setOrders(ordJson.orders);
      if (trdJson.success) setUserTrades(trdJson.trades);
      if (cbJson.success) setCircuitBreakers(cbJson.circuitBreakers);
    } catch (e: any) {
      console.warn('Failed to fetch user data:', e?.message || e);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchMarkets();
    fetchUserData();
  }, []);

  // Poll market state every 1.5 seconds
  useEffect(() => {
    fetchTicker();
    fetchDepth();
    fetchRecentTrades();

    const timer = setInterval(() => {
      fetchTicker();
      fetchDepth();
      fetchRecentTrades();
      if (user) fetchUserData();
    }, 1500);

    return () => clearInterval(timer);
  }, [symbol, user?.id]);

  // Connect Authenticated WebSocket stream (CRIT-004)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('syncnode_token');
    const wsUrl = token
      ? `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
      : `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsWsConnected(true);
      if (token) {
        ws.send(JSON.stringify({ action: 'AUTH', token }));
      }
      ws.send(JSON.stringify({
        action: 'SUBSCRIBE',
        channels: [`depth@${symbol}`, `trades@${symbol}`, `ticker@${symbol}`]
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel === `depth@${symbol}`) {
          setDepth(msg.data);
        } else if (msg.channel === `trades@${symbol}`) {
          setRecentTrades((prev) => [msg.data, ...prev.slice(0, 39)]);
        }
      } catch (e: any) {
        console.warn('Failed to parse WebSocket message:', e?.message || e);
      }
    };

    ws.onclose = () => setIsWsConnected(false);
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [symbol]);

  const handleLogout = () => {
    localStorage.removeItem('syncnode_token');
    setUser(null);
    setBalances([]);
    setOrders([]);
    setActiveTab('dashboard');
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUserData();
      fetchDepth();
    } catch (e: any) {
      console.warn(`Failed to cancel order ${orderId}:`, e?.message || e);
    }
  };

  const handleCancelAllOrders = async () => {
    try {
      const token = localStorage.getItem('syncnode_token');
      await fetch('/api/v1/orders/cancel-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ symbol })
      });
      fetchUserData();
      fetchDepth();
    } catch (e: any) {
      console.warn('Failed to cancel all orders:', e?.message || e);
    }
  };

  const handleAuthSuccess = (newUser: any, token: string) => {
    setUser(newUser);
    fetchUserData();
    setActiveTab('dashboard');
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setActiveTab('signup')}
        onOpenSearch={() => setIsSearchOpen(true)}
        isSearchOpen={isSearchOpen}
        onLogout={handleLogout}
        isWsConnected={isWsConnected}
        circuitBreakers={circuitBreakers}
      />

      {/* SEARCH MODAL (Triggered via Search Nav item or Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        watchlist={watchlist}
        onToggleWatchlist={toggleWatchlist}
        onSelectStock={(sym) => {
          setStockSymbol(sym);
          setActiveTab('stock', sym);
        }}
      />

      {/* 1. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <DashboardView
          user={user}
          balances={balances}
          orders={orders}
          userTrades={userTrades}
          onRefreshUser={fetchUserData}
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
          onNavigateToStock={(sym) => {
            setStockSymbol(sym);
            setActiveTab('stock', sym);
          }}
          onNavigateToTab={(tab, sym) => {
            setActiveTab(tab as any, sym);
          }}
        />
      )}

      {/* 2. WATCHLIST & ALERTS VIEW */}
      {activeTab === 'watchlist' && (
        <WatchlistView
          watchlistSymbols={watchlist}
          onToggleWatchlist={toggleWatchlist}
          onNavigateToStock={(sym) => {
            setStockSymbol(sym);
            setActiveTab('stock', sym);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      {/* 3. DEDICATED FINANCIAL NEWS VIEW */}
      {activeTab === 'news' && (
        <NewsView
          onNavigateToStock={(sym) => {
            setStockSymbol(sym);
            setActiveTab('stock', sym);
          }}
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
        />
      )}

      {/* 4. STOCK DETAILED PAGE */}
      {activeTab === 'stock' && (
        <StockDetailView
          stockSymbol={stockSymbol}
          onSelectStock={(sym) => {
            setStockSymbol(sym);
            setActiveTab('stock', sym);
          }}
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
        />
      )}

      {/* 5. EMAIL TEMPLATES SHOWCASE VIEW (All 5 Templates) */}
      {activeTab === 'emails' && (
        <EmailTemplatesView />
      )}

      {/* 6. SIGNUP & PERSONALIZATION FULL VIEW */}
      {(activeTab === 'signup' || activeTab === 'login') && (
        <SignupView
          initialMode={activeTab === 'login' ? 'login' : 'signup'}
          onSuccess={handleAuthSuccess}
          onNavigateHome={() => setActiveTab('dashboard')}
        />
      )}

      {/* 6.5 MARKETS OVERVIEW INSTITUTIONAL PAGE */}
      {activeTab === 'markets' && (
        <MarketsOverviewView
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
          onNavigateToStock={(sym) => {
            if (sym) {
              setStockSymbol(sym);
              setActiveTab('stock', sym);
            }
          }}
        />
      )}

      {/* 6.75 BINANCE EARN VIEW */}
      {activeTab === 'earn' && (
        <EarnView
          user={user}
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
          onOpenAuth={() => setActiveTab('signup')}
        />
      )}

      {/* 7. HOME & LANDING VIEW */}
      {activeTab === 'home' && (
        <HomeView
          markets={markets}
          onSelectSymbol={setSymbol}
          onNavigateToTrade={(sym) => {
            if (sym) {
              setSymbol(sym);
              setActiveTab('spot', sym);
            } else {
              setActiveTab('spot');
            }
          }}
          onNavigateToP2P={() => setActiveTab('p2p')}
          onOpenAuth={() => setActiveTab('signup')}
          user={user}
        />
      )}

      {/* 8. SPOT TRADING TERMINAL */}
      {activeTab === 'spot' && (
        <div className="terminal-grid">
          <TickerBar
            symbol={symbol}
            onSelectSymbol={setSymbol}
            ticker={ticker}
            markets={markets}
          />

          <OrderBook
            depth={depth}
            onSelectPrice={(p) => setSelectedPrice(p)}
            lastPrice={ticker?.lastPrice}
            spread={ticker?.spread}
          />

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <TradingChart symbol={symbol} />
            </div>
            <UserOrdersTable
              orders={orders}
              userTrades={userTrades}
              onCancelOrder={handleCancelOrder}
              onCancelAllOrders={handleCancelAllOrders}
            />
          </div>

          <RecentTrades trades={recentTrades} />

          <OrderEntryForm
            symbol={symbol}
            selectedPrice={selectedPrice}
            balances={balances}
            onOrderSubmitted={() => {
              fetchUserData();
              fetchDepth();
              fetchRecentTrades();
            }}
            user={user}
            onOpenAuth={() => setActiveTab('signup')}
          />
        </div>
      )}

      {/* 9. P2P ESCROW */}
      {activeTab === 'p2p' && (
        <P2PView user={user} onOpenAuth={() => setActiveTab('signup')} />
      )}

      {/* 10. ASSETS & WALLET */}
      {activeTab === 'wallet' && (
        <WalletView balances={balances} onRefresh={fetchUserData} />
      )}

      {/* 11. SECURITY & 2FA */}
      {activeTab === 'security' && (
        <SecurityView user={user} onRefreshUser={fetchUserData} />
      )}

      {/* 12. ADMIN CONSOLE */}
      {activeTab === 'admin' && (
        <AdminConsole />
      )}
    </div>
  );
};
