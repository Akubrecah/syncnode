# Syncnode Operations & Disaster Recovery Runbook

## 1. Quick Start (Local Full Stack)

### Standard Development Mode
```bash
# Terminal 1: Backend API Gateway, Matching Engine & WebSocket server
npm run dev:server

# Terminal 2: Web Trading Terminal
npm run dev:web
```

The trading terminal will be live at `http://localhost:3000` and the API Gateway at `http://localhost:4000`.

### Docker Compose
```bash
docker-compose up -d --build
```

---

## 2. Emergency Operational Procedures

### 2.1 Triggering Global Trading Halt
If an anomalous market event or upstream data provider failure is detected:
1. Navigate to the **Admin & Risk** portal.
2. Click **"Trigger Global Trading Halt"**.
3. All incoming order submissions will immediately be rejected by the pre-trade risk engine with `503 Service Unavailable`.

### 2.2 Per-Market Circuit Breaker
To halt trading on an isolated volatile market (e.g. `BTC/USDT`):
```bash
curl -X POST http://localhost:4000/api/v1/admin/circuit-breakers/market-halt \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTC/USDT", "halt": true}'
```

---

## 3. Financial Solvency & Proof of Reserves
Run on-demand double-entry balance verification:
```bash
curl http://localhost:4000/api/v1/admin/proof-of-reserves
```
Verify that `isSolvent` is `true` and the reserve ratio $\ge 100\%$.

---

## 4. Disaster Recovery (DR) & Replayability
Every incoming command is assigned a monotonic sequence number. In the event of a catastrophic container failure:
1. Restore cold state snapshot.
2. Replay all subsequent journal entries and matching engine events deterministically.
3. Verify that total liabilities match vault balances.
