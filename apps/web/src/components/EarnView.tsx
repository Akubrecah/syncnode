import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  Coins,
  ArrowRight,
  HelpCircle,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  DollarSign,
  Percent,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  X
} from 'lucide-react';

export interface EarnProduct {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  category: 'simple' | 'staking' | 'high_yield' | 'dual' | 'auto_invest';
  isHot?: boolean;
  isNew?: boolean;
  baseApr: number; // e.g. 12.8 (%)
  tieredBonusApr?: number; // extra tiered bonus
  minDeposit: number;
  durations: {
    label: string; // 'Flexible', '30D', '60D', '90D', '120D'
    days: number; // 0 for flexible
    apr: number; // APR % for this duration
    isPopular?: boolean;
  }[];
  totalStakedUsd?: number;
  priceUsd?: number;
  tokenSupply?: string;
  description: string;
}

const INITIAL_EARN_PRODUCTS: EarnProduct[] = [
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether USD',
    icon: 'https://public.bnbstatic.com/image/currencies/USDT.png',
    category: 'simple',
    isHot: true,
    baseApr: 12.8,
    tieredBonusApr: 7.0,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 12.8, isPopular: true },
      { label: '30 Days', days: 30, apr: 13.5 },
      { label: '60 Days', days: 60, apr: 14.2 },
      { label: '120 Days', days: 120, apr: 15.0 }
    ],
    totalStakedUsd: 4850000000,
    description: 'Earn high tiered yield on the world’s most liquid USD stablecoin with daily interest distribution.'
  },
  {
    id: 'fdusd',
    symbol: 'FDUSD',
    name: 'First Digital USD',
    icon: 'https://public.bnbstatic.com/static/images/common/fdusd.png',
    category: 'simple',
    isHot: true,
    baseApr: 11.5,
    tieredBonusApr: 5.5,
    minDeposit: 1,
    durations: [
      { label: 'Flexible', days: 0, apr: 11.5, isPopular: true },
      { label: '30 Days', days: 30, apr: 12.1 },
      { label: '60 Days', days: 60, apr: 12.8 }
    ],
    totalStakedUsd: 1920000000,
    description: 'Fully backed stablecoin with zero-fee redemption and automatic Launchpool farming rewards.'
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'https://public.bnbstatic.com/image/currencies/USDC.png',
    category: 'simple',
    baseApr: 10.9,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 10.9, isPopular: true },
      { label: '30 Days', days: 30, apr: 11.4 },
      { label: '90 Days', days: 90, apr: 12.2 }
    ],
    totalStakedUsd: 1450000000,
    description: 'Regulated, transparent dollar asset with daily compounding passive rewards.'
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    icon: 'https://public.bnbstatic.com/image/currencies/SOL.png',
    category: 'staking',
    isHot: true,
    baseApr: 7.85,
    minDeposit: 0.01,
    durations: [
      { label: 'Flexible', days: 0, apr: 7.85, isPopular: true },
      { label: '30 Days', days: 30, apr: 8.4 },
      { label: '60 Days', days: 60, apr: 8.9 },
      { label: '120 Days', days: 120, apr: 9.8 }
    ],
    totalStakedUsd: 890000000,
    description: 'Earn on-chain Solana proof-of-stake rewards with liquid staking and instant redemption.'
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'BNB',
    icon: 'https://public.bnbstatic.com/image/currencies/BNB.png',
    category: 'simple',
    isHot: true,
    baseApr: 6.4,
    minDeposit: 0.001,
    durations: [
      { label: 'Flexible', days: 0, apr: 6.4, isPopular: true },
      { label: '30 Days', days: 30, apr: 7.1 },
      { label: '60 Days', days: 60, apr: 7.9 },
      { label: '120 Days', days: 120, apr: 10.5 }
    ],
    totalStakedUsd: 3200000000,
    description: 'BNB Vault combines Simple Earn APR with automatic Launchpool token airdrops and Megadrop.'
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'https://public.bnbstatic.com/image/currencies/ETH.png',
    category: 'staking',
    baseApr: 4.2,
    minDeposit: 0.0001,
    durations: [
      { label: 'Flexible (WBETH)', days: 0, apr: 4.2, isPopular: true },
      { label: '30 Days', days: 30, apr: 4.6 },
      { label: '90 Days', days: 90, apr: 5.1 }
    ],
    totalStakedUsd: 2600000000,
    description: 'Ethereum Proof-of-Stake liquid staking. Wrap to WBETH to trade, farm DeFi, and collect validator rewards.'
  },
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: 'https://public.bnbstatic.com/image/currencies/BTC.png',
    category: 'simple',
    baseApr: 3.5,
    tieredBonusApr: 2.5,
    minDeposit: 0.0001,
    durations: [
      { label: 'Flexible', days: 0, apr: 3.5, isPopular: true },
      { label: '30 Days', days: 30, apr: 4.1 },
      { label: '60 Days', days: 60, apr: 4.8 }
    ],
    totalStakedUsd: 4100000000,
    description: 'Put your idle Bitcoin to work with daily interest payouts and 100% principal protection.'
  },
  {
    id: 'dot',
    symbol: 'DOT',
    name: 'Polkadot',
    icon: 'https://public.bnbstatic.com/image/currencies/DOT.png',
    category: 'staking',
    isHot: true,
    baseApr: 14.5,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 9.8 },
      { label: '30 Days', days: 30, apr: 12.2 },
      { label: '60 Days', days: 60, apr: 13.5 },
      { label: '120 Days', days: 120, apr: 14.5, isPopular: true }
    ],
    totalStakedUsd: 310000000,
    description: 'High-yield locked staking directly participating in Polkadot consensus security.'
  },
  {
    id: 'near',
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    icon: 'https://public.bnbstatic.com/image/currencies/NEAR.png',
    category: 'staking',
    baseApr: 9.8,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 7.2 },
      { label: '30 Days', days: 30, apr: 8.5 },
      { label: '60 Days', days: 60, apr: 9.8, isPopular: true }
    ],
    totalStakedUsd: 180000000,
    description: 'Fast, sharded blockchain staking with high APR and flexible reward unlocking.'
  },
  {
    id: 'avax',
    symbol: 'AVAX',
    name: 'Avalanche',
    icon: 'https://public.bnbstatic.com/image/currencies/AVAX.png',
    category: 'staking',
    baseApr: 8.5,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 6.5 },
      { label: '30 Days', days: 30, apr: 7.8 },
      { label: '90 Days', days: 90, apr: 8.5, isPopular: true }
    ],
    totalStakedUsd: 220000000,
    description: 'Subnet staking with automated compounding and daily distribution.'
  },
  {
    id: 'sui',
    symbol: 'SUI',
    name: 'Sui',
    icon: 'https://public.bnbstatic.com/image/currencies/SUI.png',
    category: 'simple',
    isNew: true,
    baseApr: 6.8,
    minDeposit: 1,
    durations: [
      { label: 'Flexible', days: 0, apr: 6.8, isPopular: true },
      { label: '30 Days', days: 30, apr: 7.5 }
    ],
    totalStakedUsd: 140000000,
    description: 'Next-generation Move blockchain high-throughput staking with low lockup requirements.'
  },
  {
    id: 'atom',
    symbol: 'ATOM',
    name: 'Cosmos',
    icon: 'https://public.bnbstatic.com/image/currencies/ATOM.png',
    category: 'staking',
    baseApr: 16.4,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 11.2 },
      { label: '60 Days', days: 60, apr: 14.0 },
      { label: '120 Days', days: 120, apr: 16.4, isPopular: true }
    ],
    totalStakedUsd: 195000000,
    description: 'Inter-blockchain communication hub token staking with maximum yield multiplier.'
  },
  {
    id: 'inj',
    symbol: 'INJ',
    name: 'Injective',
    icon: 'https://public.bnbstatic.com/image/currencies/INJ.png',
    category: 'staking',
    baseApr: 15.2,
    minDeposit: 0.1,
    durations: [
      { label: 'Flexible', days: 0, apr: 10.5 },
      { label: '30 Days', days: 30, apr: 12.8 },
      { label: '90 Days', days: 90, apr: 15.2, isPopular: true }
    ],
    totalStakedUsd: 110000000,
    description: 'DeFi optimized Layer-1 protocol staking rewards.'
  },
  {
    id: 'pepe',
    symbol: 'PEPE',
    name: 'Pepe',
    icon: 'https://public.bnbstatic.com/image/currencies/PEPE.png',
    category: 'high_yield',
    isNew: true,
    baseApr: 9.0,
    minDeposit: 10000,
    durations: [
      { label: 'Flexible', days: 0, apr: 9.0, isPopular: true }
    ],
    totalStakedUsd: 75000000,
    description: 'Meme ecosystem high-yield deposit promotion with daily flexible redemptions.'
  }
];

