import React, { useEffect, useRef, memo } from 'react';

interface TradingViewTimelineProps {
  theme?: 'dark' | 'light';
  height?: number | string;
  width?: number | string;
  feedMode?: 'all_symbols' | 'market';
}

export const TradingViewTimeline: React.FC<TradingViewTimelineProps> = memo(({
  theme = 'dark',
  height = '100%',
  width = '100%',
  feedMode = 'all_symbols'
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
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.type = 'text/javascript';
    script.async = true;

    script.innerHTML = JSON.stringify({
      feedMode: feedMode,
      isTransparent: false,
      displayMode: 'regular',
      width: width,
      height: height,
      colorTheme: theme,
      locale: 'en'
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [theme, height, width, feedMode]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%', minHeight: '340px' }}
    />
  );
});

TradingViewTimeline.displayName = 'TradingViewTimeline';
