# Syncnode: Enterprise Cryptocurrency Exchange Platform

Syncnode is an institutional centralized digital asset exchange (CEX) designed with financial accounting integrity, deterministic trade execution, zero-trust security, and horizontal scalability.

---

## Key Features

1. **Double-Entry Financial Accounting Ledger**
   - Strictly balanced debit/credit transactions: $\sum \text{Debits} = \sum \text{Credits}$ per asset on every operation.
   - Zero floating-point arithmetic using `bignumber.js` and integer base unit scaling.
   - Distinct balance categories: `Available`, `Locked` (in open orders), `Pending Withdrawal`, and `P2P Escrow`.
   - Real-time **Proof of Reserves** mathematical auditor ensuring $\text{Vault Reserves} \ge \text{Customer Liabilities}$.

2. **Deterministic Price-Time Priority Matching Engine**
   - High-throughput in-memory Limit Order Book (LOB) with FIFO queues per price level.
   - Supported order types: `LIMIT`, `MARKET`, `STOP_LIMIT`, `POST_ONLY`, `IOC`, `FOK`.
   - Self-Trade Prevention (STP): `CANCEL_MAKER`, `CANCEL_TAKER`, `CANCEL_BOTH`.
   - Asset-specific precision scaling (e.g. BTC 8 decimals, USDT 6 decimals).

3. **Pre-Trade Risk Engine & Emergency Circuit Breakers**
   - Pre-trade price collar/bands ($\pm 10\%$ protection from mark price to prevent fat-finger orders).
   - Order placement rate limiting (max 30 orders / 5s) and wash-trading detection.
   - Emergency Circuit Breakers: Global Trading Halt Kill Switch, Per-Market Halt toggles, and Withdrawal pause controls.

4. **Multi-Chain Wallet & Custody Infrastructure**
   - Segregated Hot / Cold storage architecture.
   - Multi-chain adapters for Bitcoin (SegWit `bc1q...`), Ethereum/EVM (`0x...`), Solana, and Polygon.
   - Deposit confirmation tracking with re-org resilience.
   - Multi-step withdrawal pipeline with 2FA TOTP verification, risk scoring, automated broadcast, and ledger finalization.

5. **P2P Escrow Marketplace**
   - Cryptographic escrow state machine: `CREATED` $\to$ `ESCROW_LOCKED` $\to$ `FIAT_MARKED_PAID` $\to$ `ESCROW_RELEASED` (or `DISPUTED`).
   - Live merchant advertisements with instant fiat-crypto trade support.

6. **API Gateway & WebSocket Streaming Hub**
   - REST API endpoints for Auth, KYC, Orders, Trades, Balances, Wallet, P2P, and Admin operations.
   - Low-latency WebSocket feeds streaming `depth@<symbol>`, `trades@<symbol>`, and `ticker@<symbol>`.

7. **Institutional Web Trading Terminal & Admin Portal**
   - Dark-mode trading interface with real-time Canvas candlestick charts, live order book ladders with visual depth bars, rapid order entry forms, and recent trade feeds.
   - Integrated Asset Custody Manager, P2P Marketplace, 2FA Security Center, and Institutional Admin Console.

---

## Directory Structure

```text
syncnode/
├── apps/
│   └── web/                     # High-performance React/Vite Trading Terminal & Admin UI
├── services/
│   ├── api-gateway/             # REST & WebSocket Gateway server
│   ├── matching-engine/         # Price-Time priority in-memory LOB
│   ├── ledger/                  # Double-entry financial journal & balance reservation
│   ├── trading/                 # Order Management System (OMS)
│   ├── market-data/             # L2/L3 depth, OHLCV candles, 24h ticker metrics
│   ├── risk/                    # Pre-trade risk checks & circuit breakers
│   ├── wallet/                  # Hot/Cold wallet infrastructure
│   ├── blockchain/              # Multi-chain adapters (BTC, ETH, SOL, Polygon)
│   ├── compliance/              # KYC verification tiers & AML screening
│   └── p2p/                     # P2P marketplace & escrow state machine
├── packages/
│   ├── common/                  # Decimal math, types, errors, logger
│   ├── security/                # PBKDF2/Argon2, TOTP (RFC 6238), HMAC, AES-256
│   └── database/                # Relational store, outbox, audit logs
├── tests/
│   ├── financial-invariants/    # Mathematical debits = credits tests
│   ├── matching-engine/         # Deterministic ordering & STP tests
│   └── e2e/                     # End-to-end full exchange lifecycle test
├── docs/                        # Architecture, API Specification & Runbooks
├── infrastructure/              # Dockerfiles & docker-compose.yml
└── package.json
```

---

## Running the Platform

### Running Automated Test Suites
```bash
npx tsx --test tests/financial-invariants/ledger-invariants.test.ts tests/matching-engine/matching-engine.test.ts tests/e2e/exchange-flow.test.ts
```

### Local Development
```bash
# Terminal 1: API Gateway & WebSocket Server (Port 4000)
npm run dev:server

# Terminal 2: Web Trading Terminal (Port 3000)
npm run dev:web
```

### Docker Compose
```bash
docker-compose up -d --build
```
# syncode
