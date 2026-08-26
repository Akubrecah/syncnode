import React, { useEffect, useRef, memo } from 'react';

interface TradingViewSymbolOverviewProps {
  symbols?: string[][];
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
  chartType?: 'area' | 'candlesticks' | 'bars' | 'line';
  scalePosition?: 'right' | 'left' | 'no';
  timeframe?: string;
}

export const TradingViewSymbolOverview: React.FC<TradingViewSymbolOverviewProps> = memo(({
  symbols = [
    ['S&P 500', 'FOREXCOM:SPXUSD|1D'],
    ['Nasdaq 100', 'FOREXCOM:NSXUSD|1D'],
    ['Bitcoin', 'BINANCE:BTCUSDT|1D'],
    ['NVIDIA', 'NASDAQ:NVDA|1D'],
    ['Apple', 'NASDAQ:AAPL|1D'],
    ['EUR/USD', 'FX:EURUSD|1D']
  ],
  theme = 'dark',
  height = '100%',
  width = '100%',
  chartType = 'area',
  scalePosition = 'right',
  timeframe = '1D'
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      symbols: symbols,
      chartOnly: false,
      width: width,
      height: height,
      locale: 'en',
      colorTheme: theme,
      autosize: true,
      largeChartUrl: '#',
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: scalePosition,
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: chartType,
      maLineColor: '#2962FF',
      maLineWidth: 1,
      maLength: 9,
      headerFontSize: 'medium',
      lineWidth: 2,
      lineType: 0,
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      upColor: '#00e599',
      downColor: '#ff3b69',
      borderUpColor: '#00e599',
      borderDownColor: '#ff3b69',
      wickUpColor: '#00e599',
      wickDownColor: '#ff3b69'
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbols, theme, height, width, chartType, scalePosition, timeframe]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, minHeight: '260px' }}
    />
  );
});

TradingViewSymbolOverview.displayName = 'TradingViewSymbolOverview';
