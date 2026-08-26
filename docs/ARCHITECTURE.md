# Syncnode Enterprise Cryptocurrency Exchange Architecture

## 1. System Overview
Syncnode is a modular, high-throughput centralized digital asset exchange (CEX) designed for institutional-grade reliability, zero-floating-point financial calculations, deterministic matching, and strict double-entry ledger settlement.

---

## 2. Core Architectural Pillars

### 2.1 Double-Entry Financial Accounting
Every financial balance mutation (deposits, order locks, trade fills, refunds, fees, and withdrawals) is recorded as immutable, append-only journal entries.
- **Mathematical Invariant**:
  $$\sum \text{Debits} = \sum \text{Credits} \quad (\forall \text{ Assets})$$
- **Balance Separation**: Available, Locked, Pending Withdrawal, P2P Escrow.
- **Solvency**: Real-time Proof of Reserves auditing guarantees that total on-chain vault reserves match or exceed customer liabilities.

### 2.2 In-Memory Price-Time Deterministic Matching Engine
- **Priority Queue**: Price-Time (FIFO) priority queue per price level.
- **Order Types**: `LIMIT`, `MARKET`, `STOP_LIMIT`, `POST_ONLY`, `IOC`, `FOK`.
- **Self-Trade Prevention (STP)**: `CANCEL_MAKER`, `CANCEL_TAKER`, `CANCEL_BOTH`.
- **Replayability**: Monotonic sequence numbering enables exact deterministic state reconstruction.

### 2.3 Pre-Trade & Post-Trade Risk Engine
- Real-time pre-trade validation:
  - Account status & KYC limits
  - Price collar / price band protection ($\pm 10\%$ from mark price)
  - Min/Max notional validation
  - Velocity rate-limiting (max 30 orders / 5s)
- Emergency Circuit Breakers:
  - Global Trading Halt
  - Per-Market Trading Halt
  - Withdrawal & Deposit pauses

### 2.4 Multi-Chain Wallet & Custody
- Multi-chain adapters for Bitcoin (UTXO/SegWit), Ethereum/EVM (ERC-20), Solana, and Polygon.
- Hot/Cold storage segregation (95%+ assets in cold storage).
- Deposit confirmation tracking with re-org resistance.
- Multi-step withdrawal pipeline with 2FA TOTP verification and compliance risk scoring.

### 2.5 P2P Escrow Marketplace
- Strict Cryptographic Escrow State Machine:
  `CREATED` $\to$ `ESCROW_LOCKED` $\to$ `FIAT_MARKED_PAID` $\to$ `ESCROW_RELEASED` (or `DISPUTED` $\to$ `ADMIN_RESOLVED`).

---

## 3. Data Flow

```text
[User Order]
    │
    ▼
[API Gateway] ──(Auth & Rate Limit)
    │
    ▼
[Pre-Trade Risk Engine] ──(Price Band, Velocity, Circuit Breakers)
    │
    ▼
[Ledger Reservation] ──(Lock Quote/Base Asset: Debits = Credits)
    │
    ▼
[Matching Engine] ──(Price-Time LOB FIFO Match)
    │
    ├─► [Match Executions] ──► [Ledger Settlement] (Atomic Debits = Credits)
    ├─► [Remaining Limit]  ──► [Order Book Rest]
    └─► [Market Data]      ──► [WebSocket Broadcast (L2 Depth, Ticker, Trades)]
```
