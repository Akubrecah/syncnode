import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval?: string;
  theme?: 'dark' | 'light';
  autosize?: boolean;
  height?: string | number;
  width?: string | number;
  allowSymbolChange?: boolean;
  hideSideToolbar?: boolean;
  withdateranges?: boolean;
  studies?: string[];
  onSymbolChange?: (newSymbol: string) => void;
}

export function resolveTradingViewSymbol(rawSymbol: string): string {
  if (!rawSymbol) return 'BINANCE:BTCUSDT';
  const trimmed = rawSymbol.trim();
  if (trimmed.includes(':')) return trimmed.toUpperCase();

  const upper = trimmed.toUpperCase();
  const clean = upper.replace('/', '').replace('-', '').replace(' ', '');

  // 1. Commodities & Precious Metals
  if (['GOLD', 'XAUUSD', 'XAU', 'SPOTGOLD'].includes(clean)) {
    return 'TVC:GOLD';
  }
  if (['SILVER', 'XAGUSD', 'XAG', 'SPOTSILVER'].includes(clean)) {
    return 'TVC:SILVER';
  }
  if (['OIL', 'CRUDE', 'CRUDEOIL', 'WTI', 'USOIL', 'CL'].includes(clean)) {
    return 'TVC:USOIL';
  }
  if (['BRENT', 'BRENTOIL', 'UKOIL'].includes(clean)) {
    return 'TVC:UKOIL';
  }
  if (['NATGAS', 'NATURALGAS', 'NG'].includes(clean)) {
    return 'NYMEX:NG1!';
  }
  if (['COPPER', 'HG'].includes(clean)) {
    return 'COMEX:HG1!';
  }
  if (['PLATINUM', 'PL'].includes(clean)) {
    return 'NYMEX:PL1!';
  }

  // 2. Forex Currency Pairs
  const forexCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'CNH', 'INR', 'BRL', 'SGD', 'HKD', 'AED', 'SAR', 'ZAR', 'MXN', 'KRW'];
  if (upper.includes('/')) {
    const [base, quote] = upper.split('/');
    if (forexCurrencies.includes(base) && forexCurrencies.includes(quote)) {
      return `FX:${base}${quote}`;
    }
  }
  const knownForex = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
    'USDCNH', 'USDINR', 'USDBRL', 'USDSGD', 'USDAED', 'USDSAR',
    'EURGBP', 'EURJPY', 'GBPJPY', 'NZDUSD', 'USDMXN', 'USDZAR',
    'EURCHF', 'AUDJPY', 'CADJPY', 'CHFJPY', 'EURCAD', 'EURAUD'
  ];
  if (knownForex.includes(clean)) {
    return `FX:${clean}`;
  }

  // 3. Cryptocurrencies
  const knownCryptos = [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'SUI', 'NEAR',
    'LINK', 'TON', 'PEPE', 'WIF', 'ARB', 'OP', 'LTC', 'BCH', 'XLM', 'UNI',
    'ICP', 'FET', 'RENDER', 'SHIB', 'TRX', 'MATIC', 'POL', 'DOT', 'APT', 'S',
    'AAVE', 'INJ', 'ONDO', 'TIA', 'SEI', 'STX', 'FIL', 'ATOM', 'KAS', 'JUP'
  ];
  if (clean === 'BITCOIN') return 'BINANCE:BTCUSDT';
  if (clean === 'ETHEREUM') return 'BINANCE:ETHUSDT';
  if (clean === 'SOLANA') return 'BINANCE:SOLUSDT';
  if (clean === 'RIPPLE') return 'BINANCE:XRPUSDT';
  if (clean === 'DOGECOIN') return 'BINANCE:DOGEUSDT';

  if (knownCryptos.includes(clean)) {
    return `BINANCE:${clean}USDT`;
  }
  for (const c of knownCryptos) {
    if (clean === `${c}USDT` || clean === `${c}USD` || clean === `${c}USDC` || clean === `${c}BTC` || clean === `${c}FDUSD`) {
      return `BINANCE:${clean}`;
    }
  }

  // 4. World Indices & ETFs
  const amexEtfs = ['SPY', 'DIA', 'IWM', 'GLD', 'SLV', 'USO', 'VOO', 'VTI', 'HYG', 'XLE', 'XLF', 'XLK', 'XLV'];
  if (amexEtfs.includes(clean)) {
    return `AMEX:${clean}`;
  }
  const nasdaqEtfs = ['QQQ', 'SMH', 'TLT', 'SOXX', 'ARKK', 'TQQQ', 'SQQQ'];
  if (nasdaqEtfs.includes(clean)) {
    return `NASDAQ:${clean}`;
  }

  // 5. NYSE Stocks & Equities
  const nyseStocks = [
    'PLTR', 'BABA', 'BRK.B', 'BRKB', 'LLY', 'JPM', 'WMT', 'BAC', 'V', 'MA',
    'XOM', 'CVX', 'JNJ', 'PG', 'UNH', 'COST', 'HD', 'DIS', 'NKE', 'SONY',
    'TSM', 'GE', 'KR', 'ORCL', 'CRM', 'IBM', 'UBER', 'PFE', 'KO', 'PEP',
    'ABBV', 'T', 'VZ', 'NVO', 'AZN', 'SHEL', 'SAP', 'TM', 'HMC', 'BBD', 'ITUB',
    'SPOT', 'SHOP', 'SNOW', 'SQ', 'NET', 'RBLX', 'DDOG', 'ZS', 'MDB'
  ];
  if (nyseStocks.includes(clean) || clean === 'BRKB') {
    return `NYSE:${clean === 'BRKB' ? 'BRK.B' : clean}`;
  }

  // 6. Default to NASDAQ for US Equities / Tech Stocks
  return `NASDAQ:${clean}`;
}

