import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  History,
  Search,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  QrCode,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Repeat,
  Info,
  Scale,
  Percent,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sliders,
  Check,
  X,
  Send,
  CreditCard
} from 'lucide-react';

export type WalletSubTab = 'overview' | 'spot' | 'margin' | 'futures' | 'funding' | 'deposit' | 'withdraw' | 'history';

interface WalletViewProps {
  balances: any[];
  onRefresh: () => void;
  initialSubTab?: WalletSubTab;
  initialAsset?: string;
  onNavigateToTrade?: (symbol: string) => void;
  onNavigateToTransfer?: (asset?: string) => void;
}

// Master metadata map for cryptocurrency logos, names, and tags
const ASSET_METADATA: Record<
  string,
  { name: string; color: string; tags: string[]; icon?: string }
> = {
  BTC: { name: 'Bitcoin', color: '#F7931A', tags: ['Layer 1', 'PoW', 'Store of Value'] },
  ETH: { name: 'Ethereum', color: '#627EEA', tags: ['Layer 1', 'PoS', 'Smart Contracts'] },
  SOL: { name: 'Solana', color: '#14F195', tags: ['Layer 1', 'High-Speed', 'DeFi'] },
  BNB: { name: 'BNB', color: '#F3BA2F', tags: ['BSC', 'Gas', 'Launchpad'] },
  USDT: { name: 'Tether USD', color: '#26A17B', tags: ['Stablecoin', 'USD'] },
  USDC: { name: 'USD Coin', color: '#2775CA', tags: ['Stablecoin', 'Audited'] },
  FDUSD: { name: 'First Digital USD', color: '#0052FF', tags: ['Stablecoin', '0% Fee'] },
  XRP: { name: 'Ripple', color: '#23292F', tags: ['Payments', 'Enterprise'] },
  ADA: { name: 'Cardano', color: '#0033AD', tags: ['Layer 1', 'PoS'] },
  DOGE: { name: 'Dogecoin', color: '#C2A633', tags: ['Meme', 'PoW'] },
  AVAX: { name: 'Avalanche', color: '#E84142', tags: ['Layer 1', 'Subnets'] },
  DOT: { name: 'Polkadot', color: '#E6007A', tags: ['Interoperability', 'Parachains'] },
  LINK: { name: 'Chainlink', color: '#375BD2', tags: ['Oracle', 'Infrastructure'] },
  NEAR: { name: 'NEAR Protocol', color: '#000000', tags: ['Layer 1', 'Sharding'] },
  SUI: { name: 'Sui', color: '#4DA2FF', tags: ['Layer 1', 'Move'] },
  PEPE: { name: 'Pepe', color: '#4B8838', tags: ['Meme', 'Ethereum'] },
  SHIB: { name: 'Shiba Inu', color: '#FFA409', tags: ['Meme', 'Ecosystem'] }
};

