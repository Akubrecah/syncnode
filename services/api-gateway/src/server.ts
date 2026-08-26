import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Automatically load .env file into process.env if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch {
  // Ignore
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import {
  AssetSymbol,
  MARKET_REGISTRY,
  ASSET_REGISTRY,
  OrderSide,
  OrderType,
  TimeInForce,
  SelfTradePrevention,
  KycTier,
  KycStatus,
  AdminRole,
  OrderStatus,
  WithdrawalStatus,
  DepositStatus,
  P2PEscrowStatus,
  User,
  Decimal,
  Logger,
  AppError
} from '@syncnode/common';
import { db } from '@syncnode/database';
import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
  signToken,
  verifyToken,
  AuthJwtPayload
} from '@syncnode/security';
import { ledgerService } from '@syncnode/ledger';
import { matchingEngine } from '@syncnode/matching-engine';
import { orderManagementService } from '@syncnode/trading';
import { marketDataService } from '@syncnode/market-data';
import { riskEngine } from '@syncnode/risk';
import { walletService } from '@syncnode/wallet';
import { complianceService } from '@syncnode/compliance';
import { p2pService } from '@syncnode/p2p';

const logger = new Logger('APIGateway');
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ==============================================================================
// 1. CORS CONFIGURATION (CRIT-002) - Strict Explicit Origin Allowlist
// ==============================================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) in development/test
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && allowedOrigins.includes('*'))) {
        return callback(null, true);
      }
      logger.warn(`CORS rejected request from origin: ${origin}`);
      return callback(new Error(`CORS Error: Origin ${origin} not permitted by Access-Control-Allow-Origin policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Order-Id']
  })
);

app.use(express.json());

// ==============================================================================
// 2. RATE LIMITING (HIGH-008) - Global and Auth-Specific Protection
// ==============================================================================
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' }
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// ==============================================================================
// 3. AUTHENTICATION & RBAC MIDDLEWARE (CRIT-003)
// ==============================================================================
export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    logger.warn('Authentication token verification failed', { error: err?.message });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * Resolve the authoritative administrative role for an authenticated principal.
 * Priority: explicit JWT role claim (validated against the enum) -> persisted
 * user.adminRole -> legacy 'admin' id-prefix convention. Never trust a role
 * that is not one of the defined AdminRole values.
 */
const ALL_ADMIN_ROLES: AdminRole[] = Object.values(AdminRole);

function resolveAdminRole(payload: AuthJwtPayload): AdminRole | undefined {
  if (payload.role && ALL_ADMIN_ROLES.includes(payload.role as AdminRole)) {
    return payload.role as AdminRole;
  }
  const user = db.users.get(payload.userId);
  if (user?.adminRole) {
    return user.adminRole;
  }
  if (payload.userId.startsWith('admin')) {
    return AdminRole.SUPER_ADMIN;
  }
  return undefined;
}

/**
 * Role-Based Access Control middleware for Administrative Endpoints
 */
function requireAdminRole(...allowedRoles: AdminRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userRole = resolveAdminRole(req.user);

    // Check if user has an assigned admin role matching allowed roles
    if (!userRole || (!allowedRoles.includes(userRole) && userRole !== AdminRole.SUPER_ADMIN)) {
      logger.warn(`Forbidden admin access attempt by user ${req.user.userId} with role ${userRole}`);
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient administrative privileges' });
      return;
    }

    next();
  };
}

/** Strip credential material before any user object leaves the server. */
function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'totpSecret'> {
  const { passwordHash: _passwordHash, totpSecret: _totpSecret, ...safe } = user;
  return safe;
}

/** Parse and clamp pagination parameters from query string. */
function parsePagination(req: Request, defaultLimit = 25, maxLimit = 200): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** Require a documented reason (min 4 chars) for privileged mutations. */
function requireReason(body: any): string {
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 4) {
    throw new AppError('A documented reason (minimum 4 characters) is required for this action', 400);
  }
  return reason;
}

// ==============================================================================
// 4. AUTH ROUTES (HIGH-001: No free fund grants on registration)
// ==============================================================================
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry } = req.body;
    if (!email || !password || password.length < 8) {
      res.status(400).json({ success: false, error: 'Email and password (min 8 chars) required' });
      return;
    }

    if (db.usersByEmail.has(email.toLowerCase())) {
      res.status(409).json({ success: false, error: 'Email is already registered' });
      return;
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const passwordHash = await hashPassword(password);

    const user = {
      id: userId,
      email: email.toLowerCase(),
      fullName: fullName || undefined,
      country: country || undefined,
      investmentGoals: investmentGoals || undefined,
      riskTolerance: riskTolerance || undefined,
      preferredIndustry: preferredIndustry || undefined,
      passwordHash,
      isTotpEnabled: false,
      kycTier: KycTier.TIER_0_UNVERIFIED,
      kycStatus: KycStatus.NOT_SUBMITTED,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.users.set(userId, user);
    db.usersByEmail.set(email.toLowerCase(), userId);

    // HIGH-001 FIX: Zero initial balance granted. Users fund accounts via real deposit or dev faucet.
    logger.info(`User registered successfully: ${user.email} (${user.id}) with initial zero balance`);

    const token = signToken({ userId, email: user.email, isTotpAuthenticated: true });
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        country: user.country,
        investmentGoals: user.investmentGoals,
        riskTolerance: user.riskTolerance,
        preferredIndustry: user.preferredIndustry,
        kycTier: user.kycTier
      }
    });
  } catch (err: any) {
    logger.error('Registration error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, totpCode } = req.body;
    const userId = db.usersByEmail.get(email?.toLowerCase());
    if (!userId) {
      db.logAudit({
        actorId: email?.toLowerCase() || 'unknown',
        actorType: 'USER',
        action: 'AUTH_LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'UNKNOWN_EMAIL' }
      });
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const user = db.users.get(userId)!;
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      db.logAudit({
        actorId: user.id,
        actorType: 'USER',
        action: 'AUTH_LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'INVALID_PASSWORD' }
      });
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (user.isTotpEnabled && user.totpSecret) {
      if (!totpCode || !verifyTotp(user.totpSecret, totpCode)) {
        db.logAudit({
          actorId: user.id,
          actorType: 'USER',
          action: 'AUTH_LOGIN_FAILED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { reason: 'INVALID_TOTP' }
        });
        res.status(401).json({ success: false, error: 'Valid 2FA TOTP code required', requires2FA: true });
        return;
      }
    }

    const token = signToken({ userId, email: user.email, isTotpAuthenticated: true });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        country: user.country,
        investmentGoals: user.investmentGoals,
        riskTolerance: user.riskTolerance,
        preferredIndustry: user.preferredIndustry,
        kycTier: user.kycTier,
        isTotpEnabled: user.isTotpEnabled
      }
    });
  } catch (err: any) {
    logger.error('Login error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.get(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, user });
});

app.post('/api/v1/auth/2fa/setup', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const secret = generateTotpSecret();
  const user = db.users.get(req.user!.userId)!;
  user.totpSecret = secret;
  res.json({
    success: true,
    otpauthUrl: `otpauth://totp/Syncnode:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Syncnode`
  });
});

