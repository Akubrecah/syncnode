# Syncnode Exchange - Functionality Repair & Production Hardening Log

## Overview
This document logs every identified issue, edge case, and broken/missing interaction repaired across the Syncnode institutional cryptocurrency exchange codebase.

---

## 1. Frontend Audit & Repairs

| Component | Issue Identified | Resolution & Hardening | Status |
| :--- | :--- | :--- | :--- |
| **`WalletView.tsx`** | Test faucet button was calling `/api/v1/orders` mock with empty payload instead of dedicated testnet deposit. | Added dedicated `/api/v1/wallet/faucet` endpoint on API Gateway; connected `handleTestDepositFaucet` with dynamic asset parameters, loading state, and inline success/error banners. | **RESOLVED** |
| **`WalletView.tsx`** | Empty `catch(e) {}` blocks swallowed deposit address generation errors and failed withdrawal feedback. | Added explicit `statusMsg` state handling with visual green/red toast badges, input validation, and disabled state during async submission. | **RESOLVED** |
| **`P2PView.tsx`** | Users could not view their historical P2P escrow trades or cancel pending trades before fiat transfer. | Implemented `myTrades` list, polled every 2s, with `GET /api/v1/p2p/trades/my`, `POST /api/v1/p2p/trades/:id/cancel`, and explicit state badges. | **RESOLVED** |
| **`P2PView.tsx`** | No interactive UI existed for users/merchants to post new P2P advertisements. | Built complete "Post P2P Advertisement" modal with asset selector, unit pricing, fiat min/max bounds, payment method tagging, and API gateway persistence. | **RESOLVED** |
| **`HomeView.tsx`** | Market table tabs (Hot, Gainers, New, Volume) were static and did not filter/sort list. | Implemented dynamic sorting and filtering (`getFilteredMarketData()`) across 24h change %, volume, and listing dates. | **RESOLVED** |
| **`UserOrdersTable.tsx`** | Missing quick action to cancel all active open orders in the current market. | Added "Cancel All" button wired to backend `POST /api/v1/orders/cancel-all`, with instant depth broadcasting and state refresh. | **RESOLVED** |
| **`OrderEntryForm.tsx`** | Unauthenticated clicks attempted order placement without clear prompt. | Added check redirecting unauthenticated users to the AuthModal, plus disabled button states and price/quantity percentage calculation triggers (25%, 50%, 75%, 100%). | **RESOLVED** |
| **`AdminView.tsx`** | Circuit breaker toggle and KYC review actions lacked unified refresh pipeline. | Wired automatic multi-data fetch (`fetchAdminData`) after every state mutation (kill-switches, market halts, KYC review). | **RESOLVED** |
| **`App.tsx` & All Pages** | Browser page refresh always reset user to Homepage and BTC/USDT pair. | Implemented bidirectional URL Hash (`#/trade/ETH-USDT`, `#/wallet`, `#/p2p`, `#/security`, `#/admin`) and `localStorage` state persistence. All pages, active trading pairs, and chart intervals now remain 100% consistent across page reloads and browser back/forward history. | **RESOLVED** |

---

## 2. Backend & API Gateway Repairs

| Service / Endpoint | Issue Identified | Resolution & Hardening | Status |
| :--- | :--- | :--- | :--- |
| **`POST /api/v1/wallet/faucet`** | Missing developer/testnet faucet trigger. | Added endpoint with asset routing (BTC, ETH, SOL, USDT, USDC), deposit event processing, and multi-confirmation ledger crediting. | **RESOLVED** |
| **`GET /api/v1/p2p/trades/my`** | No route to list a user's active and completed P2P trades. | Added method `getTradesByUser` in `P2PService` and exposed route with JWT auth verification. | **RESOLVED** |
| **`POST /api/v1/p2p/ads`** | Missing ad creation endpoint. | Added authenticated ad creation with merchant name extraction, capacity allocation, and limits validation. | **RESOLVED** |
| **`POST /api/v1/p2p/trades/:id/cancel`** | Inability to unlock and cancel unfulfilled P2P escrows. | Added escrow cancellation state transition in `P2PService` with atomic double-entry balance refund to seller and ad capacity restoration. | **RESOLVED** |
| **`POST /api/v1/orders/cancel-all`** | Missing mass cancellation capability. | Added `cancelAllOrders` in `OrderManagementService` to cancel all open orders for a user and trigger WebSocket depth update. | **RESOLVED** |

---

## 3. Production Hardening Verification

1. **TypeScript Compilations**:
   - `tsc --noEmit` on root and `@syncnode/web` passed with **0 errors**.
2. **Vite Production Build**:
   - Bundle produced in `apps/web/dist` (243 kB JS, 19.5 kB CSS, 0 errors).
3. **Automated Test Matrix**:
   - 8/8 tests passing (Financial Invariants, Matching Engine, End-to-End Exchange Lifecycle).