interface EarnViewProps {
  onNavigateToTrade?: (symbol?: string) => void;
  onOpenAuth?: () => void;
  user?: any;
}

export const EarnView: React.FC<EarnViewProps> = ({
  onNavigateToTrade,
  onOpenAuth,
  user
}) => {
  // Navigation tabs within Earn
  const [activeCategory, setActiveCategory] = useState<'all' | 'simple' | 'staking' | 'high_yield' | 'auto_invest'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | 'stable' | 'pos' | 'high_apr'>('all');
  const [sortBy, setSortBy] = useState<'apr' | 'popular' | 'name'>('apr');

  // Selected duration for each product in the table (symbol -> durationIndex)
  const [selectedDurations, setSelectedDurations] = useState<Record<string, number>>({});

  // Calculator State
  const [calcCoin, setCalcCoin] = useState('USDT');
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcDurationIndex, setCalcDurationIndex] = useState(0);
  const [isCompounding, setIsCompounding] = useState(true);

  // Live market prices
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Subscribe Modal
  const [subscribingProduct, setSubscribingProduct] = useState<{
    product: EarnProduct;
    durationIndex: number;
  } | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [autoSubscribe, setAutoSubscribe] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);

  // Fetch live prices from Binance API
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoadingPrices(true);
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (res.ok) {
          const data = await res.json();
          const priceMap: Record<string, number> = {
            'USDT': 1.0,
            'USDC': 1.0,
            'FDUSD': 1.0
          };
          if (Array.isArray(data)) {
            data.forEach((item: { symbol: string; price: string }) => {
              if (item.symbol.endsWith('USDT')) {
                const base = item.symbol.replace('USDT', '');
                priceMap[base] = parseFloat(item.price);
              }
            });
          }
          setLivePrices(priceMap);
        }
      } catch (err) {
        console.warn('Failed to fetch live prices:', err);
      } finally {
        setIsLoadingPrices(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return INITIAL_EARN_PRODUCTS.filter((p) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'simple' && p.category !== 'simple') return false;
        if (activeCategory === 'staking' && p.category !== 'staking') return false;
        if (activeCategory === 'high_yield' && p.category !== 'high_yield') return false;
        if (activeCategory === 'auto_invest' && p.category !== 'auto_invest' && p.category !== 'simple') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSym = p.symbol.toLowerCase().includes(q);
        const matchesName = p.name.toLowerCase().includes(q);
        if (!matchesSym && !matchesName) return false;
      }

      // Asset Type filter
      if (selectedAssetType === 'stable') {
        if (!['USDT', 'USDC', 'FDUSD', 'DAI'].includes(p.symbol)) return false;
      } else if (selectedAssetType === 'pos') {
        if (!['SOL', 'ETH', 'BNB', 'DOT', 'NEAR', 'AVAX', 'ATOM', 'INJ', 'SUI'].includes(p.symbol)) return false;
      } else if (selectedAssetType === 'high_apr') {
        if (p.baseApr < 8.0) return false;
      }

      return true;
    }).sort((a, b) => {
      const getApr = (prod: EarnProduct) => {
        const durIdx = selectedDurations[prod.symbol] || 0;
        return prod.durations[durIdx]?.apr || prod.baseApr;
      };
      if (sortBy === 'apr') return getApr(b) - getApr(a);
      if (sortBy === 'name') return a.symbol.localeCompare(b.symbol);
      return (b.totalStakedUsd || 0) - (a.totalStakedUsd || 0);
    });
  }, [activeCategory, searchQuery, selectedAssetType, sortBy, selectedDurations]);

  // Current calculator product
  const calcProduct = useMemo(() => {
    return INITIAL_EARN_PRODUCTS.find((p) => p.symbol === calcCoin) || INITIAL_EARN_PRODUCTS[0];
  }, [calcCoin]);

  const activeCalcDuration = calcProduct.durations[calcDurationIndex] || calcProduct.durations[0];
  const calcApr = activeCalcDuration.apr;

  // Earnings calculation
  const parsedCalcAmount = parseFloat(calcAmount) || 0;
  const coinPrice = livePrices[calcCoin] || (calcCoin === 'USDT' || calcCoin === 'USDC' || calcCoin === 'FDUSD' ? 1.0 : 100);
  const usdValue = parsedCalcAmount * coinPrice;

  const dailyAprRate = calcApr / 100 / 365;
  const estimatedDailyCoin = parsedCalcAmount * dailyAprRate;
  const estimatedDailyUsd = estimatedDailyCoin * coinPrice;

  // Total projected yield based on duration
  const projectionDays = activeCalcDuration.days > 0 ? activeCalcDuration.days : 365;
  const totalProjectedCoin = isCompounding
    ? parsedCalcAmount * (Math.pow(1 + dailyAprRate, projectionDays) - 1)
    : parsedCalcAmount * (dailyAprRate * projectionDays);
  const totalProjectedUsd = totalProjectedCoin * coinPrice;

  // Handle duration pill click in table
  const handleSelectDuration = (symbol: string, index: number) => {
    setSelectedDurations((prev) => ({ ...prev, [symbol]: index }));
  };

  const handleOpenSubscribe = (prod: EarnProduct, durIdx: number) => {
    setSubscribingProduct({ product: prod, durationIndex: durIdx });
    setDepositAmount(prod.minDeposit.toString());
    setAgreedTerms(false);
    setSubSuccess(false);
  };

  const handleConfirmSubscription = () => {
    if (!agreedTerms) return;
    setSubSuccess(true);
    setTimeout(() => {
      setSubscribingProduct(null);
      setSubSuccess(false);
    }, 2000);
  };

  return (
    <div className="earn-page-container" style={{ background: '#181a20', minHeight: '100vh', color: '#eaecef' }}>
      
      {/* 1. TOP SUBHEADER / NAVIGATION BAR */}
      <div style={{
        background: '#181a20',
        borderBottom: '1px solid #2b313a',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '52px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          {[
            { key: 'all', label: 'Overview' },
            { key: 'simple', label: 'Simple Earn' },
            { key: 'staking', label: 'ETH & SOL Staking' },
            { key: 'high_yield', label: 'High Yield' },
            { key: 'auto_invest', label: 'Auto-Invest' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeCategory === tab.key ? '#2b313a' : 'transparent',
                color: activeCategory === tab.key ? '#fcd535' : '#848e9c',
                fontWeight: activeCategory === tab.key ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#848e9c' }}>
            <Shield size={14} color="#0ecb81" />
            <span>Principal Protected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#848e9c' }}>
            <Zap size={14} color="#fcd535" />
            <span>Daily Interest</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HERO BANNER */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(252, 213, 53, 0.05) 0%, rgba(24, 26, 32, 0) 100%)',
        borderBottom: '1px solid #2b313a',
        padding: '48px 32px 36px 32px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          
          <div style={{ flex: '1 1 500px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(252, 213, 53, 0.12)',
              border: '1px solid rgba(252, 213, 53, 0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              marginBottom: '16px',
              color: '#fcd535',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <Sparkles size={13} />
              <span>SYNCNODE EARN • PASSIVE YIELD PROTOCOL</span>
            </div>

            <h1 style={{
              fontSize: '40px',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#ffffff',
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              Binance Earn
            </h1>

            <p style={{ fontSize: '18px', color: '#848e9c', marginBottom: '28px', maxWidth: '580px', lineHeight: 1.5 }}>
              Smart Earning Starts Here – 300+ Crypto Assets Supported with high-yield flexible deposits, locked staking, and auto-compounding.
            </p>

            {/* KEY METRICS BAR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', maxWidth: '640px' }}>
              <div style={{ background: '#1e2329', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                <div style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase', fontWeight: 600 }}>Total Value Locked</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef', marginTop: '2px' }}>$14.82B</div>
              </div>
              <div style={{ background: '#1e2329', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                <div style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase', fontWeight: 600 }}>Max Est. APR</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0ecb81', marginTop: '2px' }}>Up to 16.4%</div>
              </div>
              <div style={{ background: '#1e2329', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                <div style={{ fontSize: '11px', color: '#848e9c', textTransform: 'uppercase', fontWeight: 600 }}>24h Distributed</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fcd535', marginTop: '2px' }}>$4.15M</div>
              </div>
            </div>
          </div>

          {/* HERO GRAPHIC / BANNER ART */}
          <div style={{
            flex: '0 0 380px',
            background: 'radial-gradient(circle, rgba(252, 213, 53, 0.12) 0%, rgba(30, 35, 41, 0.8) 70%)',
            border: '1px solid rgba(252, 213, 53, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="https://public.bnbstatic.com/image/currencies/USDT.png" alt="USDT" style={{ width: '28px', height: '28px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>USDT Simple Earn</div>
                  <div style={{ fontSize: '11px', color: '#848e9c' }}>Flexible Term • Tiered Bonus</div>
                </div>
              </div>
              <span style={{ background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                12.80% APR
              </span>
            </div>

            <div style={{ borderTop: '1px solid #2b313a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#848e9c' }}>Real-time Bonus Tier:</span>
              <span style={{ color: '#0ecb81', fontWeight: 700 }}>+7.00% APR (up to $500)</span>
            </div>

            <button
              onClick={() => handleOpenSubscribe(INITIAL_EARN_PRODUCTS[0], 0)}
              style={{
                width: '100%',
                background: '#fcd535',
                color: '#181a20',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 0',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              Deposit USDT Now
            </button>
          </div>

        </div>
      </div>

      {/* 3. PRODUCT SHOWCASE HIGHLIGHTS CARDS */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 32px 16px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Card 1: Simple Earn */}
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef' }}>Simple Earn</span>
                <span style={{ fontSize: '11px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>PRINCIPAL SAFE</span>
              </div>
              <p style={{ fontSize: '12px', color: '#848e9c', lineHeight: 1.5, marginBottom: '16px' }}>
                Deposit idle assets with flexible redemption anytime or lock tokens for boosted fixed returns.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2b313a', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>Top APR:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0ecb81' }}>12.80%</div>
              </div>
              <button
                onClick={() => setActiveCategory('simple')}
                style={{ background: '#2b313a', border: 'none', color: '#eaecef', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                View Simple Earn &rarr;
              </button>
            </div>
          </div>

          {/* Card 2: ETH & SOL Staking */}
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef' }}>ETH &amp; SOL Staking</span>
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>LIQUID STAKING</span>
              </div>
              <p style={{ fontSize: '12px', color: '#848e9c', lineHeight: 1.5, marginBottom: '16px' }}>
                Stake ETH or SOL to secure networks and receive liquid tokens (WBETH/BNSOL) to use in DeFi.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2b313a', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>Staking APR:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0ecb81' }}>7.85%</div>
              </div>
              <button
                onClick={() => setActiveCategory('staking')}
                style={{ background: '#2b313a', border: 'none', color: '#eaecef', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Stake Tokens &rarr;
              </button>
            </div>
          </div>

          {/* Card 3: Auto-Invest */}
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef' }}>Auto-Invest</span>
                <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>DCA STRATEGY</span>
              </div>
              <p style={{ fontSize: '12px', color: '#848e9c', lineHeight: 1.5, marginBottom: '16px' }}>
                Accumulate crypto on autopilot with dollar-cost averaging while automatically earning interest.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2b313a', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>Automated APY:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0ecb81' }}>3.50% - 12.8%</div>
              </div>
              <button
                onClick={() => setActiveCategory('auto_invest')}
                style={{ background: '#2b313a', border: 'none', color: '#eaecef', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Set Plan &rarr;
              </button>
            </div>
          </div>

          {/* Card 4: High Yield */}
          <div style={{ background: '#1e2329', border: '1px solid #2b313a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef' }}>Dual Investment</span>
                <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>ENHANCED RETURN</span>
              </div>
              <p style={{ fontSize: '12px', color: '#848e9c', lineHeight: 1.5, marginBottom: '16px' }}>
                Commit crypto to buy low or sell high at your target price with high non-principal protected yield.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2b313a', paddingTop: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#848e9c' }}>Enhanced APR:</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0ecb81' }}>Up to 125%</div>
              </div>
              <button
                onClick={() => setActiveCategory('high_yield')}
                style={{ background: '#2b313a', border: 'none', color: '#eaecef', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Explore High Yield &rarr;
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. POPULAR PRODUCTS TABLE SECTION */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px' }}>
        
        {/* Table Controls & Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#eaecef' }}>Popular Products</h2>
            <div style={{ fontSize: '13px', color: '#848e9c', marginTop: '2px' }}>
              Live real-time yield offerings with zero subscription fees
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: '#1e2329',
              border: '1px solid #2b313a',
              borderRadius: '8px',
              padding: '0 12px',
              height: '40px',
              minWidth: '240px'
            }}>
              <Search size={16} color="#848e9c" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search coins (e.g. BTC, USDT, SOL)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#eaecef',
                  fontSize: '13px',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#848e9c', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Asset Category Filters */}
            <div style={{ display: 'flex', background: '#1e2329', border: '1px solid #2b313a', borderRadius: '8px', padding: '2px' }}>
              {[
                { key: 'all', label: 'All Coins' },
                { key: 'stable', label: 'Stablecoins' },
                { key: 'pos', label: 'Staking / PoS' },
                { key: 'high_apr', label: 'High APR (>8%)' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedAssetType(f.key as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedAssetType === f.key ? '#2b313a' : 'transparent',
                    color: selectedAssetType === f.key ? '#fcd535' : '#848e9c',
                    fontSize: '12px',
                    fontWeight: selectedAssetType === f.key ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: '#1e2329',
                color: '#eaecef',
                border: '1px solid #2b313a',
                borderRadius: '8px',
                padding: '0 12px',
                height: '40px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="apr">Sort by: Highest APR</option>
              <option value="popular">Sort by: Total TVL</option>
              <option value="name">Sort by: Coin Name</option>
            </select>

          </div>
        </div>

        {/* The Earn Table */}
        <div style={{
          background: '#1e2329',
          border: '1px solid #2b313a',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2b313a', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600 }}>Coin</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600 }}>Est. APR</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600 }}>Min. Deposit</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600 }}>Product Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#848e9c', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#848e9c' }}>
                      No Earn products match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const currentDurIdx = selectedDurations[p.symbol] || 0;
                    const activeDur = p.durations[currentDurIdx] || p.durations[0];
                    const livePrice = livePrices[p.symbol] || (p.symbol === 'USDT' || p.symbol === 'USDC' || p.symbol === 'FDUSD' ? 1.0 : 0);

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #2b313a',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#232732')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* 1. Coin Info */}
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={p.icon}
                              alt={p.symbol}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'contain' }}
                              onError={(e) => {
                                // Fallback avatar
                                (e.target as any).src = 'https://public.bnbstatic.com/image/currencies/USDT.png';
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#eaecef' }}>{p.symbol}</span>
                                {p.isHot && (
                                  <span style={{ fontSize: '10px', background: 'rgba(246, 70, 93, 0.15)', color: '#f6465d', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                    HOT
                                  </span>
                                )}
                                {p.isNew && (
                                  <span style={{ fontSize: '10px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#848e9c' }}>
                                {p.name} {livePrice > 0 && <span style={{ color: '#5e6673' }}>• ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Est. APR */}
                        <td style={{ padding: '18px 20px' }}>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0ecb81', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{activeDur.apr.toFixed(2)}%</span>
                              {p.tieredBonusApr && activeDur.days === 0 && (
                                <span style={{ fontSize: '11px', background: 'rgba(14, 203, 129, 0.15)', color: '#0ecb81', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Tiered Bonus
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#848e9c', marginTop: '2px' }}>
                              Daily Payout • Compounding
                            </div>
                          </div>
                        </td>

                        {/* 3. Duration Selector Pills */}
                        <td style={{ padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {p.durations.map((dur, dIdx) => (
                              <button
                                key={dur.label}
                                onClick={() => handleSelectDuration(p.symbol, dIdx)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: currentDurIdx === dIdx ? '1px solid #fcd535' : '1px solid #2b313a',
                                  background: currentDurIdx === dIdx ? 'rgba(252, 213, 53, 0.1)' : '#181a20',
                                  color: currentDurIdx === dIdx ? '#fcd535' : '#848e9c',
                                  fontSize: '12px',
                                  fontWeight: currentDurIdx === dIdx ? 700 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {dur.label}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* 4. Min Deposit */}
                        <td style={{ padding: '18px 20px', fontSize: '13px', color: '#eaecef' }}>
                          {p.minDeposit} {p.symbol}
                        </td>

                        {/* 5. Product Tag */}
                        <td style={{ padding: '18px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            background: p.category === 'staking' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.06)',
                            color: p.category === 'staking' ? '#3b82f6' : '#848e9c',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {p.category === 'simple' ? 'Simple Earn' : p.category === 'staking' ? 'On-Chain Staking' : 'High Yield'}
                          </span>
                        </td>

                        {/* 6. Action Button */}
                        <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenSubscribe(p, currentDurIdx)}
                            style={{
                              background: '#fcd535',
                              color: '#181a20',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 18px',
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            Subscribe
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 5. "CALCULATE YOUR CRYPTO EARNINGS" INTERACTIVE CALCULATOR (From HTML source) */}
      <div style={{ maxWidth: '1280px', margin: '32px auto', padding: '0 32px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e2329 0%, #171a1f 100%)',
          border: '1px solid #2b313a',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#eaecef', letterSpacing: '-0.3px' }}>
              Calculate your crypto earnings
            </h2>
            <p style={{ fontSize: '14px', color: '#848e9c', marginTop: '6px' }}>
              Estimate your projected daily, monthly, and yearly rewards with real-time dynamic APR compounding.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px' }}>
            
            {/* Left Side: Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Select Asset */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#848e9c', fontWeight: 600, marginBottom: '8px' }}>
                  Select Coin / Asset
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'FDUSD', 'DOT', 'NEAR'].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => {
                        setCalcCoin(sym);
                        setCalcDurationIndex(0);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: calcCoin === sym ? '1px solid #fcd535' : '1px solid #2b313a',
                        background: calcCoin === sym ? 'rgba(252, 213, 53, 0.15)' : '#181a20',
                        color: calcCoin === sym ? '#fcd535' : '#eaecef',
                        fontWeight: calcCoin === sym ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{sym}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deposit Amount Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#848e9c', marginBottom: '8px', fontWeight: 600 }}>
                  <span>Deposit Amount ({calcCoin})</span>
                  <span>≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#181a20',
                  border: '1px solid #2b313a',
                  borderRadius: '8px',
                  padding: '0 16px',
                  height: '48px'
                }}>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 700,
                      width: '100%'
                    }}
                  />
                  <span style={{ color: '#fcd535', fontWeight: 700, fontSize: '14px' }}>{calcCoin}</span>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {['100', '500', '1000', '5000', '10000'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCalcAmount(preset)}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        background: '#181a20',
                        border: '1px solid #2b313a',
                        borderRadius: '4px',
                        color: '#848e9c',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Tabs */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#848e9c', fontWeight: 600, marginBottom: '8px' }}>
                  Lock / Staking Period
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {calcProduct.durations.map((dur, dIdx) => (
                    <button
                      key={dur.label}
                      onClick={() => setCalcDurationIndex(dIdx)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: calcDurationIndex === dIdx ? '1px solid #fcd535' : '1px solid #2b313a',
                        background: calcDurationIndex === dIdx ? 'rgba(252, 213, 53, 0.15)' : '#181a20',
                        color: calcDurationIndex === dIdx ? '#fcd535' : '#848e9c',
                        fontWeight: calcDurationIndex === dIdx ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {dur.label} ({dur.apr.toFixed(2)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Compounding Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="compounding-check"
                  checked={isCompounding}
                  onChange={(e) => setIsCompounding(e.target.checked)}
                  style={{ accentColor: '#fcd535', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="compounding-check" style={{ fontSize: '13px', color: '#eaecef', cursor: 'pointer' }}>
                  Auto-Compound Daily Rewards (Reinvest returns automatically)
                </label>
              </div>

            </div>

            {/* Right Side: Projections & Visual SVG Curve */}
            <div style={{
              background: '#181a20',
              border: '1px solid #2b313a',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2b313a', paddingBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#848e9c', textTransform: 'uppercase', fontWeight: 600 }}>Projected Total Returns</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#0ecb81', marginTop: '4px' }}>
                      +{totalProjectedCoin.toFixed(4)} {calcCoin}
                    </div>
                    <div style={{ fontSize: '13px', color: '#848e9c' }}>
                      ≈ +${totalProjectedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#848e9c' }}>Effective APY</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#fcd535' }}>{calcApr.toFixed(2)}%</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ background: '#1e2329', padding: '10px 14px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>Estimated Daily Payout</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef', marginTop: '2px' }}>
                      +{estimatedDailyCoin.toFixed(6)} {calcCoin}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0ecb81' }}>+${estimatedDailyUsd.toFixed(3)}/day</div>
                  </div>
                  <div style={{ background: '#1e2329', padding: '10px 14px', borderRadius: '8px', border: '1px solid #2b313a' }}>
                    <div style={{ fontSize: '11px', color: '#848e9c' }}>Est. 30-Day Total</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef', marginTop: '2px' }}>
                      +{(estimatedDailyCoin * 30).toFixed(4)} {calcCoin}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0ecb81' }}>+${(estimatedDailyUsd * 30).toFixed(2)}</div>
                  </div>
                </div>

                {/* SVG Visual Yield Curve */}
                <div style={{ marginTop: '20px', height: '100px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="earnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ecb81" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0ecb81" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,90 Q 150,80 280,45 T 400,10 L 400,100 L 0,100 Z"
                      fill="url(#earnGradient)"
                    />
                    <path
                      d="M 0,90 Q 150,80 280,45 T 400,10"
                      fill="none"
                      stroke="#0ecb81"
                      strokeWidth="3"
                    />
                    <circle cx="400" cy="10" r="5" fill="#fcd535" />
                  </svg>
                </div>
              </div>

              <button
                onClick={() => handleOpenSubscribe(calcProduct, calcDurationIndex)}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 0',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                Subscribe to {calcCoin} ({calcApr.toFixed(2)}% APR)
              </button>

            </div>

          </div>

        </div>
      </div>

      {/* 6. FREQUENTLY ASKED QUESTIONS SECTION (Matching HTML source) */}
      <div style={{ maxWidth: '1280px', margin: '48px auto', padding: '0 32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#eaecef', marginBottom: '24px', letterSpacing: '-0.3px' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              q: 'What is Binance Earn?',
              a: 'Binance Earn offers a suite of products for you to grow your crypto holdings easily through passive rewards. Products including Simple Earn and Advanced Earn are currently available for subscription on the Binance Earn platform, and new offerings continue to be added regularly. By leveraging Simple Earn including Flexible Products, Locked Products, ETH Staking, and SOL Staking, users can earn daily crypto rewards on their crypto assets.'
            },
            {
              q: 'How does Binance Earn work?',
              a: 'Using Binance Earn is easy. Choose from dozens of available offerings, and transfer your cryptocurrencies into your chosen product. Flexible products allow you to deposit and redeem funds at any time, while locked products lock your assets for a fixed duration in exchange for higher APR returns.'
            },
            {
              q: 'Which cryptocurrencies are supported?',
              a: 'Binance Earn supports 300+ cryptocurrencies, including major tokens like Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), and stablecoins such as USDT, FDUSD, and USDC. Product offerings and availability vary by token and tier.'
            },
            {
              q: 'Am I eligible for Binance Earn?',
              a: 'As long as you have the minimum amount of cryptocurrency indicated in your chosen product and you have completed necessary identity verification, you are good to go. There are no subscription fees to participate.'
            },
            {
              q: 'How do I start earning?',
              a: 'To begin earning passive rewards with Binance Earn: 1. Choose a Product: Select an option like Flexible products, Locked Staking, or ETH Staking. 2. Subscribe: Enter the amount of cryptocurrency you would like to deposit. 3. Earning: Rewards are calculated daily and credited directly to your Earn Wallet.'
            }
          ].map((faq, idx) => {
            const isExp = expandedFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: '#1e2329',
                  border: '1px solid #2b313a',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setExpandedFaq(isExp ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#fcd535' }}>0{idx + 1}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#eaecef' }}>{faq.q}</span>
                  </div>
                  <div style={{ color: '#fcd535' }}>
                    {isExp ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>
                {isExp && (
                  <div style={{ padding: '0 24px 20px 56px', fontSize: '14px', color: '#848e9c', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. SUBSCRIPTION MODAL */}
      {subscribingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 14, 17, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e2329',
            border: '1px solid #2b313a',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            
            {/* Close Button */}
            <button
              onClick={() => setSubscribingProduct(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#848e9c',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {subSuccess ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <CheckCircle2 size={56} color="#0ecb81" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef' }}>Subscription Successful!</h3>
                <p style={{ fontSize: '14px', color: '#848e9c', marginTop: '8px' }}>
                  You have subscribed {depositAmount} {subscribingProduct.product.symbol} to Binance Earn. Interest starts accruing tomorrow.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <img
                    src={subscribingProduct.product.icon}
                    alt={subscribingProduct.product.symbol}
                    style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef' }}>
                      Subscribe {subscribingProduct.product.symbol}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#848e9c' }}>
                      {subscribingProduct.product.name} • {subscribingProduct.product.durations[subscribingProduct.durationIndex].label}
                    </div>
                  </div>
                </div>

                {/* Duration Pills in Modal */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#848e9c', fontWeight: 600, marginBottom: '6px' }}>
                    Duration
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {subscribingProduct.product.durations.map((dur, idx) => (
                      <button
                        key={dur.label}
                        onClick={() => setSubscribingProduct({ ...subscribingProduct, durationIndex: idx })}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: '6px',
                          border: subscribingProduct.durationIndex === idx ? '1px solid #fcd535' : '1px solid #2b313a',
                          background: subscribingProduct.durationIndex === idx ? 'rgba(252, 213, 53, 0.15)' : '#181a20',
                          color: subscribingProduct.durationIndex === idx ? '#fcd535' : '#848e9c',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subscription Amount */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848e9c', marginBottom: '6px' }}>
                    <span>Subscription Amount</span>
                    <span>Min: {subscribingProduct.product.minDeposit} {subscribingProduct.product.symbol}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#181a20',
                    border: '1px solid #2b313a',
                    borderRadius: '8px',
                    padding: '0 14px',
                    height: '44px'
                  }}>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 700,
                        width: '100%'
                      }}
                    />
                    <button
                      onClick={() => setDepositAmount('1000')}
                      style={{ background: 'transparent', border: 'none', color: '#fcd535', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Summary Details */}
                <div style={{ background: '#181a20', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#848e9c' }}>Est. APR:</span>
                    <span style={{ color: '#0ecb81', fontWeight: 700 }}>
                      {subscribingProduct.product.durations[subscribingProduct.durationIndex].apr.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#848e9c' }}>Interest Start Date:</span>
                    <span style={{ color: '#eaecef' }}>Tomorrow (00:00 UTC)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#848e9c' }}>Daily Payout:</span>
                    <span style={{ color: '#eaecef' }}>
                      ≈ {((parseFloat(depositAmount) || 0) * (subscribingProduct.product.durations[subscribingProduct.durationIndex].apr / 100 / 365)).toFixed(6)} {subscribingProduct.product.symbol}
                    </span>
                  </div>
                </div>

                {/* Auto Subscribe Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="auto-sub-modal"
                    checked={autoSubscribe}
                    onChange={(e) => setAutoSubscribe(e.target.checked)}
                    style={{ accentColor: '#fcd535' }}
                  />
                  <label htmlFor="auto-sub-modal" style={{ fontSize: '12px', color: '#848e9c', cursor: 'pointer' }}>
                    Auto-Renew: Automatically renew subscription upon maturity
                  </label>
                </div>

                {/* Terms Agreement */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="terms-sub-modal"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    style={{ accentColor: '#fcd535' }}
                  />
                  <label htmlFor="terms-sub-modal" style={{ fontSize: '12px', color: '#eaecef', cursor: 'pointer' }}>
                    I have read and agree to the <span style={{ color: '#fcd535' }}>Binance Earn Service Agreement</span>
                  </label>
                </div>

                <button
                  disabled={!agreedTerms || (parseFloat(depositAmount) || 0) <= 0}
                  onClick={handleConfirmSubscription}
                  style={{
                    width: '100%',
                    background: agreedTerms && (parseFloat(depositAmount) || 0) > 0 ? '#fcd535' : '#2b313a',
                    color: agreedTerms && (parseFloat(depositAmount) || 0) > 0 ? '#181a20' : '#5e6673',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 0',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: agreedTerms && (parseFloat(depositAmount) || 0) > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s'
                  }}
                >
                  Confirm Subscription
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* 8. BINANCE FOOTER SECTION (Included from source code) */}
      <footer style={{
        background: '#181a20',
        borderTop: '1px solid #2b313a',
        padding: '48px 32px 32px 32px',
        marginTop: '64px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', marginBottom: '40px' }}>
            
            <div>
              <h4 style={{ color: '#eaecef', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Community</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#848e9c' }}>
                <li><a href="#/earn" style={{ color: '#848e9c', textDecoration: 'none' }}>Discord</a></li>
                <li><a href="#/earn" style={{ color: '#848e9c', textDecoration: 'none' }}>Telegram</a></li>
                <li><a href="#/earn" style={{ color: '#848e9c', textDecoration: 'none' }}>Twitter (X)</a></li>
                <li><a href="#/earn" style={{ color: '#848e9c', textDecoration: 'none' }}>Reddit</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#eaecef', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>About Us</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#848e9c' }}>
                <li><a href="#/home" style={{ color: '#848e9c', textDecoration: 'none' }}>About</a></li>
                <li><a href="#/news" style={{ color: '#848e9c', textDecoration: 'none' }}>News &amp; Research</a></li>
                <li><a href="#/security" style={{ color: '#848e9c', textDecoration: 'none' }}>Proof of Reserves</a></li>
                <li><a href="#/terms" style={{ color: '#848e9c', textDecoration: 'none' }}>Terms of Use</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#eaecef', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Products</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#848e9c' }}>
                <li><a href="#/spot" style={{ color: '#848e9c', textDecoration: 'none' }}>Spot Trading</a></li>
                <li><a href="#/markets" style={{ color: '#848e9c', textDecoration: 'none' }}>USDⓈ-M Futures</a></li>
                <li><a href="#/earn" style={{ color: '#fcd535', textDecoration: 'none' }}>Binance Earn</a></li>
                <li><a href="#/p2p" style={{ color: '#848e9c', textDecoration: 'none' }}>P2P Escrow</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#eaecef', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Service &amp; Support</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#848e9c' }}>
                <li><a href="#/support" style={{ color: '#848e9c', textDecoration: 'none' }}>24/7 Chat Support</a></li>
                <li><a href="#/fees" style={{ color: '#848e9c', textDecoration: 'none' }}>Fee Schedule</a></li>
                <li><a href="#/api" style={{ color: '#848e9c', textDecoration: 'none' }}>API Documentation</a></li>
                <li><a href="#/security" style={{ color: '#848e9c', textDecoration: 'none' }}>Security &amp; 2FA</a></li>
              </ul>
            </div>

          </div>

          <div style={{ borderTop: '1px solid #2b313a', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#5e6673' }}>
            <div>
              Binance ADGM &amp; Europe regulated entities. Risk Warning: Digital asset prices can be volatile. Yield investments carry variable APY terms.
            </div>
            <div>
              Binance © 2026 • All rights reserved
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
