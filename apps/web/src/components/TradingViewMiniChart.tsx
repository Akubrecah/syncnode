import React, { useEffect, useRef, memo } from 'react';
import { resolveTradingViewSymbol } from './TradingViewWidget';

interface TradingViewMiniChartProps {
  symbol: string;
  theme?: 'dark' | 'light';
  width?: number | string;
  height?: number | string;
  dateRange?: '1D' | '1M' | '3M' | '12M' | 'ALL';
  isTransparent?: boolean;
  chartOnly?: boolean;
  noTimeScale?: boolean;
  onClick?: () => void;
  disableExternalLink?: boolean;
}

export const TradingViewMiniChart: React.FC<TradingViewMiniChartProps> = memo(({
  symbol,
  theme = 'dark',
  width = '100%',
  height = 220,
  dateRange = '1D',
  isTransparent = false,
  chartOnly = false,
  noTimeScale = false,
  onClick,
  disableExternalLink = true
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    const tvSymbol = resolveTradingViewSymbol(symbol);

    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: width,
      height: height,
      locale: 'en',
      dateRange: dateRange,
      colorTheme: theme,
      isTransparent: isTransparent,
      autosize: true,
      largeChartUrl: '#',
      chartOnly: chartOnly,
      noTimeScale: noTimeScale
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, theme, width, height, dateRange, isTransparent, chartOnly, noTimeScale]);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
      return;
    }
    if (disableExternalLink) {
      e.stopPropagation();
      const clean = symbol.toUpperCase().replace('/', '').replace('-', '');
      const isCrypto = clean.endsWith('USDT') || clean.endsWith('USD') || ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'SUI', 'NEAR'].includes(clean);
      if (isCrypto) {
        window.location.hash = `#/spot`;
      } else {
        window.location.hash = `#/stock/${clean}`;
      }
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: chartOnly ? '60px' : (typeof height === 'number' ? `${height}px` : '200px'),
        overflow: 'hidden'
      }}
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: disableExternalLink || onClick ? 'none' : 'auto'
        }}
      />
      {(disableExternalLink || onClick) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            cursor: 'pointer',
            background: 'transparent'
          }}
          title={`View ${symbol} on Syncnode`}
        />
      )}
    </div>
  );
});

TradingViewMiniChart.displayName = 'TradingViewMiniChart';
