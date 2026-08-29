import React, { useState, useEffect, useRef } from 'react';
import { TradingViewWidget } from './TradingViewWidget';
import { BarChart2, Activity } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ symbol }) => {
  const [chartEngine, setChartEngine] = useState<'tradingview' | 'canvas'>('tradingview');
  const [interval, setIntervalState] = useState(() => localStorage.getItem('syncnode_chart_interval') || '15m');
  const [candles, setCandles] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setInterval = (newItv: string) => {
    setIntervalState(newItv);
    localStorage.setItem('syncnode_chart_interval', newItv);
  };

  const fetchCandles = async () => {
    if (chartEngine !== 'canvas') return;
    try {
      const res = await fetch(`/api/v1/markets/${encodeURIComponent(symbol)}/candles?interval=${interval}&limit=80`);
      const json = await res.json();
      if (json.success) {
        setCandles(json.candles);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (chartEngine === 'canvas') {
      fetchCandles();
      const timer = setIntervalHook(fetchCandles, 2000);
      return () => clearInterval(timer);
    }
  }, [symbol, interval, chartEngine]);

  function setIntervalHook(fn: () => void, ms: number) {
    return window.setInterval(fn, ms);
  }

  // Draw High-Performance Canvas Candlestick Chart
  useEffect(() => {
    if (chartEngine !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, width, height);

    // Calculate min/max price
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    for (const c of candles) {
      const high = parseFloat(c.high);
      const low = parseFloat(c.low);
      const vol = parseFloat(c.volume);
      if (high > maxPrice) maxPrice = high;
      if (low < minPrice) minPrice = low;
      if (vol > maxVolume) maxVolume = vol;
    }

    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.08;
    const effectiveMin = minPrice - padding;
    const effectiveMax = maxPrice + padding;
    const effectiveRange = effectiveMax - effectiveMin;

    const chartHeight = height * 0.78;
    const volHeight = height * 0.18;
    const volBaseY = height - 10;

    const numCandles = candles.length;
    const candleWidth = Math.max(2, (width - 60) / numCandles - 3);

    // Draw Price Grid lines
    ctx.strokeStyle = '#1d222e';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();

      const priceLevel = effectiveMax - (effectiveRange / 5) * i;
      ctx.fillStyle = '#576075';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`$${priceLevel.toFixed(2)}`, width - 55, y + 3);
    }

    // Draw Candles & Volume Bars
    candles.forEach((c, idx) => {
      const x = idx * (candleWidth + 3) + 15;
      const open = parseFloat(c.open);
      const close = parseFloat(c.close);
      const high = parseFloat(c.high);
      const low = parseFloat(c.low);
      const vol = parseFloat(c.volume);

      const isBullish = close >= open;
      const color = isBullish ? '#00e599' : '#ff3b69';

      const openY = chartHeight - ((open - effectiveMin) / effectiveRange) * chartHeight;
      const closeY = chartHeight - ((close - effectiveMin) / effectiveRange) * chartHeight;
      const highY = chartHeight - ((high - effectiveMin) / effectiveRange) * chartHeight;
      const lowY = chartHeight - ((low - effectiveMin) / effectiveRange) * chartHeight;

      // Draw Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw Body
      ctx.fillStyle = color;
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(x, bodyY, candleWidth, bodyH);

      // Draw Volume Bar at bottom
      const barH = maxVolume ? (vol / maxVolume) * volHeight : 0;
      ctx.fillStyle = isBullish ? 'rgba(0, 229, 153, 0.25)' : 'rgba(255, 59, 105, 0.25)';
      ctx.fillRect(x, volBaseY - barH, candleWidth, barH);
    });
  }, [candles, chartEngine]);

  return (
    <div className="trading-chart-panel" style={{ width: '100%', height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', background: '#12141a' }}>
      <div className="trading-chart-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#181a20',
        borderBottom: '1px solid #2b313a',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Chart Engine Switcher */}
          <div style={{ display: 'flex', background: '#202630', padding: '2px', borderRadius: '6px', border: '1px solid #2b313a' }}>
            <button
              onClick={() => setChartEngine('tradingview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: chartEngine === 'tradingview' ? '#fcd535' : 'transparent',
                color: chartEngine === 'tradingview' ? '#181a20' : '#848e9c',
                whiteSpace: 'nowrap'
              }}
            >
              <Activity size={12} />
              <span>TradingView</span>
            </button>
            <button
              onClick={() => setChartEngine('canvas')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: chartEngine === 'canvas' ? '#fcd535' : 'transparent',
                color: chartEngine === 'canvas' ? '#181a20' : '#848e9c',
                whiteSpace: 'nowrap'
              }}
            >
              <BarChart2 size={12} />
              <span>L2 Depth</span>
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((itv) => (
              <button
                key={itv}
                onClick={() => setInterval(itv)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: interval === itv ? '#2b313a' : 'transparent',
                  color: interval === itv ? '#fcd535' : '#848e9c'
                }}
              >
                {itv}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#848e9c' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00e599', display: 'inline-block', boxShadow: '0 0 6px #00e599' }}></span>
          <span className="desktop-only">{chartEngine === 'tradingview' ? 'Live TradingView Feed' : 'Deterministic L2 Depth'}</span>
          <span style={{ fontSize: '10px', color: '#00e599', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      <div className="trading-chart-viewport" style={{ flex: 1, width: '100%', minHeight: '440px', position: 'relative', overflow: 'hidden' }}>
        {chartEngine === 'tradingview' ? (
          <TradingViewWidget symbol={symbol} interval={interval} />
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}
      </div>
    </div>
  );
};
