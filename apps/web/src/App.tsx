import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { NewsView } from './components/NewsView';
import { SearchModal } from './components/SearchModal';
import { HomeView } from './components/HomeView';
import { TickerBar } from './components/TickerBar';
import { TradingChart } from './components/TradingChart';
import { OrderBook } from './components/OrderBook';
import { RecentTrades } from './components/RecentTrades';
import { OrderEntryForm } from './components/OrderEntryForm';
import { UserOrdersTable } from './components/UserOrdersTable';
import { MarketsOverviewView } from './components/MarketsOverviewView';
import { SignupView } from './components/SignupView';
import { SpotTradeView } from './components/SpotTradeView';

const WatchlistView = lazy(() => import('./components/WatchlistView').then(m => ({ default: m.WatchlistView })));
const StockDetailView = lazy(() => import('./components/StockDetailView').then(m => ({ default: m.StockDetailView })));
const EmailTemplatesView = lazy(() => import('./components/EmailTemplatesView').then(m => ({ default: m.EmailTemplatesView })));
const P2PView = lazy(() => import('./components/P2PView').then(m => ({ default: m.P2PView })));
const InvestmentView = lazy(() => import('./components/InvestmentView').then(m => ({ default: m.InvestmentView })));
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(m => ({ default: m.AdminConsole })));

const ViewFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#848e9c' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #2b313a', borderTopColor: '#fcd535', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading Terminal...</span>
    </div>
  </div>
);