app.post('/api/v1/auth/2fa/enable', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body;
  const user = db.users.get(req.user!.userId)!;
  if (!user.totpSecret) {
    res.status(400).json({ success: false, error: '2FA has not been initialized' });
    return;
  }
  if (!verifyTotp(user.totpSecret, code)) {
    res.status(400).json({ success: false, error: 'Invalid 2FA code' });
    return;
  }
  user.isTotpEnabled = true;
  res.json({ success: true, message: '2FA TOTP successfully enabled' });
});

// ==============================================================================
// 5. MARKET DATA & TICKERS
// ==============================================================================
app.get('/api/v1/markets', (req: Request, res: Response) => {
  const markets = Object.values(MARKET_REGISTRY);
  res.json({ success: true, markets });
});

app.get('/api/v1/market-data/live', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string | undefined;
    const liveMarkets = await marketDataService.pullLiveMarketData(symbol);
    res.json({ success: true, liveMarkets, timestamp: Date.now() });
  } catch (err: any) {
    logger.error('Failed to get live market data', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/market-data/pull', async (req: Request, res: Response) => {
  try {
    const symbol = req.body.symbol as string | undefined;
    const liveMarkets = await marketDataService.pullLiveMarketData(symbol);

    for (const m of liveMarkets) {
      broadcastDepth(m.symbol);
      broadcastTicker(m.symbol);
    }

    res.json({ success: true, count: liveMarkets.length, liveMarkets });
  } catch (err: any) {
    logger.error('Failed to pull live market data', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/market-data/status', (req: Request, res: Response) => {
  const status = marketDataService.getLiveFeedStatus();
  res.json({ success: true, status });
});

app.post('/api/v1/market-data/auto-sync', (req: Request, res: Response) => {
  const { enabled, intervalMs } = req.body;
  const isEnabled = marketDataService.setAutoSync(Boolean(enabled), intervalMs || 10000);
  res.json({ success: true, autoSync: isEnabled, status: marketDataService.getLiveFeedStatus() });
});

app.get('/api/v1/markets/:symbol/ticker', (req: Request, res: Response) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol as string);
    const ticker = marketDataService.getTicker24h(symbol);
    res.json({ success: true, ticker });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/markets/:symbol/depth', (req: Request, res: Response) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol as string);
    const limit = parseInt(req.query.limit as string) || 20;
    const depth = matchingEngine.getDepth(symbol, limit);
    res.json({ success: true, depth });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/markets/:symbol/candles', (req: Request, res: Response) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol as string);
    const interval = (req.query.interval as string) || '1m';
    const limit = parseInt(req.query.limit as string) || 100;
    const candles = marketDataService.getCandles(symbol, interval, limit);
    res.json({ success: true, candles });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/markets/:symbol/trades', (req: Request, res: Response) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol as string);
    const limit = parseInt(req.query.limit as string) || 50;
    const trades = marketDataService.getRecentTrades(symbol, limit);
    res.json({ success: true, trades });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 6. ORDERS & TRADING
// ==============================================================================
app.post('/api/v1/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, side, type, price, quantity, timeInForce, selfTradePrevention, clientOrderId } = req.body;
    const result = orderManagementService.submitOrder({
      userId: req.user!.userId,
      symbol,
      side,
      type,
      price,
      quantity,
      timeInForce,
      selfTradePrevention,
      clientOrderId
    });

    for (const trade of result.trades) {
      marketDataService.onTradeExecuted(trade);
      broadcastMarketTrade(trade);
    }
    broadcastDepth(symbol);

    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    logger.warn(`Order submission failed for user ${req.user?.userId}: ${err?.message}`);
    res.status(err.statusCode || 400).json({ success: false, error: err.message, code: err.code });
  }
});

app.get('/api/v1/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const openOnly = req.query.openOnly === 'true';
  const orders = orderManagementService.getOrdersByUser(req.user!.userId, symbol, openOnly);
  res.json({ success: true, orders });
});

app.post('/api/v1/orders/cancel-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = req.body.symbol as string | undefined;
    const canceled = orderManagementService.cancelAllOrders(req.user!.userId, symbol);
    if (symbol) broadcastDepth(symbol);
    res.json({ success: true, count: canceled.length, canceled });
  } catch (err: any) {
    logger.error('Cancel all orders failed', err instanceof Error ? err : new Error(String(err)));
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/v1/orders/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = orderManagementService.cancelOrder(req.params.id as string, req.user!.userId);
    broadcastDepth(order.symbol);
    res.json({ success: true, order });
  } catch (err: any) {
    logger.warn(`Order cancellation failed for ${req.params.id}: ${err?.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/trades/my', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const trades = orderManagementService.getTradesForUser(req.user!.userId, symbol);
  res.json({ success: true, trades });
});

// ==============================================================================
// 7. BALANCES, DEPOSITS & WALLET (HIGH-002: Faucet gated behind non-production)
// ==============================================================================
app.get('/api/v1/balances', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const balances = ledgerService.getUserBalances(req.user!.userId);
  res.json({ success: true, balances });
});

app.post('/api/v1/wallet/faucet', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // HIGH-002 FIX: strictly disabled in production
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ success: false, error: 'Faucet endpoint is disabled in production' });
    return;
  }

  try {
    const { asset, amount } = req.body;
    const userId = req.user!.userId;
    const targetAsset = (asset as AssetSymbol) || AssetSymbol.USDT;
    const creditAmount = amount || (targetAsset === AssetSymbol.BTC ? '1.00000000' : targetAsset === AssetSymbol.ETH ? '10.00000' : targetAsset === AssetSymbol.SOL ? '50.0000' : '10000.00');

    walletService.processDeposit({
      userId,
      asset: targetAsset,
      network: 'Devnet-Faucet',
      address: 'faucet_designated_vault',
      txHash: `tx_faucet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: creditAmount,
      confirmations: 10
    });

    res.json({ success: true, message: `Successfully credited ${creditAmount} ${targetAsset} to your account via Faucet!` });
  } catch (err: any) {
    logger.error('Faucet deposit failed', err instanceof Error ? err : new Error(String(err)));
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/wallet/deposit-address', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const asset = req.query.asset as AssetSymbol;
  const network = req.query.network as string | undefined;
  const result = walletService.getDepositAddress(req.user!.userId, asset, network);
  res.json({ success: true, ...result });
});