export const WalletView: React.FC<WalletViewProps> = ({
  balances,
  onRefresh,
  initialSubTab = 'spot',
  initialAsset = 'USDT',
  onNavigateToTrade,
  onNavigateToTransfer
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WalletSubTab>(initialSubTab);
  const [viewMode, setViewMode] = useState<'asset' | 'account'>('asset');
  const [selectedAsset, setSelectedAsset] = useState<string>(initialAsset);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [hideSensitiveValues, setHideSensitiveValues] = useState(false);
  const [valCurrency, setValCurrency] = useState<'USD' | 'BTC'>('USD');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Small Amount Exchange (Convert Dust to BNB) Modal State
  const [isDustModalOpen, setIsDustModalOpen] = useState(false);
  const [selectedDustAssets, setSelectedDustAssets] = useState<string[]>([]);
  const [isConvertingDust, setIsConvertingDust] = useState(false);

  // Margin Sub-Mode and State
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [marginSearchFilter, setMarginSearchFilter] = useState('');
  const [hideSmallMargin, setHideSmallMargin] = useState(false);
  const [hideZeroIsolatedPairs, setHideZeroIsolatedPairs] = useState(false);
  const [selectedIsolatedPair, setSelectedIsolatedPair] = useState<string>('BTC/USDT');

  // Cross Margin balances per asset
  const [crossMarginBalances, setCrossMarginBalances] = useState<Record<string, { available: number; borrowed: number; interest: number; maxBorrow: number; hourlyRate: number }>>({
    USDT: { available: 5000.0, borrowed: 0.0, interest: 0.0, maxBorrow: 15000.0, hourlyRate: 0.0014 },
    BTC: { available: 0.25, borrowed: 0.0, interest: 0.0, maxBorrow: 0.75, hourlyRate: 0.0012 },
    ETH: { available: 2.50, borrowed: 0.0, interest: 0.0, maxBorrow: 7.50, hourlyRate: 0.0013 },
    SOL: { available: 20.0, borrowed: 0.0, interest: 0.0, maxBorrow: 60.0, hourlyRate: 0.0015 },
    BNB: { available: 6.0, borrowed: 0.0, interest: 0.0, maxBorrow: 18.0, hourlyRate: 0.0011 },
    USDC: { available: 1500.0, borrowed: 0.0, interest: 0.0, maxBorrow: 4500.0, hourlyRate: 0.0014 },
    FDUSD: { available: 1000.0, borrowed: 0.0, interest: 0.0, maxBorrow: 3000.0, hourlyRate: 0.0010 },
    XRP: { available: 600.0, borrowed: 0.0, interest: 0.0, maxBorrow: 1800.0, hourlyRate: 0.0018 },
    ADA: { available: 1000.0, borrowed: 0.0, interest: 0.0, maxBorrow: 3000.0, hourlyRate: 0.0018 },
    DOGE: { available: 4000.0, borrowed: 0.0, interest: 0.0, maxBorrow: 12000.0, hourlyRate: 0.0020 },
    AVAX: { available: 25.0, borrowed: 0.0, interest: 0.0, maxBorrow: 75.0, hourlyRate: 0.0016 },
    NEAR: { available: 120.0, borrowed: 0.0, interest: 0.0, maxBorrow: 360.0, hourlyRate: 0.0017 },
    SUI: { available: 450.0, borrowed: 0.0, interest: 0.0, maxBorrow: 1350.0, hourlyRate: 0.0019 }
  });

  // Isolated Margin pairs
  const [isolatedPairs, setIsolatedPairs] = useState<Record<string, {
    baseAsset: string;
    quoteAsset: string;
    baseAvailable: number;
    baseBorrowed: number;
    baseInterest: number;
    quoteAvailable: number;
    quoteBorrowed: number;
    quoteInterest: number;
    leverage: number;
  }>>({
    'BTC/USDT': { baseAsset: 'BTC', quoteAsset: 'USDT', baseAvailable: 0.08, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 2500.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'ETH/USDT': { baseAsset: 'ETH', quoteAsset: 'USDT', baseAvailable: 1.20, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 1800.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'SOL/USDT': { baseAsset: 'SOL', quoteAsset: 'USDT', baseAvailable: 12.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 1000.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'BNB/USDT': { baseAsset: 'BNB', quoteAsset: 'USDT', baseAvailable: 3.50, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 800.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'XRP/USDT': { baseAsset: 'XRP', quoteAsset: 'USDT', baseAvailable: 350.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 400.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'DOGE/USDT': { baseAsset: 'DOGE', quoteAsset: 'USDT', baseAvailable: 2000.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 300.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'ADA/USDT': { baseAsset: 'ADA', quoteAsset: 'USDT', baseAvailable: 500.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 250.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'AVAX/USDT': { baseAsset: 'AVAX', quoteAsset: 'USDT', baseAvailable: 15.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 350.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'NEAR/USDT': { baseAsset: 'NEAR', quoteAsset: 'USDT', baseAvailable: 60.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 200.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 },
    'SUI/USDT': { baseAsset: 'SUI', quoteAsset: 'USDT', baseAvailable: 250.0, baseBorrowed: 0.0, baseInterest: 0.0, quoteAvailable: 300.0, quoteBorrowed: 0.0, quoteInterest: 0.0, leverage: 10 }
  });

  // Modals for Margin Operations
  const [isMarginBorrowModalOpen, setIsMarginBorrowModalOpen] = useState(false);
  const [borrowModalData, setBorrowModalData] = useState<{ mode: 'cross' | 'isolated'; asset: string; pair?: string }>({
    mode: 'cross',
    asset: 'USDT'
  });
  const [borrowAmountInput, setBorrowAmountInput] = useState('');

  const [isMarginRepayModalOpen, setIsMarginRepayModalOpen] = useState(false);
  const [repayModalData, setRepayModalData] = useState<{ mode: 'cross' | 'isolated'; asset: string; pair?: string }>({
    mode: 'cross',
    asset: 'USDT'
  });
  const [repayAmountInput, setRepayAmountInput] = useState('');

  const [isMarginTransferModalOpen, setIsMarginTransferModalOpen] = useState(false);
  const [marginTransferFrom, setMarginTransferFrom] = useState<'spot' | 'cross' | 'isolated'>('spot');
  const [marginTransferTo, setMarginTransferTo] = useState<'spot' | 'cross' | 'isolated'>('cross');
  const [marginTransferAsset, setMarginTransferAsset] = useState<string>('USDT');
  const [marginTransferPair, setMarginTransferPair] = useState<string>('BTC/USDT');
  const [marginTransferAmountInput, setMarginTransferAmountInput] = useState('');

  // Futures Sub-Mode and State (Binance /en/my/wallet/account/futures)
  const [futuresMode, setFuturesMode] = useState<'usds-m' | 'coin-m'>('usds-m');
  const [futuresSearchFilter, setFuturesSearchFilter] = useState('');
  const [hideSmallFuturesAssets, setHideSmallFuturesAssets] = useState(false);
  const [hideZeroCoinMargin, setHideZeroCoinMargin] = useState(false);

  // USDⓈ-M Futures Balances & Collateral (USDT, USDC, BNB, FDUSD)
  const [usdsMarginBalances, setUsdsMarginBalances] = useState<Record<string, {
    walletBalance: number;
    unrealizedPnl: number;
    marginBalance: number;
    availableBalance: number;
    totalBalance: number;
  }>>({
    USDT: { walletBalance: 10000.0, unrealizedPnl: 142.50, marginBalance: 10142.50, availableBalance: 8642.50, totalBalance: 10142.50 },
    USDC: { walletBalance: 2500.0, unrealizedPnl: 0.0, marginBalance: 2500.0, availableBalance: 2500.0, totalBalance: 2500.0 },
    BNB: { walletBalance: 15.0, unrealizedPnl: 28.40, marginBalance: 15.0, availableBalance: 12.0, totalBalance: 15.0 },
    FDUSD: { walletBalance: 1000.0, unrealizedPnl: 0.0, marginBalance: 1000.0, availableBalance: 1000.0, totalBalance: 1000.0 }
  });

  // USDⓈ-M Active Open Positions
  const [usdsPositions, setUsdsPositions] = useState<Array<{
    id: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    leverage: number;
    size: number;
    sizeUnit: string;
    entryPrice: number;
    markPrice: number;
    liqPrice: number;
    margin: number;
    marginRatio: number;
    pnl: number;
    roe: number;
  }>>([
    {
      id: 'pos_btc_01',
      symbol: 'BTCUSDT',
      side: 'LONG',
      leverage: 125,
      size: 0.85,
      sizeUnit: 'BTC',
      entryPrice: 90200.0,
      markPrice: 91450.0,
      liqPrice: 83120.0,
      margin: 620.50,
      marginRatio: 1.25,
      pnl: 1062.50,
      roe: 171.23
    },
    {
      id: 'pos_eth_01',
      symbol: 'ETHUSDT',
      side: 'SHORT',
      leverage: 100,
      size: 8.5,
      sizeUnit: 'ETH',
      entryPrice: 2820.0,
      markPrice: 2780.0,
      liqPrice: 3045.0,
      margin: 236.30,
      marginRatio: 2.10,
      pnl: 340.0,
      roe: 143.88
    },
    {
      id: 'pos_sol_01',
      symbol: 'SOLUSDT',
      side: 'LONG',
      leverage: 50,
      size: 65.0,
      sizeUnit: 'SOL',
      entryPrice: 181.5,
      markPrice: 185.2,
      liqPrice: 148.0,
      margin: 240.76,
      marginRatio: 3.45,
      pnl: 240.50,
      roe: 99.89
    }
  ]);

  // COIN-M Balances & Collateral (BTC, ETH, BNB, SOL, XRP)
  const [coinMarginBalances, setCoinMarginBalances] = useState<Record<string, {
    walletBalance: number;
    unrealizedPnl: number;
    marginBalance: number;
    availableOrder: number;
    totalMargin: number;
  }>>({
    BTC: { walletBalance: 0.50, unrealizedPnl: 0.035, marginBalance: 0.535, availableOrder: 0.42, totalMargin: 0.535 },
    ETH: { walletBalance: 5.00, unrealizedPnl: 0.12, marginBalance: 5.12, availableOrder: 4.50, totalMargin: 5.12 },
    BNB: { walletBalance: 20.0, unrealizedPnl: 0.0, marginBalance: 20.0, availableOrder: 20.0, totalMargin: 20.0 },
    SOL: { walletBalance: 50.0, unrealizedPnl: 1.85, marginBalance: 51.85, availableOrder: 42.0, totalMargin: 51.85 },
    XRP: { walletBalance: 2500.0, unrealizedPnl: 0.0, marginBalance: 2500.0, availableOrder: 2500.0, totalMargin: 2500.0 }
  });

  // COIN-M Active Open Positions
  const [coinPositions, setCoinPositions] = useState<Array<{
    id: string;
    contract: string;
    side: 'LONG' | 'SHORT';
    leverage: number;
    contracts: number;
    entryPrice: number;
    markPrice: number;
    liqPrice: number;
    margin: number;
    marginAsset: string;
    pnl: number;
    roe: number;
  }>>([
    {
      id: 'cpos_btc_perp',
      contract: 'BTCUSD CM Perpetual',
      side: 'LONG',
      leverage: 50,
      contracts: 250,
      entryPrice: 90800.0,
      markPrice: 91450.0,
      liqPrice: 75200.0,
      margin: 0.08,
      marginAsset: 'BTC',
      pnl: 0.035,
      roe: 43.75
    },
    {
      id: 'cpos_eth_perp',
      contract: 'ETHUSD CM Perpetual',
      side: 'LONG',
      leverage: 50,
      contracts: 120,
      entryPrice: 2715.0,
      markPrice: 2780.0,
      liqPrice: 2150.0,
      margin: 0.50,
      marginAsset: 'ETH',
      pnl: 0.12,
      roe: 24.0
    }
  ]);

  // Modals for Futures Operations
  const [isFuturesTransferModalOpen, setIsFuturesTransferModalOpen] = useState(false);
  const [futuresTransferFrom, setFuturesTransferFrom] = useState<'spot' | 'usds-m' | 'coin-m'>('spot');
  const [futuresTransferTo, setFuturesTransferTo] = useState<'spot' | 'usds-m' | 'coin-m'>('usds-m');
  const [futuresTransferAsset, setFuturesTransferAsset] = useState<string>('USDT');
  const [futuresTransferAmountInput, setFuturesTransferAmountInput] = useState('');

  // =========================================================================
  // Funding Wallet State (P2P Trading, Binance Pay & Direct Merchant Custody)
  // =========================================================================
  const [fundingBalances, setFundingBalances] = useState<Record<string, { available: number; frozen: number }>>({
    USDT: { available: 1250.00, frozen: 0.00 },
    BTC: { available: 0.05, frozen: 0.00 },
    ETH: { available: 0.80, frozen: 0.00 },
    BNB: { available: 2.50, frozen: 0.00 },
    SOL: { available: 8.00, frozen: 0.00 },
    USDC: { available: 500.00, frozen: 0.00 },
    FDUSD: { available: 300.00, frozen: 0.00 },
    XRP: { available: 200.00, frozen: 0.00 },
    DOGE: { available: 1500.00, frozen: 0.00 },
    ADA: { available: 400.00, frozen: 0.00 },
    AVAX: { available: 10.00, frozen: 0.00 },
    NEAR: { available: 45.00, frozen: 0.00 },
    SUI: { available: 180.00, frozen: 0.00 }
  });

  const [fundingSearchFilter, setFundingSearchFilter] = useState('');
  const [hideSmallFunding, setHideSmallFunding] = useState(false);

  // Modals for Funding Operations
  const [isFundingTransferModalOpen, setIsFundingTransferModalOpen] = useState(false);
  const [fundingTransferFrom, setFundingTransferFrom] = useState<'spot' | 'funding' | 'usds-m' | 'coin-m' | 'cross'>('spot');
  const [fundingTransferTo, setFundingTransferTo] = useState<'spot' | 'funding' | 'usds-m' | 'coin-m' | 'cross'>('funding');
  const [fundingTransferAsset, setFundingTransferAsset] = useState<string>('USDT');
  const [fundingTransferAmountInput, setFundingTransferAmountInput] = useState('');

  const [isFundingSendModalOpen, setIsFundingSendModalOpen] = useState(false);
  const [fundingSendRecipient, setFundingSendRecipient] = useState('');
  const [fundingSendAsset, setFundingSendAsset] = useState<string>('USDT');
  const [fundingSendAmount, setFundingSendAmount] = useState('');
  const [fundingSendNote, setFundingSendNote] = useState('');

  // Live Binance Tickers for valuation & pricing
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change24h: number }>>({
    USDT: { price: 1.0, change24h: 0.0 },
    USDC: { price: 1.0, change24h: 0.0 },
    FDUSD: { price: 1.0, change24h: 0.0 },
    BTC: { price: 91450.0, change24h: 2.15 },
    ETH: { price: 2780.0, change24h: 1.45 },
    SOL: { price: 185.2, change24h: 4.8 },
    BNB: { price: 642.5, change24h: 0.95 }
  });

  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  // Fetch real-time user transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      const token = localStorage.getItem('syncnode_token');
      if (!token) return;
      try {
        const res = await fetch('/api/v1/wallet/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.transactions)) {
          setWithdrawHistory(json.transactions.map((tx: any) => ({
            id: tx.id,
            asset: tx.asset || 'USDT',
            amount: String(tx.amount || '0').replace(/^[+-]/, ''),
            type: tx.type || 'DEPOSIT',
            status: tx.status || 'COMPLETED',
            destination: tx.destination || tx.counterparty || (tx.tx_hash ? tx.tx_hash.slice(0, 14) + '...' : 'Internal Custody Vault'),
            txHash: tx.tx_hash || tx.id,
            timestamp: tx.created_at || Date.now()
          })));
        }
      } catch (e) {
        console.warn('Failed to fetch wallet transactions:', e);
      }
    };
    fetchTransactions();
  }, [balances]);

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (initialAsset) setSelectedAsset(initialAsset);
  }, [initialAsset]);


  // Fetch live market prices from Binance public ticker API
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const map: Record<string, { price: number; change24h: number }> = {
              USDT: { price: 1.0, change24h: 0.0 },
              USDC: { price: 1.0, change24h: 0.0 },
              FDUSD: { price: 1.0, change24h: 0.0 }
            };
            data.forEach((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
              if (item.symbol.endsWith('USDT')) {
                const base = item.symbol.replace('USDT', '');
                map[base] = {
                  price: parseFloat(item.lastPrice) || 0,
                  change24h: parseFloat(item.priceChangePercent) || 0
                };
              }
            });
            setLivePrices((prev) => ({ ...prev, ...map }));
          }
        }
      } catch {
        // Soft fallback
      }
    };

    fetchLiveRates();
    const interval = setInterval(fetchLiveRates, 10000);
    return () => clearInterval(interval);
  }, []);

  const isDevEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000' ||
      window.location.port === '5173');

  const fetchDepositAddress = async (asset: string) => {
    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch(`/api/v1/wallet/deposit-address?asset=${asset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setDepositAddress(json.address);
      }
    } catch (e: any) {
      console.warn('Failed to fetch deposit address:', e?.message || e);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'deposit' || selectedAsset) {
      fetchDepositAddress(selectedAsset);
    }
  }, [selectedAsset, activeSubTab]);

  const handleOpenDeposit = (asset: string) => {
    setSelectedAsset(asset);
    setActiveSubTab('deposit');
    setStatusMsg(null);
    fetchDepositAddress(asset);
  };

  const handleOpenWithdraw = (asset: string) => {
    setSelectedAsset(asset);
    setActiveSubTab('withdraw');
    setStatusMsg(null);
    setDestAddress('');
    setWithdrawAmount('');
    setTotpCode('');
  };

  const handleExecuteWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          asset: selectedAsset,
          destinationAddress: destAddress,
          amount: withdrawAmount,
          totpCode: totpCode || undefined
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Withdrawal failed');

      setStatusMsg({
        type: 'success',
        text: `Withdrawal of ${withdrawAmount} ${selectedAsset} confirmed! TX: ${json.withdrawal?.txHash || 'Pending'}`
      });
      setWithdrawHistory((prev) => [
        {
          id: `tx_${Date.now().toString().slice(-6)}`,
          asset: selectedAsset,
          amount: withdrawAmount,
          type: 'WITHDRAW',
          status: 'COMPLETED',
          destination: destAddress.slice(0, 8) + '...',
          txHash: json.withdrawal?.txHash || '0x' + Math.random().toString(16).slice(2, 10),
          timestamp: Date.now()
        },
        ...prev
      ]);
      setDestAddress('');
      setWithdrawAmount('');
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestDepositFaucet = async (asset: string) => {
    try {
      setLoading(true);
      setStatusMsg(null);
      const token = localStorage.getItem('syncnode_token');
      const res = await fetch('/api/v1/wallet/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ asset })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Faucet request failed');

      setStatusMsg({
        type: 'success',
        text: json.message || `Deposited test ${asset} successfully!`
      });
      setWithdrawHistory((prev) => [
        {
          id: `tx_${Date.now().toString().slice(-6)}`,
          asset,
          amount: asset === 'BTC' ? '0.5' : asset === 'ETH' ? '5.0' : '1000.0',
          type: 'DEPOSIT (FAUCET)',
          status: 'COMPLETED',
          destination: 'Internal Custody Vault',
          txHash: '0x' + Math.random().toString(16).slice(2, 10),
          timestamp: Date.now()
        },
        ...prev
      ]);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  // Build complete list of default & active tokens
  const fullAssetList = useMemo(() => {
    const defaultCoins = ['BTC', 'ETH', 'SOL', 'BNB', 'USDT', 'USDC', 'FDUSD', 'XRP', 'ADA', 'DOGE', 'AVAX', 'NEAR', 'SUI', 'LINK', 'PEPE', 'SHIB'];
    const assetMap = new Map<string, any>();

    // Seed defaults
    defaultCoins.forEach((sym) => {
      assetMap.set(sym, {
        asset: sym,
        available: '0.00000000',
        locked: '0.00000000',
        p2pEscrow: '0.00000000',
        total: '0.00000000'
      });
    });

    // Merge live user balances
    balances.forEach((b) => {
      assetMap.set(b.asset, {
        asset: b.asset,
        available: b.available || '0.00000000',
        locked: b.locked || '0.00000000',
        p2pEscrow: b.p2pEscrow || '0.00000000',
        total: b.total || (parseFloat(b.available || '0') + parseFloat(b.locked || '0')).toFixed(8)
      });
    });

    return Array.from(assetMap.values());
  }, [balances]);

  // Compute Total Est. Valuation in USD and BTC
  const totalUsdValuation = useMemo(() => {
    return fullAssetList.reduce((acc, b) => {
      const total = parseFloat(b.total) || 0;
      const rate = livePrices[b.asset]?.price ?? (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1.0 : 0);
      return acc + total * rate;
    }, 0);
  }, [fullAssetList, livePrices]);

  const btcPrice = livePrices['BTC']?.price || 91450;
  const bnbPrice = livePrices['BNB']?.price || 642.5;
  const totalBtcValuation = (totalUsdValuation / (btcPrice > 0 ? btcPrice : 91450)).toFixed(8);

  // Filtered Assets based on search & dust checkbox
  const filteredAssets = useMemo(() => {
    return fullAssetList.filter((b) => {
      const meta = ASSET_METADATA[b.asset] || { name: b.asset };
      const matchesSearch =
        b.asset.toLowerCase().includes(searchFilter.toLowerCase().trim()) ||
        meta.name.toLowerCase().includes(searchFilter.toLowerCase().trim());

      const rate = livePrices[b.asset]?.price ?? (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1.0 : 0);
      const usdValue = (parseFloat(b.total) || 0) * rate;
      const passesSmallFilter = !hideSmallBalances || usdValue >= 1.0;

      return matchesSearch && passesSmallFilter;
    });
  }, [fullAssetList, searchFilter, hideSmallBalances, livePrices]);

  // Assets eligible for Small Amount Exchange (< $10 USD valuation and not BNB)
  const dustCandidates = useMemo(() => {
    return fullAssetList.filter((b) => {
      if (b.asset === 'BNB') return false;
      const total = parseFloat(b.total) || 0;
      if (total <= 0) return false;
      const rate = livePrices[b.asset]?.price ?? (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1.0 : 0);
      const usdValue = total * rate;
      return usdValue < 10.0;
    });
  }, [fullAssetList, livePrices]);

  const handleConvertDust = async () => {
    if (selectedDustAssets.length === 0) return;
    try {
      setIsConvertingDust(true);
      // Compute total USD of selected dust
      let totalUsdToConvert = 0;
      selectedDustAssets.forEach((sym) => {
        const item = fullAssetList.find((b) => b.asset === sym);
        if (item) {
          const total = parseFloat(item.available || '0');
          const rate = livePrices[sym]?.price ?? 1.0;
          totalUsdToConvert += total * rate;
        }
      });

      const bnbGained = (totalUsdToConvert / (bnbPrice > 0 ? bnbPrice : 642.5)).toFixed(6);

      setStatusMsg({
        type: 'success',
        text: `Successfully converted ${selectedDustAssets.length} small assets into ≈ ${bnbGained} BNB with 0% fees!`
      });
      setIsDustModalOpen(false);
      setSelectedDustAssets([]);
      onRefresh();
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Failed to convert small assets' });
    } finally {
      setIsConvertingDust(false);
    }
  };

  // =========================================================================
  // MARGIN CALCULATIONS & METRICS
  // =========================================================================
  const crossTotalValuationUsd = useMemo(() => {
    return Object.entries(crossMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      const totalAmount = data.available + data.borrowed;
      return acc + totalAmount * rate;
    }, 0);
  }, [crossMarginBalances, livePrices]);

  const crossTotalDebtUsd = useMemo(() => {
    return Object.entries(crossMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      const debtAmount = data.borrowed + data.interest;
      return acc + debtAmount * rate;
    }, 0);
  }, [crossMarginBalances, livePrices]);

  const crossAccountEquityUsd = crossTotalValuationUsd - crossTotalDebtUsd;
  const crossMarginLevel = crossTotalDebtUsd <= 0 ? 999.0 : crossTotalValuationUsd / crossTotalDebtUsd;

  // Isolated Margin calculations across pairs
  const isolatedTotalValuationUsd = useMemo(() => {
    return Object.entries(isolatedPairs).reduce((acc, [, data]) => {
      const baseRate = livePrices[data.baseAsset]?.price ?? 1.0;
      const quoteRate = livePrices[data.quoteAsset]?.price ?? 1.0;
      const baseVal = (data.baseAvailable + data.baseBorrowed) * baseRate;
      const quoteVal = (data.quoteAvailable + data.quoteBorrowed) * quoteRate;
      return acc + baseVal + quoteVal;
    }, 0);
  }, [isolatedPairs, livePrices]);

  const isolatedTotalDebtUsd = useMemo(() => {
    return Object.entries(isolatedPairs).reduce((acc, [, data]) => {
      const baseRate = livePrices[data.baseAsset]?.price ?? 1.0;
      const quoteRate = livePrices[data.quoteAsset]?.price ?? 1.0;
      const baseDebt = (data.baseBorrowed + data.baseInterest) * baseRate;
      const quoteDebt = (data.quoteBorrowed + data.quoteInterest) * quoteRate;
      return acc + baseDebt + quoteDebt;
    }, 0);
  }, [isolatedPairs, livePrices]);

  const isolatedAccountEquityUsd = isolatedTotalValuationUsd - isolatedTotalDebtUsd;

  // Margin Risk Status Evaluator
  const getMarginRiskInfo = (level: number) => {
    if (level >= 999.0 || level >= 2.0) {
      return { label: 'Low Risk', color: '#2ebd85', bg: 'rgba(46, 189, 133, 0.15)', barWidth: '95%' };
    } else if (level >= 1.5) {
      return { label: 'Normal Risk', color: '#2ebd85', bg: 'rgba(46, 189, 133, 0.15)', barWidth: '75%' };
    } else if (level >= 1.2) {
      return { label: 'Medium Risk (Margin Call)', color: '#f0b90b', bg: 'rgba(240, 185, 11, 0.15)', barWidth: '45%' };
    } else if (level >= 1.1) {
      return { label: 'High Risk (Restricted)', color: '#ff693d', bg: 'rgba(255, 105, 61, 0.15)', barWidth: '25%' };
    } else {
      return { label: 'Liquidation Risk', color: '#f6465d', bg: 'rgba(246, 70, 93, 0.15)', barWidth: '10%' };
    }
  };

  // Handlers for Margin Borrowing, Repaying, and Transfers
  const handleExecuteBorrow = () => {
    const amount = parseFloat(borrowAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid borrowing amount' });
      return;
    }

    if (borrowModalData.mode === 'cross') {
      const asset = borrowModalData.asset;
      setCrossMarginBalances((prev) => {
        const current = prev[asset] || { available: 0, borrowed: 0, interest: 0, maxBorrow: 1000, hourlyRate: 0.0014 };
        return {
          ...prev,
          [asset]: {
            ...current,
            available: current.available + amount,
            borrowed: current.borrowed + amount
          }
        };
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully borrowed ${amount} ${asset} into Cross Margin at 0.0014%/hour interest rate!`
      });
    } else {
      const pair = borrowModalData.pair || 'BTC/USDT';
      const asset = borrowModalData.asset;
      setIsolatedPairs((prev) => {
        const current = prev[pair];
        if (!current) return prev;
        const isBase = asset === current.baseAsset;
        return {
          ...prev,
          [pair]: {
            ...current,
            baseAvailable: isBase ? current.baseAvailable + amount : current.baseAvailable,
            baseBorrowed: isBase ? current.baseBorrowed + amount : current.baseBorrowed,
            quoteAvailable: !isBase ? current.quoteAvailable + amount : current.quoteAvailable,
            quoteBorrowed: !isBase ? current.quoteBorrowed + amount : current.quoteBorrowed
          }
        };
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully borrowed ${amount} ${asset} into ${pair} Isolated Margin (10x)!`
      });
    }

    setIsMarginBorrowModalOpen(false);
    setBorrowAmountInput('');
  };

  const handleExecuteRepay = () => {
    const amount = parseFloat(repayAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid repayment amount' });
      return;
    }

    if (repayModalData.mode === 'cross') {
      const asset = repayModalData.asset;
      const current = crossMarginBalances[asset];
      if (!current || current.available < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${asset} balance to repay ${amount}` });
        return;
      }

      setCrossMarginBalances((prev) => {
        const c = prev[asset];
        const newBorrowed = Math.max(0, c.borrowed - amount);
        return {
          ...prev,
          [asset]: {
            ...c,
            available: Math.max(0, c.available - amount),
            borrowed: newBorrowed,
            interest: newBorrowed === 0 ? 0 : c.interest
          }
        };
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully repaid ${amount} ${asset} in Cross Margin. Debt reduced.`
      });
    } else {
      const pair = repayModalData.pair || 'BTC/USDT';
      const asset = repayModalData.asset;
      const current = isolatedPairs[pair];
      if (!current) return;

      const isBase = asset === current.baseAsset;
      const available = isBase ? current.baseAvailable : current.quoteAvailable;
      if (available < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${asset} balance in ${pair} to repay ${amount}` });
        return;
      }

      setIsolatedPairs((prev) => {
        const c = prev[pair];
        return {
          ...prev,
          [pair]: {
            ...c,
            baseAvailable: isBase ? Math.max(0, c.baseAvailable - amount) : c.baseAvailable,
            baseBorrowed: isBase ? Math.max(0, c.baseBorrowed - amount) : c.baseBorrowed,
            quoteAvailable: !isBase ? Math.max(0, c.quoteAvailable - amount) : c.quoteAvailable,
            quoteBorrowed: !isBase ? Math.max(0, c.quoteBorrowed - amount) : c.quoteBorrowed
          }
        };
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully repaid ${amount} ${asset} in ${pair} Isolated Margin.`
      });
    }

    setIsMarginRepayModalOpen(false);
    setRepayAmountInput('');
  };

  const handleExecuteMarginTransfer = () => {
    const amount = parseFloat(marginTransferAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid transfer amount' });
      return;
    }

    // Process internal transfer
    if (marginTransferFrom === 'spot' && marginTransferTo === 'cross') {
      setCrossMarginBalances((prev) => {
        const c = prev[marginTransferAsset] || { available: 0, borrowed: 0, interest: 0, maxBorrow: 1000, hourlyRate: 0.0014 };
        return {
          ...prev,
          [marginTransferAsset]: {
            ...c,
            available: c.available + amount
          }
        };
      });
    } else if (marginTransferFrom === 'cross' && marginTransferTo === 'spot') {
      const c = crossMarginBalances[marginTransferAsset];
      if (!c || c.available < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${marginTransferAsset} in Cross Margin` });
        return;
      }
      setCrossMarginBalances((prev) => ({
        ...prev,
        [marginTransferAsset]: {
          ...c,
          available: Math.max(0, c.available - amount)
        }
      }));
    } else if (marginTransferFrom === 'spot' && marginTransferTo === 'isolated') {
      setIsolatedPairs((prev) => {
        const c = prev[marginTransferPair];
        if (!c) return prev;
        const isBase = marginTransferAsset === c.baseAsset;
        return {
          ...prev,
          [marginTransferPair]: {
            ...c,
            baseAvailable: isBase ? c.baseAvailable + amount : c.baseAvailable,
            quoteAvailable: !isBase ? c.quoteAvailable + amount : c.quoteAvailable
          }
        };
      });
    } else if (marginTransferFrom === 'isolated' && marginTransferTo === 'spot') {
      setIsolatedPairs((prev) => {
        const c = prev[marginTransferPair];
        if (!c) return prev;
        const isBase = marginTransferAsset === c.baseAsset;
        return {
          ...prev,
          [marginTransferPair]: {
            ...c,
            baseAvailable: isBase ? Math.max(0, c.baseAvailable - amount) : c.baseAvailable,
            quoteAvailable: !isBase ? Math.max(0, c.quoteAvailable - amount) : c.quoteAvailable
          }
        };
      });
    }

    setStatusMsg({
      type: 'success',
      text: `Successfully transferred ${amount} ${marginTransferAsset} from ${marginTransferFrom.toUpperCase()} to ${marginTransferTo.toUpperCase()} with 0% fee!`
    });

    setIsMarginTransferModalOpen(false);
    setMarginTransferAmountInput('');
  };

  // =========================================================================
  // FUTURES CALCULATIONS & POSITION CLOSING ENGINE
  // =========================================================================

  // Futures USDⓈ-M Calculations
  const usdsTotalValuationUsd = useMemo(() => {
    return Object.entries(usdsMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      return acc + (data.walletBalance + data.unrealizedPnl) * rate;
    }, 0);
  }, [usdsMarginBalances, livePrices]);

  const usdsTotalWalletBalanceUsd = useMemo(() => {
    return Object.entries(usdsMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      return acc + data.walletBalance * rate;
    }, 0);
  }, [usdsMarginBalances, livePrices]);

  const usdsTotalUnrealizedPnlUsd = useMemo(() => {
    return usdsPositions.reduce((acc, pos) => acc + pos.pnl, 0);
  }, [usdsPositions]);

  const usdsTotalMarginBalanceUsd = usdsTotalWalletBalanceUsd + usdsTotalUnrealizedPnlUsd;

  // Maintenance Margin: Sum of initial maintenance requirements (~0.5% - 1.0%)
  const usdsMaintenanceMarginUsd = useMemo(() => {
    return usdsPositions.reduce((acc, pos) => acc + (pos.size * pos.markPrice * 0.005), 0);
  }, [usdsPositions]);

  const usdsMarginRatio = usdsTotalMarginBalanceUsd > 0
    ? (usdsMaintenanceMarginUsd / usdsTotalMarginBalanceUsd) * 100
    : 0.0;

  // Futures COIN-M Calculations
  const coinTotalValuationUsd = useMemo(() => {
    return Object.entries(coinMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      return acc + (data.walletBalance + data.unrealizedPnl) * rate;
    }, 0);
  }, [coinMarginBalances, livePrices]);

  const coinTotalWalletBalanceUsd = useMemo(() => {
    return Object.entries(coinMarginBalances).reduce((acc, [asset, data]) => {
      const rate = livePrices[asset]?.price ?? 1.0;
      return acc + data.walletBalance * rate;
    }, 0);
  }, [coinMarginBalances, livePrices]);

  const coinTotalUnrealizedPnlUsd = useMemo(() => {
    return coinPositions.reduce((acc, pos) => {
      const rate = livePrices[pos.marginAsset]?.price ?? 1.0;
      return acc + pos.pnl * rate;
    }, 0);
  }, [coinPositions, livePrices]);

  const futuresAccountEquityUsd = futuresMode === 'usds-m' ? usdsTotalValuationUsd : coinTotalValuationUsd;

  // Handlers for closing positions and instant zero-fee transfers
  const handleCloseUsdsPosition = (posId: string) => {
    const pos = usdsPositions.find((p) => p.id === posId);
    if (!pos) return;
    setUsdsMarginBalances((prev) => ({
      ...prev,
      USDT: {
        ...prev.USDT,
        walletBalance: prev.USDT.walletBalance + pos.pnl,
        totalBalance: prev.USDT.totalBalance + pos.pnl,
        availableBalance: prev.USDT.availableBalance + pos.margin + pos.pnl,
        marginBalance: prev.USDT.marginBalance + pos.pnl
      }
    }));
    setUsdsPositions((prev) => prev.filter((p) => p.id !== posId));
    setStatusMsg({
      type: 'success',
      text: `Position ${pos.symbol} (${pos.side} ${pos.leverage}x) closed successfully at mark price $${pos.markPrice.toLocaleString()}! Realized PnL: +$${pos.pnl.toFixed(2)}`
    });
  };

  const handleCloseCoinPosition = (posId: string) => {
    const pos = coinPositions.find((p) => p.id === posId);
    if (!pos) return;
    const asset = pos.marginAsset;
    setCoinMarginBalances((prev) => ({
      ...prev,
      [asset]: {
        ...prev[asset],
        walletBalance: prev[asset].walletBalance + pos.pnl,
        totalMargin: prev[asset].totalMargin + pos.pnl,
        availableOrder: prev[asset].availableOrder + pos.margin + pos.pnl,
        marginBalance: prev[asset].marginBalance + pos.pnl
      }
    }));
    setCoinPositions((prev) => prev.filter((p) => p.id !== posId));
    setStatusMsg({
      type: 'success',
      text: `COIN-M Position ${pos.contract} closed successfully! Realized PnL: +${pos.pnl} ${asset}`
    });
  };

  const handleExecuteFuturesTransfer = () => {
    const amount = parseFloat(futuresTransferAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid transfer amount' });
      return;
    }

    if (futuresTransferFrom === futuresTransferTo) {
      setStatusMsg({ type: 'error', text: 'Source and destination accounts must be different' });
      return;
    }

    // Transfer from Spot to USDⓈ-M
    if (futuresTransferFrom === 'spot' && futuresTransferTo === 'usds-m') {
      setUsdsMarginBalances((prev) => {
        const c = prev[futuresTransferAsset] || { walletBalance: 0, unrealizedPnl: 0, marginBalance: 0, availableBalance: 0, totalBalance: 0 };
        return {
          ...prev,
          [futuresTransferAsset]: {
            ...c,
            walletBalance: c.walletBalance + amount,
            availableBalance: c.availableBalance + amount,
            totalBalance: c.totalBalance + amount,
            marginBalance: c.marginBalance + amount
          }
        };
      });
    } else if (futuresTransferFrom === 'usds-m' && futuresTransferTo === 'spot') {
      const c = usdsMarginBalances[futuresTransferAsset];
      if (!c || c.availableBalance < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${futuresTransferAsset} in USDⓈ-M Futures` });
        return;
      }
      setUsdsMarginBalances((prev) => ({
        ...prev,
        [futuresTransferAsset]: {
          ...c,
          walletBalance: Math.max(0, c.walletBalance - amount),
          availableBalance: Math.max(0, c.availableBalance - amount),
          totalBalance: Math.max(0, c.totalBalance - amount),
          marginBalance: Math.max(0, c.marginBalance - amount)
        }
      }));
    } else if (futuresTransferFrom === 'spot' && futuresTransferTo === 'coin-m') {
      setCoinMarginBalances((prev) => {
        const c = prev[futuresTransferAsset] || { walletBalance: 0, unrealizedPnl: 0, marginBalance: 0, availableOrder: 0, totalMargin: 0 };
        return {
          ...prev,
          [futuresTransferAsset]: {
            ...c,
            walletBalance: c.walletBalance + amount,
            availableOrder: c.availableOrder + amount,
            totalMargin: c.totalMargin + amount,
            marginBalance: c.marginBalance + amount
          }
        };
      });
    } else if (futuresTransferFrom === 'coin-m' && futuresTransferTo === 'spot') {
      const c = coinMarginBalances[futuresTransferAsset];
      if (!c || c.availableOrder < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${futuresTransferAsset} in COIN-M Futures` });
        return;
      }
      setCoinMarginBalances((prev) => ({
        ...prev,
        [futuresTransferAsset]: {
          ...c,
          walletBalance: Math.max(0, c.walletBalance - amount),
          availableOrder: Math.max(0, c.availableOrder - amount),
          totalMargin: Math.max(0, c.totalMargin - amount),
          marginBalance: Math.max(0, c.marginBalance - amount)
        }
      }));
    }

    setStatusMsg({
      type: 'success',
      text: `Successfully transferred ${amount} ${futuresTransferAsset} from ${futuresTransferFrom === 'usds-m' ? 'USDⓈ-M' : futuresTransferFrom === 'coin-m' ? 'COIN-M' : 'Spot'} to ${futuresTransferTo === 'usds-m' ? 'USDⓈ-M' : futuresTransferTo === 'coin-m' ? 'COIN-M' : 'Spot'} with 0% fee!`
    });

    setIsFuturesTransferModalOpen(false);
    setFuturesTransferAmountInput('');
  };

  // =========================================================================
  // Funding Wallet Calculations & Handlers
  // =========================================================================
  const fundingTotalValuationUsd = useMemo(() => {
    return Object.entries(fundingBalances).reduce((acc, [sym, b]) => {
      const price = livePrices[sym]?.price || 1.0;
      return acc + (b.available + b.frozen) * price;
    }, 0);
  }, [fundingBalances, livePrices]);

  const fundingTotalValuationBtc = useMemo(() => {
    return btcPrice > 0 ? (fundingTotalValuationUsd / btcPrice).toFixed(8) : '0.00000000';
  }, [fundingTotalValuationUsd, btcPrice]);

  const filteredFundingList = useMemo(() => {
    return Object.entries(fundingBalances)
      .map(([asset, b]) => ({
        asset,
        available: b.available,
        frozen: b.frozen
      }))
      .filter((item) => {
        if (fundingSearchFilter) {
          const q = fundingSearchFilter.toUpperCase().trim();
          const meta = ASSET_METADATA[item.asset];
          const nameMatches = meta?.name.toUpperCase().includes(q);
          const symMatches = item.asset.toUpperCase().includes(q);
          if (!nameMatches && !symMatches) return false;
        }
        if (hideSmallFunding) {
          const price = livePrices[item.asset]?.price || 1.0;
          const val = (item.available + item.frozen) * price;
          if (val < 1.0) return false;
        }
        return true;
      });
  }, [fundingBalances, fundingSearchFilter, hideSmallFunding, livePrices]);

  const handleExecuteFundingTransfer = () => {
    const amount = parseFloat(fundingTransferAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid transfer amount' });
      return;
    }

    if (fundingTransferFrom === fundingTransferTo) {
      setStatusMsg({ type: 'error', text: 'Source and destination accounts must be different' });
      return;
    }

    if (fundingTransferFrom === 'funding') {
      const f = fundingBalances[fundingTransferAsset];
      if (!f || f.available < amount) {
        setStatusMsg({ type: 'error', text: `Insufficient available ${fundingTransferAsset} in Funding Wallet` });
        return;
      }
      setFundingBalances((prev) => ({
        ...prev,
        [fundingTransferAsset]: {
          ...f,
          available: Math.max(0, f.available - amount)
        }
      }));
    }

    if (fundingTransferTo === 'funding') {
      setFundingBalances((prev) => {
        const f = prev[fundingTransferAsset] || { available: 0, frozen: 0 };
        return {
          ...prev,
          [fundingTransferAsset]: {
            ...f,
            available: f.available + amount
          }
        };
      });
    }

    const fromLabel = fundingTransferFrom === 'spot' ? 'Spot Wallet' : fundingTransferFrom === 'funding' ? 'Funding Wallet' : fundingTransferFrom === 'usds-m' ? 'USDⓈ-M Futures' : fundingTransferFrom === 'coin-m' ? 'COIN-M Futures' : 'Cross Margin';
    const toLabel = fundingTransferTo === 'spot' ? 'Spot Wallet' : fundingTransferTo === 'funding' ? 'Funding Wallet' : fundingTransferTo === 'usds-m' ? 'USDⓈ-M Futures' : fundingTransferTo === 'coin-m' ? 'COIN-M Futures' : 'Cross Margin';

    setStatusMsg({
      type: 'success',
      text: `Successfully transferred ${amount} ${fundingTransferAsset} from ${fromLabel} to ${toLabel} with 0% fee!`
    });

    setIsFundingTransferModalOpen(false);
    setFundingTransferAmountInput('');
  };

  const handleExecuteFundingSend = () => {
    const amount = parseFloat(fundingSendAmount);
    if (!fundingSendRecipient.trim()) {
      setStatusMsg({ type: 'error', text: 'Please provide recipient Email / Phone / Pay ID' });
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid amount to send' });
      return;
    }
    const f = fundingBalances[fundingSendAsset];
    if (!f || f.available < amount) {
      setStatusMsg({ type: 'error', text: `Insufficient available ${fundingSendAsset} in Funding Wallet` });
      return;
    }
    setFundingBalances((prev) => ({
      ...prev,
      [fundingSendAsset]: {
        ...f,
        available: Math.max(0, f.available - amount)
      }
    }));
    setStatusMsg({
      type: 'success',
      text: `Payment sent! Transferred ${amount} ${fundingSendAsset} to ${fundingSendRecipient} via Binance Pay with 0 fee.`
    });
    setIsFundingSendModalOpen(false);
    setFundingSendRecipient('');
    setFundingSendAmount('');
    setFundingSendNote('');
  };

  const selectedBalanceObj = fullAssetList.find((b) => b.asset === selectedAsset) || {
    available: '0.00000000',
    locked: '0.00000000',
    total: '0.00000000'
  };

  return (
    <div className="overview-container" style={{ width: '100%', minHeight: '100%', background: '#181a20', color: '#eaecef' }}>
      <div className="wallet-v2-wrap" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* =========================================================================
            1. EST. TOTAL VALUE CARD (Binance User Center Header Spec)
            ========================================================================= */}
        <div
          style={{
            background: '#202630',
            border: '1px solid #333b47',
            borderRadius: '16px',
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Left Column: Valuation & PnL / Margin Level */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#929aa5' }}>
                {activeSubTab === 'margin' ? 'Est. Margin Account Equity' : activeSubTab === 'futures' ? 'Est. Futures Total Value' : 'Est. Total Value'}
              </span>
              <button
                onClick={() => setHideSensitiveValues(!hideSensitiveValues)}
                style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                title={hideSensitiveValues ? 'Show balance' : 'Hide balance'}
              >
                {hideSensitiveValues ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              <div style={{ marginLeft: '12px', display: 'flex', background: '#29313d', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setValCurrency('USD')}
                  style={{
                    border: 'none',
                    background: valCurrency === 'USD' ? '#333b47' : 'transparent',
                    color: valCurrency === 'USD' ? '#eaecef' : '#929aa5',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  USD
                </button>
                <button
                  onClick={() => setValCurrency('BTC')}
                  style={{
                    border: 'none',
                    background: valCurrency === 'BTC' ? '#333b47' : 'transparent',
                    color: valCurrency === 'BTC' ? '#eaecef' : '#929aa5',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  BTC
                </button>
              </div>
            </div>

            {/* Big Headline Total Valuation */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: '32px', fontWeight: 800, color: '#eaecef', letterSpacing: '-0.5px' }}>
                {hideSensitiveValues
                  ? '******'
                  : activeSubTab === 'margin'
                  ? valCurrency === 'USD'
                    ? `$${(marginMode === 'cross' ? crossAccountEquityUsd : isolatedAccountEquityUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${((marginMode === 'cross' ? crossAccountEquityUsd : isolatedAccountEquityUsd) / (btcPrice > 0 ? btcPrice : 91450)).toFixed(8)} BTC`
                  : activeSubTab === 'futures'
                  ? valCurrency === 'USD'
                    ? `$${futuresAccountEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${(futuresAccountEquityUsd / (btcPrice > 0 ? btcPrice : 91450)).toFixed(8)} BTC`
                  : activeSubTab === 'funding'
                  ? valCurrency === 'USD'
                    ? `$${fundingTotalValuationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${fundingTotalValuationBtc} BTC`
                  : valCurrency === 'USD'
                  ? `$${totalUsdValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${totalBtcValuation} BTC`}
              </span>

              <span className="mono" style={{ fontSize: '14px', color: '#929aa5' }}>
                {hideSensitiveValues
                  ? '******'
                  : activeSubTab === 'margin'
                  ? valCurrency === 'USD'
                    ? `≈ ${((marginMode === 'cross' ? crossAccountEquityUsd : isolatedAccountEquityUsd) / (btcPrice > 0 ? btcPrice : 91450)).toFixed(8)} BTC`
                    : `≈ $${(marginMode === 'cross' ? crossAccountEquityUsd : isolatedAccountEquityUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                  : activeSubTab === 'futures'
                  ? valCurrency === 'USD'
                    ? `≈ ${(futuresAccountEquityUsd / (btcPrice > 0 ? btcPrice : 91450)).toFixed(8)} BTC`
                    : `≈ $${futuresAccountEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                  : activeSubTab === 'funding'
                  ? valCurrency === 'USD'
                    ? `≈ ${fundingTotalValuationBtc} BTC`
                    : `≈ $${fundingTotalValuationUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                  : valCurrency === 'USD'
                  ? `≈ ${totalBtcValuation} BTC`
                  : `≈ $${totalUsdValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
              </span>
            </div>

            {/* Sub-line: Margin Level Metrics or Futures Metrics or Today's PnL */}
            {activeSubTab === 'margin' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: '#929aa5' }}>
                  Total Balance: <strong className="mono" style={{ color: '#eaecef' }}>${(marginMode === 'cross' ? crossTotalValuationUsd : isolatedTotalValuationUsd).toFixed(2)}</strong>
                </span>
                <span style={{ color: '#929aa5' }}>
                  Total Debt: <strong className="mono" style={{ color: '#f6465d' }}>${(marginMode === 'cross' ? crossTotalDebtUsd : isolatedTotalDebtUsd).toFixed(2)}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#929aa5' }}>Margin Level:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).bg,
                      color: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).color
                    }}
                  >
                    {marginMode === 'cross' ? (crossTotalDebtUsd <= 0 ? '999.00' : crossMarginLevel.toFixed(2)) : '999.00'} ({getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).label})
                  </span>
                </div>
              </div>
            ) : activeSubTab === 'futures' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: '#929aa5' }}>
                  Wallet Balance: <strong className="mono" style={{ color: '#eaecef' }}>${(futuresMode === 'usds-m' ? usdsTotalWalletBalanceUsd : coinTotalWalletBalanceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#929aa5' }}>Unrealized PnL:</span>
                  <span className="mono" style={{ color: '#2ebd85', fontWeight: 700 }}>
                    {hideSensitiveValues ? '******' : `+$${(futuresMode === 'usds-m' ? usdsTotalUnrealizedPnlUsd : coinTotalUnrealizedPnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+12.65%)`}
                  </span>
                </div>
                <span style={{ color: '#929aa5' }}>
                  Margin Balance: <strong className="mono" style={{ color: '#eaecef' }}>${(futuresMode === 'usds-m' ? usdsTotalMarginBalanceUsd : (coinTotalWalletBalanceUsd + coinTotalUnrealizedPnlUsd)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#929aa5' }}>Margin Ratio:</span>
                  <span style={{ fontSize: '11px', background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    {futuresMode === 'usds-m' ? usdsMarginRatio.toFixed(2) : '0.85'}% (Low Risk)
                  </span>
                </div>
              </div>
            ) : activeSubTab === 'funding' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                <span style={{ color: '#929aa5' }}>Today's PnL:</span>
                <span style={{ color: '#2ebd85', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {hideSensitiveValues ? '******' : `+$${(fundingTotalValuationUsd * 0.0085).toFixed(2)} (+0.85%)`}
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(46, 189, 133, 0.1)', color: '#2ebd85', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  P2P &amp; Binance Pay
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                <span style={{ color: '#929aa5' }}>Today's PnL:</span>
                <span style={{ color: '#2ebd85', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {hideSensitiveValues ? '******' : `+$${(totalUsdValuation * 0.0124).toFixed(2)} (+1.24%)`}
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(46, 189, 133, 0.1)', color: '#2ebd85', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  24H Real-Time
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {activeSubTab === 'margin' ? (
              <>
                <button
                  id="margin-nav-transfer"
                  onClick={() => setIsMarginTransferModalOpen(true)}
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
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowRightLeft size={16} />
                  <span>Transfer</span>
                </button>

                <button
                  id="margin-nav-borrow"
                  onClick={() => {
                    setBorrowModalData({ mode: marginMode, asset: 'USDT', pair: selectedIsolatedPair });
                    setIsMarginBorrowModalOpen(true);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={16} color="#fcd535" />
                  <span>Borrow</span>
                </button>

                <button
                  id="margin-nav-repay"
                  onClick={() => {
                    setRepayModalData({ mode: marginMode, asset: 'USDT', pair: selectedIsolatedPair });
                    setIsMarginRepayModalOpen(true);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={16} color="#2ebd85" />
                  <span>Repay</span>
                </button>

                <button
                  id="margin-nav-trade"
                  onClick={() => {
                    if (onNavigateToTrade) onNavigateToTrade('BTC/USDT');
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TrendingUp size={16} color="#0ecb81" />
                  <span>Trade</span>
                </button>
              </>
            ) : activeSubTab === 'futures' ? (
              <>
                <button
                  id="futures-nav-transfer"
                  onClick={() => setIsFuturesTransferModalOpen(true)}
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
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowRightLeft size={16} />
                  <span>Transfer</span>
                </button>

                <button
                  id="futures-nav-trade"
                  onClick={() => {
                    if (onNavigateToTrade) onNavigateToTrade('BTC/USDT');
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TrendingUp size={16} color="#0ecb81" />
                  <span>Trade</span>
                </button>

                <button
                  id="futures-nav-deposit"
                  onClick={() => {
                    setActiveSubTab('deposit');
                    setStatusMsg(null);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowDownCircle size={16} />
                  <span>Deposit</span>
                </button>
              </>
            ) : activeSubTab === 'funding' ? (
              <>
                <button
                  id="wallet-nav-transfer"
                  onClick={() => {
                    setFundingTransferFrom('funding');
                    setFundingTransferTo('spot');
                    setIsFundingTransferModalOpen(true);
                  }}
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
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowRightLeft size={16} />
                  <span>Transfer</span>
                </button>

                <button
                  id="wallet-nav-send"
                  onClick={() => setIsFundingSendModalOpen(true)}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} color="#fcd535" />
                  <span>Send</span>
                </button>

                <button
                  id="wallet-nav-withdraw"
                  onClick={() => {
                    setActiveSubTab('withdraw');
                    setStatusMsg(null);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowUpCircle size={16} />
                  <span>Withdraw</span>
                </button>

                <button
                  id="wallet-nav-deposit"
                  onClick={() => {
                    setActiveSubTab('deposit');
                    setStatusMsg(null);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowDownCircle size={16} />
                  <span>Deposit</span>
                </button>
              </>
            ) : (
              <>
                <button
                  id="wallet-nav-deposit"
                  onClick={() => {
                    setActiveSubTab('deposit');
                    setStatusMsg(null);
                  }}
                  style={{
                    background: '#fcd535',
                    color: '#181a20',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowDownCircle size={16} />
                  <span>Deposit</span>
                </button>

                <button
                  id="wallet-nav-withdraw"
                  onClick={() => {
                    setActiveSubTab('withdraw');
                    setStatusMsg(null);
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowUpCircle size={16} />
                  <span>Withdraw</span>
                </button>

                <button
                  id="wallet-nav-transfer"
                  onClick={() => {
                    if (onNavigateToTransfer) onNavigateToTransfer();
                    else setActiveSubTab('spot');
                  }}
                  style={{
                    background: '#29313d',
                    color: '#eaecef',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowRightLeft size={16} />
                  <span>Transfer</span>
                </button>
              </>
            )}

            <button
              id="wallet-nav-history"
              onClick={() => {
                setActiveSubTab('history');
                setStatusMsg(null);
              }}
              style={{
                background: '#29313d',
                color: '#eaecef',
                border: '1px solid #434c5a',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <History size={16} />
              <span>History</span>
            </button>

            {isDevEnvironment && activeSubTab !== 'margin' && (
              <button
                onClick={() => handleTestDepositFaucet('USDT')}
                disabled={loading}
                style={{
                  background: 'rgba(252, 213, 53, 0.15)',
                  color: '#fcd535',
                  border: '1px solid rgba(252, 213, 53, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Instant testnet deposit"
              >
                <Sparkles size={15} />
                <span>+ Faucet USDT</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              style={{
                background: 'transparent',
                color: '#929aa5',
                border: '1px solid #333b47',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Refresh balances"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Global Notification Toast */}
        {statusMsg && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              background: statusMsg.type === 'success' ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
              color: statusMsg.type === 'success' ? '#2ebd85' : '#f6465d',
              border: `1px solid ${statusMsg.type === 'success' ? '#2ebd85' : '#f6465d'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* =========================================================================
            2. SPOT WALLET VIEW (Binance /en/my/wallet/account/main Specification)
            ========================================================================= */}
        {activeSubTab === 'spot' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top Toolbar: Heading "Spot", Search, Small Amount Exchange, and Hide Small Assets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Spot</h2>
                <span style={{ fontSize: '12px', background: '#29313d', color: '#fcd535', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Spot &amp; Margin Custody
                </span>
              </div>

              {/* Search Bar & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Search Textfield */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    width: '200px'
                  }}
                >
                  <Search size={16} color="#707a8a" />
                  <input
                    id="asset-table-list-search-coin"
                    type="text"
                    placeholder="Search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#eaecef',
                      fontSize: '13px',
                      width: '100%'
                    }}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Small Amount Exchange Button */}
                <button
                  onClick={() => {
                    setSelectedDustAssets(dustCandidates.map((d) => d.asset));
                    setIsDustModalOpen(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#929aa5',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                  title="Convert low balance tokens into BNB"
                >
                  <Repeat size={16} />
                  <span>Small Amount Exchange</span>
                </button>

                {/* Hide Assets <1 USD Checkbox */}
                <label
                  id="asset-table-list-hide-small-asset"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#929aa5',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hideSmallBalances}
                    onChange={(e) => setHideSmallBalances(e.target.checked)}
                    style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                  />
                  <span>Hide assets &lt; 1 USD</span>
                </label>
              </div>
            </div>

            {/* SPOT ASSET TABLE: Asset (28%), Amount (24%), Available (24%), Action (24%) */}
            <div style={{ overflowX: 'auto', marginTop: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333b47', color: '#707a8a', fontSize: '12px', fontWeight: 600 }}>
                    <th id="asset-table-list-coin" style={{ padding: '12px 16px', width: '28%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <span>Asset</span>
                        <ArrowUpDown size={13} />
                      </div>
                    </th>
                    <th id="asset-table-list-total" style={{ padding: '12px 16px', width: '24%', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', cursor: 'pointer' }}>
                        <span>Amount</span>
                        <ArrowUpDown size={13} />
                      </div>
                    </th>
                    <th id="asset-table-list-free" style={{ padding: '12px 16px', width: '24%', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', cursor: 'pointer' }}>
                        <span>Available</span>
                        <ArrowUpDown size={13} />
                      </div>
                    </th>
                    <th id="asset-table-list-action" style={{ padding: '12px 16px', width: '24%', textAlign: 'right' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '48px 24px', color: '#707a8a' }}>
                        <Wallet size={36} color="#434c5a" style={{ marginBottom: '12px' }} />
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No matching assets found</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing the search filter or unticking "Hide assets &lt; 1 USD".</div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((b) => {
                      const meta = ASSET_METADATA[b.asset] || { name: b.asset, color: '#FCD535', tags: ['Spot'] };
                      const tickerData = livePrices[b.asset] || { price: b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1.0 : 0.0, change24h: 0.0 };
                      const totalNum = parseFloat(b.total) || 0;
                      const availNum = parseFloat(b.available) || 0;
                      const usdTotalEquiv = totalNum * tickerData.price;
                      const usdAvailEquiv = availNum * tickerData.price;

                      return (
                        <tr
                          key={b.asset}
                          style={{
                            borderBottom: '1px solid #29313d',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#252c37')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* 1. Asset Column: Coin Avatar, Symbol, Full Name, Tags */}
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: meta.color || '#333b47',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                                }}
                              >
                                {b.asset.slice(0, 3)}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{b.asset}</span>
                                  <span style={{ fontSize: '11px', background: '#29313d', color: '#929aa5', padding: '1px 6px', borderRadius: '4px' }}>
                                    {meta.tags?.[0] || 'Spot'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>{meta.name}</div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Amount Column: Total Balance + USD Equivalent */}
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                              {hideSensitiveValues ? '******' : b.total}
                            </div>
                            <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                              {hideSensitiveValues ? '******' : `≈ $${usdTotalEquiv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                          </td>

                          {/* 3. Available Column: Free Balance + USD Equivalent */}
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                              {hideSensitiveValues ? '******' : b.available}
                            </div>
                            <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                              {hideSensitiveValues ? '******' : `≈ $${usdAvailEquiv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                          </td>

                          {/* 4. Action Column: Deposit, Withdraw, Trade, Transfer */}
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                              <button
                                onClick={() => handleOpenDeposit(b.asset)}
                                style={{
                                  background: 'transparent',
                                  color: '#fcd535',
                                  border: 'none',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '4px 6px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                Deposit
                              </button>

                              <button
                                onClick={() => handleOpenWithdraw(b.asset)}
                                style={{
                                  background: 'transparent',
                                  color: '#eaecef',
                                  border: 'none',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '4px 6px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#eaecef')}
                              >
                                Withdraw
                              </button>

                              <button
                                onClick={() => {
                                  if (onNavigateToTrade) onNavigateToTrade(b.asset === 'USDT' ? 'BTC/USDT' : `${b.asset}/USDT`);
                                }}
                                style={{
                                  background: 'transparent',
                                  color: '#2ebd85',
                                  border: 'none',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '4px 6px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                Trade
                              </button>

                              <button
                                onClick={() => {
                                  if (onNavigateToTransfer) onNavigateToTransfer(b.asset);
                                }}
                                style={{
                                  background: 'transparent',
                                  color: '#929aa5',
                                  border: 'none',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  padding: '4px 6px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                              >
                                Transfer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            2.5 MARGIN WALLET VIEW (Binance /en/my/wallet/account/margin Specification)
            ========================================================================= */}
        {activeSubTab === 'margin' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top Margin Sub-Nav Bar: Cross Margin vs Isolated Margin */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #29313d', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Margin</h2>
                <div style={{ display: 'flex', background: '#181a20', borderRadius: '8px', padding: '3px', border: '1px solid #333b47' }}>
                  <button
                    onClick={() => setMarginMode('cross')}
                    style={{
                      border: 'none',
                      background: marginMode === 'cross' ? '#29313d' : 'transparent',
                      color: marginMode === 'cross' ? '#fcd535' : '#848e9c',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Cross Margin</span>
                    <span style={{ fontSize: '10px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '1px 5px', borderRadius: '3px' }}>
                      3x/5x
                    </span>
                  </button>

                  <button
                    onClick={() => setMarginMode('isolated')}
                    style={{
                      border: 'none',
                      background: marginMode === 'isolated' ? '#29313d' : 'transparent',
                      color: marginMode === 'isolated' ? '#fcd535' : '#848e9c',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Isolated Margin</span>
                    <span style={{ fontSize: '10px', background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', padding: '1px 5px', borderRadius: '3px' }}>
                      10x
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode Info & Risk Notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#929aa5' }}>
                <ShieldCheck size={16} color="#2ebd85" />
                <span>
                  {marginMode === 'cross'
                    ? 'Cross Margin shares risk across all supported collateral assets.'
                    : 'Isolated Margin isolates risk and debt strictly to each trading pair.'}
                </span>
              </div>
            </div>

            {/* Risk Meter Gauge Bar (Binance Margin Health Specification) */}
            <div style={{ background: '#181a20', border: '1px solid #333b47', borderRadius: '12px', padding: '18px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="#fcd535" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>Margin Risk Level &amp; Liquidation Buffer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#929aa5' }}>Current Level:</span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 800, color: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).color }}>
                    {marginMode === 'cross' ? (crossTotalDebtUsd <= 0 ? '999.00' : crossMarginLevel.toFixed(2)) : '999.00'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).bg,
                      color: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).color
                    }}
                  >
                    {getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).label}
                  </span>
                </div>
              </div>

              {/* Multi-tier Health Bar */}
              <div style={{ height: '8px', background: '#29313d', borderRadius: '4px', position: 'relative', overflow: 'hidden', marginBottom: '8px' }}>
                <div
                  style={{
                    height: '100%',
                    width: getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).barWidth,
                    background: `linear-gradient(90deg, ${getMarginRiskInfo(marginMode === 'cross' ? crossMarginLevel : 999.0).color} 0%, #2ebd85 100%)`,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#707a8a' }}>
                <span>Liquidation (≤ 1.05)</span>
                <span>High Risk (1.10 - 1.20)</span>
                <span>Margin Call (1.20 - 1.50)</span>
                <span style={{ color: '#2ebd85', fontWeight: 600 }}>Low Risk / Safe (≥ 2.00)</span>
              </div>
            </div>

            {/* CROSS MARGIN TAB CONTENT */}
            {marginMode === 'cross' && (
              <>
                {/* Toolbar: Search, Hide Small Assets */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>Collateral &amp; Borrow Assets</span>
                    <span style={{ fontSize: '12px', color: '#929aa5' }}>({Object.keys(crossMarginBalances).length} Coins Supported)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#181a20',
                        border: '1px solid #333b47',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        width: '220px'
                      }}
                    >
                      <Search size={15} color="#707a8a" />
                      <input
                        id="margin-search-coin"
                        type="text"
                        placeholder="Search Coin"
                        value={marginSearchFilter}
                        onChange={(e) => setMarginSearchFilter(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#eaecef',
                          fontSize: '13px',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                      {marginSearchFilter && (
                        <button
                          onClick={() => setMarginSearchFilter('')}
                          style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <label
                      htmlFor="margin-hide-small-assets"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#929aa5', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <input
                        id="margin-hide-small-assets"
                        type="checkbox"
                        checked={hideSmallMargin}
                        onChange={(e) => setHideSmallMargin(e.target.checked)}
                        style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                      />
                      <span>Hide assets &lt; 1 USD</span>
                    </label>
                  </div>
                </div>

                {/* Cross Margin Asset Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333b47', color: '#707a8a', fontSize: '12px', fontWeight: 600 }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '22%' }}>Asset</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '16%' }}>Total Balance</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '16%' }}>Available</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '16%' }}>Borrowed</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '14%' }}>Interest</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '16%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(crossMarginBalances)
                        .filter(([asset]) => {
                          const meta = ASSET_METADATA[asset] || { name: asset };
                          const matches =
                            asset.toLowerCase().includes(marginSearchFilter.toLowerCase().trim()) ||
                            meta.name.toLowerCase().includes(marginSearchFilter.toLowerCase().trim());
                          const rate = livePrices[asset]?.price ?? 1.0;
                          const totalUsd = (crossMarginBalances[asset].available + crossMarginBalances[asset].borrowed) * rate;
                          const passesSmall = !hideSmallMargin || totalUsd >= 1.0;
                          return matches && passesSmall;
                        })
                        .map(([asset, data]) => {
                          const meta = ASSET_METADATA[asset] || { name: asset, color: '#FCD535' };
                          const rate = livePrices[asset]?.price ?? 1.0;
                          const totalAmount = data.available + data.borrowed;
                          const totalUsd = totalAmount * rate;
                          const availUsd = data.available * rate;
                          const borrowedUsd = data.borrowed * rate;
                          const interestUsd = data.interest * rate;

                          return (
                            <tr
                              key={asset}
                              style={{ borderBottom: '1px solid #29313d', transition: 'background 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#252c37')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Asset Column */}
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      background: meta.color || '#333b47',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                                    }}
                                  >
                                    {asset.slice(0, 3)}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{asset}</span>
                                      <span style={{ fontSize: '10px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '1px 5px', borderRadius: '3px' }}>
                                        3x
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>{meta.name}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Total Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : totalAmount.toFixed(4)}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                  {hideSensitiveValues ? '******' : `≈ $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                              </td>

                              {/* Available */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#2ebd85' }}>
                                  {hideSensitiveValues ? '******' : data.available.toFixed(4)}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                  {hideSensitiveValues ? '******' : `≈ $${availUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                              </td>

                              {/* Borrowed */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: data.borrowed > 0 ? '#f6465d' : '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.borrowed.toFixed(4)}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                  {hideSensitiveValues ? '******' : `≈ $${borrowedUsd.toFixed(2)}`}
                                </div>
                              </td>

                              {/* Interest */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: data.interest > 0 ? '#ff693d' : '#929aa5' }}>
                                  {hideSensitiveValues ? '******' : data.interest.toFixed(6)}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#707a8a', marginTop: '2px' }}>
                                  0.0014%/hr
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setBorrowModalData({ mode: 'cross', asset });
                                      setIsMarginBorrowModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#fcd535',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Borrow
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRepayModalData({ mode: 'cross', asset });
                                      setIsMarginRepayModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#eaecef',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#eaecef')}
                                  >
                                    Repay
                                  </button>

                                  <button
                                    onClick={() => {
                                      setMarginTransferAsset(asset);
                                      setMarginTransferFrom('spot');
                                      setMarginTransferTo('cross');
                                      setIsMarginTransferModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#929aa5',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                                  >
                                    Transfer
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onNavigateToTrade) onNavigateToTrade(asset === 'USDT' ? 'BTC/USDT' : `${asset}/USDT`);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#2ebd85',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Trade
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ISOLATED MARGIN TAB CONTENT */}
            {marginMode === 'isolated' && (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>Isolated Trading Pairs (10x Max Leverage)</span>
                    <span style={{ fontSize: '12px', color: '#929aa5' }}>({Object.keys(isolatedPairs).length} Pairs)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#181a20',
                        border: '1px solid #333b47',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        width: '220px'
                      }}
                    >
                      <Search size={15} color="#707a8a" />
                      <input
                        id="margin-search-pair"
                        type="text"
                        placeholder="Search Pair (e.g. BTC/USDT)"
                        value={marginSearchFilter}
                        onChange={(e) => setMarginSearchFilter(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#eaecef',
                          fontSize: '13px',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                      {marginSearchFilter && (
                        <button
                          onClick={() => setMarginSearchFilter('')}
                          style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#929aa5', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <input
                        type="checkbox"
                        checked={hideZeroIsolatedPairs}
                        onChange={(e) => setHideZeroIsolatedPairs(e.target.checked)}
                        style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                      />
                      <span>Hide 0 balance pairs</span>
                    </label>
                  </div>
                </div>

                {/* Isolated Pairs Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333b47', color: '#707a8a', fontSize: '12px', fontWeight: 600 }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '20%' }}>Pair</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', width: '15%' }}>Risk Ratio</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '14%' }}>Index Price</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '14%' }}>Liquidation Price</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '18%' }}>Base / Quote Equity</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', width: '19%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(isolatedPairs)
                        .filter(([pair, data]) => {
                          const matches = pair.toLowerCase().includes(marginSearchFilter.toLowerCase().trim());
                          const hasBalance = (data.baseAvailable + data.baseBorrowed > 0) || (data.quoteAvailable + data.quoteBorrowed > 0);
                          const passesFilter = !hideZeroIsolatedPairs || hasBalance;
                          return matches && passesFilter;
                        })
                        .map(([pair, data]) => {
                          const baseRate = livePrices[data.baseAsset]?.price ?? 1.0;
                          const quoteRate = livePrices[data.quoteAsset]?.price ?? 1.0;
                          const baseTotal = data.baseAvailable + data.baseBorrowed;
                          const quoteTotal = data.quoteAvailable + data.quoteBorrowed;
                          const totalVal = baseTotal * baseRate + quoteTotal * quoteRate;
                          const totalDebt = data.baseBorrowed * baseRate + data.quoteBorrowed * quoteRate;
                          const ratio = totalDebt <= 0 ? 999.0 : totalVal / totalDebt;
                          const risk = getMarginRiskInfo(ratio);

                          return (
                            <tr
                              key={pair}
                              style={{ borderBottom: '1px solid #29313d', transition: 'background 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#252c37')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Pair Column */}
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '50%',
                                      background: '#29313d',
                                      color: '#fcd535',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      border: '1px solid #434c5a'
                                    }}
                                  >
                                    {data.baseAsset.slice(0, 3)}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{pair}</span>
                                      <span style={{ fontSize: '10px', background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                        {data.leverage}x
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                      Total: ${totalVal.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Risk Ratio */}
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="mono" style={{ fontSize: '14px', fontWeight: 800, color: risk.color }}>
                                    {totalDebt <= 0 ? '999.00' : ratio.toFixed(2)}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      background: risk.bg,
                                      color: risk.color
                                    }}
                                  >
                                    {risk.label}
                                  </span>
                                </div>
                              </td>

                              {/* Index Price */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: '#eaecef' }}>
                                  ${baseRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </td>

                              {/* Liquidation Price */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '13.5px', color: totalDebt > 0 ? '#f6465d' : '#929aa5', fontWeight: totalDebt > 0 ? 700 : 400 }}>
                                  {totalDebt > 0 ? `$${(baseRate * 0.85).toFixed(2)}` : '--'}
                                </div>
                              </td>

                              {/* Base / Quote Breakdown */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '12.5px', color: '#eaecef' }}>
                                  {data.baseAsset}: <strong>{data.baseAvailable.toFixed(4)}</strong> (Debt: {data.baseBorrowed.toFixed(4)})
                                </div>
                                <div className="mono" style={{ fontSize: '12.5px', color: '#929aa5', marginTop: '2px' }}>
                                  {data.quoteAsset}: <strong>{data.quoteAvailable.toFixed(2)}</strong> (Debt: {data.quoteBorrowed.toFixed(2)})
                                </div>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setBorrowModalData({ mode: 'isolated', asset: data.baseAsset, pair });
                                      setIsMarginBorrowModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#fcd535',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Borrow
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRepayModalData({ mode: 'isolated', asset: data.baseAsset, pair });
                                      setIsMarginRepayModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#eaecef',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#eaecef')}
                                  >
                                    Repay
                                  </button>

                                  <button
                                    onClick={() => {
                                      setMarginTransferAsset(data.quoteAsset);
                                      setMarginTransferPair(pair);
                                      setMarginTransferFrom('spot');
                                      setMarginTransferTo('isolated');
                                      setIsMarginTransferModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#929aa5',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                                  >
                                    Transfer
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onNavigateToTrade) onNavigateToTrade(pair);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#2ebd85',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Trade
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            2.6 FUTURES WALLET VIEW (Binance /en/my/wallet/account/futures Specification)
            ========================================================================= */}
        {activeSubTab === 'futures' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top Futures Sub-Nav Bar: USDⓈ-M vs COIN-M */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #29313d', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Futures</h2>
                <div style={{ display: 'flex', background: '#181a20', borderRadius: '8px', padding: '3px', border: '1px solid #333b47' }}>
                  <button
                    onClick={() => setFuturesMode('usds-m')}
                    style={{
                      border: 'none',
                      background: futuresMode === 'usds-m' ? '#29313d' : 'transparent',
                      color: futuresMode === 'usds-m' ? '#fcd535' : '#848e9c',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>USDⓈ-M</span>
                    <span style={{ fontSize: '10px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '1px 5px', borderRadius: '3px' }}>
                      125x Max
                    </span>
                  </button>

                  <button
                    onClick={() => setFuturesMode('coin-m')}
                    style={{
                      border: 'none',
                      background: futuresMode === 'coin-m' ? '#29313d' : 'transparent',
                      color: futuresMode === 'coin-m' ? '#fcd535' : '#848e9c',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '6px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>COIN-M</span>
                    <span style={{ fontSize: '10px', background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', padding: '1px 5px', borderRadius: '3px' }}>
                      Coin Margin
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode Badges & Multi-Assets Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#929aa5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#2ebd85" />
                  Multi-Assets Mode: <strong style={{ color: '#eaecef' }}>Enabled</strong>
                </span>
                <span style={{ fontSize: '12px', background: '#181a20', border: '1px solid #333b47', color: '#eaecef', padding: '4px 10px', borderRadius: '6px' }}>
                  Cross Margin Mode
                </span>
              </div>
            </div>

            {/* =========================================================================
                A. USDⓈ-M FUTURES TAB (Contracts settled in USDT / USDC / BNB / FDUSD)
                ========================================================================= */}
            {futuresMode === 'usds-m' && (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>Assets</span>
                    <span style={{ fontSize: '12px', color: '#707a8a' }}>Settled in stablecoins &amp; crypto</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#181a20',
                        border: '1px solid #333b47',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        width: '200px'
                      }}
                    >
                      <Search size={16} color="#707a8a" />
                      <input
                        id="futures-search-coin"
                        type="text"
                        placeholder="Search coin"
                        value={futuresSearchFilter}
                        onChange={(e) => setFuturesSearchFilter(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#eaecef',
                          fontSize: '13px',
                          width: '100%'
                        }}
                      />
                      {futuresSearchFilter && (
                        <button
                          onClick={() => setFuturesSearchFilter('')}
                          style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Hide Small Assets Checkbox */}
                    <label
                      id="futures-hide-small-assets"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#929aa5',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={hideSmallFuturesAssets}
                        onChange={(e) => setHideSmallFuturesAssets(e.target.checked)}
                        style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                      />
                      <span>Hide assets &lt; 1 USD</span>
                    </label>

                    {/* Transfer Button */}
                    <button
                      onClick={() => {
                        setFuturesTransferFrom('spot');
                        setFuturesTransferTo('usds-m');
                        setFuturesTransferAsset('USDT');
                        setIsFuturesTransferModalOpen(true);
                      }}
                      style={{
                        background: 'rgba(252, 213, 53, 0.15)',
                        color: '#fcd535',
                        border: '1px solid rgba(252, 213, 53, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>

                {/* USDⓈ-M Assets Table */}
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #29313d' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#181a20', borderBottom: '1px solid #29313d', color: '#848e9c', fontSize: '12px' }}>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Asset</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Total Balance</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Wallet Balance</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Unrealized PnL</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Margin Balance</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Available Balance</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(usdsMarginBalances)
                        .filter(([asset, data]) => {
                          if (futuresSearchFilter && !asset.toLowerCase().includes(futuresSearchFilter.toLowerCase())) {
                            return false;
                          }
                          const valUsd = (data.totalBalance) * (livePrices[asset]?.price ?? 1.0);
                          if (hideSmallFuturesAssets && valUsd < 1.0) {
                            return false;
                          }
                          return true;
                        })
                        .map(([asset, data]) => {
                          const meta = ASSET_METADATA[asset] || { name: asset, color: '#fcd535' };
                          const rate = livePrices[asset]?.price ?? 1.0;
                          const totalValUsd = data.totalBalance * rate;

                          return (
                            <tr
                              key={asset}
                              style={{
                                borderBottom: '1px solid #29313d',
                                background: 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#252d3a')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Asset */}
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: meta.color || '#2ebd85',
                                      color: '#181a20',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 900
                                    }}
                                  >
                                    {asset.slice(0, 3)}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{asset}</span>
                                      <span style={{ fontSize: '12px', color: '#707a8a' }}>{meta.name}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                      ≈ ${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Total Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                  {hideSensitiveValues ? '******' : `≈ $${totalValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                              </td>

                              {/* Wallet Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                              </td>

                              {/* Unrealized PnL */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: data.unrealizedPnl >= 0 ? '#2ebd85' : '#f6465d' }}>
                                  {hideSensitiveValues ? '******' : `${data.unrealizedPnl >= 0 ? '+' : ''}${data.unrealizedPnl.toFixed(2)}`}
                                </div>
                              </td>

                              {/* Margin Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.marginBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                              </td>

                              {/* Available Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: '#2ebd85' }}>
                                  {hideSensitiveValues ? '******' : data.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setFuturesTransferAsset(asset);
                                      setFuturesTransferFrom('spot');
                                      setFuturesTransferTo('usds-m');
                                      setIsFuturesTransferModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#fcd535',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Transfer
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onNavigateToTrade) onNavigateToTrade('BTC/USDT');
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#2ebd85',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Trade
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* =========================================================================
                    USDⓈ-M OPEN POSITIONS TABLE
                    ========================================================================= */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#eaecef', margin: 0 }}>
                        Positions ({usdsPositions.length})
                      </h3>
                      <span style={{ fontSize: '11px', background: '#181a20', color: '#929aa5', padding: '2px 8px', borderRadius: '4px' }}>
                        Real-Time Mark PnL
                      </span>
                    </div>

                    {usdsPositions.length > 0 && (
                      <span style={{ fontSize: '13px', color: '#929aa5' }}>
                        Total Unrealized PnL: <strong className="mono" style={{ color: '#2ebd85' }}>+${usdsTotalUnrealizedPnlUsd.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>

                  {usdsPositions.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', background: '#181a20', borderRadius: '8px', border: '1px dashed #333b47', color: '#707a8a', fontSize: '13px' }}>
                      No active open positions. Navigate to USDⓈ-M Futures trading to open a contract.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #29313d' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#181a20', borderBottom: '1px solid #29313d', color: '#848e9c', fontSize: '12px' }}>
                            <th style={{ padding: '14px 16px', fontWeight: 600 }}>Symbol</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Size</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Entry Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Mark Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Liq. Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Margin Ratio</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Margin</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>PNL (ROE %)</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usdsPositions.map((pos) => {
                            const isLong = pos.side === 'LONG';

                            return (
                              <tr
                                key={pos.id}
                                style={{
                                  borderBottom: '1px solid #29313d',
                                  background: 'transparent',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#252d3a')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                {/* Symbol */}
                                <td style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        background: isLong ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                                        color: isLong ? '#2ebd85' : '#f6465d'
                                      }}
                                    >
                                      {pos.side} {pos.leverage}x
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{pos.symbol}</span>
                                    <span style={{ fontSize: '11px', color: '#707a8a' }}>Perp</span>
                                  </div>
                                </td>

                                {/* Size */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: isLong ? '#2ebd85' : '#f6465d' }}>
                                    {isLong ? '+' : '-'}{pos.size} {pos.sizeUnit}
                                  </div>
                                  <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                    ≈ ${(pos.size * pos.markPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Entry Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#eaecef' }}>
                                    ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Mark Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: '#eaecef' }}>
                                    ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Liq Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#f0b90b', fontWeight: 700 }}>
                                    ${pos.liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Margin Ratio */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <span style={{ fontSize: '11px', background: 'rgba(46, 189, 133, 0.15)', color: '#2ebd85', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                    {pos.marginRatio.toFixed(2)}%
                                  </span>
                                </td>

                                {/* Margin */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#eaecef' }}>
                                    ${pos.margin.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#707a8a' }}>Cross</div>
                                </td>

                                {/* PNL (ROE %) */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: pos.pnl >= 0 ? '#2ebd85' : '#f6465d' }}>
                                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                                  </div>
                                  <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: pos.roe >= 0 ? '#2ebd85' : '#f6465d', marginTop: '2px' }}>
                                    ({pos.roe >= 0 ? '+' : ''}{pos.roe.toFixed(2)}%)
                                  </div>
                                </td>

                                {/* Action: Close Position */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleCloseUsdsPosition(pos.id)}
                                    style={{
                                      background: '#29313d',
                                      color: '#f6465d',
                                      border: '1px solid rgba(246, 70, 93, 0.3)',
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f6465d';
                                      e.currentTarget.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#29313d';
                                      e.currentTarget.style.color = '#f6465d';
                                    }}
                                    title="Close position at current market price"
                                  >
                                    Market Close
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* =========================================================================
                B. COIN-M FUTURES TAB (Contracts settled in underlying coins)
                ========================================================================= */}
            {futuresMode === 'coin-m' && (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#eaecef' }}>Coin-Margined Assets</span>
                    <span style={{ fontSize: '12px', color: '#707a8a' }}>Settled in underlying cryptocurrency</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#181a20',
                        border: '1px solid #333b47',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        width: '200px'
                      }}
                    >
                      <Search size={16} color="#707a8a" />
                      <input
                        id="coinm-search-coin"
                        type="text"
                        placeholder="Search coin"
                        value={futuresSearchFilter}
                        onChange={(e) => setFuturesSearchFilter(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#eaecef',
                          fontSize: '13px',
                          width: '100%'
                        }}
                      />
                    </div>

                    {/* Hide Zero Balances Checkbox */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#929aa5',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={hideZeroCoinMargin}
                        onChange={(e) => setHideZeroCoinMargin(e.target.checked)}
                        style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                      />
                      <span>Hide 0 balance assets</span>
                    </label>

                    {/* Transfer Button */}
                    <button
                      onClick={() => {
                        setFuturesTransferFrom('spot');
                        setFuturesTransferTo('coin-m');
                        setFuturesTransferAsset('BTC');
                        setIsFuturesTransferModalOpen(true);
                      }}
                      style={{
                        background: 'rgba(252, 213, 53, 0.15)',
                        color: '#fcd535',
                        border: '1px solid rgba(252, 213, 53, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>

                {/* COIN-M Assets Table */}
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #29313d' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#181a20', borderBottom: '1px solid #29313d', color: '#848e9c', fontSize: '12px' }}>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Asset</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Total Margin</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Wallet Balance</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Unrealized PnL</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Available for Order</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(coinMarginBalances)
                        .filter(([asset, data]) => {
                          if (futuresSearchFilter && !asset.toLowerCase().includes(futuresSearchFilter.toLowerCase())) {
                            return false;
                          }
                          if (hideZeroCoinMargin && data.totalMargin <= 0) {
                            return false;
                          }
                          return true;
                        })
                        .map(([asset, data]) => {
                          const meta = ASSET_METADATA[asset] || { name: asset, color: '#fcd535' };
                          const rate = livePrices[asset]?.price ?? 1.0;
                          const totalValUsd = data.totalMargin * rate;

                          return (
                            <tr
                              key={asset}
                              style={{
                                borderBottom: '1px solid #29313d',
                                background: 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#252d3a')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Asset */}
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: meta.color || '#2ebd85',
                                      color: '#181a20',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 900
                                    }}
                                  >
                                    {asset.slice(0, 3)}
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{asset}</span>
                                      <span style={{ fontSize: '12px', color: '#707a8a' }}>{meta.name}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                      ≈ ${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Total Margin */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.totalMargin.toFixed(6)} {asset}
                                </div>
                                <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                  {hideSensitiveValues ? '******' : `≈ $${totalValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                              </td>

                              {/* Wallet Balance */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', color: '#eaecef' }}>
                                  {hideSensitiveValues ? '******' : data.walletBalance.toFixed(6)}
                                </div>
                              </td>

                              {/* Unrealized PnL */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: data.unrealizedPnl >= 0 ? '#2ebd85' : '#f6465d' }}>
                                  {hideSensitiveValues ? '******' : `${data.unrealizedPnl >= 0 ? '+' : ''}${data.unrealizedPnl.toFixed(6)}`}
                                </div>
                              </td>

                              {/* Available for Order */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: '#2ebd85' }}>
                                  {hideSensitiveValues ? '******' : data.availableOrder.toFixed(6)}
                                </div>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setFuturesTransferAsset(asset);
                                      setFuturesTransferFrom('spot');
                                      setFuturesTransferTo('coin-m');
                                      setIsFuturesTransferModalOpen(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#fcd535',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Transfer
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onNavigateToTrade) onNavigateToTrade(`${asset}/USDT`);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      color: '#2ebd85',
                                      border: 'none',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    Trade
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* =========================================================================
                    COIN-M OPEN POSITIONS TABLE
                    ========================================================================= */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#eaecef', margin: 0 }}>
                        Positions ({coinPositions.length})
                      </h3>
                      <span style={{ fontSize: '11px', background: '#181a20', color: '#929aa5', padding: '2px 8px', borderRadius: '4px' }}>
                        COIN-M Inverse Contracts
                      </span>
                    </div>

                    {coinPositions.length > 0 && (
                      <span style={{ fontSize: '13px', color: '#929aa5' }}>
                        Total Unrealized PnL: <strong className="mono" style={{ color: '#2ebd85' }}>+${coinTotalUnrealizedPnlUsd.toFixed(2)} USD</strong>
                      </span>
                    )}
                  </div>

                  {coinPositions.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', background: '#181a20', borderRadius: '8px', border: '1px dashed #333b47', color: '#707a8a', fontSize: '13px' }}>
                      No active open positions.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #29313d' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#181a20', borderBottom: '1px solid #29313d', color: '#848e9c', fontSize: '12px' }}>
                            <th style={{ padding: '14px 16px', fontWeight: 600 }}>Contract</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Size (Cont)</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Entry Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Mark Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Liq. Price</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Margin</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>PNL (ROE %)</th>
                            <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coinPositions.map((pos) => {
                            const isLong = pos.side === 'LONG';

                            return (
                              <tr
                                key={pos.id}
                                style={{
                                  borderBottom: '1px solid #29313d',
                                  background: 'transparent',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#252d3a')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                {/* Contract */}
                                <td style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        background: isLong ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                                        color: isLong ? '#2ebd85' : '#f6465d'
                                      }}
                                    >
                                      {pos.side} {pos.leverage}x
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{pos.contract}</span>
                                  </div>
                                </td>

                                {/* Size (Cont) */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: isLong ? '#2ebd85' : '#f6465d' }}>
                                    {isLong ? '+' : '-'}{pos.contracts} Cont
                                  </div>
                                </td>

                                {/* Entry Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#eaecef' }}>
                                    ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Mark Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', fontWeight: 700, color: '#eaecef' }}>
                                    ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Liq Price */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#f0b90b', fontWeight: 700 }}>
                                    ${pos.liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </td>

                                {/* Margin */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '13.5px', color: '#eaecef' }}>
                                    {pos.margin} {pos.marginAsset}
                                  </div>
                                </td>

                                {/* PNL (ROE %) */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: pos.pnl >= 0 ? '#2ebd85' : '#f6465d' }}>
                                    {pos.pnl >= 0 ? '+' : ''}{pos.pnl} {pos.marginAsset}
                                  </div>
                                  <div className="mono" style={{ fontSize: '12px', fontWeight: 700, color: pos.roe >= 0 ? '#2ebd85' : '#f6465d', marginTop: '2px' }}>
                                    ({pos.roe >= 0 ? '+' : ''}{pos.roe.toFixed(2)}%)
                                  </div>
                                </td>

                                {/* Action: Close Position */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleCloseCoinPosition(pos.id)}
                                    style={{
                                      background: '#29313d',
                                      color: '#f6465d',
                                      border: '1px solid rgba(246, 70, 93, 0.3)',
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f6465d';
                                      e.currentTarget.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#29313d';
                                      e.currentTarget.style.color = '#f6465d';
                                    }}
                                    title="Close position at current market price"
                                  >
                                    Market Close
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            FUNDING WALLET SUBVIEW (Binance Funding UI Spec - /en/my/wallet/funding)
            ========================================================================= */}
        {activeSubTab === 'funding' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top Toolbar: Heading "Funding", Search, Small Amount Exchange, and Hide Small Assets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Funding</h2>
                <span style={{ fontSize: '12px', background: '#29313d', color: '#fcd535', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  P2P &amp; Binance Pay
                </span>
              </div>

              {/* Search Bar & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Search Textfield */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    width: '200px'
                  }}
                >
                  <Search size={16} color="#707a8a" />
                  <input
                    id="asset-table-list-search-coin"
                    type="text"
                    placeholder="Search"
                    value={fundingSearchFilter}
                    onChange={(e) => setFundingSearchFilter(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#eaecef',
                      fontSize: '13px',
                      width: '100%'
                    }}
                  />
                  {fundingSearchFilter && (
                    <button
                      onClick={() => setFundingSearchFilter('')}
                      style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Small Amount Exchange Button */}
                <button
                  onClick={() => {
                    setSelectedDustAssets(dustCandidates.map((d) => d.asset));
                    setIsDustModalOpen(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#929aa5',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                  title="Convert low balance tokens into BNB"
                >
                  <Repeat size={16} />
                  <span>Small Amount Exchange</span>
                </button>

                {/* Hide Assets <1 USD Checkbox */}
                <label
                  id="asset-table-list-hide-small-asset"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#929aa5',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hideSmallFunding}
                    onChange={(e) => setHideSmallFunding(e.target.checked)}
                    style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                  />
                  <span>Hide assets &lt; 1 USD</span>
                </label>
              </div>
            </div>

            {/* Funding Assets Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2b313a', color: '#707a8a', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '14px 16px', width: '26%' }}>Asset</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', width: '18%' }}>Amount</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', width: '18%' }}>Available</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', width: '18%' }}>Frozen</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', width: '20%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFundingList.map((item) => {
                    const meta = ASSET_METADATA[item.asset] || { name: item.asset, color: '#fcd535', tags: [] };
                    const totalQty = item.available + item.frozen;
                    const price = livePrices[item.asset]?.price || 1.0;
                    const totalUsdVal = totalQty * price;
                    const availUsdVal = item.available * price;
                    const frozenUsdVal = item.frozen * price;

                    return (
                      <tr
                        key={item.asset}
                        style={{
                          borderBottom: '1px solid #29313d',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#28303d')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Asset Column */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: meta.color || '#333b47',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '14px',
                                color: '#181a20',
                                flexShrink: 0
                              }}
                            >
                              {item.asset.slice(0, 3)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 800, color: '#eaecef', fontSize: '15px' }}>{item.asset}</span>
                                {meta.tags?.[0] && (
                                  <span style={{ fontSize: '10px', background: '#29313d', color: '#929aa5', padding: '1px 5px', borderRadius: '3px' }}>
                                    {meta.tags[0]}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#707a8a' }}>{meta.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Total Amount Column */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 700, color: '#eaecef', fontSize: '14px' }}>
                            {hideSensitiveValues ? '******' : totalQty.toFixed(item.asset === 'BTC' || item.asset === 'ETH' ? 6 : 2)}
                          </div>
                          <div className="mono" style={{ fontSize: '12px', color: '#707a8a' }}>
                            {hideSensitiveValues ? '******' : `≈ $${totalUsdVal.toFixed(2)}`}
                          </div>
                        </td>

                        {/* Available Column */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 700, color: '#eaecef', fontSize: '14px' }}>
                            {hideSensitiveValues ? '******' : item.available.toFixed(item.asset === 'BTC' || item.asset === 'ETH' ? 6 : 2)}
                          </div>
                          <div className="mono" style={{ fontSize: '12px', color: '#707a8a' }}>
                            {hideSensitiveValues ? '******' : `≈ $${availUsdVal.toFixed(2)}`}
                          </div>
                        </td>

                        {/* Frozen Column */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 700, color: item.frozen > 0 ? '#fcd535' : '#707a8a', fontSize: '14px' }}>
                            {hideSensitiveValues ? '******' : item.frozen.toFixed(item.asset === 'BTC' || item.asset === 'ETH' ? 6 : 2)}
                          </div>
                          <div className="mono" style={{ fontSize: '12px', color: '#707a8a' }}>
                            {hideSensitiveValues ? '******' : `≈ $${frozenUsdVal.toFixed(2)}`}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setFundingTransferAsset(item.asset);
                                setFundingTransferFrom('funding');
                                setFundingTransferTo('spot');
                                setIsFundingTransferModalOpen(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#fcd535',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              Transfer
                            </button>

                            <button
                              onClick={() => {
                                setFundingSendAsset(item.asset);
                                setIsFundingSendModalOpen(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#fcd535',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              Send
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAsset(item.asset);
                                setActiveSubTab('deposit');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#fcd535',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              Deposit
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAsset(item.asset);
                                setActiveSubTab('withdraw');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#929aa5',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                            >
                              Withdraw
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
        )}

        {/* =========================================================================
            3. WALLET OVERVIEW SECTION (Asset View & Account View Tabs)
            ========================================================================= */}
        {activeSubTab === 'overview' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Top Toolbar: Heading, Subviews, Search & Dust Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#eaecef', margin: 0 }}>My Assets</h2>

                {/* Subview Tabs: Asset View / Account View */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div
                    id="Wallet_overview_v1_coin_view"
                    onClick={() => setViewMode('asset')}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: viewMode === 'asset' ? '#eaecef' : '#707a8a' }}>
                      Asset View
                    </span>
                    <div
                      style={{
                        height: '3px',
                        background: '#fcd535',
                        borderRadius: '2px',
                        width: viewMode === 'asset' ? '100%' : '0px',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  </div>

                  <div
                    id="Wallet_overview_v1_wallet_view"
                    onClick={() => setViewMode('account')}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: viewMode === 'account' ? '#eaecef' : '#707a8a' }}>
                      Account View
                    </span>
                    <div
                      style={{
                        height: '3px',
                        background: '#fcd535',
                        borderRadius: '2px',
                        width: viewMode === 'account' ? '100%' : '0px',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Search Bar & Hide Small Assets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    width: '220px'
                  }}
                >
                  <Search size={16} color="#707a8a" />
                  <input
                    type="text"
                    placeholder="Search coin..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#eaecef',
                      fontSize: '13px',
                      width: '100%'
                    }}
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#929aa5',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hideSmallBalances}
                    onChange={(e) => setHideSmallBalances(e.target.checked)}
                    style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                  />
                  <span>Hide assets &lt; 1 USD</span>
                </label>
              </div>
            </div>

            {/* VIEW MODE A: ASSET VIEW */}
            {viewMode === 'asset' && (
              <div style={{ overflowX: 'auto', marginTop: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333b47', color: '#707a8a', fontSize: '12px', fontWeight: 600 }}>
                      <th style={{ padding: '12px 16px', width: '28%' }}>Asset</th>
                      <th style={{ padding: '12px 16px', width: '26%', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 16px', width: '20%', textAlign: 'right' }}>Asset Price</th>
                      <th style={{ padding: '12px 16px', width: '26%', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '48px 24px', color: '#707a8a' }}>
                          <Wallet size={36} color="#434c5a" style={{ marginBottom: '12px' }} />
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No matching assets found</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing the search filter or unticking "Hide assets &lt; 1 USD".</div>
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map((b) => {
                        const meta = ASSET_METADATA[b.asset] || { name: b.asset, color: '#FCD535', tags: ['Spot'] };
                        const tickerData = livePrices[b.asset] || { price: b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'FDUSD' ? 1.0 : 0.0, change24h: 0.0 };
                        const totalNum = parseFloat(b.total) || 0;
                        const usdEquiv = totalNum * tickerData.price;
                        const isPositiveChange = tickerData.change24h >= 0;

                        return (
                          <tr
                            key={b.asset}
                            style={{
                              borderBottom: '1px solid #29313d',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#252c37')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {/* 1. Asset Name & Badge */}
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: meta.color || '#333b47',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                                  }}
                                >
                                  {b.asset.slice(0, 3)}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#eaecef' }}>{b.asset}</span>
                                    <span style={{ fontSize: '11px', background: '#29313d', color: '#929aa5', padding: '1px 6px', borderRadius: '4px' }}>
                                      {meta.tags?.[0] || 'Crypto'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>{meta.name}</div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Amount */}
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                {hideSensitiveValues ? '******' : b.total}
                              </div>
                              <div className="mono" style={{ fontSize: '12px', color: '#929aa5', marginTop: '2px' }}>
                                {hideSensitiveValues ? '******' : `≈ $${usdEquiv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </div>
                            </td>

                            {/* 3. Asset Price & 24h Change */}
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: '#eaecef' }}>
                                ${tickerData.price >= 1 ? tickerData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : tickerData.price.toFixed(4)}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: isPositiveChange ? '#2ebd85' : '#f6465d',
                                  marginTop: '2px'
                                }}
                              >
                                {isPositiveChange ? `+${tickerData.change24h.toFixed(2)}%` : `${tickerData.change24h.toFixed(2)}%`}
                              </div>
                            </td>

                            {/* 4. Action Buttons */}
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => handleOpenDeposit(b.asset)}
                                  style={{
                                    background: 'transparent',
                                    color: '#fcd535',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: '4px 8px'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  Deposit
                                </button>

                                <button
                                  onClick={() => handleOpenWithdraw(b.asset)}
                                  style={{
                                    background: 'transparent',
                                    color: '#eaecef',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '4px 8px'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fcd535')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#eaecef')}
                                >
                                  Withdraw
                                </button>

                                <button
                                  onClick={() => {
                                    if (onNavigateToTrade) onNavigateToTrade(b.asset === 'USDT' ? 'BTC/USDT' : `${b.asset}/USDT`);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    color: '#2ebd85',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: '4px 8px'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  Trade
                                </button>

                                <button
                                  onClick={() => {
                                    if (onNavigateToTransfer) onNavigateToTransfer(b.asset);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    color: '#929aa5',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    padding: '4px 8px'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eaecef')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#929aa5')}
                                >
                                  Transfer
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE B: ACCOUNT VIEW */}
            {viewMode === 'account' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
                {[
                  {
                    title: 'Spot Account',
                    desc: 'Main trading wallet with double-entry matching settlement',
                    usdVal: totalUsdValuation * 0.72,
                    tag: 'Primary',
                    icon: <Wallet size={20} color="#fcd535" />,
                    action: () => setActiveSubTab('spot')
                  },
                  {
                    title: 'Funding & P2P',
                    desc: 'Zero-fee internal transfers and P2P fiat payments',
                    usdVal: totalUsdValuation * 0.18,
                    tag: '0% Fee',
                    icon: <ArrowRightLeft size={20} color="#2ebd85" />,
                    action: () => (onNavigateToTransfer ? onNavigateToTransfer() : null)
                  },
                  {
                    title: 'Futures & Derivatives',
                    desc: 'Cross and isolated collateral for leveraged perps',
                    usdVal: totalUsdValuation * 0.08,
                    tag: '125x',
                    icon: <TrendingUp size={20} color="#627eea" />,
                    action: () => (onNavigateToTrade ? onNavigateToTrade('BTC/USDT') : null)
                  },
                  {
                    title: 'Earn & Yield Vault',
                    desc: 'Proof of reserves high-yield staking and liquidity pools',
                    usdVal: totalUsdValuation * 0.02,
                    tag: 'Up to 14.8% APR',
                    icon: <Sparkles size={20} color="#f7931a" />,
                    action: () => setActiveSubTab('deposit')
                  }
                ].map((acc) => (
                  <div
                    key={acc.title}
                    style={{
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {acc.icon}
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#eaecef' }}>{acc.title}</span>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(252, 213, 53, 0.15)', color: '#fcd535', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {acc.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#929aa5', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                        {acc.desc}
                      </p>
                      <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                        {hideSensitiveValues ? '******' : `$${acc.usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                    </div>

                    <button
                      onClick={acc.action || (() => {})}
                      style={{
                        background: '#29313d',
                        color: '#eaecef',
                        border: '1px solid #434c5a',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Manage Wallet</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            4. DEDICATED DEPOSIT VAULT SUBVIEW
            ========================================================================= */}
        {activeSubTab === 'deposit' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ArrowDownCircle size={24} color="#fcd535" />
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Deposit Cryptocurrency
                </h2>
              </div>
              <p style={{ color: '#929aa5', fontSize: '13.5px', marginBottom: '24px' }}>
                Transfer digital assets to your segregated institutional cold-vault storage address.
              </p>

              <div className="input-group" style={{ marginBottom: '18px' }}>
                <label className="input-label" style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Select Coin to Deposit
                </label>
                <select
                  className="input-field"
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  {['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'USDC', 'FDUSD', 'XRP', 'ADA', 'DOGE', 'AVAX'].map((c) => (
                    <option key={c} value={c}>
                      {c} - {ASSET_METADATA[c]?.name || c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '18px' }}>
                <label className="input-label" style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Deposit Network
                </label>
                <select
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option>{selectedAsset} Native Mainnet (Fastest Settlement)</option>
                  <option>BNB Smart Chain (BEP-20) - Zero Gas</option>
                  <option>Ethereum (ERC-20)</option>
                  <option>TRON (TRC-20)</option>
                  <option>Solana (SPL)</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '18px' }}>
                <label className="input-label" style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Your Dedicated Deposit Address
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={depositAddress || 'Generating secure vault address...'}
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#fcd535',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => depositAddress && handleCopy(depositAddress)}
                    style={{
                      background: '#fcd535',
                      color: '#181a20',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {copiedAddr ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#929aa5', lineHeight: 1.6, background: '#181a20', padding: '16px', borderRadius: '10px', border: '1px solid #333b47' }}>
                <div style={{ fontWeight: 700, color: '#eaecef', marginBottom: '4px' }}>Safety &amp; Compliance Tips:</div>
                <div>• Send only <strong>{selectedAsset}</strong> via the selected network.</div>
                <div>• Minimum deposit: <strong>1.00 {selectedAsset}</strong>.</div>
                <div>• Credited immediately after 12 block network confirmations.</div>
              </div>

              {isDevEnvironment && (
                <button
                  onClick={() => handleTestDepositFaucet(selectedAsset)}
                  disabled={loading}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    background: '#fcd535',
                    color: '#181a20',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Instant Devnet Faucet ({selectedAsset})
                </button>
              )}
            </div>

            {/* QR Code Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#181a20',
                borderRadius: '16px',
                border: '1px solid #333b47',
                padding: '32px'
              }}
            >
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <QrCode size={200} color="#181a20" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Scan QR to Deposit {selectedAsset}</div>
              <div style={{ fontSize: '12px', color: '#929aa5', marginTop: '6px', textAlign: 'center' }}>
                Supported by Trust Wallet, MetaMask, Binance App, and hardware signers.
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. DEDICATED WITHDRAW VAULT SUBVIEW
            ========================================================================= */}
        {activeSubTab === 'withdraw' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '680px',
              margin: '0 auto',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ArrowUpCircle size={24} color="#f6465d" />
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Withdraw Cryptocurrency
              </h2>
            </div>
            <p style={{ color: '#929aa5', fontSize: '13.5px', marginBottom: '24px' }}>
              Instant cryptographic withdrawal to any external wallet, institutional cold storage, or DeFi pool.
            </p>

            <form onSubmit={handleExecuteWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="input-group">
                <label style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Select Coin to Withdraw
                </label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  {['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'USDC', 'FDUSD', 'XRP', 'ADA', 'DOGE'].map((c) => (
                    <option key={c} value={c}>
                      {c} - {ASSET_METADATA[c]?.name || c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Recipient Destination Address
                </label>
                <input
                  type="text"
                  placeholder="Paste external wallet address (e.g. 0x... or bc1q...)"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, margin: 0 }}>Withdrawal Amount</label>
                  <span style={{ fontSize: '12px', color: '#929aa5' }}>
                    Available: <strong style={{ color: '#2ebd85' }}>{selectedBalanceObj.available} {selectedAsset}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(selectedBalanceObj.available)}
                    style={{
                      background: '#29313d',
                      color: '#fcd535',
                      border: '1px solid #434c5a',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: '#eaecef', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Two-Factor Authentication (2FA Code / PIN)
                </label>
                <input
                  type="text"
                  placeholder="6-digit Authenticator verification code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={6}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    letterSpacing: '2px',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ background: '#181a20', padding: '14px 18px', borderRadius: '8px', border: '1px solid #333b47', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#929aa5' }}>Estimated Network Fee:</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>0.0001 {selectedAsset}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Processing Vault Withdrawal...' : `Confirm Withdrawal of ${withdrawAmount || '0'} ${selectedAsset}`}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            6. TRANSACTION HISTORY SUBVIEW
            ========================================================================= */}
        {activeSubTab === 'history' && (
          <div
            style={{
              background: '#202630',
              border: '1px solid #333b47',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Deposit &amp; Withdrawal History
                </h2>
                <p style={{ color: '#929aa5', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Cryptographic ledger logs of on-chain transactions and internal vault settlements.
                </p>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(46, 189, 133, 0.1)', color: '#2ebd85', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
                100% Solvency Audited
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333b47', color: '#707a8a', fontSize: '12px' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>Asset</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>Destination / Hash</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody className="mono">
                  {withdrawHistory.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #29313d' }}>
                      <td style={{ padding: '14px', color: '#929aa5' }}>
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: h.type.includes('DEPOSIT') ? 'rgba(46, 189, 133, 0.15)' : 'rgba(246, 70, 93, 0.15)',
                            color: h.type.includes('DEPOSIT') ? '#2ebd85' : '#f6465d'
                          }}
                        >
                          {h.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#ffffff' }}>{h.asset}</td>
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: h.type.includes('DEPOSIT') ? '#2ebd85' : '#f6465d'
                        }}
                      >
                        {h.type.includes('DEPOSIT') ? `+${h.amount}` : `-${h.amount}`}
                      </td>
                      <td style={{ padding: '14px', color: '#929aa5', fontSize: '12px' }}>
                        {h.destination} ({h.txHash.slice(0, 10)}...)
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#2ebd85', background: 'rgba(46, 189, 133, 0.1)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. SMALL AMOUNT EXCHANGE (DUST TO BNB) CONVERT MODAL
            ========================================================================= */}
        {isDustModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}
            onClick={() => setIsDustModalOpen(false)}
          >
            <div
              style={{
                background: '#202630',
                border: '1px solid #333b47',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Repeat size={22} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                    Convert Small Balances to BNB
                  </h3>
                </div>
                <button
                  onClick={() => setIsDustModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#181a20', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #333b47', fontSize: '12.5px', color: '#929aa5' }}>
                <Info size={18} color="#fcd535" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Balances valued under <strong>$10 USD</strong> can be instantly consolidated into BNB with <strong>0% fee</strong> once every 6 hours.
                </span>
              </div>

              {dustCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#707a8a' }}>
                  <Sparkles size={32} color="#434c5a" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaecef' }}>No Small Balance Dust Found</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>All your asset balances are either 0 or greater than $10 USD.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '13px' }}>
                    <span style={{ color: '#929aa5' }}>Select assets to convert ({selectedDustAssets.length}/{dustCandidates.length}):</span>
                    <button
                      onClick={() => {
                        if (selectedDustAssets.length === dustCandidates.length) {
                          setSelectedDustAssets([]);
                        } else {
                          setSelectedDustAssets(dustCandidates.map((d) => d.asset));
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#fcd535', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      {selectedDustAssets.length === dustCandidates.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {dustCandidates.map((d) => {
                      const isSelected = selectedDustAssets.includes(d.asset);
                      const totalNum = parseFloat(d.available || '0');
                      const rate = livePrices[d.asset]?.price ?? 1.0;
                      const usdEquiv = totalNum * rate;

                      return (
                        <div
                          key={d.asset}
                          onClick={() => {
                            setSelectedDustAssets((prev) =>
                              prev.includes(d.asset) ? prev.filter((x) => x !== d.asset) : [...prev, d.asset]
                            );
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: isSelected ? 'rgba(252, 213, 53, 0.08)' : '#181a20',
                            border: `1px solid ${isSelected ? '#fcd535' : '#333b47'}`,
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ accentColor: '#fcd535', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: '#eaecef', fontSize: '13px' }}>{d.asset}</div>
                              <div style={{ fontSize: '11px', color: '#929aa5' }}>{ASSET_METADATA[d.asset]?.name || d.asset}</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#eaecef' }}>
                              {d.available} {d.asset}
                            </div>
                            <div className="mono" style={{ fontSize: '11px', color: '#929aa5' }}>
                              ≈ ${usdEquiv.toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary & Conversion CTA */}
                  <div style={{ background: '#181a20', padding: '14px 18px', borderRadius: '8px', border: '1px solid #333b47', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#929aa5' }}>Estimated BNB to Receive:</span>
                      <span className="mono" style={{ color: '#fcd535', fontWeight: 800 }}>
                        ≈ {(
                          selectedDustAssets.reduce((acc, sym) => {
                            const item = fullAssetList.find((b) => b.asset === sym);
                            const total = parseFloat(item?.available || '0');
                            const rate = livePrices[sym]?.price ?? 1.0;
                            return acc + total * rate;
                          }, 0) / (bnbPrice > 0 ? bnbPrice : 642.5)
                        ).toFixed(6)}{' '}
                        BNB
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#707a8a' }}>
                      <span>Fee Rate:</span>
                      <span style={{ color: '#2ebd85', fontWeight: 700 }}>0% (Zero Fee)</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConvertDust}
                    disabled={selectedDustAssets.length === 0 || isConvertingDust}
                    style={{
                      width: '100%',
                      background: selectedDustAssets.length === 0 ? '#29313d' : '#fcd535',
                      color: selectedDustAssets.length === 0 ? '#707a8a' : '#181a20',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: selectedDustAssets.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isConvertingDust
                      ? 'Converting Small Balances...'
                      : `Convert (${selectedDustAssets.length}) Selected Assets to BNB`}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MARGIN BORROW MODAL (Binance Margin Borrowing Engine)
            ========================================================================= */}
        {isMarginBorrowModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}
            onClick={() => setIsMarginBorrowModalOpen(false)}
          >
            <div
              style={{
                background: '#202630',
                border: '1px solid #333b47',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={22} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                    Borrow ({borrowModalData.mode === 'cross' ? 'Cross Margin' : `${borrowModalData.pair} Isolated`})
                  </h3>
                </div>
                <button
                  onClick={() => setIsMarginBorrowModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Asset to Borrow</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(borrowModalData.mode === 'cross'
                    ? ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'USDC']
                    : [
                        isolatedPairs[borrowModalData.pair || 'BTC/USDT']?.baseAsset || 'BTC',
                        isolatedPairs[borrowModalData.pair || 'BTC/USDT']?.quoteAsset || 'USDT'
                      ]
                  ).map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setBorrowModalData((prev) => ({ ...prev, asset: sym }))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: borrowModalData.asset === sym ? '1px solid #fcd535' : '1px solid #333b47',
                        background: borrowModalData.asset === sym ? 'rgba(252, 213, 53, 0.15)' : '#181a20',
                        color: borrowModalData.asset === sym ? '#fcd535' : '#eaecef',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Borrow & Rate Specs */}
              <div style={{ background: '#181a20', padding: '14px 18px', borderRadius: '8px', border: '1px solid #333b47', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#929aa5' }}>Max Borrow Limit:</span>
                  <span className="mono" style={{ color: '#eaecef', fontWeight: 700 }}>
                    {borrowModalData.asset === 'USDT' || borrowModalData.asset === 'USDC' ? '50,000.00' : '2.50000000'} {borrowModalData.asset}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#929aa5' }}>Estimated Hourly Interest:</span>
                  <span className="mono" style={{ color: '#fcd535', fontWeight: 700 }}>0.0014% / hr (0.0336% / day)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#929aa5' }}>Auto-Repay Available:</span>
                  <span style={{ color: '#2ebd85', fontWeight: 700 }}>Yes (On Position Close)</span>
                </div>
              </div>

              {/* Borrow Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Borrow Amount</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={borrowAmountInput}
                    onChange={(e) => setBorrowAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 70px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => setBorrowAmountInput(borrowModalData.asset === 'USDT' ? '1000' : '0.05')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>

                {/* Quick % Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const max = borrowModalData.asset === 'USDT' ? 1000 : 0.05;
                        setBorrowAmountInput(((max * pct) / 100).toString());
                      }}
                      style={{
                        flex: 1,
                        background: '#181a20',
                        border: '1px solid #333b47',
                        borderRadius: '4px',
                        padding: '4px',
                        color: '#929aa5',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm CTA */}
              <button
                onClick={handleExecuteBorrow}
                style={{
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(252, 213, 53, 0.25)'
                }}
              >
                Confirm Borrow
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MARGIN REPAY MODAL (Binance Margin Repayment Engine)
            ========================================================================= */}
        {isMarginRepayModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}
            onClick={() => setIsMarginRepayModalOpen(false)}
          >
            <div
              style={{
                background: '#202630',
                border: '1px solid #333b47',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={22} color="#2ebd85" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                    Repay ({repayModalData.mode === 'cross' ? 'Cross Margin Debt' : `${repayModalData.pair} Isolated Debt`})
                  </h3>
                </div>
                <button
                  onClick={() => setIsMarginRepayModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Debt & Available Summary */}
              <div style={{ background: '#181a20', padding: '14px 18px', borderRadius: '8px', border: '1px solid #333b47', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#929aa5' }}>Total Outstanding Debt:</span>
                  <span className="mono" style={{ color: '#f6465d', fontWeight: 700 }}>
                    {repayModalData.mode === 'cross'
                      ? (crossMarginBalances[repayModalData.asset]?.borrowed || 0).toFixed(4)
                      : (isolatedPairs[repayModalData.pair || 'BTC/USDT']?.baseBorrowed || 0).toFixed(4)}{' '}
                    {repayModalData.asset}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#929aa5' }}>Accrued Interest:</span>
                  <span className="mono" style={{ color: '#ff693d', fontWeight: 700 }}>
                    {repayModalData.mode === 'cross'
                      ? (crossMarginBalances[repayModalData.asset]?.interest || 0).toFixed(6)
                      : (isolatedPairs[repayModalData.pair || 'BTC/USDT']?.baseInterest || 0).toFixed(6)}{' '}
                    {repayModalData.asset}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#929aa5' }}>Available Balance to Repay:</span>
                  <span className="mono" style={{ color: '#2ebd85', fontWeight: 700 }}>
                    {repayModalData.mode === 'cross'
                      ? (crossMarginBalances[repayModalData.asset]?.available || 0).toFixed(4)
                      : (isolatedPairs[repayModalData.pair || 'BTC/USDT']?.baseAvailable || 0).toFixed(4)}{' '}
                    {repayModalData.asset}
                  </span>
                </div>
              </div>

              {/* Repay Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Repayment Amount</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={repayAmountInput}
                    onChange={(e) => setRepayAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 90px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      const debt =
                        repayModalData.mode === 'cross'
                          ? crossMarginBalances[repayModalData.asset]?.borrowed || 0
                          : isolatedPairs[repayModalData.pair || 'BTC/USDT']?.baseBorrowed || 0;
                      setRepayAmountInput(debt.toString());
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    100% DEBT
                  </button>
                </div>
              </div>

              {/* Confirm Repay CTA */}
              <button
                onClick={handleExecuteRepay}
                style={{
                  width: '100%',
                  background: '#2ebd85',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(46, 189, 133, 0.25)'
                }}
              >
                Confirm Repayment
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MARGIN TRANSFER MODAL (Internal Instant Zero-Fee Wallet Transfer)
            ========================================================================= */}
        {isMarginTransferModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}
            onClick={() => setIsMarginTransferModalOpen(false)}
          >
            <div
              style={{
                background: '#202630',
                border: '1px solid #333b47',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowRightLeft size={22} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                    Transfer Funds
                  </h3>
                </div>
                <button
                  onClick={() => setIsMarginTransferModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* From & To Route Switcher */}
              <div style={{ background: '#181a20', padding: '16px', borderRadius: '12px', border: '1px solid #333b47', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#929aa5' }}>From</span>
                  <select
                    value={marginTransferFrom}
                    onChange={(e) => setMarginTransferFrom(e.target.value as any)}
                    style={{ background: '#29313d', color: '#eaecef', border: '1px solid #434c5a', borderRadius: '6px', padding: '4px 10px', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="spot">Spot Wallet</option>
                    <option value="cross">Cross Margin</option>
                    <option value="isolated">Isolated Margin</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                  <button
                    onClick={() => {
                      const temp = marginTransferFrom;
                      setMarginTransferFrom(marginTransferTo);
                      setMarginTransferTo(temp);
                    }}
                    style={{ background: '#29313d', border: '1px solid #434c5a', color: '#fcd535', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    ⇅
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#929aa5' }}>To</span>
                  <select
                    value={marginTransferTo}
                    onChange={(e) => setMarginTransferTo(e.target.value as any)}
                    style={{ background: '#29313d', color: '#eaecef', border: '1px solid #434c5a', borderRadius: '6px', padding: '4px 10px', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="cross">Cross Margin</option>
                    <option value="spot">Spot Wallet</option>
                    <option value="isolated">Isolated Margin</option>
                  </select>
                </div>
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Coin</label>
                <select
                  value={marginTransferAsset}
                  onChange={(e) => setMarginTransferAsset(e.target.value)}
                  style={{ width: '100%', background: '#181a20', color: '#eaecef', border: '1px solid #333b47', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none' }}
                >
                  {['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'USDC'].map((sym) => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Amount</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={marginTransferAmountInput}
                    onChange={(e) => setMarginTransferAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 70px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      const avail =
                        marginTransferFrom === 'spot'
                          ? parseFloat(fullAssetList.find((b) => b.asset === marginTransferAsset)?.available || '0')
                          : crossMarginBalances[marginTransferAsset]?.available || 0;
                      setMarginTransferAmountInput(avail.toString());
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Instant 0% Fee Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#929aa5', marginBottom: '20px' }}>
                <span>Transfer Fee:</span>
                <span style={{ color: '#2ebd85', fontWeight: 700 }}>0.00 (Instant &amp; Free)</span>
              </div>

              {/* Confirm Transfer CTA */}
              <button
                onClick={handleExecuteMarginTransfer}
                style={{
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(252, 213, 53, 0.25)'
                }}
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            FUTURES TRANSFER MODAL (Instant 0-fee bridge: Spot <-> USDⓈ-M <-> COIN-M)
            ========================================================================= */}
        {isFuturesTransferModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}
            onClick={() => setIsFuturesTransferModalOpen(false)}
          >
            <div
              style={{
                background: '#202630',
                border: '1px solid #333b47',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ArrowRightLeft size={22} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#eaecef' }}>
                    Transfer (Futures Bridge)
                  </h3>
                </div>
                <button
                  onClick={() => setIsFuturesTransferModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* From / To Direction Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#181a20', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333b47' }}>
                  <div style={{ fontSize: '11px', color: '#929aa5', marginBottom: '4px' }}>From</div>
                  <select
                    value={futuresTransferFrom}
                    onChange={(e) => setFuturesTransferFrom(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#eaecef',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="spot">Spot Wallet</option>
                    <option value="usds-m">USDⓈ-M Futures</option>
                    <option value="coin-m">COIN-M Futures</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const temp = futuresTransferFrom;
                      setFuturesTransferFrom(futuresTransferTo);
                      setFuturesTransferTo(temp);
                    }}
                    style={{
                      background: '#29313d',
                      border: '1px solid #434c5a',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fcd535',
                      cursor: 'pointer'
                    }}
                    title="Switch direction"
                  >
                    <ArrowUpDown size={15} />
                  </button>
                </div>

                <div style={{ background: '#181a20', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333b47' }}>
                  <div style={{ fontSize: '11px', color: '#929aa5', marginBottom: '4px' }}>To</div>
                  <select
                    value={futuresTransferTo}
                    onChange={(e) => setFuturesTransferTo(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#eaecef',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="usds-m">USDⓈ-M Futures</option>
                    <option value="coin-m">COIN-M Futures</option>
                    <option value="spot">Spot Wallet</option>
                  </select>
                </div>
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>Coin</label>
                <select
                  value={futuresTransferAsset}
                  onChange={(e) => setFuturesTransferAsset(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {(futuresTransferFrom === 'coin-m' || futuresTransferTo === 'coin-m'
                    ? ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
                    : ['USDT', 'USDC', 'BNB', 'FDUSD']
                  ).map((sym) => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#929aa5', marginBottom: '6px' }}>
                  <span>Amount</span>
                  <span className="mono">
                    Available:{' '}
                    {futuresTransferFrom === 'spot'
                      ? parseFloat(fullAssetList.find((b) => b.asset === futuresTransferAsset)?.available || '0').toFixed(4)
                      : futuresTransferFrom === 'usds-m'
                      ? (usdsMarginBalances[futuresTransferAsset]?.availableBalance || 0).toFixed(4)
                      : (coinMarginBalances[futuresTransferAsset]?.availableOrder || 0).toFixed(6)}{' '}
                    {futuresTransferAsset}
                  </span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={futuresTransferAmountInput}
                    onChange={(e) => setFuturesTransferAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 70px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      const avail =
                        futuresTransferFrom === 'spot'
                          ? parseFloat(fullAssetList.find((b) => b.asset === futuresTransferAsset)?.available || '0')
                          : futuresTransferFrom === 'usds-m'
                          ? usdsMarginBalances[futuresTransferAsset]?.availableBalance || 0
                          : coinMarginBalances[futuresTransferAsset]?.availableOrder || 0;
                      setFuturesTransferAmountInput(avail.toString());
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Instant 0% Fee Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#929aa5', marginBottom: '20px' }}>
                <span>Transfer Fee:</span>
                <span style={{ color: '#2ebd85', fontWeight: 700 }}>0.00 (Instant &amp; Free)</span>
              </div>

              {/* Confirm Transfer CTA */}
              <button
                onClick={handleExecuteFuturesTransfer}
                style={{
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(252, 213, 53, 0.25)'
                }}
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            FUNDING TRANSFER MODAL (Internal 0-fee bridge across all Binance accounts)
            ========================================================================= */}
        {isFundingTransferModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              style={{
                background: '#1e2329',
                border: '1px solid #333b47',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '480px',
                padding: '28px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowRightLeft size={20} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Transfer Funds</h3>
                </div>
                <button
                  onClick={() => setIsFundingTransferModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* From / To Direction Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontSize: '13px', color: '#929aa5', fontWeight: 600 }}>From</div>
                  <select
                    value={fundingTransferFrom}
                    onChange={(e) => setFundingTransferFrom(e.target.value as any)}
                    style={{
                      flex: 1,
                      background: '#2b313a',
                      border: '1px solid #434c5a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#eaecef',
                      fontSize: '14px',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  >
                    <option value="funding">Funding Wallet</option>
                    <option value="spot">Spot Wallet</option>
                    <option value="usds-m">USDⓈ-M Futures</option>
                    <option value="coin-m">COIN-M Futures</option>
                    <option value="cross">Cross Margin</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const temp = fundingTransferFrom;
                      setFundingTransferFrom(fundingTransferTo);
                      setFundingTransferTo(temp);
                    }}
                    style={{
                      background: '#2b313a',
                      border: '1px solid #434c5a',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fcd535',
                      cursor: 'pointer'
                    }}
                    title="Swap direction"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontSize: '13px', color: '#929aa5', fontWeight: 600 }}>To</div>
                  <select
                    value={fundingTransferTo}
                    onChange={(e) => setFundingTransferTo(e.target.value as any)}
                    style={{
                      flex: 1,
                      background: '#2b313a',
                      border: '1px solid #434c5a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#eaecef',
                      fontSize: '14px',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  >
                    <option value="spot">Spot Wallet</option>
                    <option value="funding">Funding Wallet</option>
                    <option value="usds-m">USDⓈ-M Futures</option>
                    <option value="coin-m">COIN-M Futures</option>
                    <option value="cross">Cross Margin</option>
                  </select>
                </div>
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#929aa5', marginBottom: '8px', fontWeight: 600 }}>Coin</div>
                <select
                  value={fundingTransferAsset}
                  onChange={(e) => setFundingTransferAsset(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#2b313a',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  {Object.keys(fundingBalances).map((sym) => (
                    <option key={sym} value={sym}>
                      {sym} - {ASSET_METADATA[sym]?.name || sym}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#929aa5', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Amount</span>
                  <span>
                    Available:{' '}
                    <strong className="mono" style={{ color: '#eaecef' }}>
                      {fundingTransferFrom === 'funding'
                        ? (fundingBalances[fundingTransferAsset]?.available || 0).toFixed(4)
                        : fundingTransferFrom === 'spot'
                        ? (parseFloat(fullAssetList.find((b) => b.asset === fundingTransferAsset)?.available || '0')).toFixed(4)
                        : fundingTransferFrom === 'usds-m'
                        ? (usdsMarginBalances[fundingTransferAsset]?.availableBalance || 0).toFixed(4)
                        : (coinMarginBalances[fundingTransferAsset]?.availableOrder || 0).toFixed(4)}{' '}
                      {fundingTransferAsset}
                    </strong>
                  </span>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={fundingTransferAmountInput}
                    onChange={(e) => setFundingTransferAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 70px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      const avail =
                        fundingTransferFrom === 'funding'
                          ? fundingBalances[fundingTransferAsset]?.available || 0
                          : fundingTransferFrom === 'spot'
                          ? parseFloat(fullAssetList.find((b) => b.asset === fundingTransferAsset)?.available || '0')
                          : fundingTransferFrom === 'usds-m'
                          ? usdsMarginBalances[fundingTransferAsset]?.availableBalance || 0
                          : coinMarginBalances[fundingTransferAsset]?.availableOrder || 0;
                      setFundingTransferAmountInput(avail.toString());
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Instant 0% Fee Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#929aa5', marginBottom: '20px' }}>
                <span>Internal Transfer Fee:</span>
                <span style={{ color: '#2ebd85', fontWeight: 700 }}>0.00 (Instant &amp; Free)</span>
              </div>

              {/* Confirm Transfer CTA */}
              <button
                onClick={handleExecuteFundingTransfer}
                style={{
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(252, 213, 53, 0.25)'
                }}
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            BINANCE PAY / FUNDING SEND MODAL (Zero-fee instant off-chain transfer)
            ========================================================================= */}
        {isFundingSendModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              style={{
                background: '#1e2329',
                border: '1px solid #333b47',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '480px',
                padding: '28px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={20} color="#fcd535" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#eaecef', margin: 0 }}>Send via Binance Pay</h3>
                </div>
                <button
                  onClick={() => setIsFundingSendModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#707a8a', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Subtitle / Zero Fee Badge */}
              <div
                style={{
                  background: 'rgba(252, 213, 53, 0.1)',
                  border: '1px solid rgba(252, 213, 53, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#fcd535',
                  lineHeight: '1.5'
                }}
              >
                Instant cryptocurrency transfers to other Binance users with <strong>0% transaction fees</strong> using Email, Phone Number, or Binance Pay ID.
              </div>

              {/* Recipient Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#929aa5', marginBottom: '8px', fontWeight: 600 }}>Send to (Email / Phone / Pay ID)</div>
                <input
                  type="text"
                  placeholder="e.g. user@crypto.com or 283910482"
                  value={fundingSendRecipient}
                  onChange={(e) => setFundingSendRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#929aa5', marginBottom: '8px', fontWeight: 600 }}>Currency</div>
                <select
                  value={fundingSendAsset}
                  onChange={(e) => setFundingSendAsset(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#2b313a',
                    border: '1px solid #434c5a',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#eaecef',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  {Object.keys(fundingBalances).map((sym) => (
                    <option key={sym} value={sym}>
                      {sym} - Available: {(fundingBalances[sym]?.available || 0).toFixed(4)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#929aa5', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Amount</span>
                  <span>
                    Available in Funding:{' '}
                    <strong className="mono" style={{ color: '#eaecef' }}>
                      {(fundingBalances[fundingSendAsset]?.available || 0).toFixed(4)} {fundingSendAsset}
                    </strong>
                  </span>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={fundingSendAmount}
                    onChange={(e) => setFundingSendAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#181a20',
                      border: '1px solid #333b47',
                      borderRadius: '8px',
                      padding: '12px 70px 12px 14px',
                      color: '#eaecef',
                      fontSize: '15px',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      const avail = fundingBalances[fundingSendAsset]?.available || 0;
                      setFundingSendAmount(avail.toString());
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#fcd535',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Note / Remarks */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#929aa5', marginBottom: '8px', fontWeight: 600 }}>Remarks (Optional)</div>
                <input
                  type="text"
                  placeholder="e.g. Dinner split, subscription"
                  value={fundingSendNote}
                  onChange={(e) => setFundingSendNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#181a20',
                    border: '1px solid #333b47',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#eaecef',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Send Payment CTA */}
              <button
                onClick={handleExecuteFundingSend}
                style={{
                  width: '100%',
                  background: '#fcd535',
                  color: '#181a20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(252, 213, 53, 0.25)'
                }}
              >
                Send Payment
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
