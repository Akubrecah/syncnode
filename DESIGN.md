---
version: 1.0.0
name: CryptoBridge Institutional Design System
description: Ultra-clean, high-density, authentic institutional digital asset exchange interface. Anti-slop, zero faux-3D gimmickry, crisp typography, and strict matte surface hierarchies.
colors:
  background: "#0b0e11"
  surface-primary: "#181a20"
  surface-secondary: "#202630"
  surface-elevated: "#29313d"
  border-subtle: "#23272e"
  border-default: "#2b313a"
  border-strong: "#434c5a"
  text-primary: "#eaecef"
  text-secondary: "#848e9c"
  text-muted: "#5e6673"
  brand-yellow: "#fcd535"
  brand-yellow-hover: "#f0b90b"
  brand-yellow-subtle: "rgba(252, 213, 53, 0.1)"
  buy-green: "#0ecb81"
  buy-green-subtle: "rgba(14, 203, 129, 0.12)"
  sell-red: "#f6465d"
  sell-red-subtle: "rgba(246, 70, 93, 0.12)"
typography:
  font-sans: "BinanceNova, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  font-mono: "'JetBrains Mono', monospace"
  scale:
    h1: "32px"
    h2: "24px"
    h3: "18px"
    body: "14px"
    body-sm: "12px"
    caption: "11px"
spacing:
  unit: 4px
  container-max: "1440px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
---

# CryptoBridge Design System

## Overview
CryptoBridge is built on the design principles of tier-1 institutional financial exchanges (Binance, Kraken Pro, Coinbase Institutional). The interface prioritizes raw data clarity, microsecond interaction responsiveness, tactile feedback, and crisp structural borders over ornamental gimmicks.

## Core Anti-Slop Principles
1. **Zero Faux-3D Renders or Isometric Blobs**: No cartoonish 3D floating icons, glass spheres, or AI-generated stock illustrations. All visual metaphors use standard financial glyphs, geometric SVG vectors, and real TradingView market charts.
2. **Matte Surfaces, No Neon Mesh Blurs**: Avoid giant colorful background blur spheres and radioactive drop-shadows. Use subtle, purposeful matte layers (`#0b0e11` base, `#181a20` container, `#202630` card, `#2b313a` border).
3. **High Information Density**: Present real market data, order books, execution logs, and account balances in compact, scannable tabular grids with monospace alignment.
4. **Authentic FinTech Typography**: Primary content in clean sans-serif; all prices, quantities, hashes, and percentages strictly formatted with tabular monospace fonts.

## Do's and Don'ts
- **DO**: Use clear 1px borders, subtle hover transitions (0.15s), and semantic color cues (Green = Buy/Profit, Red = Sell/Loss, Gold = Brand/VIP).
- **DO**: Format every financial figure with appropriate decimal precision (e.g. `$96,450.00`, `0.0450 BTC`).
- **DON'T**: Add fake floating 3D coins, AI marketing buzzword counters, or rainbow gradient text.
- **DON'T**: Use decorative animations that delay user actions or block interface interactions.
