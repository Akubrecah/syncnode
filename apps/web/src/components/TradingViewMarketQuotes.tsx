import React, { useEffect, useRef, memo } from 'react';

interface TradingViewMarketQuotesProps {
  category?: 'stocks' | 'crypto' | 'forex' | 'indices' | 'all';
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
}

export const TradingViewMarketQuotes: React.FC<TradingViewMarketQuotesProps> = memo(({
  category = 'stocks',
  theme = 'dark',
  height = '100%',
  width = '100%'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
    script.type = 'text/javascript';
    script.async = true;

    const symbolsGroups = [
      {
        name: 'Top Global Stocks',
        originalTitle: 'Stocks',
        symbols: [
          { name: 'NASDAQ:NVDA', displayName: 'NVIDIA' },
          { name: 'NASDAQ:AAPL', displayName: 'Apple' },
          { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
          { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
          { name: 'NASDAQ:GOOGL', displayName: 'Alphabet' },
          { name: 'NASDAQ:META', displayName: 'Meta' },
          { name: 'NASDAQ:TSLA', displayName: 'Tesla' },
          { name: 'NASDAQ:NFLX', displayName: 'Netflix' },
          { name: 'NYSE:PLTR', displayName: 'Palantir' },
          { name: 'NYSE:BRK.B', displayName: 'Berkshire' }
        ]
      },
      {
        name: 'Cryptocurrencies',
        originalTitle: 'Crypto',
        symbols: [
          { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' },
          { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
          { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
          { name: 'BINANCE:BNBUSDT', displayName: 'BNB' },
          { name: 'BINANCE:XRPUSDT', displayName: 'Ripple' },
          { name: 'BINANCE:DOGEUSDT', displayName: 'Dogecoin' },
          { name: 'BINANCE:ADAUSDT', displayName: 'Cardano' },
          { name: 'BINANCE:AVAXUSDT', displayName: 'Avalanche' },
          { name: 'BINANCE:SUIUSDT', displayName: 'Sui' },
          { name: 'BINANCE:NEARUSDT', displayName: 'NEAR' }
        ]
      },
      {
        name: 'Major Currencies (Forex)',
        originalTitle: 'Forex',
        symbols: [
          { name: 'FX:EURUSD', displayName: 'EUR / USD' },
          { name: 'FX:GBPUSD', displayName: 'GBP / USD' },
          { name: 'FX:USDJPY', displayName: 'USD / JPY' },
          { name: 'FX:USDCHF', displayName: 'USD / CHF' },
          { name: 'FX:AUDUSD', displayName: 'AUD / USD' },
          { name: 'FX:USDCAD', displayName: 'USD / CAD' },
          { name: 'FX:USDINR', displayName: 'USD / INR' },
          { name: 'FX:USDBRL', displayName: 'USD / BRL' }
        ]
      },
      {
        name: 'World Indices',
        originalTitle: 'Indices',
        symbols: [
          { name: 'FOREXCOM:SPXUSD', displayName: 'S&P 500' },
          { name: 'FOREXCOM:NSXUSD', displayName: 'Nasdaq 100' },
          { name: 'FOREXCOM:DJI', displayName: 'Dow Jones 30' },
          { name: 'INDEX:NKY', displayName: 'Nikkei 225' },
          { name: 'INDEX:FTSE', displayName: 'FTSE 100' }
        ]
      }
    ];

    script.innerHTML = JSON.stringify({
      width: width,
      height: height,
      symbolsGroups: symbolsGroups,
      showSymbolLogo: true,
      isTransparent: false,
      colorTheme: theme,
      locale: 'en'
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [category, theme, height, width]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, minHeight: '340px' }}
    />
  );
});

TradingViewMarketQuotes.displayName = 'TradingViewMarketQuotes';
