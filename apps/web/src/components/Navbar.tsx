import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Wallet,
  Users,
  Zap,
  Lock,
  LogOut,
  UserPlus,
  ChevronDown,
  Search,
  Star,
  Newspaper,
  LineChart,
  Settings,
  Coins,
  ShieldCheck,
  TrendingUp,
  History,
  Repeat,
  CreditCard,
  FileText
} from 'lucide-react';

export type TabType =
  | 'home'
  | 'markets'
  | 'dashboard'
  | 'watchlist'
  | 'news'
  | 'stock'
  | 'spot'
  | 'earn'
  | 'p2p'
  | 'wallet'
  | 'assets'
  | 'margin'
  | 'futures'
  | 'funding'
  | 'deposit'
  | 'withdraw'
  | 'transfers'
  | 'orders'
  | 'history'
  | 'security'
  | 'kyc'
  | 'apikeys'
  | 'sessions'
  | 'settings'
  | 'admin'
  | 'emails'
  | 'signup'
  | 'login';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: any;
  onOpenAuth: () => void;
  onOpenSearch?: () => void;
  isSearchOpen?: boolean;
  onLogout: () => void;
  isWsConnected: boolean;
  circuitBreakers: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onOpenSearch,
  isSearchOpen = false,
  onLogout,
  isWsConnected,
  circuitBreakers
}) => {
  const [isTradeMenuOpen, setIsTradeMenuOpen] = useState(false);
  const [isOrdersMenuOpen, setIsOrdersMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const tradeRef = useRef<HTMLDivElement>(null);
  const ordersRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tradeRef.current && !tradeRef.current.contains(e.target as Node)) {
        setIsTradeMenuOpen(false);
      }
      if (ordersRef.current && !ordersRef.current.contains(e.target as Node)) {
        setIsOrdersMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isTradeActive = ['spot', 'p2p'].includes(activeTab);
  const isOrdersActive = ['orders', 'history'].includes(activeTab);

  return (
    <header className="header-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        
        {/* BRAND LOGO */}
        <a
          href="/"
          className="brand-logo"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(252, 213, 53, 0.15)',
            border: '1px solid rgba(252, 213, 53, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={18} color="#fcd535" />
          </div>
          <span style={{ color: '#ffffff', fontWeight: 800, letterSpacing: '-0.4px', fontSize: '19px' }}>
            CryptoBridge
          </span>
        </a>

        {/* PRIMARY STREAMLINED NAVIGATION */}
        <nav className="nav-links">
          {/* 1. Markets */}
          <button
            className={`nav-item ${activeTab === 'markets' && !isSearchOpen ? 'active' : ''}`}
            onClick={() => setActiveTab('markets')}
          >
            Markets
          </button>

          {/* 2. Trade Dropdown (Spot & P2P) */}
          <div className="nav-dropdown-wrapper" ref={tradeRef}>
            <button
              className={`nav-item nav-dropdown-btn ${isTradeActive ? 'active' : ''}`}
              onClick={() => {
                setIsTradeMenuOpen(!isTradeMenuOpen);
                setIsOrdersMenuOpen(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Trade</span>
              <ChevronDown size={13} style={{ transform: isTradeMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {isTradeMenuOpen && (
              <div className="nav-dropdown-menu">
                <button
                  className={`nav-dropdown-item ${activeTab === 'spot' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('spot');
                    setIsTradeMenuOpen(false);
                  }}
                >
                  <TrendingUp size={15} color="#fcd535" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#eaecef' }}>Spot Trading</div>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>Trade crypto with high liquidity &amp; depth</div>
                  </div>
                </button>

                <button
                  className={`nav-dropdown-item ${activeTab === 'p2p' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('p2p');
                    setIsTradeMenuOpen(false);
                  }}
                >
                  <Users size={15} color="#0ecb81" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#eaecef' }}>P2P Express</div>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>Bank transfer &amp; 100+ local payment methods</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. Orders Dropdown (Assets History, Spot, Futures, P2P, Convert, Payment) - Only visible when logged in */}
          {user && (
            <div className="nav-dropdown-wrapper" ref={ordersRef}>
              <button
                className={`nav-item nav-dropdown-btn ${isOrdersActive ? 'active' : ''}`}
                onClick={() => {
                  setIsOrdersMenuOpen(!isOrdersMenuOpen);
                  setIsTradeMenuOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Orders</span>
                <ChevronDown size={13} style={{ transform: isOrdersMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {isOrdersMenuOpen && (
                <div className="nav-dropdown-menu" style={{ width: '300px' }}>
                  {/* 1. Assets History */}
                  <button
                    className={`nav-dropdown-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('history');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <History size={16} color="#fcd535" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>Assets History</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Deposit, withdrawal, transfer &amp; asset logs</div>
                    </div>
                  </button>

                  {/* 2. Spot Order */}
                  <button
                    className={`nav-dropdown-item ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('orders');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <FileText size={16} color="#0ecb81" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>Spot Order</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Open orders, order history &amp; trade executions</div>
                    </div>
                  </button>

                  {/* 3. Futures Order */}
                  <button
                    className={`nav-dropdown-item ${activeTab === 'futures' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('futures');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <Activity size={16} color="#fcd535" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>Futures Order</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>USDⓈ-M &amp; COIN-M perpetual orders &amp; positions</div>
                    </div>
                  </button>

                  {/* 4. P2P Order */}
                  <button
                    className={`nav-dropdown-item ${activeTab === 'p2p' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('p2p');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <Users size={16} color="#0ecb81" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>P2P Order</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>P2P buy/sell orders, escrow &amp; payment status</div>
                    </div>
                  </button>

                  {/* 5. Convert History */}
                  <button
                    className="nav-dropdown-item"
                    onClick={() => {
                      setActiveTab('orders');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <Repeat size={16} color="#fcd535" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>Convert History</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Instant crypto swap &amp; dust BNB conversions</div>
                    </div>
                  </button>

                  {/* 6. Payment History */}
                  <button
                    className="nav-dropdown-item"
                    onClick={() => {
                      setActiveTab('orders');
                      setIsOrdersMenuOpen(false);
                    }}
                  >
                    <CreditCard size={16} color="#0ecb81" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#eaecef' }}>Payment History</div>
                      <div style={{ fontSize: '11px', color: '#848e9c' }}>Binance Pay transactions &amp; merchant receipts</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3.5 High-Yield Earn / Staking */}
          <button
            className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`}
            onClick={() => setActiveTab('earn')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Earn</span>
            <span style={{
              background: 'rgba(252, 213, 53, 0.15)',
              color: '#fcd535',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '3px'
            }}>
              250%
            </span>
          </button>

          {/* 4. Stocks & Commodities */}
          <button
            className={`nav-item ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            Stocks
          </button>

          {/* 5. Market News */}
          <button
            className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            News
          </button>

          {/* 6. Dashboard / Portfolio */}
          <button
            className={`nav-item ${activeTab === 'dashboard' && !isSearchOpen ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>

          {/* 7. Admin Console */}
          {user?.admin_roles && user.admin_roles.length > 0 && (
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#fcd535',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <ShieldCheck size={14} color="#fcd535" />
              <span>Admin</span>
            </a>
          )}
        </nav>
      </div>

      {/* RIGHT CONTROLS: Quick Search + Watchlist + Live Status + User Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Search Shortcut Pill */}
        <button
          onClick={() => onOpenSearch && onOpenSearch()}
          style={{
            background: '#202630',
            border: '1px solid #2b313a',
            borderRadius: '8px',
            padding: '5px 10px',
            color: '#848e9c',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#fcd535';
            e.currentTarget.style.color = '#eaecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2b313a';
            e.currentTarget.style.color = '#848e9c';
          }}
        >
          <Search size={13} />
          <span>Search</span>
          <span style={{ fontSize: '10px', background: '#181a20', padding: '1px 4px', borderRadius: '3px', border: '1px solid #2b313a' }}>
            ⌘K
          </span>
        </button>

        {/* Watchlist Quick Button */}
        <button
          onClick={() => setActiveTab('watchlist')}
          title="My Watchlist"
          style={{
            background: activeTab === 'watchlist' ? 'rgba(252, 213, 53, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            color: activeTab === 'watchlist' ? '#fcd535' : '#848e9c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Star size={16} fill={activeTab === 'watchlist' ? '#fcd535' : 'none'} />
        </button>

        {/* Global Circuit Breaker Alert */}
        {circuitBreakers?.isGlobalTradingHalted && (
          <span className="badge" style={{ background: 'rgba(255, 59, 105, 0.2)', color: '#ff3b69', border: '1px solid #ff3b69' }}>
            HALT
          </span>
        )}

        {/* Live WebSocket Engine Status Indicator */}
        <div
          title={isWsConnected ? 'Matching Engine & OrderBook WebSocket: Connected' : 'Matching Engine: Reconnecting...'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: isWsConnected ? '#00e599' : '#ff3b69',
            background: isWsConnected ? 'rgba(0, 229, 153, 0.08)' : 'rgba(255, 59, 105, 0.08)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${isWsConnected ? 'rgba(0, 229, 153, 0.25)' : 'rgba(255, 59, 105, 0.25)'}`
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isWsConnected ? '#00e599' : '#ff3b69',
              boxShadow: isWsConnected ? '0 0 6px #00e599' : 'none'
            }}
          />
          <span style={{ display: 'inline-block' }}>{isWsConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* User Profile / Dropdown - Strictly rendered for authenticated users */}
        {user ? (
          <div className="nav-profile-wrapper" ref={profileRef}>
            <div
              className="nav-profile-pill"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="nav-avatar-icon">
                {user.fullName && user.fullName.trim()
                  ? (user.fullName.trim().split(/\s+/).length >= 2
                      ? `${user.fullName.trim().split(/\s+/)[0][0]}${user.fullName.trim().split(/\s+/)[1][0]}`.toUpperCase()
                      : user.fullName.slice(0, 2).toUpperCase())
                  : (user.email ? user.email.slice(0, 2).toUpperCase() : '')}
              </div>
              <span className="nav-profile-name">
                {user.fullName || (user.email ? user.email.split('@')[0] : '')}
              </span>
              <ChevronDown size={13} color="#848e9c" style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="nav-profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">
                    {user.fullName && user.fullName.trim()
                      ? (user.fullName.trim().split(/\s+/).length >= 2
                          ? `${user.fullName.trim().split(/\s+/)[0][0]}${user.fullName.trim().split(/\s+/)[1][0]}`.toUpperCase()
                          : user.fullName.slice(0, 2).toUpperCase())
                      : (user.email ? user.email.slice(0, 2).toUpperCase() : '')}
                  </div>
                  <div>
                    <div className="profile-menu-name">{user.fullName || (user.email ? user.email.split('@')[0] : '')}</div>
                    <div className="profile-menu-email">{user.email || ''}</div>
                  </div>
                </div>

                <div className="profile-menu-links">
                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    <Activity size={14} color="#fcd535" />
                    <span>Dashboard &amp; Assets</span>
                  </button>

                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab('watchlist');
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    <Star size={14} color="#fcd535" />
                    <span>Watchlist &amp; Alerts</span>
                  </button>

                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setActiveTab('security');
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    <Settings size={14} color="#848e9c" />
                    <span>Account &amp; 2FA Security</span>
                  </button>

                  {user.admin_roles && user.admin_roles.length > 0 && (
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setActiveTab('admin');
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <ShieldCheck size={14} color="#fcd535" />
                      <span>Risk Engine &amp; Admin</span>
                    </button>
                  )}

                  <div className="nav-dropdown-divider"></div>

                  <button
                    className="profile-menu-item logout"
                    onClick={() => {
                      onLogout();
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Auth Buttons for Unauthenticated Users */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setActiveTab('login')}
            >
              Log In
            </button>
            <button
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: '#fcd535',
                color: '#181a20',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => setActiveTab('signup')}
            >
              <UserPlus size={13} />
              <span>Sign Up</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
