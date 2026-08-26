import React, { useEffect, useRef, memo } from 'react';
import { resolveTradingViewSymbol } from './TradingViewWidget';

interface TradingViewSymbolProfileProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
}

export const TradingViewSymbolProfile: React.FC<TradingViewSymbolProfileProps> = memo(({
  symbol = 'AAPL',
  theme = 'dark',
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js';
    script.type = 'text/javascript';
    script.async = true;

    const tvSymbol = resolveTradingViewSymbol(symbol);

    script.innerHTML = JSON.stringify({
      width: width,
      height: height,
      colorTheme: theme,
      isTransparent: false,
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

TradingViewSymbolProfile.displayName = 'TradingViewSymbolProfile';
