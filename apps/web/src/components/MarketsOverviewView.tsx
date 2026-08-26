import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Flame,
  TrendingUp,
  Clock,
  BarChart2,
  Star,
  ArrowUpDown,
  RefreshCw,
  TrendingDown,
  Award,
  Crown,
  Sparkles,
  Layers,
  DollarSign,
  Activity,
  Zap,
  Percent,
  Timer,
  Coins,
  ChevronDown,
  ArrowRight,
  Info,
  SlidersHorizontal,
  LayoutGrid,
  List
} from 'lucide-react';
import { TradingViewCryptoScreener } from './TradingViewCryptoScreener';

interface MarketsOverviewViewProps {
  onNavigateToTrade: (sym?: string) => void;
  onNavigateToStock: (sym?: string) => void;
}

interface ProductItem {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetName: string;
  tags: string[];
  lastPrice: string;
  priceNum: number;
  change24h: string;
  changeNum: number;
  high24h: string;
  low24h: string;
  volume24h: string;
  volumeNum: number;
  marketCap: string;
  marketCapNum: number;
  isPositive: boolean;
  tvSymbol: string;
}

interface FuturesContractItem {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetName: string;
  contractType: 'Perpetual' | 'Quarterly';
  markPrice: string;
  markPriceNum: number;
  indexPrice: string;
  indexPriceNum: number;
  basis: string;
  fundingRate: string;
  fundingRateNum: number;
  nextFundingTime: string;
  change24h: string;
  changeNum: number;
  high24h: string;
  low24h: string;
  volume24h: string;
  volumeNum: number;
  openInterest: string;
  isPositive: boolean;
  tags: string[];
}

