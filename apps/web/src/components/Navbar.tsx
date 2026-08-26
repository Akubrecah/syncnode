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
  TrendingUp
} from 'lucide-react';

export type TabType = 'home' | 'markets' | 'dashboard' | 'watchlist' | 'news' | 'stock' | 'spot' | 'earn' | 'p2p' | 'wallet' | 'security' | 'admin' | 'emails' | 'signup' | 'login';

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const tradeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tradeRef.current && !tradeRef.current.contains(e.target as Node)) {
        setIsTradeMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isTradeActive = ['spot', 'p2p'].includes(activeTab);

  return (
    <header className="header-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        
        {/* BRAND LOGO */}
        <a
          href="#/home"
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
            SYNCNODE
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
              onClick={() => setIsTradeMenuOpen(!isTradeMenuOpen)}
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
                  <Activity size={15} color="#00e599" />
                  <div>
                    <div className="nav-dropdown-title">Spot Trading</div>
                    <div className="nav-dropdown-desc">CLOB matching engine &amp; TradingView chart</div>
                  </div>
                </button>

                <button
                  className={`nav-dropdown-item ${activeTab === 'p2p' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('p2p');
                    setIsTradeMenuOpen(false);
                  }}
                >
                  <Users size={15} color="#fcd535" />
                  <div>
                    <div className="nav-dropdown-title">P2P Escrow Market</div>
                    <div className="nav-dropdown-desc">0% fee peer-to-peer fiat gateway</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. Earn */}
          <button
            className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`}
            onClick={() => setActiveTab('earn')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Coins size={14} color={activeTab === 'earn' ? '#fcd535' : '#848e9c'} />
            <span>Earn</span>
            <span style={{ fontSize: '9px', background: 'rgba(252, 213, 53, 0.2)', color: '#fcd535', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
              16.4%
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
          {(user?.adminRole || user?.role || user?.email === 'poweldayck@gmail.com' || activeTab === 'admin') && (
            <button
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: activeTab === 'admin' ? '#fcd535' : '#ec4899',
                fontWeight: 700
              }}
            >
              <ShieldCheck size={14} color={activeTab === 'admin' ? '#fcd535' : '#ec4899'} />
              <span>Admin</span>
            </button>
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

        {/* WebSocket Connection Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#848e9c' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isWsConnected ? '#00e599' : '#ff3b69',
              boxShadow: isWsConnected ? '0 0 6px #00e599' : 'none'
            }}
          />
          <span style={{ display: 'none' }}>{isWsConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* User Profile / Dropdown */}
        <div className="nav-profile-wrapper" ref={profileRef}>
          <div
            className="nav-profile-pill"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="nav-avatar-icon">
              {user ? (user.fullName ? user.fullName[0].toUpperCase() : 'U') : 'JS'}
            </div>
            <span className="nav-profile-name">
              {user ? (user.fullName || user.email.split('@')[0]) : 'User'}
            </span>
            <ChevronDown size={13} color="#848e9c" style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="nav-profile-menu">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">
                  {user ? (user.fullName ? user.fullName[0].toUpperCase() : 'U') : 'U'}
                </div>
                <div>
                  <div className="profile-menu-name">{user ? user.fullName || 'User' : 'Syncnode User'}</div>
                  <div className="profile-menu-email">{user ? user.email : 'user@syncnode.com'}</div>
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

                <button
                  className="profile-menu-item"
                  onClick={() => {
                    setActiveTab('admin');
                    setIsProfileMenuOpen(false);
                  }}
                >
                  <ShieldCheck size={14} color="#ec4899" />
                  <span>Risk Engine &amp; Admin</span>
                </button>

                <div className="nav-dropdown-divider"></div>

                {user ? (
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
                ) : (
                  <>
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setActiveTab('login');
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <span>Sign In</span>
                    </button>
                    <button
                      className="profile-menu-item register"
                      onClick={() => {
                        setActiveTab('signup');
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <UserPlus size={14} />
                      <span>Create Account</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auth Buttons for Unauthenticated Users */}
        {!user && (
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