function mapInterval(itv?: string): string {
  switch (itv) {
    case '1m': return '1';
    case '5m': return '5';
    case '15m': return '15';
    case '30m': return '30';
    case '1h': return '60';
    case '4h': return '240';
    case '1d': case '1D': return 'D';
    case '1w': case '1W': return 'W';
    case '1M': case 'M': return 'M';
    default: return '15';
  }
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol,
  interval = '15m',
  theme = 'dark',
  autosize = true,
  allowSymbolChange = true,
  hideSideToolbar = false,
  withdateranges = true,
  studies = ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
  onSymbolChange
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    const tvSymbol = resolveTradingViewSymbol(symbol);
    const tvInterval = mapInterval(interval);

    script.innerHTML = JSON.stringify({
      autosize: autosize,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: allowSymbolChange,
      hide_side_toolbar: hideSideToolbar,
      withdateranges: withdateranges,
      save_image: true,
      studies: studies,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#12141a',
      gridColor: 'rgba(43, 49, 58, 0.5)',
      container_id: 'tradingview_advanced_chart'
    });

    container.appendChild(script);

    // Message listener for any iframe-posted symbol updates
    const handleMessage = (e: MessageEvent) => {
      try {
        if (!e.data) return;
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (typeof data === 'object' && data !== null) {
          let rawCandidate: string | null = null;
          
          if (typeof data.symbol === 'string') {
            rawCandidate = data.symbol;
          } else if (typeof data.pro_name === 'string') {
            rawCandidate = data.pro_name;
          } else if (data.data && typeof data.data.symbol === 'string') {
            rawCandidate = data.data.symbol;
          } else if (data.data && typeof data.data.pro_name === 'string') {
            rawCandidate = data.data.pro_name;
          } else if (data.name === 'symbol_change' && typeof data.data === 'string') {
            rawCandidate = data.data;
          }

          if (rawCandidate) {
            const clean = rawCandidate.trim().toUpperCase();
            // Filter out system event names like 'tv-widget-load', 'resize', 'ready', etc.
            const isSystemEvent = /^(TV-|WIDGET|LOAD|RESIZE|HEADER|READY|INIT|UNDEFINED|NULL)/i.test(clean);
            if (!isSystemEvent && clean.length > 0 && clean.length <= 25 && onSymbolChange) {
              const sym = clean.includes(':') ? clean.split(':')[1] : clean;
              if (sym && sym !== symbol.toUpperCase().replace(/^.*:/, '')) {
                onSymbolChange(sym);
              }
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, interval, theme, autosize, allowSymbolChange, hideSideToolbar, withdateranges, onSymbolChange]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '100%', width: '100%', minHeight: '380px', position: 'relative' }}
    />
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
