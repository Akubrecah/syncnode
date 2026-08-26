import React, { useEffect, useRef } from 'react';

interface TradingViewCryptoScreenerProps {
  height?: number | string;
  defaultColumn?: 'overview' | 'performance' | 'oscillators' | 'moving_averages';
  screenerType?: 'crypto_mkt' | 'crypto_pairs';
  displayCurrency?: string;
  colorTheme?: 'dark' | 'light';
}

export const TradingViewCryptoScreener: React.FC<TradingViewCryptoScreenerProps> = ({
  height = 700,
  defaultColumn = 'overview',
  screenerType = 'crypto_mkt',
  displayCurrency = 'USD',
  colorTheme = 'dark'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = 'calc(100% - 32px)';
    widgetContainer.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: typeof height === 'number' ? height : 700,
      defaultColumn: defaultColumn,
      screener_type: screenerType,
      displayCurrency: displayCurrency,
      colorTheme: colorTheme,
      locale: 'en',
      isTransparent: true,
      showToolbar: true
    });

    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [height, defaultColumn, screenerType, displayCurrency, colorTheme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
    />
  );
};
