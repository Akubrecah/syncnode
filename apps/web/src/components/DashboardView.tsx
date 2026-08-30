import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowRightLeft,
  CreditCard,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Lock,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Coins,
  Bot,
  Zap,
  Gift,
  Users,
  Settings,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  BarChart2,
  FileText,
  UserCheck,
  Key,
  Mail,
  RefreshCw,
  Sliders,
  DollarSign,
  Smartphone,
  Menu,
  X
} from 'lucide-react';
import { TradingViewMarketQuotes } from './TradingViewMarketQuotes';
import { TradingViewMiniChart } from './TradingViewMiniChart';

interface DashboardViewProps {
  user: any;
  balances?: any[];
  orders?: any[];
  userTrades?: any[];
  onRefreshUser?: () => void;
  onNavigateToTrade?: (sym?: string) => void;
  onNavigateToStock?: (sym: string) => void;
  onNavigateToTab?: (tab: string, sym?: string) => void;
  initialSidebarTab?: string;
  initialWalletSubTab?: string;
  initialSecuritySubTab?: string;
}

interface AssetPriceInfo {
  symbol: string;
  price: number;
  change24h: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  balances = [],
  orders = [],
  userTrades = [],
  onRefreshUser,
  onNavigateToTrade,
  onNavigateToStock,
  onNavigateToTab,
  initialSidebarTab = 'dashboard'
}) => {
  const [hideBalances, setHideBalances] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarActiveTab, setSidebarActiveTab] = useState<string>(initialSidebarTab || 'dashboard');
  const [expandedSidebarMenu, setExpandedSidebarMenu] = useState<{ [key: string]: boolean }>({
    assets: false,
    orders: false,
    account: false
  });
  const [activeActivityTab, setActiveActivityTab] = useState<'open_orders' | 'order_history' | 'trade_history' | 'assets'>('open_orders');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [livePrices, setLivePrices] = useState<{ [key: string]: AssetPriceInfo }>({});
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAsset, setTransferAsset] = useState('USDT');
  const [transferFrom, setTransferFrom] = useState('Spot Account');
  const [transferTo, setTransferTo] = useState('Futures USDⓈ-M');
  const [transferSuccessMsg, setTransferSuccessMsg] = useState('');

  // Fetch live market prices from Binance Public API
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: { [key: string]: AssetPriceInfo } = {};
          data.forEach((item: any) => {
            if (item.symbol && (item.symbol.endsWith('USDT') || item.symbol.endsWith('FDUSD'))) {
              const base = item.symbol.replace('USDT', '').replace('FDUSD', '');
              map[base] = {
                symbol: item.symbol,
                price: parseFloat(item.lastPrice) || 0,
                change24h: parseFloat(item.priceChangePercent) || 0
              };
            }
          });
          // Ensure default rates
          map['USDT'] = { symbol: 'USDT', price: 1, change24h: 0.01 };
          map['USDC'] = { symbol: 'USDC', price: 1, change24h: 0.00 };
          map['FDUSD'] = { symbol: 'FDUSD', price: 1, change24h: 0.01 };
          setLivePrices(map);
        }
      } catch (err) {
        console.warn('Dashboard live price fetch fallback:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, type: 'uid' | 'referral') => {
    navigator.clipboard.writeText(text);
    if (type === 'uid') {
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } else {
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const toggleSidebarMenu = (menu: string) => {
    setExpandedSidebarMenu((prev) => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const navigateTo = (tab: string, param?: string) => {
    setIsMobileSidebarOpen(false);
    if (onNavigateToTab) {
      onNavigateToTab(tab, param);
    } else if (tab === 'spot' && onNavigateToTrade) {
      onNavigateToTrade(param);
    } else if (tab === 'stock' && onNavigateToStock) {
      onNavigateToStock(param || 'NVDA');
    } else {
      window.location.hash = `#/${tab}`;
    }
  };

  // Compute live portfolio holdings from real balance state
  const holdingsList = React.useMemo(() => {
    const defaultAssets = [
      { asset: 'USDT', name: 'Tether USD', free: 0, locked: 0, logo: '₮', color: '#26a17b' },
      { asset: 'BTC', name: 'Bitcoin', free: 0, locked: 0, logo: '₿', color: '#f7931a' },
      { asset: 'ETH', name: 'Ethereum', free: 0, locked: 0, logo: 'Ξ', color: '#627eea' },
      { asset: 'SOL', name: 'Solana', free: 0, locked: 0, logo: '◎', color: '#14f195' },
      { asset: 'BNB', name: 'BNB', free: 0, locked: 0, logo: '🔶', color: '#f3ba2f' },
      { asset: 'FDUSD', name: 'First Digital USD', free: 0, locked: 0, logo: '$', color: '#2775ca' }
    ];

    const list = defaultAssets.map((item) => ({ ...item }));

    // Merge in any live balance items from API
    if (Array.isArray(balances) && balances.length > 0) {
      balances.forEach((b) => {
        const existingIdx = list.findIndex((item) => item.asset === b.asset);
        if (existingIdx >= 0) {
          list[existingIdx].free = parseFloat(b.free) || 0;
          list[existingIdx].locked = parseFloat(b.locked) || 0;
        } else {
          list.push({
            asset: b.asset,
            name: b.asset,
            free: parseFloat(b.free) || 0,
            locked: parseFloat(b.locked) || 0,
            logo: b.asset.slice(0, 3),
            color: '#848e9c'
          });
        }
      });
    }

    return list.map((item) => {
      const price = livePrices[item.asset]?.price || (item.asset === 'USDT' || item.asset === 'FDUSD' || item.asset === 'USDC' ? 1 : 0);
      const change24h = livePrices[item.asset]?.change24h || 0;
      const totalAmount = item.free + item.locked;
      const totalUsdValue = totalAmount * price;
      return {
        ...item,
        totalAmount,
        price,
        change24h,
        totalUsdValue
      };
    });
  }, [balances, livePrices]);

  // Total balance calculations
  const totalUsdEstimated = holdingsList.reduce((acc, curr) => acc + curr.totalUsdValue, 0);
  const btcPrice = livePrices['BTC']?.price || 0;
  const totalBtcEstimated = btcPrice > 0 ? totalUsdEstimated / btcPrice : 0;

  // Real account balance distribution
  const spotAccountUsd = totalUsdEstimated;
  const fundingAccountUsd = 0;
  const futuresAccountUsd = 0;
  const earnAccountUsd = 0;

  // Real 24h PNL calculation from live assets
  const portfolio24hChangeUsd = holdingsList.reduce((acc, curr) => {
    if (curr.totalUsdValue <= 0) return acc;
    const changeFrac = curr.change24h / 100;
    const prevVal = changeFrac !== -1 ? curr.totalUsdValue / (1 + changeFrac) : curr.totalUsdValue;
    return acc + (curr.totalUsdValue - prevVal);
  }, 0);
  const isPnlPositive = portfolio24hChangeUsd >= 0;
  const portfolio24hChangePct = totalUsdEstimated > 0
    ? ((portfolio24hChangeUsd / Math.max(0.01, totalUsdEstimated - portfolio24hChangeUsd)) * 100)
    : 0;

  // Filtered holdings (Null-safe)
  const filteredHoldings = (holdingsList || []).filter(
    (h) =>
      (h?.asset || '').toLowerCase().includes((assetSearchQuery || '').toLowerCase()) ||
      (h?.name || '').toLowerCase().includes((assetSearchQuery || '').toLowerCase())
  );

  const displayUid = user?.id ? (String(user.id).length > 8 ? String(user.id).slice(0, 8) : String(user.id)) : '—';
  const referralCode = user?.id ? String(user.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() : 'SYNCNODE';
  const displayEmail = user?.email || 'user@syncnode.com';
  const displayMaskedEmail = typeof displayEmail === 'string' && displayEmail.includes('@')
    ? `${displayEmail.split('@')[0].slice(0, 3)}***@${displayEmail.split('@')[1]}`
    : String(displayEmail);

  return (
    <div className="dashboard-layout-container" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: '#181a20', color: '#eaecef' }}>
      {/* Mobile Collapsible 3-Lines Header Bar */}
      <div className="dashboard-mobile-header-bar">
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="dashboard-mobile-toggle-btn"
          aria-label="Toggle Dashboard Menu"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobileSidebarOpen ? <X size={20} color="#fcd535" /> : <Menu size={20} color="#fcd535" />}
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#eaecef' }}>
              {isMobileSidebarOpen ? 'Close Menu' : 'Dashboard Menu'}
            </span>
          </div>
          <span className="dashboard-current-tab-badge">
            {sidebarActiveTab.charAt(0).toUpperCase() + sidebarActiveTab.slice(1)} ▾
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0 }} className="dashboard-body-row">
        {/* =========================================================================
            1. LEFT SIDEBAR NAVIGATION (Binance User Center Sidebar)
            ========================================================================= */}
        <aside
          className={`dashboard-sidebar-nav ${isMobileSidebarOpen ? 'mobile-open' : 'mobile-closed'}`}
          style={{
            width: '248px',
            minWidth: '248px',
            background: '#181a20',
            borderRight: '1px solid #2b313a',
            padding: '24px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {/* Main Dashboard Link */}
          <button
            onClick={() => { setSidebarActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: sidebarActiveTab === 'dashboard' ? 'rgba(252, 213, 53, 0.1)' : 'transparent',
              color: sidebarActiveTab === 'dashboard' ? '#fcd535' : '#eaecef',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.8 10.8v8.39h14.4V10.8L12 4.4l-7.2 6.4zM21 19.49c0 .83-.67 1.5-1.5 1.5H4.35c-.76-.08-1.35-.72-1.35-1.5v-8.83c0-.43.18-.84.5-1.12L11 2.88c.57-.5 1.42-.5 1.99 0l7.5 6.67c.32.28.5.69.5 1.12v8.83l.01-.01z" />
            <path d="M8.82 12.99L12 9.81l3.18 3.18L12 16.17l-3.18-3.18z" />
          </svg>
          <span>Dashboard</span>
        </button>

        {/* Assets Dropdown Menu */}
        <div>
          <button
            onClick={() => toggleSidebarMenu('assets')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#848e9c',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wallet size={20} color="#848e9c" />
              <span>Assets</span>
            </div>
            {expandedSidebarMenu.assets ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandedSidebarMenu.assets && (
            <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {[
                { name: 'Overview', tab: 'wallet' },
                { name: 'Spot & Fiat', tab: 'wallet' },
                { name: 'Margin', tab: 'spot' },
                { name: 'Futures', tab: 'spot' },
                { name: 'Trading Bots', tab: 'spot' },
                { name: 'Earn', tab: 'earn' },
                { name: 'Funding', tab: 'wallet' }
              ].map((sub) => (
                <button
                  key={sub.name}
                  onClick={() => navigateTo(sub.tab)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#848e9c',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Orders Dropdown Menu */}
        <div>
          <button
            onClick={() => toggleSidebarMenu('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#848e9c',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={20} color="#848e9c" />
              <span>Orders</span>
            </div>
            {expandedSidebarMenu.orders ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandedSidebarMenu.orders && (
            <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {[
                { name: 'Spot Order', tab: 'spot' },
                { name: 'P2P Order', tab: 'p2p' },
                { name: 'Futures Order', tab: 'spot' },
                { name: 'Trading Bots Order', tab: 'spot' },
                { name: 'Convert History', tab: 'spot' }
              ].map((sub) => (
                <button
                  key={sub.name}
                  onClick={() => navigateTo(sub.tab)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#848e9c',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rewards Hub */}
        <button
          onClick={() => alert('Rewards Hub: You have 100 USDT Voucher Ready to Claim!')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'transparent',
            color: '#848e9c',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
        >
          <Gift size={20} color="#fcd535" />
          <span>Rewards Hub</span>
          <span style={{ marginLeft: 'auto', background: '#fcd535', color: '#181a20', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
            NEW
          </span>
        </button>

        {/* Referral */}
        <button
          onClick={() => handleCopy(typeof window !== 'undefined' ? `${window.location.origin}/#/signup?ref=${referralCode}` : `https://cryptobridge-syncode.vercel.app/#/signup?ref=${referralCode}`, 'referral')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'transparent',
            color: '#848e9c',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
        >
          <Users size={20} color="#848e9c" />
          <span>Referral</span>
        </button>

        {/* Account Menu */}
        <div>
          <button
            onClick={() => toggleSidebarMenu('account')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#848e9c',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserCheck size={20} color="#848e9c" />
              <span>Account</span>
            </div>
            {expandedSidebarMenu.account ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {expandedSidebarMenu.account && (
            <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {[
                { name: 'Identification (KYC)', tab: 'security' },
                { name: 'Security & 2FA', tab: 'security' },
                { name: 'Settings & Profile', tab: 'security' },
                { name: 'API Management', tab: 'security' }
              ].map((sub) => (
                <button
                  key={sub.name}
                  onClick={() => navigateTo(sub.tab)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#848e9c',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => navigateTo('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'transparent',
            color: '#848e9c',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
        >
          <Settings size={20} color="#848e9c" />
          <span>Settings</span>
        </button>

        {/* Download App Mini-Card */}
        <div
          style={{
            marginTop: 'auto',
            background: '#202630',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} color="#fcd535" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#eaecef' }}>CryptoBridge Mobile PWA</span>
          </div>
          <p style={{ fontSize: '11px', color: '#848e9c', margin: 0 }}>
            Trade on the go with real-time price alerts &amp; sub-millisecond execution.
          </p>
          <button
            onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#/spot'; }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#2b313a',
              color: '#eaecef',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Open Mobile Trade</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA (#__APP / dashboard-v3-wrap)
          ========================================================================= */}
      <main className="dashboard-main-content" style={{ flex: 1, minWidth: 0, padding: '32px 36px', maxWidth: '1400px', margin: '0 auto', overflowY: 'auto' }}>
        {/* TOP USER PROFILE & STATUS HEADER */}
        <div
          className="dashboard-user-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid #2b313a',
            marginBottom: '20px'
          }}
        >
          {/* User Info Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fcd535 0%, #f0b90b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181a20',
                fontSize: '22px',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(252, 213, 53, 0.2)'
              }}
            >
              {displayEmail.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#eaecef' }}>{displayMaskedEmail}</span>
                <span
                  style={{
                    background: 'rgba(252, 213, 53, 0.15)',
                    color: '#fcd535',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  VIP 0
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(46, 189, 133, 0.15)',
                    color: '#2ebd85',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: '#848e9c' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>User ID:</span>
                  <span style={{ color: '#eaecef', fontFamily: 'monospace' }}>{displayUid}</span>
                  <button
                    onClick={() => handleCopy(displayUid, 'uid')}
                    style={{ background: 'none', border: 'none', color: '#848e9c', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    title="Copy UID"
                  >
                    {copiedUid ? <Check size={14} color="#2ebd85" /> : <Copy size={14} />}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} color="#2ebd85" />
                  <span style={{ color: '#2ebd85', fontWeight: 600 }}>2FA Active</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Referral:</span>
                  <span style={{ color: '#eaecef', fontFamily: 'monospace' }}>{referralCode}</span>
                  <button
                    onClick={() => handleCopy(referralCode, 'referral')}
                    style={{ background: 'none', border: 'none', color: '#848e9c', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    title="Copy Referral ID"
                  >
                    {copiedReferral ? <Check size={14} color="#2ebd85" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsDepositModalOpen(true)}
              style={{
                background: '#fcd535',
                color: '#181a20',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowDownLeft size={16} />
              <span>Deposit</span>
            </button>

            <button
              onClick={() => navigateTo('wallet')}
              style={{
                background: '#2b313a',
                color: '#eaecef',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowUpRight size={16} />
              <span>Withdraw</span>
            </button>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              style={{
                background: '#2b313a',
                color: '#eaecef',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowRightLeft size={16} />
              <span>Transfer</span>
            </button>

            <button
              onClick={() => navigateTo('p2p')}
              style={{
                background: '#2b313a',
                color: '#eaecef',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CreditCard size={16} />
              <span>Buy Crypto</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            ESTIMATED BALANCE & ACCOUNT BREAKDOWN CARD
            ========================================================================= */}
        <div
          className="dashboard-balance-card"
          style={{
            background: 'linear-gradient(135deg, #202630 0%, #181a20 100%)',
            borderRadius: '16px',
            border: '1px solid #2b313a',
            padding: '24px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Top Row: Total Balance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#848e9c', fontWeight: 500 }}>Estimated Balance</span>
                <button
                  onClick={() => setHideBalances(!hideBalances)}
                  style={{ background: 'none', border: 'none', color: '#848e9c', cursor: 'pointer', padding: 0 }}
                  title={hideBalances ? 'Show balance' : 'Hide balance'}
                >
                  {hideBalances ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: '#eaecef', letterSpacing: '-0.5px' }}>
                  {hideBalances ? '******' : `$${totalUsdEstimated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
                <span style={{ fontSize: '15px', color: '#848e9c', fontWeight: 500 }}>
                  ≈ {hideBalances ? '****' : totalBtcEstimated.toFixed(8)} BTC
                </span>
              </div>

              {/* Today's PNL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <span style={{ fontSize: '13px', color: '#848e9c' }}>Today's PNL:</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: isPnlPositive ? '#2ebd85' : '#f6465d',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  {isPnlPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {hideBalances
                    ? '****'
                    : `${isPnlPositive ? '+' : ''}$${portfolio24hChangeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${isPnlPositive ? '+' : ''}${portfolio24hChangePct.toFixed(2)}%)`}
                </span>
                <span style={{ fontSize: '12px', color: '#707a8a' }}>| Live 24h weighted</span>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsDepositModalOpen(true)}
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
                Deposit Fiat/Crypto
              </button>
              <button
                onClick={() => navigateTo('spot')}
                style={{
                  background: 'transparent',
                  color: '#fcd535',
                  border: '1px solid #fcd535',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Trade Now
              </button>
            </div>
          </div>

          {/* 4-Column Account Balance Breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '16px',
              marginTop: '28px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {/* Spot */}
            <div
              style={{
                background: '#181a20',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                border: '1px solid #2b313a'
              }}
              onClick={() => navigateTo('wallet')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Spot Account</span>
                <span style={{ fontSize: '11px', color: '#fcd535', fontWeight: 700 }}>
                  {totalUsdEstimated > 0 ? `${((spotAccountUsd / totalUsdEstimated) * 100).toFixed(0)}%` : '100%'}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>
                {hideBalances ? '******' : `$${spotAccountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>
                Main Trading &amp; Fiat Vault
              </div>
            </div>

            {/* Funding */}
            <div
              style={{
                background: '#181a20',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                border: '1px solid #2b313a'
              }}
              onClick={() => navigateTo('p2p')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Funding Account</span>
                <span style={{ fontSize: '11px', color: '#848e9c', fontWeight: 700 }}>
                  {totalUsdEstimated > 0 ? `${((fundingAccountUsd / totalUsdEstimated) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>
                {hideBalances ? '******' : `$${fundingAccountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>
                P2P &amp; CryptoBridge Pay
              </div>
            </div>

            {/* Futures */}
            <div
              style={{
                background: '#181a20',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                border: '1px solid #2b313a'
              }}
              onClick={() => navigateTo('spot')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>Futures (USDⓈ-M)</span>
                <span style={{ fontSize: '11px', color: '#848e9c', fontWeight: 700 }}>
                  {totalUsdEstimated > 0 ? `${((futuresAccountUsd / totalUsdEstimated) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>
                {hideBalances ? '******' : `$${futuresAccountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>
                Perpetual Contracts
              </div>
            </div>

            {/* Earn */}
            <div
              style={{
                background: '#181a20',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                border: '1px solid #2b313a'
              }}
              onClick={() => navigateTo('earn')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#848e9c', fontWeight: 600 }}>CryptoBridge Earn</span>
                <span style={{ fontSize: '11px', color: '#2ebd85', fontWeight: 700 }}>Flexible</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef' }}>
                {hideBalances ? '******' : `$${earnAccountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div style={{ fontSize: '12px', color: '#848e9c', marginTop: '4px' }}>
                Staking &amp; Savings
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            FAST SERVICES & CORE FUNCTIONALITY SHORTCUTS (Binance Grid)
            ========================================================================= */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef', margin: 0 }}>Core Services &amp; Quick Actions</h2>
            <span style={{ fontSize: '13px', color: '#848e9c' }}>High liquidity, low slippage, ultra-low fees</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '16px'
            }}
          >
            {[
              {
                title: 'Spot Trading',
                desc: 'Trade BTC, ETH & 300+ pairs with 0.1% fees',
                icon: Activity,
                color: '#fcd535',
                action: () => navigateTo('spot')
              },
              {
                title: 'Convert & Swap',
                desc: 'Zero slippage, zero fees instant conversion',
                icon: ArrowRightLeft,
                color: '#2ebd85',
                action: () => navigateTo('spot')
              },
              {
                title: 'CryptoBridge Earn',
                desc: 'Earn up to 16.4% APR with Simple Earn & Staking',
                icon: Coins,
                color: '#f0b90b',
                action: () => navigateTo('earn')
              },
              {
                title: 'USDⓈ-M Futures',
                desc: 'Trade perpetual contracts with up to 125x leverage',
                icon: Zap,
                color: '#f6465d',
                action: () => navigateTo('spot')
              },
              {
                title: 'P2P Trading',
                desc: 'Buy & sell with bank transfer & 800+ payment methods',
                icon: CreditCard,
                color: '#3b82f6',
                action: () => navigateTo('p2p')
              },
              {
                title: 'Trading Bots',
                desc: 'Automate Spot Grid, DCA & Rebalancing strategies',
                icon: Bot,
                color: '#8b5cf6',
                action: () => navigateTo('spot')
              },
              {
                title: 'Stock Intelligence',
                desc: 'Live institutional analysis for NVDA, AAPL & TSLA',
                icon: BarChart2,
                color: '#0284c7',
                action: () => navigateTo('stock', 'NVDA')
              },
              {
                title: 'Rewards Hub',
                desc: 'Complete rookie tasks & unlock up to $100 bonus',
                icon: Gift,
                color: '#ec4899',
                action: () => alert('Rewards Hub: 100 USDT Welcome Voucher Ready!')
              }
            ].map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.title}
                  onClick={srv.action}
                  style={{
                    background: '#202630',
                    borderRadius: '12px',
                    border: '1px solid #2b313a',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = srv.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2b313a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: `rgba(${srv.color === '#fcd535' ? '252, 213, 53' : srv.color === '#2ebd85' ? '46, 189, 133' : '59, 130, 246'}, 0.12)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={22} color={srv.color} />
                    </div>
                    <ChevronRight size={18} color="#848e9c" />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef', margin: '0 0 4px 0' }}>{srv.title}</h3>
                    <p style={{ fontSize: '12px', color: '#848e9c', margin: 0, lineHeight: '1.4' }}>{srv.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            PORTFOLIO ASSETS & TOP HOLDINGS TABLE
            ========================================================================= */}
        <div
          style={{
            background: '#202630',
            borderRadius: '16px',
            border: '1px solid #2b313a',
            padding: '24px',
            marginBottom: '28px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px'
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef', margin: '0 0 4px 0' }}>Assets &amp; Holdings</h2>
              <span style={{ fontSize: '13px', color: '#848e9c' }}>Live valuations calculated with real-time institutional order books</span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} color="#848e9c" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search coin..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 36px',
                  color: '#eaecef',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Holdings Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2b313a', color: '#848e9c' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Asset</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Last Price (USD)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>24h Change</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Available Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500 }}>Total USD Value</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((coin) => {
                  const isPositive = coin.change24h >= 0;
                  return (
                    <tr
                      key={coin.asset}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Asset & Logo */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#181a20',
                              border: `1px solid ${coin.color}`,
                              color: coin.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '14px'
                            }}
                          >
                            {coin.logo}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#eaecef' }}>{coin.asset}</div>
                            <div style={{ fontSize: '11px', color: '#848e9c' }}>{coin.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#eaecef' }}>
                        ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* 24h Change */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: isPositive ? '#2ebd85' : '#f6465d' }}>
                        {isPositive ? `+${coin.change24h.toFixed(2)}%` : `${coin.change24h.toFixed(2)}%`}
                      </td>

                      {/* Free Amount */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#eaecef' }}>
                        <div>{hideBalances ? '******' : coin.free.toLocaleString('en-US', { maximumFractionDigits: 6 })}</div>
                        {coin.locked > 0 && (
                          <div style={{ fontSize: '11px', color: '#848e9c' }}>
                            Locked: {hideBalances ? '***' : coin.locked}
                          </div>
                        )}
                      </td>

                      {/* Total USD Value */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#eaecef' }}>
                        {hideBalances ? '******' : `$${coin.totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>

                      {/* Action Links */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setIsDepositModalOpen(true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#fcd535',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Deposit
                          </button>
                          <button
                            onClick={() => navigateTo('spot', `${coin.asset}/USDT`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#848e9c',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#848e9c')}
                          >
                            Trade
                          </button>
                          <button
                            onClick={() => navigateTo('earn')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2ebd85',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Earn
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            LIVE ORDER ACTIVITY & TRADE HISTORY TABS
            ========================================================================= */}
        <div
          style={{
            background: '#202630',
            borderRadius: '16px',
            border: '1px solid #2b313a',
            padding: '24px',
            marginBottom: '28px'
          }}
        >
          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #2b313a',
              paddingBottom: '14px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', gap: '24px' }}>
              {[
                { id: 'open_orders', label: `Open Orders (${(orders || []).filter((o) => o && (o.status === 'NEW' || o.status === 'PARTIALLY_FILLED')).length})` },
                { id: 'order_history', label: 'Order History' },
                { id: 'trade_history', label: `Trade History (${(userTrades || []).length})` },
                { id: 'assets', label: 'Asset Logs' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveActivityTab(tab.id as any)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 0 6px 0',
                    fontSize: '14px',
                    fontWeight: activeActivityTab === tab.id ? 700 : 500,
                    color: activeActivityTab === tab.id ? '#fcd535' : '#848e9c',
                    borderBottom: activeActivityTab === tab.id ? '2px solid #fcd535' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigateTo('spot')}
              style={{
                background: 'none',
                border: 'none',
                color: '#fcd535',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Go to Advanced Trading Terminal</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Tab Contents */}
          {activeActivityTab === 'open_orders' && (
            <div>
              {(orders || []).filter((o) => o && (o.status === 'NEW' || o.status === 'PARTIALLY_FILLED')).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#848e9c' }}>
                  <FileText size={36} color="#4f5867" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No Open Orders</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>You have no open limit or stop orders on the CLOB engine.</div>
                  <button
                    onClick={() => navigateTo('spot')}
                    style={{
                      marginTop: '16px',
                      background: '#fcd535',
                      color: '#181a20',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Place an Order
                  </button>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ color: '#848e9c', borderBottom: '1px solid #2b313a' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Market</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Side</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Filled</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders || [])
                      .filter((o) => o && (o.status === 'NEW' || o.status === 'PARTIALLY_FILLED'))
                      .map((o) => (
                        <tr key={o.id || o.order_id || Math.random()} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{o.market || o.symbol || 'BTC/USDT'}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: o.side === 'BUY' ? '#2ebd85' : '#f6465d' }}>
                            {o.side || 'BUY'}
                          </td>
                          <td style={{ padding: '12px', color: '#848e9c' }}>{o.type || 'LIMIT'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>${parseFloat(o.price || '0').toFixed(2)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(o.quantity || o.amount || '0').toFixed(4)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {((parseFloat(o.executedQty || '0') / Math.max(0.0001, parseFloat(o.quantity || o.amount || '1'))) * 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              style={{
                                background: 'rgba(246, 70, 93, 0.15)',
                                color: '#f6465d',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeActivityTab === 'trade_history' && (
            <div>
              {(userTrades || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#848e9c' }}>
                  <Activity size={36} color="#4f5867" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No Trade Executions</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Executed matching trades will appear here with execution timestamps.</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ color: '#848e9c', borderBottom: '1px solid #2b313a' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Time</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Market</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Side</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Executed Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(userTrades || []).slice(0, 10).map((t, idx) => (
                      <tr key={t?.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px', color: '#848e9c', fontSize: '12px' }}>
                          {new Date(t?.timestamp || Date.now()).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{t?.market || t?.symbol || 'BTC/USDT'}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: t?.side === 'BUY' ? '#2ebd85' : '#f6465d' }}>
                          {t?.side || 'BUY'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>${parseFloat(t?.price || '0').toFixed(2)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(t?.quantity || t?.amount || '0').toFixed(4)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#848e9c', fontFamily: 'monospace' }}>
                          {t?.fee || '0.001 USDT'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeActivityTab === 'order_history' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#848e9c' }}>
              <Clock size={36} color="#4f5867" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>Order History Archive</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>All settled, filled, and cancelled orders within the past 90 days.</div>
            </div>
          )}

          {activeActivityTab === 'assets' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#848e9c' }}>
              <Wallet size={36} color="#4f5867" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>Internal Transfers &amp; Deposit History</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Deposit, withdrawal, and internal sub-account transfer audit trail.</div>
            </div>
          )}
        </div>

        {/* =========================================================================
            ACCOUNT SECURITY & SAFETY CHECKLIST
            ========================================================================= */}
        <div
          style={{
            background: '#202630',
            borderRadius: '16px',
            border: '1px solid #2b313a',
            padding: '24px',
            marginBottom: '28px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#eaecef', margin: '0 0 4px 0' }}>Security Center &amp; Recommendations</h2>
              <span style={{ fontSize: '13px', color: '#848e9c' }}>Protect your funds with advanced defense layers</span>
            </div>
            <span
              style={{
                background: 'rgba(46, 189, 133, 0.15)',
                color: '#2ebd85',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              Security Score: High (4/4 Completed)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
            {[
              {
                title: 'Authenticator App (2FA)',
                status: 'Enabled',
                desc: 'Google Authenticator / TOTP verification for withdrawals and trades',
                icon: Key,
                enabled: true
              },
              {
                title: 'Email Verification',
                status: 'Verified',
                desc: 'Confirm trades and critical actions via high-security verification emails',
                icon: Mail,
                enabled: true
              },
              {
                title: 'Passkeys & Biometrics',
                status: 'Enabled',
                desc: 'FIDO2 WebAuthn authentication via Touch ID, Face ID or YubiKey',
                icon: ShieldCheck,
                enabled: true
              },
              {
                title: 'Anti-Phishing Code',
                status: 'Active',
                desc: 'Prevent spoofing emails with your custom cryptographic secret code',
                icon: Lock,
                enabled: true
              }
            ].map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.title}
                  style={{
                    background: '#181a20',
                    borderRadius: '12px',
                    border: '1px solid #2b313a',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={18} color="#2ebd85" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>{sec.title}</span>
                    </div>
                    <span style={{ color: '#2ebd85', fontSize: '12px', fontWeight: 700 }}>{sec.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#848e9c', margin: 0, lineHeight: '1.4' }}>{sec.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MARKET OVERVIEW & REAL-TIME NEWS STREAM
            ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
          {/* Top Markets Screener */}
          <div
            style={{
              background: '#202630',
              borderRadius: '16px',
              border: '1px solid #2b313a',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#fcd535" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef', margin: 0 }}>Markets Overview</h3>
              </div>
              <button
                onClick={() => navigateTo('markets')}
                style={{ background: 'none', border: 'none', color: '#fcd535', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                View all markets
              </button>
            </div>
            <div style={{ height: '340px', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingViewMarketQuotes category="crypto" height="100%" theme="dark" />
            </div>
          </div>

          {/* Watchlist Mini-Charts */}
          <div
            style={{
              background: '#202630',
              borderRadius: '16px',
              border: '1px solid #2b313a',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#0284c7" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef', margin: 0 }}>Watchlist Live Feed</h3>
              </div>
              <button
                onClick={() => navigateTo('watchlist')}
                style={{ background: 'none', border: 'none', color: '#fcd535', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Manage Watchlist
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
              {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'NVDA'].map((sym) => (
                <div
                  key={sym}
                  onClick={() => (sym.includes('/') ? navigateTo('spot', sym) : navigateTo('stock', sym))}
                  style={{
                    background: '#181a20',
                    borderRadius: '12px',
                    padding: '10px',
                    border: '1px solid #2b313a',
                    cursor: 'pointer',
                    minHeight: '220px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fcd535';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2b313a';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <TradingViewMiniChart symbol={sym} height={210} theme="dark" dateRange="1D" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* =========================================================================
          DEPOSIT MODAL
          ========================================================================= */}
      {isDepositModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setIsDepositModalOpen(false)}
        >
          <div
            style={{
              background: '#202630',
              border: '1px solid #2b313a',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              color: '#eaecef'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowDownLeft size={22} color="#fcd535" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Deposit Crypto &amp; Fiat</h3>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#848e9c', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#848e9c', display: 'block', marginBottom: '6px' }}>Select Coin</label>
                <select
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                >
                  <option value="USDT">USDT - Tether USD</option>
                  <option value="BTC">BTC - Bitcoin</option>
                  <option value="ETH">ETH - Ethereum</option>
                  <option value="SOL">SOL - Solana</option>
                  <option value="BNB">BNB - BNB Smart Chain</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#848e9c', display: 'block', marginBottom: '6px' }}>Deposit Network</label>
                <select
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="TRX">Tron (TRC20) - Fast (1 block confirmation)</option>
                  <option value="BSC">BNB Smart Chain (BEP20) - Low Fee</option>
                  <option value="ETH">Ethereum (ERC20)</option>
                  <option value="SOL">Solana Network</option>
                </select>
              </div>

              {/* Deposit Address Box */}
              <div style={{ background: '#181a20', borderRadius: '12px', padding: '16px', border: '1px solid #2b313a' }}>
                <div style={{ fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>Your Dedicated Deposit Address</div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#fcd535',
                    wordBreak: 'break-all',
                    background: 'rgba(252, 213, 53, 0.08)',
                    padding: '10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>TYas98Qk7x1J9s81L9z0qKp18LqX810as</span>
                  <button
                    onClick={() => handleCopy('TYas98Qk7x1J9s81L9z0qKp18LqX810as', 'uid')}
                    style={{ background: 'none', border: 'none', color: '#fcd535', cursor: 'pointer' }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '8px' }}>
                  ⚠️ Send only USDT to this deposit address. Sending any other currency will result in permanent loss.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  style={{
                    flex: 1,
                    background: '#fcd535',
                    color: '#181a20',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERNAL TRANSFER MODAL
          ========================================================================= */}
      {isTransferModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setIsTransferModalOpen(false)}
        >
          <div
            style={{
              background: '#202630',
              border: '1px solid #2b313a',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              color: '#eaecef'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowRightLeft size={22} color="#fcd535" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Internal Account Transfer</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#848e9c', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {transferSuccessMsg ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#2ebd85" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef', margin: '0 0 6px 0' }}>Transfer Completed</h4>
                <p style={{ fontSize: '13px', color: '#848e9c' }}>{transferSuccessMsg}</p>
                <button
                  onClick={() => {
                    setTransferSuccessMsg('');
                    setIsTransferModalOpen(false);
                  }}
                  style={{
                    marginTop: '16px',
                    background: '#fcd535',
                    color: '#181a20',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  OK
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '4px' }}>From</label>
                    <select
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#181a20',
                        border: '1px solid #2b313a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#eaecef',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="Spot Account">Spot Account</option>
                      <option value="Funding Account">Funding Account</option>
                      <option value="Futures USDⓈ-M">Futures USDⓈ-M</option>
                      <option value="Earn Account">CryptoBridge Earn</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const temp = transferFrom;
                      setTransferFrom(transferTo);
                      setTransferTo(temp);
                    }}
                    style={{
                      background: '#181a20',
                      border: '1px solid #2b313a',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      color: '#fcd535',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginTop: '18px'
                    }}
                  >
                    <ArrowRightLeft size={16} />
                  </button>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '4px' }}>To</label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#181a20',
                        border: '1px solid #2b313a',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#eaecef',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="Futures USDⓈ-M">Futures USDⓈ-M</option>
                      <option value="Spot Account">Spot Account</option>
                      <option value="Funding Account">Funding Account</option>
                      <option value="Earn Account">CryptoBridge Earn</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '4px' }}>Coin</label>
                  <select
                    value={transferAsset}
                    onChange={(e) => setTransferAsset(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #2b313a',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#eaecef',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="USDT">USDT - Tether USD</option>
                    <option value="BTC">BTC - Bitcoin</option>
                    <option value="ETH">ETH - Ethereum</option>
                    <option value="SOL">SOL - Solana</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#848e9c', display: 'block', marginBottom: '4px' }}>Amount</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#181a20',
                        border: '1px solid #2b313a',
                        borderRadius: '8px',
                        padding: '10px 60px 10px 12px',
                        color: '#eaecef',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => setTransferAmount('1000')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#fcd535',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848e9c' }}>
                  <span>Transfer Fee:</span>
                  <span style={{ color: '#2ebd85', fontWeight: 600 }}>0.00 (Instant Free Internal Transfer)</span>
                </div>

                <button
                  onClick={() => {
                    const amt = parseFloat(transferAmount) || 100;
                    setTransferSuccessMsg(`Successfully transferred ${amt} ${transferAsset} from ${transferFrom} to ${transferTo}.`);
                    if (onRefreshUser) onRefreshUser();
                  }}
                  style={{
                    marginTop: '8px',
                    background: '#fcd535',
                    color: '#181a20',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Confirm Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
