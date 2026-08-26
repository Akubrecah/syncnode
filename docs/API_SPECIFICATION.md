# Syncnode API Specification (v1)

## Base URL
`http://localhost:4000/api/v1`

---

## 1. Authentication & Security
### POST `/auth/register`
Creates a new customer account and deposits initial testing liquidity.
- **Request Body**:
  ```json
  {
    "email": "trader@institution.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201`**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_1740001234",
      "email": "trader@institution.com",
      "kycTier": "TIER_0_UNVERIFIED"
    }
  }
  ```

### POST `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "trader@institution.com",
    "password": "SecurePassword123!",
    "totpCode": "123456"
  }
  ```

### POST `/auth/2fa/setup` & `/auth/2fa/enable`
Generates and activates RFC 6238 TOTP authentication.

---

## 2. Market Data & Public Feeds
### GET `/markets`
Returns all active trading pairs and trading constraints.

### GET `/markets/:symbol/ticker`
Returns rolling 24-hour ticker metrics (High, Low, Volume, Price Change %, Spread).

### GET `/markets/:symbol/depth?limit=20`
Returns L2 order book price levels (Bids and Asks).

### GET `/markets/:symbol/candles?interval=1m&limit=100`
Returns OHLCV candlestick bars.

---

## 3. Order Management System (OMS)
### POST `/orders` (Authenticated)
Submits an order through risk validation, balance reservation, matching engine, and ledger settlement.
- **Request Body**:
  ```json
  {
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "price": "94250.00",
    "quantity": "0.500000",
    "timeInForce": "GTC",
    "selfTradePrevention": "CANCEL_MAKER"
  }
  ```

### GET `/orders` (Authenticated)
Returns user orders with optional `symbol` and `openOnly` filters.

### DELETE `/orders/:id` (Authenticated)
Cancels an open order and unlocks reserved balances back to available funds.

---

## 4. Wallet & Custody
### GET `/balances` (Authenticated)
Returns multi-asset account balances (Available, Locked, Pending Withdrawal, P2P Escrow, Total).

### GET `/wallet/deposit-address?asset=BTC` (Authenticated)
Returns deterministic custody deposit address.

### POST `/wallet/withdraw` (Authenticated)
Requests a withdrawal with 2FA TOTP verification and automated/manual risk scoring.

---

## 5. P2P Marketplace & Escrow
### GET `/p2p/ads`
### POST `/p2p/trades` (Initiate escrow)
### POST `/p2p/trades/:id/mark-paid` (Buyer confirmation)
### POST `/p2p/trades/:id/release` (Seller crypto escrow release)
### POST `/p2p/trades/:id/dispute` (Dispute mediation)

---

## 6. Admin & Operations
### POST `/admin/circuit-breakers/global-halt`
### POST `/admin/circuit-breakers/market-halt`
### GET `/admin/proof-of-reserves`
Returns mathematical solvency audit ($\text{Assets} \ge \text{Liabilities}$).
