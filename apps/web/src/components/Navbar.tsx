import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
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
  FileText,
  Menu,
  X,
  Home,
  BarChart2,
  Layers,
  ArrowRightLeft
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
  const { user: clerkUser, isSignedIn: isClerkSignedIn } = useUser();
  const [isTradeMenuOpen, setIsTradeMenuOpen] = useState(false);
  const [isOrdersMenuOpen, setIsOrdersMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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

  const currentUser = user || (() => {
    try {
      const s = typeof localStorage !== 'undefined' ? localStorage.getItem('syncnode_user') : null;
      if (s) return JSON.parse(s);
    } catch {}
    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
      return {
        id: clerkUser.id,
        email,
        fullName: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0] || 'Trader',
        avatarUrl: clerkUser.imageUrl
      };
    }
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('syncnode_token') : null;
      if (token) {
        return {
          id: 'usr_trader',
          email: '',
          fullName: 'Trader',
          kyc_tier: 1
        };
      }
    } catch {}
    return null;
  })();

  const isTradeActive = ['spot', 'p2p'].includes(activeTab);
  const isOrdersActive = ['orders', 'history'].includes(activeTab);

  return (
    <>
      <header className="header-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={22} color="#eaecef" />
          </button>

          {/* BRAND LOGO */}
          <a
            href="#/home"
            className="brand-logo"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(252, 213, 53, 0.15)',
                border: '1px solid rgba(252, 213, 53, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Zap size={16} color="#fcd535" />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              CryptoBridge
            </span>
          </a>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="nav-links desktop-nav-links">
            <a
              href="#/markets"
              className={`nav-link ${activeTab === 'markets' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('markets');
              }}
            >
              Markets
            </a>

            {/* Trade Dropdown */}
            <div className="nav-dropdown-wrapper" ref={tradeRef}>
              <button
                type="button"
                className={`nav-link ${isTradeActive ? 'active' : ''}`}
                onClick={() => setIsTradeMenuOpen(!isTradeMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span>Trade</span>
                <ChevronDown size={13} color="#848e9c" style={{ transform: isTradeMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
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
                    <Activity size={15} color="#fcd535" />
                    <div>
                      <div className="dropdown-title">Spot Trading</div>
                      <div className="dropdown-desc">Trade crypto with institutional depth &amp; sub-millisecond execution</div>
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
                      <div className="dropdown-title">P2P Express Trading</div>
                      <div className="dropdown-desc">Buy &amp; sell crypto with 100+ local payment methods &amp; 0 fees</div>
                    </div>
                  </button>

                  <button
                    className={`nav-dropdown-item ${activeTab === 'stock' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('stock');
                      setIsTradeMenuOpen(false);
                    }}
                  >
                    <TrendingUp size={15} color="#38bdf8" />
                    <div>
                      <div className="dropdown-title">Tokenized Stock Equities</div>
                      <div className="dropdown-desc">Trade 24/7 institutional shares of NVDA, AAPL, TSLA &amp; S&amp;P 500</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Futures Link */}
            <a
              href="#/futures"
              className={`nav-link ${activeTab === 'futures' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('futures');
              }}
            >
              Futures
            </a>

            {/* Earn Link */}
            <a
              href="#/earn"
              className={`nav-link ${activeTab === 'earn' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('earn');
              }}
            >
              Earn <span className="nav-badge-gold">250%</span>
            </a>

            {/* Tokenized Stocks Link */}
            <a
              href="#/stock"
              className={`nav-link ${activeTab === 'stock' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('stock');
              }}
            >
              Stocks
            </a>

            {/* News Feed Link */}
            <a
              href="#/news"
              className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('news');
              }}
            >
              News
            </a>

            {/* Dashboard Link - Rendered when user is authenticated */}
            {currentUser && (
              <a
                href="#/dashboard"
                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('dashboard');
                }}
              >
                Dashboard
              </a>
            )}
          </nav>
        </div>

        {/* RIGHT ACTION CONTROLS */}
        <div className="nav-right-actions">
          
          {/* Quick Search Shortcut */}
          <button
            type="button"
            className="nav-search-btn desktop-only"
            onClick={onOpenSearch}
            title="Search Markets & Assets (Cmd+K)"
          >
            <Search size={14} color="#848e9c" />
            <span style={{ fontSize: '12px', color: '#848e9c' }}>Search</span>
            <kbd className="kbd-shortcut">⌘K</kbd>
          </button>

          {/* Global Circuit Breaker Alert */}
          {circuitBreakers?.isGlobalTradingHalted && (
            <span className="badge" style={{ background: 'rgba(255, 59, 105, 0.2)', color: '#ff3b69', border: '1px solid #ff3b69' }}>
              HALT
            </span>
          )}

          {/* Live WebSocket Engine Status Indicator */}
          <div
            className="nav-ws-status"
            title={isWsConnected ? 'Matching Engine & OrderBook WebSocket: Connected' : 'Matching Engine: Reconnecting...'}
          >
            <div
              className={`nav-ws-dot ${isWsConnected ? 'connected' : 'disconnected'}`}
            />
            <span className="nav-ws-text">{isWsConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* User Profile / Dropdown */}
          {currentUser ? (
            <div className="nav-profile-wrapper" ref={profileRef}>
              <div
                className="nav-profile-pill"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="nav-avatar-icon">
                  {currentUser.fullName && currentUser.fullName.trim()
                    ? (currentUser.fullName.trim().split(/\s+/).length >= 2
                        ? `${currentUser.fullName.trim().split(/\s+/)[0][0]}${currentUser.fullName.trim().split(/\s+/)[1][0]}`.toUpperCase()
                        : currentUser.fullName.slice(0, 2).toUpperCase())
                    : (currentUser.email ? currentUser.email.slice(0, 2).toUpperCase() : 'U')}
                </div>
                <span className="nav-profile-name desktop-only">
                  {currentUser.fullName || (currentUser.email ? currentUser.email.split('@')[0] : 'Trader')}
                </span>
                <ChevronDown size={13} color="#848e9c" style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </div>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="nav-profile-menu">
                  <div className="profile-menu-header">
                    <div className="profile-menu-avatar">
                      {currentUser.fullName && currentUser.fullName.trim()
                        ? (currentUser.fullName.trim().split(/\s+/).length >= 2
                            ? `${currentUser.fullName.trim().split(/\s+/)[0][0]}${currentUser.fullName.trim().split(/\s+/)[1][0]}`.toUpperCase()
                            : currentUser.fullName.slice(0, 2).toUpperCase())
                        : (currentUser.email ? currentUser.email.slice(0, 2).toUpperCase() : 'U')}
                    </div>
                    <div>
                      <div className="profile-menu-name">{currentUser.fullName || (currentUser.email ? currentUser.email.split('@')[0] : 'Trader')}</div>
                      <div className="profile-menu-email">{currentUser.email || ''}</div>
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

                    {currentUser.admin_roles && currentUser.admin_roles.length > 0 && (
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
            <div className="nav-auth-buttons">
              <button
                className="btn btn-secondary nav-auth-login-btn"
                onClick={() => setActiveTab('login')}
              >
                Log In
              </button>
              <button
                className="btn btn-primary nav-auth-signup-btn"
                onClick={() => setActiveTab('signup')}
              >
                <UserPlus size={13} />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE SLIDE-OUT DRAWER OVERLAY */}
      {isMobileDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileDrawerOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#fcd535" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>CryptoBridge</span>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <X size={20} color="#848e9c" />
              </button>
            </div>

            {/* Mobile Drawer Menu Links */}
            <div className="mobile-drawer-links">
              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('home');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Home size={18} />
                <span>Home</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'markets' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('markets');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <BarChart2 size={18} />
                <span>Markets</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'spot' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('spot');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Activity size={18} />
                <span>Spot Trade</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'stock' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('stock');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <TrendingUp size={18} />
                <span>Tokenized Stocks</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'futures' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('futures');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Layers size={18} />
                <span>Futures (125x)</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'p2p' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('p2p');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Users size={18} />
                <span>P2P Express (0 Fee)</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'earn' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('earn');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Coins size={18} />
                <span>Earn &amp; Vaults (250% APY)</span>
              </button>

              <button
                type="button"
                className={`mobile-drawer-item ${activeTab === 'news' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('news');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <Newspaper size={18} />
                <span>News &amp; Research</span>
              </button>

              <div className="mobile-drawer-divider" />

              {currentUser ? (
                <>
                  <button
                    type="button"
                    className={`mobile-drawer-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsMobileDrawerOpen(false);
                    }}
                  >
                    <Wallet size={18} />
                    <span>Dashboard &amp; Assets</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-drawer-item ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('security');
                      setIsMobileDrawerOpen(false);
                    }}
                  >
                    <Settings size={18} />
                    <span>Security &amp; 2FA</span>
                  </button>

                  {currentUser.admin_roles && currentUser.admin_roles.length > 0 && (
                    <button
                      type="button"
                      className={`mobile-drawer-item ${activeTab === 'admin' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('admin');
                        setIsMobileDrawerOpen(false);
                      }}
                    >
                      <ShieldCheck size={18} />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="mobile-drawer-item logout"
                    onClick={() => {
                      onLogout();
                      setIsMobileDrawerOpen(false);
                    }}
                  >
                    <LogOut size={18} />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#fcd535', color: '#181a20', fontWeight: 700, padding: '12px' }}
                    onClick={() => {
                      setActiveTab('signup');
                      setIsMobileDrawerOpen(false);
                    }}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '12px' }}
                    onClick={() => {
                      setActiveTab('login');
                      setIsMobileDrawerOpen(false);
                    }}
                  >
                    Log In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM APP NAVIGATION BAR (FIXED) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === 'markets' ? 'active' : ''}`}
          onClick={() => setActiveTab('markets')}
        >
          <BarChart2 size={20} />
          <span>Markets</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === 'spot' ? 'active' : ''}`}
          onClick={() => setActiveTab('spot')}
        >
          <Activity size={20} />
          <span>Trade</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === 'futures' ? 'active' : ''}`}
          onClick={() => setActiveTab('futures')}
        >
          <Layers size={20} />
          <span>Futures</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${['dashboard', 'wallet', 'assets'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => setActiveTab(currentUser ? 'dashboard' : 'login')}
        >
          <Wallet size={20} />
          <span>{currentUser ? 'Assets' : 'Login'}</span>
        </button>
      </nav>
    </>
  );
};
