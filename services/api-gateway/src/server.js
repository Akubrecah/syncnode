"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const node_http_1 = __importDefault(require("node:http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const security_1 = require("@syncnode/security");
const ledger_1 = require("@syncnode/ledger");
const matching_engine_1 = require("@syncnode/matching-engine");
const trading_1 = require("@syncnode/trading");
const market_data_1 = require("@syncnode/market-data");
const risk_1 = require("@syncnode/risk");
const wallet_1 = require("@syncnode/wallet");
const compliance_1 = require("@syncnode/compliance");
const p2p_1 = require("@syncnode/p2p");
const logger = new common_1.Logger('APIGateway');
const app = (0, express_1.default)();
exports.app = app;
const server = node_http_1.default.createServer(app);
exports.server = server;
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Authorization token required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, security_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
// ==========================
// Auth Routes
// ==========================
app.post('/api/v1/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password || password.length < 8) {
            res.status(400).json({ success: false, error: 'Email and password (min 8 chars) required' });
            return;
        }
        if (database_1.db.usersByEmail.has(email.toLowerCase())) {
            res.status(409).json({ success: false, error: 'Email is already registered' });
            return;
        }
        const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const passwordHash = await (0, security_1.hashPassword)(password);
        const user = {
            id: userId,
            email: email.toLowerCase(),
            passwordHash,
            isTotpEnabled: false,
            kycTier: common_1.KycTier.TIER_0_UNVERIFIED,
            kycStatus: common_1.KycStatus.NOT_SUBMITTED,
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.users.set(userId, user);
        database_1.db.usersByEmail.set(email.toLowerCase(), userId);
        // Initial deposit for testing & demo liquidity (1.5 BTC, 20 ETH, 50,000 USDT)
        wallet_1.walletService.processDeposit({
            userId,
            asset: common_1.AssetSymbol.BTC,
            network: 'Bitcoin-Mainnet',
            address: 'bc1qdemo_initial_vault',
            txHash: `tx_init_btc_${userId}`,
            amount: '1.50000000',
            confirmations: 6
        });
        wallet_1.walletService.processDeposit({
            userId,
            asset: common_1.AssetSymbol.ETH,
            network: 'Ethereum-Mainnet',
            address: '0xdemo_initial_vault',
            txHash: `tx_init_eth_${userId}`,
            amount: '20.00000',
            confirmations: 15
        });
        wallet_1.walletService.processDeposit({
            userId,
            asset: common_1.AssetSymbol.USDT,
            network: 'Ethereum-ERC20',
            address: '0xdemo_initial_vault',
            txHash: `tx_init_usdt_${userId}`,
            amount: '50000.00',
            confirmations: 15
        });
        const token = (0, security_1.signToken)({ userId, email: user.email, isTotpAuthenticated: true });
        res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, kycTier: user.kycTier } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password, totpCode } = req.body;
        const userId = database_1.db.usersByEmail.get(email?.toLowerCase());
        if (!userId) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const user = database_1.db.users.get(userId);
        const isValidPassword = await (0, security_1.verifyPassword)(password, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        if (user.isTotpEnabled && user.totpSecret) {
            if (!totpCode || !(0, security_1.verifyTotp)(user.totpSecret, totpCode)) {
                res.status(401).json({ success: false, error: 'Valid 2FA TOTP code required', requires2FA: true });
                return;
            }
        }
        const token = (0, security_1.signToken)({ userId, email: user.email, isTotpAuthenticated: true });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                kycTier: user.kycTier,
                isTotpEnabled: user.isTotpEnabled
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/auth/me', authMiddleware, (req, res) => {
    const user = database_1.db.users.get(req.user.userId);
    if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }
    res.json({ success: true, user });
});
app.post('/api/v1/auth/2fa/setup', authMiddleware, (req, res) => {
    const secret = (0, security_1.generateTotpSecret)();
    const user = database_1.db.users.get(req.user.userId);
    user.totpSecret = secret;
    res.json({ success: true, secret, otpauthUrl: `otpauth://totp/Syncnode:${user.email}?secret=${secret}&issuer=Syncnode` });
});
app.post('/api/v1/auth/2fa/enable', authMiddleware, (req, res) => {
    const { code } = req.body;
    const user = database_1.db.users.get(req.user.userId);
    if (!user.totpSecret) {
        res.status(400).json({ success: false, error: '2FA has not been initialized' });
        return;
    }
    if (!(0, security_1.verifyTotp)(user.totpSecret, code)) {
        res.status(400).json({ success: false, error: 'Invalid 2FA code' });
        return;
    }
    user.isTotpEnabled = true;
    res.json({ success: true, message: '2FA TOTP successfully enabled' });
});
// ==========================
// Market Data & Tickers
// ==========================
app.get('/api/v1/markets', (req, res) => {
    const markets = Object.values(common_1.MARKET_REGISTRY);
    res.json({ success: true, markets });
});
app.get('/api/v1/market-data/live', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        const liveMarkets = await market_data_1.marketDataService.pullLiveMarketData(symbol);
        res.json({ success: true, liveMarkets, timestamp: Date.now() });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/market-data/pull', async (req, res) => {
    try {
        const symbol = req.body.symbol;
        const liveMarkets = await market_data_1.marketDataService.pullLiveMarketData(symbol);
        // Broadcast updated depth and ticker to WebSocket subscribers
        for (const m of liveMarkets) {
            broadcastDepth(m.symbol);
            broadcastTicker(m.symbol);
        }
        res.json({ success: true, count: liveMarkets.length, liveMarkets });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/market-data/status', (req, res) => {
    const status = market_data_1.marketDataService.getLiveFeedStatus();
    res.json({ success: true, status });
});
app.post('/api/v1/market-data/auto-sync', (req, res) => {
    const { enabled, intervalMs } = req.body;
    const isEnabled = market_data_1.marketDataService.setAutoSync(Boolean(enabled), intervalMs || 10000);
    res.json({ success: true, autoSync: isEnabled, status: market_data_1.marketDataService.getLiveFeedStatus() });
});
app.get('/api/v1/markets/:symbol/ticker', (req, res) => {
    try {
        const symbol = decodeURIComponent(req.params.symbol);
        const ticker = market_data_1.marketDataService.getTicker24h(symbol);
        res.json({ success: true, ticker });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/markets/:symbol/depth', (req, res) => {
    try {
        const symbol = decodeURIComponent(req.params.symbol);
        const limit = parseInt(req.query.limit) || 20;
        const depth = matching_engine_1.matchingEngine.getDepth(symbol, limit);
        res.json({ success: true, depth });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/markets/:symbol/candles', (req, res) => {
    try {
        const symbol = decodeURIComponent(req.params.symbol);
        const interval = req.query.interval || '1m';
        const limit = parseInt(req.query.limit) || 100;
        const candles = market_data_1.marketDataService.getCandles(symbol, interval, limit);
        res.json({ success: true, candles });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/markets/:symbol/trades', (req, res) => {
    try {
        const symbol = decodeURIComponent(req.params.symbol);
        const limit = parseInt(req.query.limit) || 50;
        const trades = market_data_1.marketDataService.getRecentTrades(symbol, limit);
        res.json({ success: true, trades });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});
// ==========================
// Orders & Trading
// ==========================
app.post('/api/v1/orders', authMiddleware, (req, res) => {
    try {
        const { symbol, side, type, price, quantity, timeInForce, selfTradePrevention, clientOrderId } = req.body;
        const result = trading_1.orderManagementService.submitOrder({
            userId: req.user.userId,
            symbol,
            side,
            type,
            price,
            quantity,
            timeInForce,
            selfTradePrevention,
            clientOrderId
        });
        // Notify market data pipeline of trades
        for (const trade of result.trades) {
            market_data_1.marketDataService.onTradeExecuted(trade);
            broadcastMarketTrade(trade);
        }
        broadcastDepth(symbol);
        res.status(201).json({ success: true, ...result });
    }
    catch (err) {
        res.status(err.statusCode || 400).json({ success: false, error: err.message, code: err.code });
    }
});
app.get('/api/v1/orders', authMiddleware, (req, res) => {
    const symbol = req.query.symbol;
    const openOnly = req.query.openOnly === 'true';
    const orders = trading_1.orderManagementService.getOrdersByUser(req.user.userId, symbol, openOnly);
    res.json({ success: true, orders });
});
app.post('/api/v1/orders/cancel-all', authMiddleware, (req, res) => {
    try {
        const symbol = req.body.symbol;
        const canceled = trading_1.orderManagementService.cancelAllOrders(req.user.userId, symbol);
        if (symbol)
            broadcastDepth(symbol);
        res.json({ success: true, count: canceled.length, canceled });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.delete('/api/v1/orders/:id', authMiddleware, (req, res) => {
    try {
        const order = trading_1.orderManagementService.cancelOrder(req.params.id, req.user.userId);
        broadcastDepth(order.symbol);
        res.json({ success: true, order });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/trades/my', authMiddleware, (req, res) => {
    const symbol = req.query.symbol;
    const trades = trading_1.orderManagementService.getTradesForUser(req.user.userId, symbol);
    res.json({ success: true, trades });
});
// ==========================
// Balances & Wallet
// ==========================
app.get('/api/v1/balances', authMiddleware, (req, res) => {
    const balances = ledger_1.ledgerService.getUserBalances(req.user.userId);
    res.json({ success: true, balances });
});
app.post('/api/v1/wallet/faucet', authMiddleware, (req, res) => {
    try {
        const { asset, amount } = req.body;
        const userId = req.user.userId;
        const targetAsset = asset || common_1.AssetSymbol.USDT;
        const creditAmount = amount || (targetAsset === common_1.AssetSymbol.BTC ? '1.00000000' : targetAsset === common_1.AssetSymbol.ETH ? '10.00000' : targetAsset === common_1.AssetSymbol.SOL ? '50.0000' : '10000.00');
        wallet_1.walletService.processDeposit({
            userId,
            asset: targetAsset,
            network: 'Devnet-Faucet',
            address: 'faucet_designated_vault',
            txHash: `tx_faucet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            amount: creditAmount,
            confirmations: 10
        });
        res.json({ success: true, message: `Successfully credited ${creditAmount} ${targetAsset} to your account via Faucet!` });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/wallet/deposit-address', authMiddleware, (req, res) => {
    const asset = req.query.asset;
    const network = req.query.network;
    const result = wallet_1.walletService.getDepositAddress(req.user.userId, asset, network);
    res.json({ success: true, ...result });
});
app.get('/api/v1/wallet/deposits', authMiddleware, (req, res) => {
    const deposits = wallet_1.walletService.getUserDeposits(req.user.userId);
    res.json({ success: true, deposits });
});
app.post('/api/v1/wallet/receive-crypto', authMiddleware, (req, res) => {
    try {
        const { asset, network, address, amount, confirmations } = req.body;
        const targetAsset = asset || common_1.AssetSymbol.USDT;
        const deposit = wallet_1.walletService.processDeposit({
            userId: req.user.userId,
            asset: targetAsset,
            network: network || 'Blockchain-Direct',
            address: address || 'bc1q_customer_designated_vault',
            txHash: `tx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            amount: amount || '100.00',
            confirmations: typeof confirmations === 'number' ? confirmations : 12
        });
        res.status(201).json({ success: true, message: `Successfully received ${deposit.amount} ${deposit.asset}!`, deposit });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/wallet/receive-fiat', authMiddleware, (req, res) => {
    try {
        const { amount, currency, paymentMethod, referenceCode } = req.body;
        const result = wallet_1.walletService.processFiatDeposit({
            userId: req.user.userId,
            amount,
            currency,
            paymentMethod,
            referenceCode
        });
        res.status(201).json({
            success: true,
            message: `Successfully received ${amount} ${currency || 'USD'} via ${paymentMethod || 'Bank Wire'}! Credited as USDT.`,
            ...result
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/wallet/transfer/internal', authMiddleware, (req, res) => {
    try {
        const { recipientIdentifier, asset, amount, note } = req.body;
        const transfer = wallet_1.walletService.transferInternal({
            senderUserId: req.user.userId,
            recipientIdentifier,
            asset: asset,
            amount,
            note
        });
        res.status(201).json({
            success: true,
            message: `Transferred ${amount} ${asset} to ${transfer.recipientEmail || recipientIdentifier} with zero fees!`,
            transfer
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/wallet/transfer/external', authMiddleware, async (req, res) => {
    try {
        const { asset, network, destinationAddress, amount, totpCode } = req.body;
        const request = await wallet_1.walletService.requestWithdrawal({
            userId: req.user.userId,
            asset,
            network,
            destinationAddress,
            amount,
            totpCode
        });
        res.status(201).json({ success: true, message: `Withdrawal broadcasted successfully!`, withdrawal: request });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/wallet/transfer/fiat', authMiddleware, async (req, res) => {
    try {
        const { amount, currency, bankDetails, totpCode } = req.body;
        const transfer = await wallet_1.walletService.processFiatWithdrawal({
            userId: req.user.userId,
            amount,
            currency,
            bankDetails,
            totpCode
        });
        res.status(201).json({
            success: true,
            message: `Fiat payout of ${amount} USD initiated to ${bankDetails?.bankName || 'bank'}!`,
            transfer
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/wallet/transfers', authMiddleware, (req, res) => {
    const transfers = wallet_1.walletService.getUserTransfers(req.user.userId);
    res.json({ success: true, transfers });
});
app.get('/api/v1/wallet/transfers/:id', authMiddleware, (req, res) => {
    const transfer = wallet_1.walletService.getTransferById(req.params.id);
    if (!transfer) {
        res.status(404).json({ success: false, error: 'Transfer record not found' });
        return;
    }
    if (transfer.senderUserId !== req.user.userId && transfer.recipientUserId !== req.user.userId) {
        res.status(403).json({ success: false, error: 'Unauthorized to view this transfer receipt' });
        return;
    }
    res.json({ success: true, transfer });
});
app.post('/api/v1/wallet/withdraw', authMiddleware, async (req, res) => {
    try {
        const { asset, network, destinationAddress, amount, totpCode } = req.body;
        const request = await wallet_1.walletService.requestWithdrawal({
            userId: req.user.userId,
            asset,
            network,
            destinationAddress,
            amount,
            totpCode
        });
        res.status(201).json({ success: true, withdrawal: request });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// ==========================
// P2P Marketplace
// ==========================
app.get('/api/v1/p2p/ads', (req, res) => {
    const asset = req.query.asset;
    const fiatCurrency = req.query.fiatCurrency;
    const type = req.query.type;
    const ads = p2p_1.p2pService.getAds(asset, fiatCurrency, type);
    res.json({ success: true, ads });
});
app.post('/api/v1/p2p/ads', authMiddleware, (req, res) => {
    try {
        const user = database_1.db.users.get(req.user.userId);
        const { type, asset, fiatCurrency, price, totalCryptoAmount, minFiatLimit, maxFiatLimit, paymentMethods, terms } = req.body;
        const ad = p2p_1.p2pService.createAd({
            merchantId: user.id,
            merchantName: user.email.split('@')[0],
            type,
            asset,
            fiatCurrency,
            price,
            totalCryptoAmount,
            minFiatLimit,
            maxFiatLimit,
            paymentMethods: paymentMethods || ['Bank Transfer'],
            terms: terms || 'Verified traders only.'
        });
        res.status(201).json({ success: true, ad });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.get('/api/v1/p2p/trades/my', authMiddleware, (req, res) => {
    const trades = p2p_1.p2pService.getTradesByUser(req.user.userId);
    res.json({ success: true, trades });
});
app.post('/api/v1/p2p/trades', authMiddleware, (req, res) => {
    try {
        const { adId, cryptoAmount, paymentMethod } = req.body;
        const trade = p2p_1.p2pService.initiateTrade({
            adId,
            buyerUserId: req.user.userId,
            cryptoAmount,
            paymentMethod
        });
        res.status(201).json({ success: true, trade });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/p2p/trades/:id/mark-paid', authMiddleware, (req, res) => {
    try {
        const trade = p2p_1.p2pService.markFiatPaid(req.params.id, req.user.userId);
        res.json({ success: true, trade });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/p2p/trades/:id/release', authMiddleware, (req, res) => {
    try {
        const trade = p2p_1.p2pService.releaseEscrow(req.params.id, req.user.userId);
        res.json({ success: true, trade });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/p2p/trades/:id/cancel', authMiddleware, (req, res) => {
    try {
        const trade = p2p_1.p2pService.cancelTrade(req.params.id, req.user.userId);
        res.json({ success: true, trade });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// ==========================
// KYC Compliance
// ==========================
app.post('/api/v1/kyc/submit', authMiddleware, (req, res) => {
    try {
        const appData = req.body;
        const app = compliance_1.complianceService.submitKyc({
            userId: req.user.userId,
            tier: appData.tier || common_1.KycTier.TIER_2_VERIFIED,
            fullName: appData.fullName,
            dateOfBirth: appData.dateOfBirth,
            country: appData.country,
            idDocumentType: appData.idDocumentType || 'PASSPORT',
            idNumber: appData.idNumber
        });
        res.status(201).json({ success: true, application: app });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// ==========================
// Admin & Operations Portal
// ==========================
app.get('/api/v1/admin/circuit-breakers', (req, res) => {
    res.json({ success: true, circuitBreakers: database_1.db.circuitBreakers });
});
app.post('/api/v1/admin/circuit-breakers/global-halt', (req, res) => {
    const { halt } = req.body;
    risk_1.riskEngine.setGlobalTradingHalt(Boolean(halt), 'admin_super');
    res.json({ success: true, circuitBreakers: database_1.db.circuitBreakers });
});
app.post('/api/v1/admin/circuit-breakers/market-halt', (req, res) => {
    const { symbol, halt } = req.body;
    risk_1.riskEngine.setMarketHalt(symbol, Boolean(halt), 'admin_super');
    res.json({ success: true, circuitBreakers: database_1.db.circuitBreakers });
});
app.get('/api/v1/admin/proof-of-reserves', (req, res) => {
    const audit = ledger_1.ledgerService.performProofOfReservesAudit();
    res.json({ success: true, audit });
});
app.get('/api/v1/admin/kyc/pending', (req, res) => {
    const pending = compliance_1.complianceService.getPendingApplications();
    res.json({ success: true, applications: pending });
});
app.post('/api/v1/admin/kyc/review', (req, res) => {
    const { kycId, approved, rejectionReason } = req.body;
    const result = compliance_1.complianceService.reviewKyc(kycId, approved, 'admin_compliance', rejectionReason);
    res.json({ success: true, application: result });
});
app.get('/api/v1/admin/audit-logs', (req, res) => {
    res.json({ success: true, logs: database_1.db.auditLogs.slice(-100).reverse() });
});
const clients = new Map();
wss.on('connection', (ws) => {
    const sub = { ws, channels: new Set() };
    clients.set(ws, sub);
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.action === 'SUBSCRIBE' && Array.isArray(data.channels)) {
                for (const ch of data.channels)
                    sub.channels.add(ch);
                ws.send(JSON.stringify({ event: 'subscribed', channels: Array.from(sub.channels) }));
            }
            else if (data.action === 'UNSUBSCRIBE' && Array.isArray(data.channels)) {
                for (const ch of data.channels)
                    sub.channels.delete(ch);
                ws.send(JSON.stringify({ event: 'unsubscribed', channels: Array.from(sub.channels) }));
            }
        }
        catch (e) { }
    });
    ws.on('close', () => {
        clients.delete(ws);
    });
});
function broadcastMarketTrade(trade) {
    const channel = `trades@${trade.symbol}`;
    const payload = JSON.stringify({ channel, data: trade });
    for (const client of clients.values()) {
        if (client.channels.has(channel) && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(payload);
        }
    }
}
function broadcastDepth(symbol) {
    const channel = `depth@${symbol}`;
    const depth = matching_engine_1.matchingEngine.getDepth(symbol, 20);
    const payload = JSON.stringify({ channel, data: depth });
    for (const client of clients.values()) {
        if (client.channels.has(channel) && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(payload);
        }
    }
}
function broadcastTicker(symbol) {
    const channel = `ticker@${symbol}`;
    const ticker = market_data_1.marketDataService.getTicker24h(symbol);
    const payload = JSON.stringify({ channel, data: ticker });
    for (const client of clients.values()) {
        if (client.channels.has(channel) && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(payload);
        }
    }
}
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    logger.info(`Syncnode API Gateway & WebSocket Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map