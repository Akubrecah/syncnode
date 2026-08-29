import React, { useEffect, useRef, memo } from 'react';

interface TradingViewTickerTapeProps {
  theme?: 'dark' | 'light';
  showSymbolLogo?: boolean;
  isTransparent?: boolean;
  displayMode?: 'adaptive' | 'regular' | 'compact';
}

export const TradingViewTickerTape: React.FC<TradingViewTickerTapeProps> = memo(({
  theme = 'dark',
  showSymbolLogo = true,
  isTransparent = false,
  displayMode = 'adaptive'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BINANCE:BTCUSDT', title: 'Bitcoin' },
        { proName: 'BINANCE:ETHUSDT', title: 'Ethereum' },
        { proName: 'BINANCE:SOLUSDT', title: 'Solana' },
        { proName: 'BINANCE:BNBUSDT', title: 'BNB' },
        { proName: 'BINANCE:XRPUSDT', title: 'XRP' },
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
        { proName: 'BINANCE:DOGEUSDT', title: 'Dogecoin' }
      ],
      showSymbolLogo: showSymbolLogo,
      isTransparent: isTransparent,
      displayMode: displayMode,
      colorTheme: theme,
      locale: 'en',
      largeChartUrl: '#'
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [theme, showSymbolLogo, isTransparent, displayMode]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '46px',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
      onClick={() => {
        window.location.hash = '#/spot';
      }}
    >
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ width: '100%', height: '46px', pointerEvents: 'none' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          background: 'transparent'
        }}
        title="Open Live Spot Exchange on CryptoBridge"
      />
    </div>
  );
});

TradingViewTickerTape.displayName = 'TradingViewTickerTape';