app.get('/api/v1/wallet/deposits', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const deposits = walletService.getUserDeposits(req.user!.userId);
  res.json({ success: true, deposits });
});

app.post('/api/v1/wallet/receive-crypto', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset, network, address, amount, confirmations } = req.body;
    const targetAsset = (asset as AssetSymbol) || AssetSymbol.USDT;
    const deposit = walletService.processDeposit({
      userId: req.user!.userId,
      asset: targetAsset,
      network: network || 'Blockchain-Direct',
      address: address || 'bc1q_customer_designated_vault',
      txHash: `tx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      amount: amount || '100.00',
      confirmations: typeof confirmations === 'number' ? confirmations : 12
    });
    res.status(201).json({ success: true, message: `Successfully received ${deposit.amount} ${deposit.asset}!`, deposit });
  } catch (err: any) {
    logger.error('Receive crypto failed', err instanceof Error ? err : new Error(String(err)));
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/wallet/withdraw', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset, amount, destinationAddress, network, totpCode } = req.body;
    const user = db.users.get(req.user!.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.isTotpEnabled && user.totpSecret) {
      if (!totpCode || !verifyTotp(user.totpSecret, totpCode)) {
        res.status(400).json({ success: false, error: 'Valid 2FA TOTP code required for withdrawal' });
        return;
      }
    }

    const withdrawal = await walletService.requestWithdrawal({
      userId: user.id,
      asset,
      amount,
      destinationAddress,
      network
    });

    res.status(201).json({ success: true, withdrawal });
  } catch (err: any) {
    logger.error('Withdrawal failed', err instanceof Error ? err : new Error(String(err)));
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/wallet/transfer/internal', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientEmail, asset, amount, note } = req.body;
    const senderId = req.user!.userId;

    if (!recipientEmail || !asset || !amount) {
      res.status(400).json({ success: false, error: 'Recipient email, asset, and amount are required' });
      return;
    }

    const transfer = walletService.transferInternal({
      senderUserId: senderId,
      recipientIdentifier: recipientEmail,
      asset: asset as AssetSymbol,
      amount: String(amount),
      note
    });

    res.status(201).json({ success: true, message: `Successfully transferred ${transfer.amount} ${transfer.asset} to ${recipientEmail}`, transfer });
  } catch (err: any) {
    logger.error('Internal transfer failed', err instanceof Error ? err : new Error(String(err)));
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 8. P2P ESCROW ROUTES
// ==============================================================================
app.get('/api/v1/p2p/offers', (req: Request, res: Response) => {
  const type = req.query.type as any;
  const asset = req.query.asset as any;
  const fiatCurrency = req.query.fiatCurrency as any;
  const offers = p2pService.getAds(asset, fiatCurrency, type);
  res.json({ success: true, offers });
});

app.post('/api/v1/p2p/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { offerId, cryptoAmount, paymentMethod } = req.body;
    const order = p2pService.initiateTrade({
      adId: offerId,
      buyerUserId: req.user!.userId,
      cryptoAmount,
      paymentMethod: paymentMethod || 'Bank Wire'
    });
    res.status(201).json({ success: true, order });
  } catch (err: any) {
    logger.error('P2P order creation failed', err instanceof Error ? err : new Error(String(err)));
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/p2p/orders/:id/mark-paid', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = p2pService.markFiatPaid(req.params.id as string, req.user!.userId);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/p2p/orders/:id/release', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { totpCode } = req.body;
    const user = db.users.get(req.user!.userId);
    if (user?.isTotpEnabled && user.totpSecret) {
      if (!totpCode || !verifyTotp(user.totpSecret, totpCode)) {
        res.status(400).json({ success: false, error: 'Valid 2FA TOTP code required to release escrow' });
        return;
      }
    }
    const order = p2pService.releaseEscrow(req.params.id as string, req.user!.userId);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 9. COMPLIANCE & KYC
// ==============================================================================
app.get('/api/v1/compliance/kyc', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const applications = complianceService.getApplicationsByUser(req.user!.userId);
  res.json({ success: true, application: applications[0] || null });
});

app.post('/api/v1/compliance/kyc/submit', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetTier, fullName, dateOfBirth, country, idDocumentType, idDocumentNumber } = req.body;
    const app = complianceService.submitKyc({
      userId: req.user!.userId,
      tier: targetTier || KycTier.TIER_1_BASIC,
      fullName: fullName || '',
      dateOfBirth: dateOfBirth || '',
      country: country || 'US',
      idDocumentType: idDocumentType || 'PASSPORT',
      idNumber: idDocumentNumber || ''
    });
    res.status(201).json({ success: true, application: app });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 10. ADMIN & OPERATIONS PORTAL (CRIT-003: Auth + RBAC Enforced)
// ==============================================================================

// ---------- Session / Role Resolution ----------
app.get(
  '/api/v1/admin/session',
  authMiddleware,
  requireAdminRole(...ALL_ADMIN_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const role = resolveAdminRole(req.user!)!;
    res.json({
      success: true,
      session: { userId: req.user!.userId, email: req.user!.email, role }
    });
  }
);

// ---------- Circuit Breakers & Emergency Controls ----------
app.get(
  '/api/v1/admin/circuit-breakers',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

app.post(
  '/api/v1/admin/circuit-breakers/global-halt',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST),
  (req: AuthenticatedRequest, res: Response) => {
    const { halt } = req.body;
    const reason = requireReason(req.body);
    riskEngine.setGlobalTradingHalt(Boolean(halt), req.user!.userId, reason);
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

app.post(
  '/api/v1/admin/circuit-breakers/market-halt',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST),
  (req: AuthenticatedRequest, res: Response) => {
    const { symbol, halt } = req.body;
    if (!symbol || typeof symbol !== 'string') throw new AppError(400, 'Market symbol is required.');
    const reason = requireReason(req.body);
    riskEngine.setMarketHalt(symbol, Boolean(halt), req.user!.userId, reason);
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

app.post(
  '/api/v1/admin/circuit-breakers/withdrawals-pause',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST),
  (req: AuthenticatedRequest, res: Response) => {
    const { pause } = req.body;
    const reason = requireReason(req.body);
    riskEngine.setWithdrawalPause(Boolean(pause), req.user!.userId, reason);
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

app.post(
  '/api/v1/admin/circuit-breakers/deposits-pause',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST),
  (req: AuthenticatedRequest, res: Response) => {
    const { pause } = req.body;
    const reason = requireReason(req.body);
    riskEngine.setDepositsPause(Boolean(pause), req.user!.userId, reason);
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

app.post(
  '/api/v1/admin/circuit-breakers/maintenance',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    const { enabled } = req.body;
    const reason = requireReason(req.body);
    riskEngine.setEmergencyMaintenance(Boolean(enabled), req.user!.userId, reason);
    res.json({ success: true, circuitBreakers: db.circuitBreakers });
  }
);

// ---------- System Health ----------
app.get(
  '/api/v1/admin/system/health',
  authMiddleware,
  requireAdminRole(...ALL_ADMIN_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Real event-loop lag measurement
    const lagStart = process.hrtime.bigint();
    setImmediate(() => {
      const lagMs = Number(process.hrtime.bigint() - lagStart) / 1e6;

      // Real liveness probes against in-process subsystems
      let matchingEngineOk = true;
      for (const symbol of Object.keys(MARKET_REGISTRY)) {
        try {
          matchingEngine.getDepth(symbol, 1);
        } catch {
          matchingEngineOk = false;
        }
      }

      const openOrderStatuses: OrderStatus[] = [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED];
      const openOrders = Array.from(db.orders.values()).filter((o) => openOrderStatuses.includes(o.status));
      const trades24h = Array.from(db.trades.values()).filter((t) => t.timestamp >= dayAgo);

      const activeUserIds = new Set<string>();
      for (const o of db.orders.values()) if (o.createdAt >= dayAgo) activeUserIds.add(o.userId);
      for (const t of db.trades.values()) if (t.timestamp >= dayAgo) { activeUserIds.add(t.buyerUserId); activeUserIds.add(t.sellerUserId); }

      const pendingWithdrawals = Array.from(db.withdrawals.values()).filter((w) =>
        [WithdrawalStatus.REQUESTED, WithdrawalStatus.RISK_REVIEW, WithdrawalStatus.PROCESSING].includes(w.status)
      );
      const confirmingDeposits = Array.from(db.deposits.values()).filter((d) =>
        d.status === DepositStatus.CONFIRMING || d.status === DepositStatus.DETECTED
      );
      const disputedP2P = Array.from(db.p2pTrades.values()).filter((t) => t.status === P2PEscrowStatus.DISPUTED);

      const memory = process.memoryUsage();

      res.json({
        success: true,
        health: {
          timestamp: now,
          uptimeSeconds: Math.floor(process.uptime()),
          eventLoopLagMs: Number(lagMs.toFixed(2)),
          process: {
            nodeVersion: process.version,
            platform: `${process.platform}/${process.arch}`,
            pid: process.pid,
            rssMb: Number((memory.rss / 1024 / 1024).toFixed(1)),
            heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1))
          },
          metrics: {
            totalUsers: db.users.size,
            usersActive24h: activeUserIds.size,
            openOrders: openOrders.length,
            trades24h: trades24h.length,
            pendingKycReviews: complianceService.getPendingApplications().length,
            pendingWithdrawals: pendingWithdrawals.length,
            depositsAwaitingConfirmation: confirmingDeposits.length,
            disputedP2pTrades: disputedP2P.length,
            websocketConnections: clients.size,
            ledgerAccounts: db.accounts.size,
            ledgerTransactions: db.ledgerTransactions.size,
            auditLogEntries: db.auditLogs.length
          },
          services: [
            { name: 'API Gateway', status: 'HEALTHY', detail: `port ${PORT}` },
            { name: 'Matching Engine', status: matchingEngineOk ? 'HEALTHY' : 'CRITICAL', detail: matchingEngineOk ? `${Object.keys(MARKET_REGISTRY).length} order books responsive` : 'order book probe failed' },
            { name: 'Risk Engine', status: db.circuitBreakers.isGlobalTradingHalted ? 'DEGRADED' : 'HEALTHY', detail: db.circuitBreakers.isGlobalTradingHalted ? 'global trading halt engaged' : 'all checks active' },
            { name: 'WebSocket Server', status: 'HEALTHY', detail: `${clients.size} connected clients` },
            { name: 'Ledger', status: 'HEALTHY', detail: `${db.accounts.size} accounts, ${db.ledgerTransactions.size} transactions` },
            { name: 'Database', status: 'HEALTHY', detail: 'in-memory transactional store' },
            { name: 'Compliance Service', status: complianceService.getPendingApplications().length > 0 ? 'DEGRADED' : 'HEALTHY', detail: `${complianceService.getPendingApplications().length} KYC cases awaiting review` },
            { name: 'Wallet Service', status: db.circuitBreakers.isWithdrawalsPaused ? 'DEGRADED' : 'HEALTHY', detail: db.circuitBreakers.isWithdrawalsPaused ? 'withdrawals paused' : 'processing' }
          ],
          circuitBreakers: db.circuitBreakers
        }
      });
    });
  }
);

// ---------- User Management ----------
const USER_READ_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.COMPLIANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR];
const USER_MUTATE_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.COMPLIANCE_OFFICER];

app.get(
  '/api/v1/admin/users',
  authMiddleware,
  requireAdminRole(...USER_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const kycStatus = req.query.kycStatus as KycStatus | undefined;
    const kycTier = req.query.kycTier as KycTier | undefined;
    const suspendedParam = req.query.suspended as string | undefined;
    const totpParam = req.query.totpEnabled as string | undefined;

    let users = Array.from(db.users.values());

    if (search) {
      users = users.filter((u) =>
        u.email.toLowerCase().includes(search) ||
        u.id.toLowerCase().includes(search) ||
        (u.fullName || '').toLowerCase().includes(search)
      );
    }
    if (kycStatus && Object.values(KycStatus).includes(kycStatus)) {
      users = users.filter((u) => u.kycStatus === kycStatus);
    }
    if (kycTier && Object.values(KycTier).includes(kycTier)) {
      users = users.filter((u) => u.kycTier === kycTier);
    }
    if (suspendedParam === 'true' || suspendedParam === 'false') {
      const wantSuspended = suspendedParam === 'true';
      users = users.filter((u) => u.isSuspended === wantSuspended);
    }
    if (totpParam === 'true' || totpParam === 'false') {
      const wantTotp = totpParam === 'true';
      users = users.filter((u) => u.isTotpEnabled === wantTotp);
    }

    users.sort((a, b) => b.createdAt - a.createdAt);

    const total = users.length;
    const paged = users.slice(offset, offset + limit).map(sanitizeUser);

    res.json({ success: true, users: paged, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

app.get(
  '/api/v1/admin/users/:id',
  authMiddleware,
  requireAdminRole(...USER_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const user = db.users.get(req.params.id as string);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const userId = user.id;
    const orders = Array.from(db.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    const trades = Array.from(db.trades.values())
      .filter((t) => t.buyerUserId === userId || t.sellerUserId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    const deposits = walletService.getUserDeposits(userId).slice(0, 50);
    const withdrawals = Array.from(db.withdrawals.values())
      .filter((w) => w.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    const transfers = walletService.getUserTransfers(userId).slice(0, 50);
    const kycApplications = complianceService.getApplicationsByUser(userId);
    const auditLogs = db.auditLogs.filter((l) => l.actorId === userId || l.targetId === userId).slice(-50).reverse();
    const p2pTrades = p2pService.getTradesByUser(userId).slice(0, 50);

    res.json({
      success: true,
      user: sanitizeUser(user),
      balances: ledgerService.getUserBalances(userId),
      orders,
      trades,
      deposits,
      withdrawals,
      transfers,
      kycApplications,
      p2pTrades,
      auditLogs
    });
  }
);

function applyAccountRestriction(req: AuthenticatedRequest, res: Response, mutate: (user: User) => { action: string; before: Record<string, unknown>; after: Record<string, unknown> }): void {
  try {
    const reason = requireReason(req.body);
    const user = db.users.get(req.params.id as string);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const { action, before, after } = mutate(user);
    user.updatedAt = Date.now();
    db.logAudit({
      actorId: req.user!.userId,
      actorType: 'ADMIN',
      action,
      targetId: user.id,
      ipAddress: req.ip,
      metadata: { reason, before, after }
    });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
}

app.post(
  '/api/v1/admin/users/:id/suspend',
  authMiddleware,
  requireAdminRole(...USER_MUTATE_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    applyAccountRestriction(req, res, (user) => {
      const before = { isSuspended: user.isSuspended };
      user.isSuspended = true;
      return { action: 'ADMIN_USER_SUSPENDED', before, after: { isSuspended: true } };
    });
  }
);

app.post(
  '/api/v1/admin/users/:id/unsuspend',
  authMiddleware,
  requireAdminRole(...USER_MUTATE_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    applyAccountRestriction(req, res, (user) => {
      const before = { isSuspended: user.isSuspended };
      user.isSuspended = false;
      return { action: 'ADMIN_USER_UNSUSPENDED', before, after: { isSuspended: false } };
    });
  }
);

app.post(
  '/api/v1/admin/users/:id/withdrawal-restriction',
  authMiddleware,
  requireAdminRole(...USER_MUTATE_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const restricted = Boolean(req.body?.restricted);
    applyAccountRestriction(req, res, (user) => {
      const before = { isWithdrawalSuspended: user.isWithdrawalSuspended };
      user.isWithdrawalSuspended = restricted;
      return {
        action: restricted ? 'ADMIN_WITHDRAWALS_RESTRICTED' : 'ADMIN_WITHDRAWALS_UNRESTRICTED',
        before,
        after: { isWithdrawalSuspended: restricted }
      };
    });
  }
);

// ---------- Treasury & Finance ----------
const FINANCE_READ_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR];

app.get(
  '/api/v1/admin/wallet/balances',
  authMiddleware,
  requireAdminRole(...FINANCE_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const summary = ledgerService.getTreasurySummary();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Authoritative 24h fee revenue derived from executed trade records
    const fees24h: Record<string, { baseFees: string; quoteFees: string }> = {};
    for (const trade of db.trades.values()) {
      if (trade.timestamp < dayAgo) continue;

      if (!fees24h[trade.buyerFeeAsset]) fees24h[trade.buyerFeeAsset] = { baseFees: '0', quoteFees: '0' };
      fees24h[trade.buyerFeeAsset].baseFees = new Decimal(fees24h[trade.buyerFeeAsset].baseFees).plus(trade.buyerFee).toString();

      if (!fees24h[trade.sellerFeeAsset]) fees24h[trade.sellerFeeAsset] = { baseFees: '0', quoteFees: '0' };
      fees24h[trade.sellerFeeAsset].quoteFees = new Decimal(fees24h[trade.sellerFeeAsset].quoteFees).plus(trade.sellerFee).toString();
    }

    res.json({ success: true, treasury: summary.assets, timestamp: summary.timestamp, fees24h });
  }
);

app.get(
  '/api/v1/admin/proof-of-reserves',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.FINANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const audit = ledgerService.performProofOfReservesAudit();
    res.json({ success: true, audit });
  }
);

// ---------- Deposits ----------
app.get(
  '/api/v1/admin/deposits',
  authMiddleware,
  requireAdminRole(...FINANCE_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const status = req.query.status as DepositStatus | undefined;
    const asset = req.query.asset as AssetSymbol | undefined;
    const userId = req.query.userId as string | undefined;

    let deposits = Array.from(db.deposits.values());
    if (status && Object.values(DepositStatus).includes(status)) deposits = deposits.filter((d) => d.status === status);
    if (asset && Object.values(AssetSymbol).includes(asset)) deposits = deposits.filter((d) => d.asset === asset);
    if (userId) deposits = deposits.filter((d) => d.userId === userId);
    deposits.sort((a, b) => b.createdAt - a.createdAt);

    const total = deposits.length;
    const paged = deposits.slice(offset, offset + limit).map((d) => ({
      ...d,
      userEmail: db.users.get(d.userId)?.email || 'unknown'
    }));

    res.json({ success: true, deposits: paged, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

// ---------- Withdrawals ----------
app.get(
  '/api/v1/admin/withdrawals',
  authMiddleware,
  requireAdminRole(...FINANCE_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const status = req.query.status as WithdrawalStatus | undefined;
    const asset = req.query.asset as AssetSymbol | undefined;
    const minRiskScore = parseInt(req.query.minRiskScore as string, 10);

    let withdrawals = Array.from(db.withdrawals.values());
    if (status && Object.values(WithdrawalStatus).includes(status)) withdrawals = withdrawals.filter((w) => w.status === status);
    if (asset && Object.values(AssetSymbol).includes(asset)) withdrawals = withdrawals.filter((w) => w.asset === asset);
    if (!Number.isNaN(minRiskScore)) withdrawals = withdrawals.filter((w) => w.riskScore >= minRiskScore);
    withdrawals.sort((a, b) => b.createdAt - a.createdAt);

    const total = withdrawals.length;
    const paged = withdrawals.slice(offset, offset + limit).map((w) => ({
      ...w,
      userEmail: db.users.get(w.userId)?.email || 'unknown'
    }));

    res.json({ success: true, withdrawals: paged, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

const WITHDRAWAL_APPROVAL_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER];

app.post(
  '/api/v1/admin/withdrawals/:id/approve',
  authMiddleware,
  requireAdminRole(...WITHDRAWAL_APPROVAL_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reason = requireReason(req.body);
      const withdrawal = await walletService.approveWithdrawal(req.params.id as string, req.user!.userId);
      db.logAudit({
        actorId: req.user!.userId,
        actorType: 'ADMIN',
        action: 'WITHDRAWAL_APPROVAL_RECORDED',
        targetId: withdrawal.id,
        ipAddress: req.ip,
        metadata: { reason, finalStatus: withdrawal.status, amount: withdrawal.amount, asset: withdrawal.asset }
      });
      res.json({ success: true, withdrawal });
    } catch (err: any) {
      logger.warn(`Withdrawal approval failed: ${err?.message}`);
      res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
  }
);

app.post(
  '/api/v1/admin/withdrawals/:id/reject',
  authMiddleware,
  requireAdminRole(...WITHDRAWAL_APPROVAL_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const reason = requireReason(req.body);
      const withdrawal = walletService.rejectWithdrawal(req.params.id as string, req.user!.userId, reason);
      res.json({ success: true, withdrawal });
    } catch (err: any) {
      logger.warn(`Withdrawal rejection failed: ${err?.message}`);
      res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
  }
);

// ---------- Markets ----------
app.get(
  '/api/v1/admin/markets',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.RISK_ANALYST, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const markets = Object.values(MARKET_REGISTRY).map((market) => {
      const openOrders = Array.from(db.orders.values()).filter(
        (o) => o.symbol === market.symbol && [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED].includes(o.status)
      );
      const trades24h = Array.from(db.trades.values()).filter((t) => t.symbol === market.symbol && t.timestamp >= dayAgo);

      let lastPrice: string | null = null;
      let changePercent: string | null = null;
      try {
        const ticker = marketDataService.getTicker24h(market.symbol);
        lastPrice = ticker.lastPrice;
        changePercent = ticker.priceChangePercent;
      } catch (err) {
        logger.warn(`Ticker unavailable for ${market.symbol}`, { error: err instanceof Error ? err.message : String(err) });
      }

      return {
        ...market,
        stats: {
          openOrders: openOrders.length,
          trades24h: trades24h.length,
          volume24h: trades24h.reduce((acc, t) => acc.plus(t.quantity), Decimal.ZERO).toString(),
          lastPrice,
          changePercent,
          isHalted: Boolean(db.circuitBreakers.haltedMarkets[market.symbol]) || db.circuitBreakers.isGlobalTradingHalted
        }
      };
    });

    res.json({ success: true, markets });
  }
);

app.put(
  '/api/v1/admin/markets/:symbol',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.RISK_ANALYST),
  (req: AuthenticatedRequest, res: Response) => {
    const symbol = decodeURIComponent(req.params.symbol as string);
    const market = MARKET_REGISTRY[symbol];
    if (!market) {
      res.status(404).json({ success: false, error: `Market ${symbol} not found` });
      return;
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (typeof req.body?.isTradingEnabled === 'boolean') {
      before.isTradingEnabled = market.isTradingEnabled;
      market.isTradingEnabled = req.body.isTradingEnabled;
      after.isTradingEnabled = market.isTradingEnabled;
    }
    if (req.body?.priceBandPercent !== undefined) {
      const band = Number(req.body.priceBandPercent);
      if (!Number.isFinite(band) || band < 1 || band > 50) {
        res.status(400).json({ success: false, error: 'priceBandPercent must be a number between 1 and 50' });
        return;
      }
      before.priceBandPercent = market.priceBandPercent;
      market.priceBandPercent = band;
      after.priceBandPercent = band;
    }
    if (req.body?.makerFeeRate !== undefined) {
      const rate = Number(req.body.makerFeeRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 0.05) {
        res.status(400).json({ success: false, error: 'makerFeeRate must be between 0 and 0.05' });
        return;
      }
      before.makerFeeRate = market.makerFeeRate;
      market.makerFeeRate = String(rate);
      after.makerFeeRate = market.makerFeeRate;
    }
    if (req.body?.takerFeeRate !== undefined) {
      const rate = Number(req.body.takerFeeRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 0.05) {
        res.status(400).json({ success: false, error: 'takerFeeRate must be between 0 and 0.05' });
        return;
      }
      before.takerFeeRate = market.takerFeeRate;
      market.takerFeeRate = String(rate);
      after.takerFeeRate = market.takerFeeRate;
    }
    for (const field of ['minQty', 'maxQty', 'minNotional'] as const) {
      const bodyRecord = req.body as Record<string, unknown> | undefined;
      if (bodyRecord && bodyRecord[field] !== undefined) {
        const raw = String(bodyRecord[field]);
        const value = new Decimal(raw);
        if (!value.isPositive()) {
          res.status(400).json({ success: false, error: `${field} must be a positive number` });
          return;
        }
        before[field] = market[field];
        market[field] = raw;
        after[field] = raw;
      }
    }

    if (Object.keys(after).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid configuration fields supplied (isTradingEnabled, priceBandPercent, makerFeeRate, takerFeeRate, minQty, maxQty, minNotional)'
      });
      return;
    }

    db.logAudit({
      actorId: req.user!.userId,
      actorType: 'ADMIN',
      action: 'MARKET_CONFIG_UPDATED',
      targetId: symbol,
      ipAddress: req.ip,
      metadata: { before, after, reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined }
    });

    res.json({ success: true, market });
  }
);

// ---------- Order & Trade Surveillance ----------
app.get(
  '/api/v1/admin/orders',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const symbol = req.query.symbol as string | undefined;
    const status = req.query.status as OrderStatus | undefined;
    const side = req.query.side as OrderSide | undefined;

    let orders = Array.from(db.orders.values());
    if (symbol) orders = orders.filter((o) => o.symbol === symbol);
    if (status && Object.values(OrderStatus).includes(status)) orders = orders.filter((o) => o.status === status);
    if (side && Object.values(OrderSide).includes(side)) orders = orders.filter((o) => o.side === side);
    orders.sort((a, b) => b.createdAt - a.createdAt);

    const total = orders.length;
    const paged = orders.slice(offset, offset + limit).map((o) => ({
      ...o,
      userEmail: db.users.get(o.userId)?.email || 'unknown'
    }));

    res.json({ success: true, orders: paged, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

app.get(
  '/api/v1/admin/trades',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.RISK_ANALYST, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const symbol = req.query.symbol as string | undefined;

    let trades = Array.from(db.trades.values());
    if (symbol) trades = trades.filter((t) => t.symbol === symbol);
    trades.sort((a, b) => b.timestamp - a.timestamp);

    const total = trades.length;
    const paged = trades.slice(offset, offset + limit);

    res.json({ success: true, trades: paged, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

// ---------- KYC / Compliance ----------
app.get(
  '/api/v1/admin/kyc/pending',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER),
  (req: AuthenticatedRequest, res: Response) => {
    const pending = complianceService.getPendingApplications();
    res.json({ success: true, applications: pending });
  }
);

app.get(
  '/api/v1/admin/kyc/all',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const applications = complianceService.getAllApplications().map((a) => ({
      ...a,
      userEmail: db.users.get(a.userId)?.email || 'unknown'
    }));
    res.json({ success: true, applications });
  }
);

app.post(
  '/api/v1/admin/kyc/review',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER),
  (req: AuthenticatedRequest, res: Response) => {
    const { kycId, approved, rejectionReason } = req.body;
    const result = complianceService.reviewKyc(kycId, approved, req.user!.userId, rejectionReason);
    res.json({ success: true, application: result });
  }
);

// ---------- P2P Escrow Oversight ----------
app.get(
  '/api/v1/admin/p2p/escrows',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as P2PEscrowStatus | undefined;
    let trades = p2pService.getAllTrades();
    if (status && Object.values(P2PEscrowStatus).includes(status)) {
      trades = trades.filter((t) => t.status === status);
    }
    const enriched = trades.map((t) => ({
      ...t,
      buyerEmail: db.users.get(t.buyerUserId)?.email || t.buyerUserId,
      sellerEmail: db.users.get(t.sellerUserId)?.email || t.sellerUserId
    }));
    res.json({ success: true, escrows: enriched });
  }
);

app.post(
  '/api/v1/admin/p2p/escrows/:id/resolve',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const action = req.body?.action;
      if (action !== 'RELEASE' && action !== 'CANCEL') {
        res.status(400).json({ success: false, error: "action must be 'RELEASE' or 'CANCEL'" });
        return;
      }
      const reason = requireReason(req.body);
      const trade = p2pService.adminResolveDispute(req.params.id as string, req.user!.userId, action, reason);
      res.json({ success: true, trade });
    } catch (err: any) {
      logger.warn(`P2P dispute resolution failed: ${err?.message}`);
      res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
  }
);

// ---------- Internal Transfers ----------
app.get(
  '/api/v1/admin/transfers',
  authMiddleware,
  requireAdminRole(...FINANCE_READ_ROLES),
  (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req);
    const type = req.query.type as string | undefined;
    let transfers = Array.from(db.transfers.values());
    if (type) transfers = transfers.filter((t) => t.type === type);
    transfers.sort((a, b) => b.createdAt - a.createdAt);

    const total = transfers.length;
    res.json({ success: true, transfers: transfers.slice(offset, offset + limit), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }
);

// ---------- P2P Advertisements ----------
app.get(
  '/api/v1/admin/p2p/ads',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const ads = Array.from(db.p2pAds.values()).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, ads });
  }
);

// ---------- Security Center ----------
app.get(
  '/api/v1/admin/api-keys',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    // Metadata only: never expose full API keys or secret hashes.
    const apiKeys = Array.from(db.apiKeys.values()).map((k) => ({
      id: k.id,
      userId: k.userId,
      userEmail: db.users.get(k.userId)?.email || 'unknown',
      label: k.label,
      keyPrefix: `${k.key.slice(0, 11)}…`,
      permissions: k.permissions,
      ipWhitelist: k.ipWhitelist,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt
    }));
    res.json({ success: true, apiKeys });
  }
);

app.get(
  '/api/v1/admin/security/events',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const securityActions = ['AUTH_LOGIN_FAILED'];
    const events = db.auditLogs
      .filter((l) => securityActions.includes(l.action))
      .slice(-200)
      .reverse();
    const failedByUser = new Map<string, number>();
    for (const log of db.auditLogs) {
      if (log.action !== 'AUTH_LOGIN_FAILED') continue;
      failedByUser.set(log.actorId, (failedByUser.get(log.actorId) || 0) + 1);
    }
    res.json({
      success: true,
      events,
      summary: {
        failedLoginAttempts: events.length,
        distinctTargetAccounts: failedByUser.size,
        topTargets: Array.from(failedByUser.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([actorId, count]) => ({ actorId, count }))
      }
    });
  }
);

// ---------- Audit Logs ----------
app.get(
  '/api/v1/admin/audit-logs',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 100));
    const actorId = req.query.actorId as string | undefined;
    const action = req.query.action as string | undefined;
    const actorType = req.query.actorType as string | undefined;

    let logs = db.auditLogs;
    if (actorId) logs = logs.filter((l) => l.actorId.includes(actorId));
    if (action) logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
    if (actorType) logs = logs.filter((l) => l.actorType === actorType);

    res.json({ success: true, logs: logs.slice(-limit).reverse(), total: logs.length });
  }
);

app.get(
  '/api/v1/admin/audit-logs/export',
  authMiddleware,
  requireAdminRole(AdminRole.SUPER_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.READ_ONLY_AUDITOR),
  (req: AuthenticatedRequest, res: Response) => {
    const cap = 5000;
    const logs = db.auditLogs.slice(-cap);

    const escapeCsv = (value: unknown): string => {
      const str = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const header = 'id,timestamp,actorId,actorType,action,targetId,ipAddress';
    const rows = logs.map((l) =>
      [l.id, new Date(l.timestamp).toISOString(), l.actorId, l.actorType, l.action, l.targetId ?? '', l.ipAddress ?? '']
        .map(escapeCsv)
        .join(',')
    );

    db.logAudit({
      actorId: req.user!.userId,
      actorType: 'ADMIN',
      action: 'AUDIT_LOG_EXPORTED',
      metadata: { exportedRows: rows.length }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="syncnode-audit-logs-${Date.now()}.csv"`);
    res.send([header, ...rows].join('\n'));
  }
);

