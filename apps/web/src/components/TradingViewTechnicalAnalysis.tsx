import React, { useEffect, useRef, memo } from 'react';
import { resolveTradingViewSymbol } from './TradingViewWidget';

interface TradingViewTechnicalAnalysisProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M';
  height?: number | string;
  width?: number | string;
}

export const TradingViewTechnicalAnalysis: React.FC<TradingViewTechnicalAnalysisProps> = memo(({
  symbol = 'AAPL',
  theme = 'dark',
  interval = '15m',
  height = 360,
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;

    const tvSymbol = resolveTradingViewSymbol(symbol);

    script.innerHTML = JSON.stringify({
      interval: interval,
      width: width,
      isTransparent: false,
      height: height,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'en',
      colorTheme: theme
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, theme, interval, height, width]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
});

TradingViewTechnicalAnalysis.displayName = 'TradingViewTechnicalAnalysis';
