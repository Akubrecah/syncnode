import React, { useEffect, useRef, memo } from 'react';
import { resolveTradingViewSymbol } from './TradingViewWidget';

interface TradingViewFinancialsProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
}

export const TradingViewFinancials: React.FC<TradingViewFinancialsProps> = memo(({
  symbol = 'AAPL',
  theme = 'dark',
  height = 420,
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js';
    script.type = 'text/javascript';
    script.async = true;

    const tvSymbol = resolveTradingViewSymbol(symbol);

    script.innerHTML = JSON.stringify({
      isTransparent: false,
      largeChartUrl: '',
      displayMode: 'regular',
      width: width,
      height: height,
      colorTheme: theme,
      symbol: tvSymbol,
      locale: 'en'
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, theme, height, width]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
});

TradingViewFinancials.displayName = 'TradingViewFinancials';