// ---------- Global Error Handler ----------
// Terminal middleware: converts thrown errors into JSON responses without
// ever leaking stack traces or internal details to the client.
app.use(
  (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (res.headersSent) {
      _next(err);
      return;
    }
    if (err instanceof AppError) {
      logger.warn(`${err.name} on ${req.method} ${req.path}: ${err.message}`);
      res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
      return;
    }
    logger.error(
      `Unhandled error on ${req.method} ${req.path}`,
      err instanceof Error ? err : new Error(String(err))
    );
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
);

// ==============================================================================
// 11. WEBSOCKET STREAMING HUB (CRIT-004: Authenticated WebSockets)
// ==============================================================================
interface ClientSubscription {
  ws: WebSocket;
  channels: Set<string>;
  userId?: string;
  isAuthenticated: boolean;
  authTimeoutTimer?: NodeJS.Timeout;
}
const clients = new Map<WebSocket, ClientSubscription>();

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  let initialToken: string | null = null;
  if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      initialToken = parsedUrl.searchParams.get('token');
    } catch (e) {
      logger.warn(`Failed to parse WebSocket handshake URL: ${req.url}`);
    }
  }

  let isAuthenticated = false;
  let authenticatedUser: AuthJwtPayload | undefined = undefined;

  if (initialToken) {
    try {
      authenticatedUser = verifyToken(initialToken);
      isAuthenticated = true;
      logger.info(`WebSocket client connected and authenticated via handshake for user ${authenticatedUser.userId}`);
    } catch (err: any) {
      logger.warn(`WebSocket handshake token validation failed: ${err?.message}`);
    }
  }

  const sub: ClientSubscription = {
    ws,
    channels: new Set(),
    userId: authenticatedUser?.userId,
    isAuthenticated
  };

  if (!isAuthenticated) {
    sub.authTimeoutTimer = setTimeout(() => {
      const hasPrivateChannel = Array.from(sub.channels).some((c) => c.startsWith('orders@') || c.startsWith('wallet@'));
      if (hasPrivateChannel && !sub.isAuthenticated) {
        logger.warn('Closing unauthenticated WebSocket attempting private channels');
        ws.close(4401, 'Unauthorized');
      }
    }, 5000);
  }

  clients.set(ws, sub);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.action === 'AUTH') {
        try {
          const payload = verifyToken(data.token);
          sub.isAuthenticated = true;
          sub.userId = payload.userId;
          if (sub.authTimeoutTimer) clearTimeout(sub.authTimeoutTimer);
          ws.send(JSON.stringify({ event: 'authenticated', userId: payload.userId }));
        } catch (err: any) {
          logger.warn(`WebSocket AUTH frame rejected: ${err?.message}`);
          ws.send(JSON.stringify({ event: 'error', message: 'Authentication failed' }));
          ws.close(4401, 'Unauthorized');
        }
        return;
      }

      if (data.action === 'SUBSCRIBE' && Array.isArray(data.channels)) {
        for (const ch of data.channels) {
          if ((ch.startsWith('orders@') || ch.startsWith('wallet@')) && !sub.isAuthenticated) {
            ws.send(JSON.stringify({ event: 'error', message: `Authentication required for channel ${ch}` }));
            continue;
          }
          sub.channels.add(ch);
        }
        ws.send(JSON.stringify({ event: 'subscribed', channels: Array.from(sub.channels) }));
      } else if (data.action === 'UNSUBSCRIBE' && Array.isArray(data.channels)) {
        for (const ch of data.channels) sub.channels.delete(ch);
        ws.send(JSON.stringify({ event: 'unsubscribed', channels: Array.from(sub.channels) }));
      }
    } catch (e: any) {
      logger.warn(`Malformed message received on WebSocket: ${e?.message}`);
    }
  });

  ws.on('close', () => {
    if (sub.authTimeoutTimer) clearTimeout(sub.authTimeoutTimer);
    clients.delete(ws);
  });
});