function parseUrlRoute(): { tab: TabType; symbol: string; stockSymbol: string; isSearch: boolean } {
  const defaultSymbol = localStorage.getItem('syncnode_active_symbol') || 'BTC/USDT';
  const defaultStock = localStorage.getItem('syncnode_active_stock') || 'NVDA';
  
  let raw = '';
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    raw = pathname || hash;
  }

  // Filter out any corrupted widget event strings
  if (raw.includes('TV-WIDGET') || raw.includes('LOAD')) {
    raw = 'stock';
  }

  if (!raw || raw === 'home') {
    return { tab: 'home', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  // Direct Admin Access
  if (raw === 'admin' || raw.startsWith('admin/')) {
    return { tab: 'admin', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  // Support /stock, /stock/NVDA, /stocks/AAPL
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

  // Support /trade/BTC-USDT or /trade/ETH-USDT
  if (raw.startsWith('trade/') || raw.startsWith('spot/')) {
    const symPart = raw.replace(/^(trade|spot)\//i, '').replace('-', '/').toUpperCase();
    return { tab: 'spot', symbol: symPart || defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'trade' || raw === 'spot') {
    return { tab: 'spot', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'signup') {
    return { tab: 'signup', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'login') {
    return { tab: 'login', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (
    raw === 'futures' ||
    raw === 'futures-wallet' ||
    raw === 'usds-m' ||
    raw === 'coin-m' ||
    raw === 'features'
  ) {
    return { tab: 'futures', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (
    raw === 'funding' ||
    raw === 'funding-wallet' ||
    raw === 'pay' ||
    raw === 'binance-pay'
  ) {
    return { tab: 'funding', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (
    raw === 'markets' ||
    raw.startsWith('markets') ||
    raw.includes('quarterly')
  ) {
    return { tab: 'markets', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'deposit') {
    return { tab: 'deposit', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'withdraw') {
    return { tab: 'withdraw', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'assets' || raw === 'wallet' || raw === 'balances') {
    return { tab: 'assets', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'margin' || raw === 'cross-margin' || raw === 'isolated-margin') {
    return { tab: 'margin', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'transfers' || raw === 'transfer') {
    return { tab: 'transfers', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (
    raw === 'orders' ||
    raw === 'trades' ||
    raw === 'order-history' ||
    raw.startsWith('orders/') ||
    raw.startsWith('orders-')
  ) {
    return { tab: 'orders', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'security' || raw === '2fa') {
    return { tab: 'security', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'kyc' || raw === 'identity' || raw === 'verification') {
    return { tab: 'kyc', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'api-keys' || raw === 'apikeys' || raw === 'api') {
    return { tab: 'apikeys', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'sessions' || raw === 'devices') {
    return { tab: 'sessions', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'settings' || raw === 'preferences' || raw === 'profile') {
    return { tab: 'settings', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (
    raw === 'history' ||
    raw === 'tx-history' ||
    raw === 'assets-history'
  ) {
    return { tab: 'history', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'emails' || raw === 'templates') {
    return { tab: 'emails', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }
  if (raw === 'p2p' || raw.startsWith('p2p')) {
    return { tab: 'p2p', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'dashboard' || raw === 'overview') {
    return { tab: 'dashboard', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'watchlist') {
    return { tab: 'watchlist', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'news') {
    return { tab: 'news', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (raw === 'earn' || raw.startsWith('earn') || raw === 'invest' || raw.startsWith('invest') || raw === 'staking') {
    return { tab: 'earn', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  if (['home', 'dashboard', 'watchlist', 'news', 'stock', 'spot', 'earn', 'p2p', 'wallet', 'assets', 'margin', 'futures', 'funding', 'deposit', 'withdraw', 'transfers', 'orders', 'history', 'security', 'kyc', 'apikeys', 'sessions', 'settings', 'admin', 'emails', 'signup', 'login'].includes(raw)) {
    return { tab: raw as TabType, symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
  }

  return { tab: 'home', symbol: defaultSymbol, stockSymbol: defaultStock, isSearch: false };
}

// Centralized Protected and Administrative Route Definitions
const PROTECTED_TABS: Set<TabType> = new Set([
  'dashboard',
  'wallet',
  'assets',
  'margin',
  'futures',
  'funding',
  'deposit',
  'withdraw',
  'transfers',
  'orders',
  'history',
  'stock',
  'security',
  'kyc',
  'apikeys',
  'sessions',
  'settings'
]);

const UNAUTH_ONLY_TABS: Set<TabType> = new Set([
  'signup',
  'login'
]);

const ADMIN_TABS: Set<TabType> = new Set([
  'admin',
  'emails'
]);

export const App: React.FC = () => {
  const initialRoute = parseUrlRoute();

  const [activeTab, setActiveTabState] = useState<TabType>(initialRoute.tab);
  const [symbol, setSymbolState] = useState<string>(initialRoute.symbol);
  const [stockSymbol, setStockSymbolState] = useState<string>(initialRoute.stockSymbol);
  const [isSearchOpen, setIsSearchOpen] = useState(initialRoute.isSearch);

  // Market and Data state
  const [markets, setMarkets] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any | null>(null);
  const [depth, setDepth] = useState<any | null>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string | undefined>(undefined);

  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useUser();

  // User and Auth State
  const [user, setUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('syncnode_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [balances, setBalances] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<any>(null);
  const [isWsConnected, setIsWsConnected] = useState(true);


  const wsRef = useRef<WebSocket | null>(null);

  // Watchlist state stored in localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('syncnode_watchlist');
      return saved ? JSON.parse(saved) : ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'BTC', 'ETH', 'SOL'];
    } catch {
      return ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'BTC', 'ETH', 'SOL'];
    }
  });

  const toggleWatchlist = (sym: string) => {
    const upper = sym.toUpperCase();
    setWatchlist((prev) => {
      const exists = prev.includes(upper);
      const next = exists ? prev.filter((s) => s !== upper) : [...prev, upper];
      localStorage.setItem('syncnode_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const setActiveTab = (tab: TabType, extraParam?: string) => {
    const hasAuth = !!user || !!localStorage.getItem('syncnode_token');

    // Unauthenticated-only route guard: If already logged in, redirect away from signup / login to dashboard
    if (UNAUTH_ONLY_TABS.has(tab) && hasAuth && !loadingUser) {
      setActiveTabState('dashboard');
      if (window.location.pathname !== '/dashboard') {
        window.history.pushState(null, '', '/dashboard');
      }
      return;
    }

    // Client-side authentication & permission check before tab transition
    if (PROTECTED_TABS.has(tab) && !hasAuth && !loadingUser) {
      setActiveTabState('signup');
      if (window.location.pathname !== '/signup') {
        window.history.pushState(null, '', '/signup');
      }
      return;
    }

    setActiveTabState(tab);
    localStorage.setItem('syncnode_active_tab', tab);

    let targetPath = `/${tab}`;
    if (tab === 'home') {
      targetPath = '/';
    } else if (tab === 'spot') {
      const sym = (extraParam || symbol).replace('/', '-');
      targetPath = `/trade/${sym}`;
    } else if (tab === 'stock') {
      const stockSym = extraParam || stockSymbol;
      targetPath = `/stock/${stockSym}`;
    } else if (tab === 'admin') {
      targetPath = '/admin';
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const setSymbol = (newSymbol: string) => {
    setSymbolState(newSymbol);
    localStorage.setItem('syncnode_active_symbol', newSymbol);
    if (activeTab === 'spot') {
      const target = `/trade/${newSymbol.replace('/', '-')}`;
      if (window.location.pathname !== target) {
        window.history.pushState(null, '', target);
      }
    }
  };

  const setStockSymbol = (newStock: string) => {
    setStockSymbolState(newStock);
    localStorage.setItem('syncnode_active_stock', newStock);
    if (activeTab === 'stock') {
      const target = `/stock/${newStock}`;
      if (window.location.pathname !== target) {
        window.history.pushState(null, '', target);
      }
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

  // Auto-redirect authenticated user from login/signup straight to dashboard
  useEffect(() => {
    const hasAuth = !!user || !!localStorage.getItem('syncnode_token');
    if (hasAuth && (activeTab === 'login' || activeTab === 'signup')) {
      setActiveTabState('dashboard');
      if (window.location.pathname !== '/dashboard') {
        window.history.replaceState(null, '', '/dashboard');
      }
    }
  }, [user, activeTab]);

  // Synchronize on browser Back/Forward/PopState (No '#' hash)
  useEffect(() => {
    // If user lands with legacy hash, cleanly upgrade to HTML5 clean path
    if (typeof window !== 'undefined' && window.location.hash) {
      const cleanHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (cleanHash) {
        const cleanPath = cleanHash === 'home' ? '/' : `/${cleanHash}`;
        window.history.replaceState(null, '', cleanPath);
      }
    }

    const handlePopState = () => {
      const route = parseUrlRoute();
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

    window.addEventListener('hashchange', handlePopState);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('hashchange', handlePopState);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

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
      setLoadingUser(false);
      return;
    }

    try {
      const meRes = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      
      // Token expiration / 401 handling with automatic refresh token rotation
      if (meRes.status === 401) {
        const refreshToken = localStorage.getItem('syncnode_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await fetch('/api/v1/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });
            const refreshJson = await refreshRes.json();
            if (refreshJson.success && refreshJson.token) {
              localStorage.setItem('syncnode_token', refreshJson.token);
              if (refreshJson.refreshToken) {
                localStorage.setItem('syncnode_refresh_token', refreshJson.refreshToken);
              }
              return fetchUserData();
            }
          } catch (refErr) {
            console.warn('Token refresh failed:', refErr);
          }
        }

        // Preserve active user profile
        setLoadingUser(false);
        return;
      }

      const [balRes, ordRes, trdRes, cbRes, txRes] = await Promise.all([
        fetch('/api/v1/balances', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/trades/my', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/circuit-breakers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const meJson = await meRes.json();
      const balJson = await balRes.json();
      const ordJson = await ordRes.json();
      const trdJson = await trdRes.json();
      const cbJson = await cbRes.json();
      const txJson = await txRes.json();

      if (meJson.success && meJson.user) {
        setUser(meJson.user);
        localStorage.setItem('syncnode_user', JSON.stringify(meJson.user));
      }
      if (balJson.success) setBalances(balJson.balances);
      if (ordJson.success) setOrders(ordJson.orders);
      if (trdJson.success) setUserTrades(trdJson.trades);
      if (cbJson.success) setCircuitBreakers(cbJson.circuitBreakers);
      if (txJson.success && Array.isArray(txJson.transactions)) setTransactions(txJson.transactions);
    } catch (e: any) {
      console.warn('Failed to fetch user data:', e?.message || e);
    } finally {
      setLoadingUser(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchMarkets();
    fetchUserData();
  }, []);

  // Realtime Clerk User Synchronization
  useEffect(() => {
    if (!isClerkLoaded) return;
    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) return;

      const userProfile = {
        id: clerkUser.id,
        email: email,
        fullName: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0],
        avatarUrl: clerkUser.imageUrl,
        kyc_tier: 1,
        kyc_status: 'UNVERIFIED',
        created_at: Date.now()
      };

      const existingToken = localStorage.getItem('syncnode_token');
      if (!existingToken) {
        localStorage.setItem('syncnode_token', `clerk_tok_${clerkUser.id}`);
      }
      localStorage.setItem('syncnode_user', JSON.stringify(userProfile));
      setUser(userProfile);

      if (activeTab === 'signup' || activeTab === 'login') {
        setActiveTabState('dashboard');
        if (window.location.pathname !== '/dashboard') {
          window.history.pushState(null, '', '/dashboard');
        }
      }

      const syncWithBackend = async () => {
        try {
          const res = await fetch('/api/v1/auth/clerk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkId: clerkUser.id,
              email: email,
              fullName: userProfile.fullName,
              avatarUrl: clerkUser.imageUrl,
              provider: 'clerk'
            })
          });
          const data = await res.json();
          if (data.success && data.token) {
            localStorage.setItem('syncnode_token', data.token);
            if (data.refreshToken) localStorage.setItem('syncnode_refresh_token', data.refreshToken);
            if (data.user) {
              localStorage.setItem('syncnode_user', JSON.stringify(data.user));
              setUser(data.user);
            }
            fetchUserData();
          }
        } catch (e) {
          console.warn('Background clerk sync notice:', e);
        }
      };
      syncWithBackend();
    }
  }, [isClerkLoaded, isClerkSignedIn, clerkUser?.id]);

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

  // Connect Authenticated WebSocket stream with Railway production fallback and auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isCleanedUp = false;

    const getWsUrl = () => {
      const token = localStorage.getItem('syncnode_token');
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return `ws://localhost:8000/ws${tokenParam}`;
      }
      return `wss://syncnode-web-production.up.railway.app/ws${tokenParam}`;
    };

    const connect = () => {
      if (isCleanedUp) return;
      try {
        const url = getWsUrl();
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (isCleanedUp) return;
          setIsWsConnected(true);
          const token = localStorage.getItem('syncnode_token');
          if (token) {
            ws?.send(JSON.stringify({ action: 'AUTH', token }));
          }
          ws?.send(JSON.stringify({
            action: 'SUBSCRIBE',
            channels: [`depth@${symbol}`, `trades@${symbol}`, `ticker@${symbol}`]
          }));
        };

        ws.onmessage = (event) => {
          if (isCleanedUp) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'BALANCE_UPDATE') {
              if (msg.balances) setBalances(msg.balances);
              if (localStorage.getItem('syncnode_token')) fetchUserData();
            } else if (msg.type === 'ORDER_UPDATE' || msg.type === 'TRADE_UPDATE') {
              fetchUserData();
            } else if (msg.channel === `depth@${symbol}`) {
              setDepth(msg.data);
            } else if (msg.channel === `trades@${symbol}`) {
              setRecentTrades((prev) => [msg.data, ...prev.slice(0, 39)]);
            }
          } catch (e: any) {
            console.warn('Failed to parse WebSocket message:', e?.message || e);
          }
        };

        ws.onclose = () => {
          if (isCleanedUp) return;
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            setIsWsConnected(true);
          } else {
            setIsWsConnected(false);
          }
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (isCleanedUp) return;
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            setIsWsConnected(true);
          } else {
            setIsWsConnected(false);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setIsWsConnected(true);
        }
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isCleanedUp = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [symbol]);

  // Real-time synchronization when tab is active/focused
  useEffect(() => {
    const handleSync = () => {
      if (localStorage.getItem('syncnode_token')) {
        fetchUserData();
      }
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('syncnode_token');
    localStorage.removeItem('syncnode_user');
    setUser(null);
    setActiveTab('home');
  };

  const handleCancelOrder = async (orderId: string) => {
    const token = localStorage.getItem('syncnode_token');
    if (!token) return;
    try {
      await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchUserData();
      fetchDepth();
    } catch (e: any) {
      console.warn('Failed to cancel order:', e?.message || e);
    }
  };

  const handleCancelAllOrders = async () => {
    const token = localStorage.getItem('syncnode_token');
    if (!token) return;
    try {
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
    localStorage.setItem('syncnode_token', token);
    localStorage.setItem('syncnode_user', JSON.stringify(newUser));
    localStorage.setItem('syncnode_active_tab', 'dashboard');
    setActiveTabState('dashboard');
    if (window.location.pathname !== '/dashboard') {
      window.history.pushState(null, '', '/dashboard');
    }
    fetchUserData();
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

      {/* 1. DASHBOARD / ASSETS / DEPOSIT / WITHDRAW / TRANSFERS / ORDERS / SECURITY / KYC / API KEYS / SESSIONS / SETTINGS */}
      {PROTECTED_TABS.has(activeTab) && (
        <DashboardView
          user={user || { id: 'usr_active', email: '', fullName: 'Trader', kyc_tier: 1 }}
          balances={balances}
          orders={orders}
          userTrades={userTrades}
          initialSidebarTab={
            activeTab === 'wallet' || activeTab === 'assets' || activeTab === 'margin' || activeTab === 'futures' || activeTab === 'funding' || activeTab === 'deposit' || activeTab === 'withdraw' || activeTab === 'history'
              ? 'assets'
              : activeTab === 'transfers'
              ? 'transfers'
              : activeTab === 'orders'
              ? 'orders'
              : activeTab === 'security' || activeTab === 'kyc' || activeTab === 'apikeys' || activeTab === 'sessions'
              ? 'security'
              : activeTab === 'settings'
              ? 'settings'
              : 'dashboard'
          }
          initialWalletSubTab={
            activeTab === 'margin'
              ? 'margin'
              : activeTab === 'futures'
              ? 'futures'
              : activeTab === 'funding'
              ? 'funding'
              : activeTab === 'deposit'
              ? 'deposit'
              : activeTab === 'withdraw'
              ? 'withdraw'
              : activeTab === 'history'
              ? 'history'
              : 'overview'
          }
          initialSecuritySubTab={
            activeTab === 'kyc' ? 'kyc' : activeTab === 'apikeys' ? 'apikeys' : activeTab === 'sessions' ? 'sessions' : '2fa'
          }
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
        <Suspense fallback={<ViewFallback />}>
          <WatchlistView
            watchlistSymbols={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onNavigateToStock={(sym) => {
              setStockSymbol(sym);
              setActiveTab('stock', sym);
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        </Suspense>
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
        <Suspense fallback={<ViewFallback />}>
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
        </Suspense>
      )}

      {/* 5. EMAIL TEMPLATES SHOWCASE VIEW (Gated for admin users) */}
      {activeTab === 'emails' && user?.admin_roles && user.admin_roles.length > 0 && (
        <Suspense fallback={<ViewFallback />}>
          <EmailTemplatesView />
        </Suspense>
      )}

      {/* 6. SIGNUP & PERSONALIZATION FULL VIEW */}
      {(activeTab === 'signup' || activeTab === 'login') && (
        !user ? (
          <SignupView
            initialMode={activeTab === 'login' ? 'login' : 'signup'}
            onSuccess={handleAuthSuccess}
            onNavigateHome={() => setActiveTab('home')}
          />
        ) : (
          <DashboardView
            user={user}
            balances={balances}
            orders={orders}
            userTrades={userTrades}
            initialSidebarTab="dashboard"
            initialWalletSubTab="overview"
            initialSecuritySubTab="2fa"
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
        )
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
        <SpotTradeView
          symbol={symbol}
          onSelectSymbol={setSymbol}
          ticker={ticker}
          markets={markets}
          depth={depth || { bids: [], asks: [] }}
          trades={recentTrades}
          balances={balances}
          userOrders={orders}
          userTrades={userTrades}
          onOrderSubmitted={() => {
            fetchUserData();
            fetchDepth();
            fetchRecentTrades();
          }}
          user={user}
          onOpenAuth={() => setActiveTab('signup')}
        />
      )}

      {/* 8.5 HIGH-YIELD EARN & STAKING PLATFORM */}
      {activeTab === 'earn' && (
        <Suspense fallback={<ViewFallback />}>
          <InvestmentView
            user={user}
            balances={balances}
            onOpenAuth={() => setActiveTab('signup')}
            onNavigateToWallet={() => setActiveTab('wallet')}
          />
        </Suspense>
      )}

      {/* 9. P2P ESCROW */}
      {activeTab === 'p2p' && (
        <Suspense fallback={<ViewFallback />}>
          <P2PView user={user} onOpenAuth={() => setActiveTab('signup')} />
        </Suspense>
      )}

      {/* 10. ADMIN CONSOLE (Accessed directly at /admin) */}
      {activeTab === 'admin' && (
        <Suspense fallback={<ViewFallback />}>
          <AdminConsole />
        </Suspense>
      )}
    </div>
  );

};
