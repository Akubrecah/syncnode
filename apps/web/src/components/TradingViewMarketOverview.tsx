import React, { useEffect, useRef, memo } from 'react';

interface TradingViewMarketOverviewProps {
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
  showChart?: boolean;
}

export const TradingViewMarketOverview: React.FC<TradingViewMarketOverviewProps> = memo(({
  theme = 'dark',
  height = 550,
  width = '100%',
  showChart = true
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      colorTheme: theme,
      dateRange: '12M',
      showChart: showChart,
      locale: 'en',
      width: width,
      height: height,
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      plotLineColorGrowing: 'rgba(14, 203, 129, 1)',
      plotLineColorFalling: 'rgba(246, 70, 93, 1)',
      gridLineColor: 'rgba(43, 49, 58, 0.4)',
      scaleFontColor: 'rgba(132, 142, 156, 1)',
      belowLineFillColorGrowing: 'rgba(14, 203, 129, 0.12)',
      belowLineFillColorFalling: 'rgba(246, 70, 93, 0.12)',
      symbolActiveColor: 'rgba(252, 213, 53, 0.15)',
      tabs: [
        {
          title: 'Crypto Top',
          symbols: [
            { s: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
            { s: 'BINANCE:ETHUSDT', d: 'Ethereum' },
            { s: 'BINANCE:SOLUSDT', d: 'Solana' },
            { s: 'BINANCE:BNBUSDT', d: 'BNB' },
            { s: 'BINANCE:XRPUSDT', d: 'Ripple' },
            { s: 'BINANCE:DOGEUSDT', d: 'Dogecoin' }
          ]
        },
        {
          title: 'Indices',
          symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' },
            { s: 'FOREXCOM:DJI', d: 'Dow 30' },
            { s: 'INDEX:NKY', d: 'Nikkei 225' }
          ]
        },
        {
          title: 'DeFi & Altcoins',
          symbols: [
            { s: 'BINANCE:UNIUSDT', d: 'Uniswap' },
            { s: 'BINANCE:AAVEUSDT', d: 'Aave' },
            { s: 'BINANCE:LINKUSDT', d: 'Chainlink' },
            { s: 'BINANCE:AVAXUSDT', d: 'Avalanche' },
            { s: 'BINANCE:NEARUSDT', d: 'NEAR' }
          ]
        }
      ]
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [theme, height, width, showChart]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
});

TradingViewMarketOverview.displayName = 'TradingViewMarketOverview';