function broadcastMarketTrade(trade: any): void {
  const channel = `trades@${trade.symbol}`;
  const payload = JSON.stringify({ channel, data: trade });
  for (const client of clients.values()) {
    if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastDepth(symbol: string): void {
  const channel = `depth@${symbol}`;
  const depth = matchingEngine.getDepth(symbol, 20);
  const payload = JSON.stringify({ channel, data: depth });
  for (const client of clients.values()) {
    if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastTicker(symbol: string): void {
  const channel = `ticker@${symbol}`;
  const ticker = marketDataService.getTicker24h(symbol);
  const payload = JSON.stringify({ channel, data: ticker });
  for (const client of clients.values()) {
    if (client.channels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

const PORT = process.env.PORT || 4000;

/**
 * Ensure at least one SUPER_ADMIN exists so the operations console is reachable.
 *
 * Production: requires ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD env vars.
 * Non-production: falls back to documented local development credentials when
 * the env vars are absent so engineers can exercise the admin console locally.
 * The bootstrap is idempotent and every creation is audit logged.
 */
async function ensureBootstrapAdmin(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  let email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  let usingDevDefaults = false;

  if (!email || !password) {
    if (isProduction) {
      logger.info('ADMIN_BOOTSTRAP_EMAIL/PASSWORD not configured; admin bootstrap skipped');
      return;
    }
    email = 'poweldayck@gmail.com';
    password = 'Kapenguria@12';
    usingDevDefaults = true;
  }

  const existingId = db.usersByEmail.get(email);
  if (existingId) {
    const existing = db.users.get(existingId);
    if (existing && !existing.adminRole) {
      existing.adminRole = AdminRole.SUPER_ADMIN;
      existing.updatedAt = Date.now();
      logger.warn(`Existing bootstrap account ${email} elevated to SUPER_ADMIN`);
    }
    return;
  }

  const userId = `admin_${Date.now().toString(36)}`;
  const passwordHash = await hashPassword(password);
  const admin: User = {
    id: userId,
    email,
    passwordHash,
    fullName: 'Exchange Administrator',
    adminRole: AdminRole.SUPER_ADMIN,
    isTotpEnabled: false,
    kycTier: KycTier.TIER_3_INSTITUTIONAL,
    kycStatus: KycStatus.APPROVED,
    isSuspended: false,
    isWithdrawalSuspended: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.users.set(userId, admin);
  db.usersByEmail.set(email, userId);

  db.logAudit({
    actorId: 'SYSTEM',
    actorType: 'SYSTEM',
    action: 'BOOTSTRAP_SUPER_ADMIN_CREATED',
    targetId: userId,
    metadata: { email }
  });

  if (usingDevDefaults) {
    logger.warn(`DEV BOOTSTRAP SUPER_ADMIN created -> email: ${email} password: ${password} (configure ADMIN_BOOTSTRAP_* to override)`);
  } else {
    logger.info(`Bootstrap SUPER_ADMIN created for ${email}`);
  }
}

server.listen(PORT, () => {
  logger.info(`Syncnode API Gateway & WebSocket Server running on port ${PORT}`);
  ensureBootstrapAdmin().catch((err) => {
    logger.error('Admin bootstrap failed', err instanceof Error ? err : new Error(String(err)));
  });
});

export { app, server };