type MainHeaderNav = 'overview' | 'trading_data' | 'ai_select' | 'token_unlock';
type TradingDataSubTab = 'rankings' | 'usd_futures' | 'coin_futures' | 'options' | 'screener';
type RankingCategory = 'gainers' | 'volume' | 'hot' | 'marketcap' | 'losers' | 'new';
type TimeInterval = '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export const MarketsOverviewView: React.FC<MarketsOverviewViewProps> = ({
  onNavigateToTrade,
  onNavigateToStock
}) => {
  // Parse initial state from hash
  const parseRoute = (): { headerNav: MainHeaderNav; subTab: TradingDataSubTab } => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('coin-m') || hash.includes('quarterly') || hash.includes('coin_futures')) {
      return { headerNav: 'trading_data', subTab: 'coin_futures' };
    }
    if (hash.includes('usd') || hash.includes('perpetual') || hash.includes('usd_futures') || hash.includes('futures')) {
      return { headerNav: 'trading_data', subTab: 'usd_futures' };
    }
    if (hash.includes('screener')) {
      return { headerNav: 'trading_data', subTab: 'screener' };
    }
    if (hash.includes('rankings') || hash.includes('trading_data')) {
      return { headerNav: 'trading_data', subTab: 'rankings' };
    }
    return { headerNav: 'overview', subTab: 'rankings' };
  };

  const initial = parseRoute();
  const [headerNav, setHeaderNav] = useState<MainHeaderNav>(initial.headerNav);
  const [subTab, setSubTab] = useState<TradingDataSubTab>(initial.subTab);

  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('1h');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [rankingCategory, setRankingCategory] = useState<RankingCategory>('gainers');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'rank' | 'volume' | 'change' | 'price' | 'name' | 'marketcap' | 'funding'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [futuresContracts, setFuturesContracts] = useState<FuturesContractItem[]>([]);
  const [coinMFutures, setCoinMFutures] = useState<FuturesContractItem[]>([]);
  const [nextFundingCountdown, setNextFundingCountdown] = useState('03:32:45');

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('syncnode_watchlist');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'BTCUSD_PERP', 'ETHUSD_PERP'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'BTCUSD_PERP', 'ETHUSD_PERP'];
    }
  });

  // Dynamic countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextFundingHours = Math.ceil((now.getUTCHours() + 0.001) / 8) * 8;
      const target = new Date(now);
      target.setUTCHours(nextFundingHours % 24, 0, 0, 0);
      if (nextFundingHours >= 24) target.setUTCDate(target.getUTCDate() + 1);

      const diff = Math.max(0, target.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setNextFundingCountdown(`${hours}:${minutes}:${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format utilities
  const formatVol = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatPrice = (val: number) => {
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.0001) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(8)}`;
  };

  // Fetch live market data
  const fetchLiveProducts = async () => {
    try {
      setIsLoading(true);

      const tagDatabase: Record<string, { name: string; tags: string[]; circulatingSupply?: number }> = {
        'BTCUSDT': { name: 'Bitcoin', tags: ['Layer1_Layer2', 'Payments', 'mining-zone', 'pos'], circulatingSupply: 19780000 },
        'ETHUSDT': { name: 'Ethereum', tags: ['Layer1_Layer2', 'pos', 'mining-zone'], circulatingSupply: 120400000 },
        'SOLUSDT': { name: 'Solana', tags: ['Layer1_Layer2', 'Solana', 'pos'], circulatingSupply: 470000000 },
        'BNBUSDT': { name: 'BNB', tags: ['Layer1_Layer2', 'BSC', 'pos'], circulatingSupply: 144000000 },
        'XRPUSDT': { name: 'XRP', tags: ['Layer1_Layer2', 'Payments'], circulatingSupply: 56000000000 },
        'DOGEUSDT': { name: 'Dogecoin', tags: ['Meme', 'mining-zone'], circulatingSupply: 146000000000 },
        'ADAUSDT': { name: 'Cardano', tags: ['Layer1_Layer2', 'pos'], circulatingSupply: 35700000000 },
        'AVAXUSDT': { name: 'Avalanche', tags: ['Layer1_Layer2', 'RWA', 'pos'], circulatingSupply: 405000000 },
        'SUIUSDT': { name: 'Sui', tags: ['Layer1_Layer2', 'Launchpool', 'pos'], circulatingSupply: 2850000000 },
        'NEARUSDT': { name: 'NEAR Protocol', tags: ['Layer1_Layer2', 'AI', 'pos'], circulatingSupply: 1210000000 },
        'LINKUSDT': { name: 'Chainlink', tags: ['defi', 'AI', 'RWA', 'Infrastructure'], circulatingSupply: 626000000 },
        'FETUSDT': { name: 'Artificial Superintelligence Alliance', tags: ['AI', 'Infrastructure', 'Launchpad'], circulatingSupply: 2600000000 },
        'RENDERUSDT': { name: 'Render Token', tags: ['AI', 'Infrastructure', 'Solana'], circulatingSupply: 518000000 },
        'PEPEUSDT': { name: 'Pepe', tags: ['Meme', 'innovation-zone'], circulatingSupply: 420690000000000 },
        'WIFUSDT': { name: 'dogwifhat', tags: ['Meme', 'Solana', 'Seed'], circulatingSupply: 998000000 },
        'ONDOUSDT': { name: 'Ondo Finance', tags: ['RWA', 'defi'], circulatingSupply: 1430000000 },
        'SHIBUSDT': { name: 'SHIBA INU', tags: ['Meme'], circulatingSupply: 589000000000000 },
        'DOTUSDT': { name: 'Polkadot', tags: ['Layer1_Layer2', 'pos'], circulatingSupply: 1430000000 },
        'LTCUSDT': { name: 'Litecoin', tags: ['Payments', 'mining-zone'], circulatingSupply: 75000000 },
        'BCHUSDT': { name: 'Bitcoin Cash', tags: ['Payments', 'mining-zone'], circulatingSupply: 19700000 },
        'APTUSDT': { name: 'Aptos', tags: ['Layer1_Layer2', 'pos'], circulatingSupply: 510000000 },
        'ARBUSDT': { name: 'Arbitrum', tags: ['Layer1_Layer2'], circulatingSupply: 3900000000 },
        'OPUSDT': { name: 'Optimism', tags: ['Layer1_Layer2'], circulatingSupply: 1250000000 },
        'INJUSDT': { name: 'Injective', tags: ['defi', 'Layer1_Layer2', 'AI', 'RWA', 'BSC'], circulatingSupply: 100000000 },
        'AAVEUSDT': { name: 'Aave', tags: ['defi'], circulatingSupply: 14900000 },
        'UNIUSDT': { name: 'Uniswap', tags: ['defi'], circulatingSupply: 600000000 }
      };

      // 1. Fetch Spot Tickers
      const resSpot = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (resSpot.ok) {
        const tickers = await resSpot.json();
        if (Array.isArray(tickers)) {
          const validUSDT = tickers
            .filter((t: any) => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 10000)
            .map((t: any) => {
              const sym = t.symbol;
              const baseAsset = sym.replace('USDT', '');
              const priceNum = parseFloat(t.lastPrice) || 0;
              const changeNum = parseFloat(t.priceChangePercent) || 0;
              const volumeNum = parseFloat(t.quoteVolume) || 0;
              const isPos = changeNum >= 0;
              const meta = tagDatabase[sym] || { name: baseAsset, tags: ['spot'] };
              const supply = meta.circulatingSupply || 50000000;
              const mCap = priceNum * supply;

              return {
                symbol: sym,
                baseAsset,
                quoteAsset: 'USDT',
                baseAssetName: meta.name,
                tags: meta.tags,
                lastPrice: formatPrice(priceNum),
                priceNum,
                change24h: `${isPos ? '+' : ''}${changeNum.toFixed(2)}%`,
                changeNum,
                high24h: formatPrice(parseFloat(t.highPrice) || priceNum),
                low24h: formatPrice(parseFloat(t.lowPrice) || priceNum),
                volume24h: formatVol(volumeNum),
                volumeNum,
                marketCap: formatVol(mCap),
                marketCapNum: mCap,
                isPositive: isPos,
                tvSymbol: `BINANCE:${baseAsset}USDT`
              };
            });
          setProducts(validUSDT);
        }
      }

      // 2. Fetch USD-M Futures Data
      const [resPrem, resFutTicker] = await Promise.all([
        fetch('https://fapi.binance.com/fapi/v1/premiumIndex').catch(() => null),
        fetch('https://fapi.binance.com/fapi/v1/ticker/24hr').catch(() => null)
      ]);

      if (resPrem && resPrem.ok && resFutTicker && resFutTicker.ok) {
        const premList = await resPrem.json();
        const futList = await resFutTicker.json();

        if (Array.isArray(premList) && Array.isArray(futList)) {
          const tickerMap = new Map<string, any>();
          futList.forEach((f: any) => tickerMap.set(f.symbol, f));

          const futuresData: FuturesContractItem[] = premList
            .filter((p: any) => p.symbol.endsWith('USDT'))
            .map((p: any) => {
              const sym = p.symbol;
              const baseAsset = sym.replace('USDT', '');
              const meta = tagDatabase[sym] || { name: baseAsset, tags: ['Perpetual'] };
              const ticker = tickerMap.get(sym) || {};

              const markNum = parseFloat(p.markPrice) || 0;
              const indexNum = parseFloat(p.indexPrice) || 0;
              const changeNum = parseFloat(ticker.priceChangePercent) || 0;
              const volumeNum = parseFloat(ticker.quoteVolume) || 0;
              const fundingNum = parseFloat(p.lastFundingRate) || 0;
              const basisNum = markNum - indexNum;
              const basisStr = `${basisNum >= 0 ? '+' : ''}${basisNum.toFixed(2)}`;
              const isPos = changeNum >= 0;
              const openInterestEst = volumeNum * 0.35;

              return {
                symbol: sym,
                baseAsset,
                quoteAsset: 'USDT',
                baseAssetName: meta.name,
                contractType: 'Perpetual' as const,
                markPrice: formatPrice(markNum),
                markPriceNum: markNum,
                indexPrice: formatPrice(indexNum),
                indexPriceNum: indexNum,
                basis: basisStr,
                fundingRate: `${fundingNum >= 0 ? '+' : ''}${(fundingNum * 100).toFixed(4)}%`,
                fundingRateNum: fundingNum,
                nextFundingTime: nextFundingCountdown,
                change24h: `${isPos ? '+' : ''}${changeNum.toFixed(2)}%`,
                changeNum,
                high24h: formatPrice(parseFloat(ticker.highPrice) || markNum),
                low24h: formatPrice(parseFloat(ticker.lowPrice) || markNum),
                volume24h: formatVol(volumeNum),
                volumeNum,
                openInterest: formatVol(openInterestEst),
                isPositive: isPos,
                tags: meta.tags
              };
            })
            .sort((a, b) => b.volumeNum - a.volumeNum);

          setFuturesContracts(futuresData);
        }
      }

      // 3. Fetch COIN-M Futures Data
      const [resCoinPrem, resCoinTicker] = await Promise.all([
        fetch('https://dapi.binance.com/dapi/v1/premiumIndex').catch(() => null),
        fetch('https://dapi.binance.com/dapi/v1/ticker/24hr').catch(() => null)
      ]);

      if (resCoinPrem && resCoinPrem.ok && resCoinTicker && resCoinTicker.ok) {
        const coinPremList = await resCoinPrem.json();
        const coinTickerList = await resCoinTicker.json();

        if (Array.isArray(coinPremList) && Array.isArray(coinTickerList)) {
          const coinMap = new Map<string, any>();
          coinTickerList.forEach((c: any) => coinMap.set(c.symbol, c));

          const nameMap: Record<string, string> = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum',
            'SOL': 'Solana',
            'BNB': 'BNB',
            'XRP': 'XRP',
            'DOGE': 'Dogecoin',
            'ADA': 'Cardano',
            'LTC': 'Litecoin',
            'BCH': 'Bitcoin Cash',
            'LINK': 'Chainlink',
            'DOT': 'Polkadot',
            'AVAX': 'Avalanche',
            'FIL': 'Filecoin',
            'NEAR': 'NEAR Protocol',
            'UNI': 'Uniswap',
            'APT': 'Aptos'
          };

          const coinFuturesData: FuturesContractItem[] = coinPremList.map((p: any) => {
            const sym = p.symbol;
            const pair = p.pair || sym.split('_')[0];
            const baseAsset = pair.replace('USD', '');
            const isPerp = sym.includes('PERP');
            const ticker = coinMap.get(sym) || {};

            const markNum = parseFloat(p.markPrice) || 0;
            const indexNum = parseFloat(p.indexPrice) || 0;
            const changeNum = parseFloat(ticker.priceChangePercent) || 0;
            const volumeNum = (parseFloat(ticker.volume) || 0) * 10;
            const fundingNum = parseFloat(p.lastFundingRate) || 0;
            const basisNum = markNum - indexNum;
            const basisStr = `${basisNum >= 0 ? '+' : ''}${basisNum.toFixed(2)}`;
            const isPos = changeNum >= 0;
            const openInterestEst = volumeNum * 0.42;

            const tags = [isPerp ? 'Perpetual' : 'Quarterly'];
            if (['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP'].includes(baseAsset)) tags.push('Layer1_Layer2');
            if (['DOGE'].includes(baseAsset)) tags.push('Meme');
            if (['LINK', 'UNI'].includes(baseAsset)) tags.push('defi');

            return {
              symbol: sym,
              baseAsset,
              quoteAsset: 'USD',
              baseAssetName: nameMap[baseAsset] || baseAsset,
              contractType: (isPerp ? 'Perpetual' : 'Quarterly') as 'Perpetual' | 'Quarterly',
              markPrice: formatPrice(markNum),
              markPriceNum: markNum,
              indexPrice: formatPrice(indexNum),
              indexPriceNum: indexNum,
              basis: basisStr,
              fundingRate: isPerp ? `${fundingNum >= 0 ? '+' : ''}${(fundingNum * 100).toFixed(4)}%` : 'Settlement',
              fundingRateNum: fundingNum,
              nextFundingTime: isPerp ? nextFundingCountdown : 'Quarterly Expiry',
              change24h: `${isPos ? '+' : ''}${changeNum.toFixed(2)}%`,
              changeNum,
              high24h: formatPrice(parseFloat(ticker.highPrice) || markNum),
              low24h: formatPrice(parseFloat(ticker.lowPrice) || markNum),
              volume24h: formatVol(volumeNum),
              volumeNum,
              openInterest: formatVol(openInterestEst),
              isPositive: isPos,
              tags
            };
          }).sort((a, b) => b.volumeNum - a.volumeNum);

          setCoinMFutures(coinFuturesData);
        }
      }

    } catch (err) {
      console.error('Failed to fetch live market products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveProducts();
    const interval = setInterval(fetchLiveProducts, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleWatchlist = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      localStorage.setItem('syncnode_watchlist', JSON.stringify(next));
      return next;
    });
  };

  // Quad movers
  const hotCoins = useMemo(() => [...products].sort((a, b) => b.volumeNum - a.volumeNum).slice(0, 5), [products]);
  const topGainers = useMemo(() => [...products].sort((a, b) => b.changeNum - a.changeNum).slice(0, 5), [products]);
  const topLosers = useMemo(() => [...products].sort((a, b) => a.changeNum - b.changeNum).slice(0, 5), [products]);
  const topVolume = useMemo(() => [...products].sort((a, b) => b.volumeNum - a.volumeNum).slice(0, 5), [products]);

  // Filtered Spot/Rankings products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedTag === 'watchlist') {
      list = list.filter((p) => watchlist.includes(p.symbol));
    } else if (selectedTag !== 'all') {
      list = list.filter((p) => p.tags.includes(selectedTag));
    }

    if (headerNav === 'trading_data' && subTab === 'rankings') {
      if (rankingCategory === 'gainers') {
        list = list.filter((p) => p.changeNum > 0).sort((a, b) => b.changeNum - a.changeNum);
      } else if (rankingCategory === 'losers') {
        list = list.filter((p) => p.changeNum < 0).sort((a, b) => a.changeNum - b.changeNum);
      } else if (rankingCategory === 'volume') {
        list = list.sort((a, b) => b.volumeNum - a.volumeNum);
      } else if (rankingCategory === 'marketcap') {
        list = list.sort((a, b) => b.marketCapNum - a.marketCapNum);
      } else if (rankingCategory === 'hot') {
        list = list.sort((a, b) => (b.volumeNum * Math.abs(b.changeNum)) - (a.volumeNum * Math.abs(a.changeNum)));
      } else if (rankingCategory === 'new') {
        list = list.filter((p) => p.tags.includes('Launchpool') || p.tags.includes('Launchpad') || p.tags.includes('Seed'));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.baseAsset.toLowerCase().includes(q) ||
          p.baseAssetName.toLowerCase().includes(q)
      );
    }

    if (sortColumn !== 'rank') {
      list.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortColumn === 'price') {
          valA = a.priceNum;
          valB = b.priceNum;
        } else if (sortColumn === 'change') {
          valA = a.changeNum;
          valB = b.changeNum;
        } else if (sortColumn === 'volume') {
          valA = a.volumeNum;
          valB = b.volumeNum;
        } else if (sortColumn === 'marketcap') {
          valA = a.marketCapNum;
          valB = b.marketCapNum;
        } else if (sortColumn === 'name') {
          return sortOrder === 'asc'
            ? a.baseAsset.localeCompare(b.baseAsset)
            : b.baseAsset.localeCompare(a.baseAsset);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [products, selectedTag, rankingCategory, headerNav, subTab, searchQuery, sortColumn, sortOrder, watchlist]);

  // Filtered USD-M Futures products
  const filteredFutures = useMemo(() => {
    let list = [...futuresContracts];

    if (selectedTag === 'watchlist') {
      list = list.filter((f) => watchlist.includes(f.symbol));
    } else if (selectedTag !== 'all') {
      list = list.filter((f) => f.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.symbol.toLowerCase().includes(q) ||
          f.baseAsset.toLowerCase().includes(q) ||
          f.baseAssetName.toLowerCase().includes(q)
      );
    }

    if (sortColumn === 'funding') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.fundingRateNum - b.fundingRateNum : b.fundingRateNum - a.fundingRateNum));
    } else if (sortColumn === 'change') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.changeNum - b.changeNum : b.changeNum - a.changeNum));
    } else if (sortColumn === 'volume') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.volumeNum - b.volumeNum : b.volumeNum - a.volumeNum));
    } else if (sortColumn === 'price') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.markPriceNum - b.markPriceNum : b.markPriceNum - a.markPriceNum));
    }

    return list;
  }, [futuresContracts, selectedTag, searchQuery, sortColumn, sortOrder, watchlist]);

  // Filtered COIN-M Futures products
  const filteredCoinM = useMemo(() => {
    let list = [...coinMFutures];

    if (selectedTag === 'watchlist') {
      list = list.filter((c) => watchlist.includes(c.symbol));
    } else if (selectedTag === 'perpetual') {
      list = list.filter((c) => c.contractType === 'Perpetual');
    } else if (selectedTag === 'quarterly') {
      list = list.filter((c) => c.contractType === 'Quarterly');
    } else if (selectedTag !== 'all') {
      list = list.filter((c) => c.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.baseAsset.toLowerCase().includes(q) ||
          c.baseAssetName.toLowerCase().includes(q)
      );
    }

    if (sortColumn === 'funding') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.fundingRateNum - b.fundingRateNum : b.fundingRateNum - a.fundingRateNum));
    } else if (sortColumn === 'change') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.changeNum - b.changeNum : b.changeNum - a.changeNum));
    } else if (sortColumn === 'volume') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.volumeNum - b.volumeNum : b.volumeNum - a.volumeNum));
    } else if (sortColumn === 'price') {
      list.sort((a, b) => (sortOrder === 'asc' ? a.markPriceNum - b.markPriceNum : b.markPriceNum - a.markPriceNum));
    }

    return list;
  }, [coinMFutures, selectedTag, searchQuery, sortColumn, sortOrder, watchlist]);

  const handleSort = (col: 'rank' | 'volume' | 'change' | 'price' | 'name' | 'marketcap' | 'funding') => {
    if (sortColumn === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortOrder('desc');
    }
  };

  const handleHeaderNav = (nav: MainHeaderNav) => {
    setHeaderNav(nav);
    if (nav === 'overview') {
      window.location.hash = '#/markets/overview';
    } else if (nav === 'trading_data') {
      window.location.hash = '#/markets/trading_data';
      setSubTab('rankings');
    }
  };

  const handleSubTab = (tab: TradingDataSubTab) => {
    setSubTab(tab);
    if (tab === 'rankings') {
      window.location.hash = '#/markets/trading_data';
    } else if (tab === 'usd_futures') {
      window.location.hash = '#/markets/trading_data/futures/perpetual';
    } else if (tab === 'coin_futures') {
      window.location.hash = '#/markets/trading_data/futures/quarterly/trading-data';
    } else if (tab === 'screener') {
      window.location.hash = '#/markets/screener';
    }
  };

  return (
    <div className="com-trading-data-wrap" style={{ minHeight: '100vh', background: 'var(--color-BasicBg, #181A20)', color: 'var(--color-PrimaryText, #EAECEF)', fontFamily: 'BinanceNova, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      
      {/* 1. TOP HEADER NAVIGATION (Overview | Trading Data | AI Select | Token Unlock) */}
      <div style={{ borderBottom: '1px solid #29313D', padding: '0 32px' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <button
              onClick={() => handleHeaderNav('overview')}
              style={{
                background: 'transparent',
                border: 'none',
                color: headerNav === 'overview' ? '#EAECEF' : '#848E9C',
                fontSize: '20px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0',
                transition: 'color 0.15s'
              }}
            >
              Overview
            </button>

            <button
              onClick={() => handleHeaderNav('trading_data')}
              style={{
                background: 'transparent',
                border: 'none',
                color: headerNav === 'trading_data' ? '#EAECEF' : '#848E9C',
                fontSize: '20px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0',
                transition: 'color 0.15s'
              }}
            >
              Trading Data
            </button>

            <span style={{ color: '#848E9C', fontSize: '20px', fontWeight: 700, cursor: 'not-allowed', opacity: 0.5 }}>
              AI Select
            </span>

            <span style={{ color: '#848E9C', fontSize: '20px', fontWeight: 700, cursor: 'not-allowed', opacity: 0.5 }}>
              Token Unlock
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#848E9C' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2EBD85', display: 'inline-block' }}></span>
              Real-time Live Stream
            </span>
            <button
              onClick={fetchLiveProducts}
              style={{ background: '#202630', border: '1px solid #333B47', borderRadius: '4px', color: '#EAECEF', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION BAR (For Trading Data: Rankings | USDⓈ-M Futures | COIN-M Futures | Screener) */}
      {headerNav === 'trading_data' && (
        <div style={{ borderBottom: '1px solid #29313D', padding: '0 32px', background: '#181A20' }}>
          <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', gap: '32px', height: '48px', alignItems: 'center' }}>
            
            <button
              onClick={() => handleSubTab('rankings')}
              style={{
                background: 'transparent',
                border: 'none',
                color: subTab === 'rankings' ? '#EAECEF' : '#848E9C',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <span>Rankings</span>
              {subTab === 'rankings' && <div style={{ width: '20px', height: '3px', background: '#FCD535', borderRadius: '2px' }} />}
            </button>

            <button
              onClick={() => handleSubTab('usd_futures')}
              style={{
                background: 'transparent',
                border: 'none',
                color: subTab === 'usd_futures' ? '#EAECEF' : '#848E9C',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <span>USDⓈ-M Futures</span>
              {subTab === 'usd_futures' && <div style={{ width: '20px', height: '3px', background: '#FCD535', borderRadius: '2px' }} />}
            </button>

            <button
              onClick={() => handleSubTab('coin_futures')}
              style={{
                background: 'transparent',
                border: 'none',
                color: subTab === 'coin_futures' ? '#EAECEF' : '#848E9C',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <span>COIN-M Futures</span>
              {subTab === 'coin_futures' && <div style={{ width: '20px', height: '3px', background: '#FCD535', borderRadius: '2px' }} />}
            </button>

            <button
              onClick={() => handleSubTab('screener')}
              style={{
                background: 'transparent',
                border: 'none',
                color: subTab === 'screener' ? '#EAECEF' : '#848E9C',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <span>Live TradingView Screener</span>
              {subTab === 'screener' && <div style={{ width: '20px', height: '3px', background: '#FCD535', borderRadius: '2px' }} />}
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 32px' }}>
        
        {/* VIEW 1: TRADINGVIEW SCREENER */}
        {headerNav === 'trading_data' && subTab === 'screener' && (
          <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#EAECEF' }}>Live TradingView Screener</h2>
              <p style={{ fontSize: '13px', color: '#848E9C', margin: '4px 0 0 0' }}>Multi-exchange institutional ratings, technical oscillators, moving averages, and market strength.</p>
            </div>
            <TradingViewCryptoScreener height={740} colorTheme="dark" defaultColumn="overview" />
          </div>
        )}

        {/* VIEW 2: OVERVIEW HIGHLIGHTS QUAD */}
        {headerNav === 'overview' && (
          <div>
            {/* Highlights Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              
              {/* Card 1: Hot Coins */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={18} color="#FCD535" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Hot Coins</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#848E9C' }}>24h Activity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {hotCoins.map((c) => (
                    <div
                      key={c.symbol}
                      onClick={() => onNavigateToTrade(`${c.baseAsset}/USDT`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#29313D', color: '#FCD535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                          {c.baseAsset.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>{c.baseAsset}</div>
                          <div style={{ fontSize: '11px', color: '#848E9C' }}>{c.baseAssetName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{c.lastPrice}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: c.isPositive ? '#2EBD85' : '#F6465D' }}>{c.change24h}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Top Gainers */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} color="#2EBD85" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Top Gainers</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#848E9C' }}>24h Surge</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topGainers.map((c) => (
                    <div
                      key={c.symbol}
                      onClick={() => onNavigateToTrade(`${c.baseAsset}/USDT`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#29313D', color: '#2EBD85', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                          {c.baseAsset.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>{c.baseAsset}</div>
                          <div style={{ fontSize: '11px', color: '#848E9C' }}>{c.baseAssetName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{c.lastPrice}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#2EBD85' }}>{c.change24h}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Top 24h Volume */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="#00A4EF" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>24h Volume Leaders</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#848E9C' }}>Global Liquidity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topVolume.map((c) => (
                    <div
                      key={c.symbol}
                      onClick={() => onNavigateToTrade(`${c.baseAsset}/USDT`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#29313D', color: '#00A4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                          {c.baseAsset.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>{c.baseAsset}</div>
                          <div style={{ fontSize: '11px', color: '#848E9C' }}>{c.baseAssetName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{c.lastPrice}</div>
                        <div style={{ fontSize: '12px', color: '#848E9C' }}>Vol {c.volume24h}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Top Losers */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingDown size={18} color="#F6465D" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>Top Losers</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#848E9C' }}>24h Pullback</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topLosers.map((c) => (
                    <div
                      key={c.symbol}
                      onClick={() => onNavigateToTrade(`${c.baseAsset}/USDT`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#29313D', color: '#F6465D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                          {c.baseAsset.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>{c.baseAsset}</div>
                          <div style={{ fontSize: '11px', color: '#848E9C' }}>{c.baseAssetName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{c.lastPrice}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#F6465D' }}>{c.change24h}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DERIVATIVES 6-ANALYTICS CARD GRID (For USD-M and COIN-M Futures) */}
        {headerNav === 'trading_data' && (subTab === 'usd_futures' || subTab === 'coin_futures') && (
          <div style={{ marginBottom: '28px' }}>
            
            {/* Top Controls Bar matching Binance Source */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 0', borderBottom: '1px solid #29313D', marginBottom: '24px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {/* Symbol Dropdown */}
                <div style={{ background: '#202630', border: '1px solid #333B47', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700, color: '#EAECEF', fontSize: '14px' }}>
                    {subTab === 'usd_futures' ? 'BTCUSDT Perpetual' : 'BTCUSD_PERP'}
                  </span>
                  <ChevronDown size={14} color="#848E9C" />
                </div>

                {/* Interval Selector */}
                <div style={{ display: 'flex', background: '#202630', borderRadius: '8px', padding: '3px', border: '1px solid #333B47' }}>
                  {(['5m', '15m', '30m', '1h', '4h', '1d'] as TimeInterval[]).map((iv) => (
                    <button
                      key={iv}
                      onClick={() => setSelectedInterval(iv)}
                      style={{
                        background: selectedInterval === iv ? '#29313D' : 'transparent',
                        color: selectedInterval === iv ? '#FCD535' : '#848E9C',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {iv}
                    </button>
                  ))}
                </div>

                {/* Grid / Table View Switcher */}
                <div style={{ display: 'flex', background: '#202630', borderRadius: '8px', padding: '3px', border: '1px solid #333B47' }}>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      background: viewMode === 'table' ? '#29313D' : 'transparent',
                      color: viewMode === 'table' ? '#EAECEF' : '#848E9C',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      background: viewMode === 'grid' ? '#29313D' : 'transparent',
                      color: viewMode === 'grid' ? '#EAECEF' : '#848E9C',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {/* Trade Futures Action Button */}
              <button
                onClick={() => onNavigateToTrade('BTC/USDT')}
                style={{
                  background: '#FCD535',
                  color: '#181A20',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(252, 213, 53, 0.2)'
                }}
              >
                <span>Trade {subTab === 'usd_futures' ? 'USDⓈ-M' : 'COIN-M'} Futures</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* 6 Analytics Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              
              {/* Card 1: Top Trader Long/Short Ratio (Accounts) */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Top Trader Long/Short Ratio (Accounts)</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#848E9C', padding: '2px 6px', borderRadius: '4px' }}>{selectedInterval}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2EBD85', marginBottom: '12px' }}>
                  1.48 <span style={{ fontSize: '13px', color: '#848E9C', fontWeight: 500 }}>(59.68% Long)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F6465D', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                  <div style={{ width: '59.68%', height: '100%', background: '#2EBD85' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#2EBD85', fontWeight: 600 }}>Long 59.68%</span>
                  <span style={{ color: '#F6465D', fontWeight: 600 }}>Short 40.32%</span>
                </div>
              </div>

              {/* Card 2: Top Trader Long/Short Ratio (Positions) */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Top Trader Long/Short Ratio (Positions)</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#848E9C', padding: '2px 6px', borderRadius: '4px' }}>{selectedInterval}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2EBD85', marginBottom: '12px' }}>
                  1.72 <span style={{ fontSize: '13px', color: '#848E9C', fontWeight: 500 }}>(63.24% Long)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F6465D', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                  <div style={{ width: '63.24%', height: '100%', background: '#2EBD85' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#2EBD85', fontWeight: 600 }}>Long 63.24%</span>
                  <span style={{ color: '#F6465D', fontWeight: 600 }}>Short 36.76%</span>
                </div>
              </div>

              {/* Card 3: Long/Short Ratio (Global Accounts) */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Long/Short Ratio (Global Accounts)</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#848E9C', padding: '2px 6px', borderRadius: '4px' }}>{selectedInterval}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2EBD85', marginBottom: '12px' }}>
                  1.10 <span style={{ fontSize: '13px', color: '#848E9C', fontWeight: 500 }}>(52.38% Long)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F6465D', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                  <div style={{ width: '52.38%', height: '100%', background: '#2EBD85' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#2EBD85', fontWeight: 600 }}>Long 52.38%</span>
                  <span style={{ color: '#F6465D', fontWeight: 600 }}>Short 47.62%</span>
                </div>
              </div>

              {/* Card 4: Taker Buy/Sell Volume */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Taker Buy/Sell Volume</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#848E9C', padding: '2px 6px', borderRadius: '4px' }}>{selectedInterval}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#EAECEF', marginBottom: '12px' }}>
                  1.08 <span style={{ fontSize: '13px', color: '#2EBD85', fontWeight: 500 }}>(+5.8% Net Buy)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F6465D', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                  <div style={{ width: '51.92%', height: '100%', background: '#2EBD85' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#2EBD85', fontWeight: 600 }}>Buy $1.42B</span>
                  <span style={{ color: '#F6465D', fontWeight: 600 }}>Sell $1.31B</span>
                </div>
              </div>

              {/* Card 5: Basis & Annualized Rate */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Basis Spread &amp; Next Settlement</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#FCD535', padding: '2px 6px', borderRadius: '4px' }}>8h Cycle</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2EBD85', marginBottom: '4px' }}>
                  +0.0100%
                </div>
                <div style={{ fontSize: '12.5px', color: '#848E9C', marginBottom: '10px' }}>
                  Next Funding in <span style={{ color: '#EAECEF', fontFamily: 'monospace', fontWeight: 700 }}>{nextFundingCountdown}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848E9C', borderTop: '1px solid #29313D', paddingTop: '8px' }}>
                  <span>Annualized Basis: +10.95%</span>
                  <span style={{ color: '#2EBD85' }}>Normal Premium</span>
                </div>
              </div>

              {/* Card 6: Open Interest & Turnover */}
              <div style={{ background: '#202630', borderRadius: '16px', border: '1px solid #29313D', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EAECEF' }}>Aggregate Open Interest</span>
                    <Info size={14} color="#707A8A" />
                  </div>
                  <span style={{ fontSize: '11px', background: '#29313D', color: '#848E9C', padding: '2px 6px', borderRadius: '4px' }}>Global</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#EAECEF', marginBottom: '4px' }}>
                  {subTab === 'usd_futures' ? '$26.19B' : '$8.45B'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#2EBD85', marginBottom: '10px' }}>
                  +3.42% in 24h
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848E9C', borderTop: '1px solid #29313D', paddingTop: '8px' }}>
                  <span>BTC Dominance: 54.2%</span>
                  <span>ETH Dominance: 21.8%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: RANKINGS CATEGORY PILLS (Shown on Rankings subtab) */}
        {headerNav === 'trading_data' && subTab === 'rankings' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                { key: 'gainers', label: '🚀 Top Gainers' },
                { key: 'volume', label: '💎 24h Volume Leaders' },
                { key: 'hot', label: '🔥 Hot / Trending' },
                { key: 'marketcap', label: '👑 Market Cap Rank' },
                { key: 'losers', label: '🔻 Top Losers' },
                { key: 'new', label: '✨ New Listings' }
              ].map((cat) => {
                const isSelected = rankingCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setRankingCategory(cat.key as RankingCategory)}
                    style={{
                      background: isSelected ? '#FCD535' : '#202630',
                      color: isSelected ? '#181A20' : '#EAECEF',
                      border: isSelected ? '1px solid #FCD535' : '1px solid #29313D',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. SECTOR TAGS & SEARCH BAR */}
        {!(headerNav === 'trading_data' && subTab === 'screener') && (
          <div style={{ background: '#202630', borderRadius: '16px 16px 0 0', border: '1px solid #29313D', borderBottom: 'none', padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              
              {/* Sector Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'watchlist', label: '⭐ Watchlist' },
                  ...(subTab === 'coin_futures' ? [{ key: 'perpetual', label: 'Perpetual' }, { key: 'quarterly', label: 'Quarterly Delivery' }] : []),
                  { key: 'Layer1_Layer2', label: 'Layer 1 / Layer 2' },
                  { key: 'AI', label: 'AI & Data' },
                  { key: 'defi', label: 'DeFi' },
                  { key: 'Solana', label: 'Solana' },
                  { key: 'Meme', label: 'Meme' },
                  { key: 'RWA', label: 'RWA' },
                  { key: 'Gaming', label: 'Gaming' },
                  { key: 'Payments', label: 'Payments' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTag(tab.key)}
                    style={{
                      background: selectedTag === tab.key ? '#29313D' : 'transparent',
                      color: selectedTag === tab.key ? '#FCD535' : '#848E9C',
                      border: selectedTag === tab.key ? '1px solid #434C5A' : '1px solid transparent',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: selectedTag === tab.key ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#707A8A' }} />
                <input
                  type="text"
                  placeholder="Search Coin / Symbol / Pair"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: '#181A20',
                    border: '1px solid #29313D',
                    borderRadius: '6px',
                    padding: '7px 12px 7px 32px',
                    color: '#EAECEF',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. DATA TABLE (.rc-table) */}
        {!(headerNav === 'trading_data' && subTab === 'screener') && (
          <div className="rc-table" style={{ background: '#202630', border: '1px solid #29313D', borderRadius: '0 0 16px 16px', overflowX: 'auto' }}>
            <div className="rc-table-content">
              <table>
                <thead className="rc-table-thead">
                  <tr>
                    {headerNav === 'trading_data' && subTab === 'rankings' && (
                      <th style={{ width: '50px', textAlign: 'center' }}># Rank</th>
                    )}
                    <th style={{ width: '40px' }}></th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{subTab === 'coin_futures' || subTab === 'usd_futures' ? 'Contract' : 'Name'}</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{subTab === 'coin_futures' || subTab === 'usd_futures' ? 'Mark Price' : 'Price'}</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    {(subTab === 'usd_futures' || subTab === 'coin_futures') && <th>Index Price</th>}
                    {(subTab === 'usd_futures' || subTab === 'coin_futures') && <th>Basis Spread</th>}
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('change')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>24h Change</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    {(subTab === 'usd_futures' || subTab === 'coin_futures') ? (
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('funding')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Funding Rate / Settlement</span>
                          <ArrowUpDown size={12} />
                        </div>
                      </th>
                    ) : (
                      <th>24h High / 24h Low</th>
                    )}
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('volume')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>24h Volume</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th>{subTab === 'coin_futures' || subTab === 'usd_futures' ? 'Est. Open Interest' : 'Market Cap'}</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="rc-table-tbody">
                  
                  {/* COIN-M FUTURES ROWS */}
                  {headerNav === 'trading_data' && subTab === 'coin_futures' && filteredCoinM.map((c) => {
                    const isFav = watchlist.includes(c.symbol);
                    return (
                      <tr
                        key={c.symbol}
                        className="rc-table-row"
                        onClick={() => onNavigateToTrade(`${c.baseAsset}/USDT`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <button onClick={(e) => toggleWatchlist(c.symbol, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <Star size={15} fill={isFav ? '#FCD535' : 'none'} color={isFav ? '#FCD535' : '#707A8A'} />
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#29313D', color: '#FCD535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
                              {c.baseAsset.slice(0, 3)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#EAECEF', fontSize: '14px' }}>{c.symbol}</span>
                                <span style={{ fontSize: '10px', background: c.contractType === 'Perpetual' ? '#29313D' : '#3B2D54', color: c.contractType === 'Perpetual' ? '#FCD535' : '#D09CFF', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                  {c.contractType === 'Perpetual' ? 'Coin-M Perp' : 'Quarterly'}
                                </span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#848E9C' }}>{c.baseAssetName} Margined</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '14px', color: '#EAECEF' }}>{c.markPrice}</td>
                        <td style={{ color: '#848E9C', fontFamily: 'monospace', fontSize: '13px' }}>{c.indexPrice}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: c.basis.startsWith('+') ? '#2EBD85' : '#F6465D' }}>{c.basis}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12.5px', background: c.isPositive ? 'rgba(46, 189, 133, 0.12)' : 'rgba(246, 70, 93, 0.12)', color: c.isPositive ? '#2EBD85' : '#F6465D' }}>
                            {c.change24h}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: c.fundingRate.startsWith('+') ? '#FCD535' : '#2EBD85' }}>{c.fundingRate}</span>
                            <span style={{ fontSize: '11px', color: '#707A8A', fontFamily: 'monospace' }}>{c.contractType === 'Perpetual' ? `in ${c.nextFundingTime}` : c.nextFundingTime}</span>
                          </div>
                        </td>
                        <td style={{ color: '#EAECEF', fontWeight: 600 }}>{c.volume24h}</td>
                        <td style={{ color: '#848E9C', fontWeight: 600 }}>{c.openInterest}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToStock(c.baseAsset); }} style={{ background: '#29313D', border: '1px solid #333B47', color: '#EAECEF', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Detail</button>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToTrade(`${c.baseAsset}/USDT`); }} style={{ background: '#FCD535', border: 'none', color: '#181A20', padding: '6px 16px', borderRadius: '4px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Trade</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* USD-M FUTURES ROWS */}
                  {headerNav === 'trading_data' && subTab === 'usd_futures' && filteredFutures.map((f) => {
                    const isFav = watchlist.includes(f.symbol);
                    return (
                      <tr
                        key={f.symbol}
                        className="rc-table-row"
                        onClick={() => onNavigateToTrade(`${f.baseAsset}/USDT`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <button onClick={(e) => toggleWatchlist(f.symbol, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <Star size={15} fill={isFav ? '#FCD535' : 'none'} color={isFav ? '#FCD535' : '#707A8A'} />
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#29313D', color: '#FCD535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
                              {f.baseAsset.slice(0, 3)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#EAECEF', fontSize: '14px' }}>{f.baseAsset}USDT</span>
                                <span style={{ fontSize: '10px', background: '#29313D', color: '#FCD535', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>Perp</span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#848E9C' }}>{f.baseAssetName} Perpetual</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '14px', color: '#EAECEF' }}>{f.markPrice}</td>
                        <td style={{ color: '#848E9C', fontFamily: 'monospace', fontSize: '13px' }}>{f.indexPrice}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: f.basis.startsWith('+') ? '#2EBD85' : '#F6465D' }}>{f.basis}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12.5px', background: f.isPositive ? 'rgba(46, 189, 133, 0.12)' : 'rgba(246, 70, 93, 0.12)', color: f.isPositive ? '#2EBD85' : '#F6465D' }}>
                            {f.change24h}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: f.fundingRate.startsWith('+') ? '#FCD535' : '#2EBD85' }}>{f.fundingRate}</span>
                            <span style={{ fontSize: '11px', color: '#707A8A', fontFamily: 'monospace' }}>in {f.nextFundingTime}</span>
                          </div>
                        </td>
                        <td style={{ color: '#EAECEF', fontWeight: 600 }}>{f.volume24h}</td>
                        <td style={{ color: '#848E9C', fontWeight: 600 }}>{f.openInterest}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToStock(f.baseAsset); }} style={{ background: '#29313D', border: '1px solid #333B47', color: '#EAECEF', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Detail</button>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToTrade(`${f.baseAsset}/USDT`); }} style={{ background: '#FCD535', border: 'none', color: '#181A20', padding: '6px 16px', borderRadius: '4px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Trade</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* SPOT OVERVIEW & RANKINGS ROWS */}
                  {(headerNav === 'overview' || (headerNav === 'trading_data' && subTab === 'rankings')) && filteredProducts.map((p, idx) => {
                    const isFav = watchlist.includes(p.symbol);
                    const rankNum = idx + 1;
                    return (
                      <tr
                        key={p.symbol}
                        className="rc-table-row"
                        onClick={() => onNavigateToTrade(`${p.baseAsset}/USDT`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {headerNav === 'trading_data' && subTab === 'rankings' && (
                          <td style={{ textAlign: 'center', fontWeight: 800 }}>
                            {rankNum === 1 ? (
                              <span style={{ background: '#FCD535', color: '#181A20', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}>#1</span>
                            ) : rankNum === 2 ? (
                              <span style={{ background: '#CACED3', color: '#181A20', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}>#2</span>
                            ) : rankNum === 3 ? (
                              <span style={{ background: '#CD7F32', color: '#FFFFFF', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}>#3</span>
                            ) : (
                              <span style={{ color: '#707A8A', fontSize: '12px' }}>{rankNum}</span>
                            )}
                          </td>
                        )}
                        <td>
                          <button onClick={(e) => toggleWatchlist(p.symbol, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <Star size={15} fill={isFav ? '#FCD535' : 'none'} color={isFav ? '#FCD535' : '#707A8A'} />
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#29313D', color: '#FCD535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
                              {p.baseAsset.slice(0, 3)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#EAECEF', fontSize: '14px' }}>
                                {p.baseAsset}
                                <span style={{ color: '#707A8A', fontSize: '12px', marginLeft: '4px' }}>/{p.quoteAsset}</span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#848E9C' }}>{p.baseAssetName}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '14px' }}>{p.lastPrice}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12.5px', background: p.isPositive ? 'rgba(46, 189, 133, 0.12)' : 'rgba(246, 70, 93, 0.12)', color: p.isPositive ? '#2EBD85' : '#F6465D' }}>
                            {p.change24h}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#848E9C', fontFamily: 'monospace' }}>
                          <div>H: <span style={{ color: '#EAECEF' }}>{p.high24h}</span></div>
                          <div>L: <span style={{ color: '#EAECEF' }}>{p.low24h}</span></div>
                        </td>
                        <td style={{ color: '#EAECEF', fontWeight: 600 }}>{p.volume24h}</td>
                        <td style={{ color: '#848E9C', fontWeight: 600 }}>{p.marketCap}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToStock(p.baseAsset); }} style={{ background: '#29313D', border: '1px solid #333B47', color: '#EAECEF', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Detail</button>
                            <button onClick={(e) => { e.stopPropagation(); onNavigateToTrade(`${p.baseAsset}/USDT`); }} style={{ background: '#FCD535', border: 'none', color: '#181A20', padding: '6px 16px', borderRadius: '4px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Trade</button>
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
      </div>

      {/* 6. EXACT FOOTER (Matching Source Specs) */}
      <footer className="footer-wrapper" style={{ borderTop: '1px solid #29313D', padding: '48px 32px 24px 32px', marginTop: '48px' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          <div className="footer-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', marginBottom: '40px' }}>
            
            {/* Column 1: Community */}
            <div className="footer-community">
              <h3 className="footer-navlist-title">Community</h3>
              <div className="footer-icongroup">
                <a href="https://discord.gg" target="_blank" rel="noreferrer">Discord</a>
                <a href="https://t.me" target="_blank" rel="noreferrer">Telegram</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer">X (Twitter)</a>
                <a href="https://reddit.com" target="_blank" rel="noreferrer">Reddit</a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
              </div>
            </div>

            {/* Column 2: About Us */}
            <div className="footer-navlist-group">
              <h3 className="footer-navlist-title">About Us</h3>
              <ul className="footer-navlist-item-list">
                <li className="footer-navlist-item"><a href="#/about">About</a></li>
                <li className="footer-navlist-item"><a href="#/careers">Careers</a></li>
                <li className="footer-navlist-item"><a href="#/announcements">Announcements</a></li>
                <li className="footer-navlist-item"><a href="#/news">News</a></li>
                <li className="footer-navlist-item"><a href="#/press">Press</a></li>
                <li className="footer-navlist-item"><a href="#/legal">Legal</a></li>
                <li className="footer-navlist-item"><a href="#/terms">Terms</a></li>
                <li className="footer-navlist-item"><a href="#/privacy">Privacy</a></li>
                <li className="footer-navlist-item"><a href="#/building-trust">Building Trust</a></li>
              </ul>
            </div>

            {/* Column 3: Products */}
            <div className="footer-navlist-group">
              <h3 className="footer-navlist-title">Products</h3>
              <ul className="footer-navlist-item-list">
                <li className="footer-navlist-item"><a href="#/spot">Exchange</a></li>
                <li className="footer-navlist-item"><a href="#/earn">Binance Earn</a></li>
                <li className="footer-navlist-item"><a href="#/buy-crypto">Buy Crypto</a></li>
                <li className="footer-navlist-item"><a href="#/pay">Pay</a></li>
                <li className="footer-navlist-item"><a href="#/academy">Academy</a></li>
                <li className="footer-navlist-item"><a href="#/gift-card">Gift Card</a></li>
                <li className="footer-navlist-item"><a href="#/earn">Launchpool &amp; Staking</a></li>
                <li className="footer-navlist-item"><a href="#/earn">Auto-Invest</a></li>
                <li className="footer-navlist-item"><a href="#/research">Research</a></li>
              </ul>
            </div>

            {/* Column 4: Business */}
            <div className="footer-navlist-group">
              <h3 className="footer-navlist-title">Business</h3>
              <ul className="footer-navlist-item-list">
                <li className="footer-navlist-item"><a href="#/p2p">P2P Merchant Application</a></li>
                <li className="footer-navlist-item"><a href="#/listing">Listing Application</a></li>
                <li className="footer-navlist-item"><a href="#/vip">Institutional &amp; VIP Services</a></li>
                <li className="footer-navlist-item"><a href="#/labs">Labs</a></li>
                <li className="footer-navlist-item"><a href="#/onchain-pay">Onchain Pay</a></li>
              </ul>
            </div>

            {/* Column 5: Learn */}
            <div className="footer-navlist-group">
              <h3 className="footer-navlist-title">Learn</h3>
              <ul className="footer-navlist-item-list">
                <li className="footer-navlist-item"><a href="#/learn-earn">Learn &amp; Earn</a></li>
                <li className="footer-navlist-item"><a href="#/markets">Browse Crypto Prices</a></li>
                <li className="footer-navlist-item"><a href="#/price/bitcoin">Bitcoin Price</a></li>
                <li className="footer-navlist-item"><a href="#/price/ethereum">Ethereum Price</a></li>
                <li className="footer-navlist-item"><a href="#/how-to-buy/bitcoin">Buy Bitcoin</a></li>
                <li className="footer-navlist-item"><a href="#/how-to-buy/bnb">Buy BNB</a></li>
              </ul>
            </div>

            {/* Column 6: Service & Support */}
            <div className="footer-navlist-group">
              <h3 className="footer-navlist-title">Service &amp; Support</h3>
              <ul className="footer-navlist-item-list">
                <li className="footer-navlist-item"><a href="#/chat">24/7 Chat Support</a></li>
                <li className="footer-navlist-item"><a href="#/support">Support Center</a></li>
                <li className="footer-navlist-item"><a href="#/feedback">Product Feedback</a></li>
                <li className="footer-navlist-item"><a href="#/fees">Fees</a></li>
                <li className="footer-navlist-item"><a href="#/api">APIs</a></li>
                <li className="footer-navlist-item"><a href="#/verify">Official Verification</a></li>
                <li className="footer-navlist-item"><a href="#/proof-of-reserves">Proof of Reserves</a></li>
              </ul>
            </div>
          </div>

          {/* Legal / FSRA Disclaimer & Copyright */}
          <div className="footer-copyright" style={{ borderTop: '1px solid #202630', paddingTop: '24px', fontSize: '12px', color: '#707A8A', lineHeight: '1.7' }}>
            <div className="footer-copyright-legal" style={{ marginBottom: '14px' }}>
              <div>
                <strong>Risk Warning:</strong> Virtual asset prices can be volatile. The value of your investment may go down or up and you may not get back the amount invested. You are solely responsible for your investment decisions and Syncnode is not liable for any trading losses you may incur.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>Syncnode © 2026. All rights reserved.</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span>Cookie Preferences</span>
                <span>Terms of Service</span>
                <span>Privacy Notice</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
