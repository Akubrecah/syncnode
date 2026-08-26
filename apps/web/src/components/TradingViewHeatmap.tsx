import React, { useEffect, useRef, memo } from 'react';

interface TradingViewHeatmapProps {
  theme?: 'dark' | 'light';
  dataSource?: 'SPX500' | 'NASDAQ100' | 'Crypto' | 'All';
  height?: number | string;
  width?: number | string;
}

export const TradingViewHeatmap: React.FC<TradingViewHeatmapProps> = memo(({
  theme = 'dark',
  dataSource = 'SPX500',
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: dataSource,
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'en',
      symbolUrl: '#',
      colorTheme: theme,
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      largeChartUrl: '#',
      width: width,
      height: height
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [theme, dataSource, height, width]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%', minHeight: '380px', position: 'relative' }}
    />
  );
});

TradingViewHeatmap.displayName = 'TradingViewHeatmap';
