export enum AssetSymbol {
  BTC = 'BTC',
  ETH = 'ETH',
  SOL = 'SOL',
  USDT = 'USDT',
  USDC = 'USDC'
}

export interface AssetDefinition {
  symbol: AssetSymbol;
  name: string;
  decimals: number;
  minDeposit: string;
  minWithdrawal: string;
  withdrawalFee: string;
  confirmationsRequired: number;
  networks: string[];
  isDepositEnabled: boolean;
  isWithdrawalEnabled: boolean;
}

export const ASSET_REGISTRY: Record<AssetSymbol, AssetDefinition> = {
  [AssetSymbol.BTC]: {
    symbol: AssetSymbol.BTC,
    name: 'Bitcoin',
    decimals: 8,
    minDeposit: '0.0001',
    minWithdrawal: '0.0005',
    withdrawalFee: '0.0002',
    confirmationsRequired: 3,
    networks: ['Bitcoin-Mainnet', 'Bitcoin-Testnet'],
    isDepositEnabled: true,
    isWithdrawalEnabled: true
  },
  [AssetSymbol.ETH]: {
    symbol: AssetSymbol.ETH,
    name: 'Ethereum',
    decimals: 18,
    minDeposit: '0.001',
    minWithdrawal: '0.005',
    withdrawalFee: '0.002',
    confirmationsRequired: 12,
    networks: ['Ethereum-Mainnet', 'Sepolia'],
    isDepositEnabled: true,
    isWithdrawalEnabled: true
  },
  [AssetSymbol.SOL]: {
    symbol: AssetSymbol.SOL,
    name: 'Solana',
    decimals: 9,
    minDeposit: '0.05',
    minWithdrawal: '0.1',
    withdrawalFee: '0.01',
    confirmationsRequired: 32,
    networks: ['Solana-Mainnet', 'Solana-Devnet'],
    isDepositEnabled: true,
    isWithdrawalEnabled: true
  },
  [AssetSymbol.USDT]: {
    symbol: AssetSymbol.USDT,
    name: 'Tether USD',
    decimals: 6,
    minDeposit: '1.00',
    minWithdrawal: '5.00',
    withdrawalFee: '1.00',
    confirmationsRequired: 12,
    networks: ['Ethereum-ERC20', 'Tron-TRC20', 'Polygon'],
    isDepositEnabled: true,
    isWithdrawalEnabled: true
  },
  [AssetSymbol.USDC]: {
    symbol: AssetSymbol.USDC,
    name: 'USD Coin',
    decimals: 6,
    minDeposit: '1.00',
    minWithdrawal: '5.00',
    withdrawalFee: '1.00',
    confirmationsRequired: 12,
    networks: ['Ethereum-ERC20', 'Solana-SPL', 'Polygon'],
    isDepositEnabled: true,
    isWithdrawalEnabled: true
  }
};

export interface MarketPair {
  symbol: string; // e.g. 'BTC/USDT'
  baseAsset: AssetSymbol;
  quoteAsset: AssetSymbol;
  priceDecimals: number;
  qtyDecimals: number;
  minQty: string;
  maxQty: string;
  minNotional: string;
  tickSize: string;
  lotSize: string;
  makerFeeRate: string; // 0.0010 = 0.10%
  takerFeeRate: string; // 0.0015 = 0.15%
  isTradingEnabled: boolean;
  priceBandPercent: number; // e.g. 10 means +/- 10% from mark price
}

export const MARKET_REGISTRY: Record<string, MarketPair> = {
  'BTC/USDT': {
    symbol: 'BTC/USDT',
    baseAsset: AssetSymbol.BTC,
    quoteAsset: AssetSymbol.USDT,
    priceDecimals: 2,
    qtyDecimals: 6,
    minQty: '0.00001',
    maxQty: '100.0',
    minNotional: '5.00',
    tickSize: '0.01',
    lotSize: '0.00001',
    makerFeeRate: '0.001',
    takerFeeRate: '0.0015',
    isTradingEnabled: true,
    priceBandPercent: 10
  },
  'ETH/USDT': {
    symbol: 'ETH/USDT',
    baseAsset: AssetSymbol.ETH,
    quoteAsset: AssetSymbol.USDT,
    priceDecimals: 2,
    qtyDecimals: 5,
    minQty: '0.0001',
    maxQty: '1000.0',
    minNotional: '5.00',
    tickSize: '0.01',
    lotSize: '0.0001',
    makerFeeRate: '0.001',
    takerFeeRate: '0.0015',
    isTradingEnabled: true,
    priceBandPercent: 10
  },
  'SOL/USDT': {
    symbol: 'SOL/USDT',
    baseAsset: AssetSymbol.SOL,
    quoteAsset: AssetSymbol.USDT,
    priceDecimals: 2,
    qtyDecimals: 4,
    minQty: '0.001',
    maxQty: '5000.0',
    minNotional: '5.00',
    tickSize: '0.01',
    lotSize: '0.001',
    makerFeeRate: '0.001',
    takerFeeRate: '0.0015',
    isTradingEnabled: true,
    priceBandPercent: 10
  },
  'ETH/BTC': {
    symbol: 'ETH/BTC',
    baseAsset: AssetSymbol.ETH,
    quoteAsset: AssetSymbol.BTC,
    priceDecimals: 6,
    qtyDecimals: 4,
    minQty: '0.001',
    maxQty: '500.0',
    minNotional: '0.0001',
    tickSize: '0.000001',
    lotSize: '0.001',
    makerFeeRate: '0.001',
    takerFeeRate: '0.0015',
    isTradingEnabled: true,
    priceBandPercent: 10
  }
};

// ==========================
// Order Types & Enums
// ==========================
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP_LIMIT = 'STOP_LIMIT'
}

export enum TimeInForce {
  GTC = 'GTC', // Good 'Til Cancelled
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
  POST_ONLY = 'POST_ONLY'
}

export enum OrderStatus {
  NEW = 'NEW',
  VALIDATED = 'VALIDATED',
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCEL_REQUESTED = 'CANCEL_REQUESTED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED'
}

export enum SelfTradePrevention {
  CANCEL_MAKER = 'CANCEL_MAKER',
  CANCEL_TAKER = 'CANCEL_TAKER',
  CANCEL_BOTH = 'CANCEL_BOTH',
  DECREMENT_AND_CANCEL = 'DECREMENT_AND_CANCEL'
}

export interface Order {
  id: string;
  clientOrderId?: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price?: string;
  stopPrice?: string;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  cumulativeQuoteQuantity: string;
  status: OrderStatus;
  selfTradePrevention: SelfTradePrevention;
  lockedAmount: string;
  lockedAsset: AssetSymbol;
  createdAt: number;
  updatedAt: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerUserId: string;
  sellerUserId: string;
  makerSide: OrderSide;
  buyerFee: string;
  buyerFeeAsset: AssetSymbol;
  sellerFee: string;
  sellerFeeAsset: AssetSymbol;
  timestamp: number;
}

// ==========================
// Ledger & Accounting Types
// ==========================
export enum AccountCategory {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum AccountType {
  // Exchange Vaults (Assets)
  EXCHANGE_HOT_WALLET = 'EXCHANGE_HOT_WALLET',
  EXCHANGE_COLD_STORAGE = 'EXCHANGE_COLD_STORAGE',
  
  // Customer Balances (Liabilities)
  USER_AVAILABLE = 'USER_AVAILABLE',
  USER_LOCKED = 'USER_LOCKED',
  USER_WITHDRAWAL_PENDING = 'USER_WITHDRAWAL_PENDING',
  USER_P2P_ESCROW = 'USER_P2P_ESCROW',

  // Exchange Earnings (Revenue)
  TRADING_FEES = 'TRADING_FEES',
  WITHDRAWAL_FEES = 'WITHDRAWAL_FEES',

  // Expenses
  BLOCKCHAIN_GAS_EXPENSE = 'BLOCKCHAIN_GAS_EXPENSE'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL_LOCK = 'WITHDRAWAL_LOCK',
  WITHDRAWAL_FINALIZE = 'WITHDRAWAL_FINALIZE',
  WITHDRAWAL_CANCEL = 'WITHDRAWAL_CANCEL',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  FIAT_DEPOSIT = 'FIAT_DEPOSIT',
  FIAT_WITHDRAWAL = 'FIAT_WITHDRAWAL',
  ORDER_LOCK = 'ORDER_LOCK',
  ORDER_UNLOCK = 'ORDER_UNLOCK',
  TRADE_SETTLEMENT = 'TRADE_SETTLEMENT',
  P2P_ESCROW_LOCK = 'P2P_ESCROW_LOCK',
  P2P_ESCROW_RELEASE = 'P2P_ESCROW_RELEASE',
  P2P_ESCROW_CANCEL = 'P2P_ESCROW_CANCEL',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT'
}

export enum EntryDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface JournalEntry {
  id: string;
  accountId: string;
  userId?: string;
  accountType: AccountType;
  asset: AssetSymbol;
  direction: EntryDirection;
  amount: string;
  createdAt: number;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  referenceId: string;
  idempotencyKey: string;
  description: string;
  entries: JournalEntry[];
  createdAt: number;
}

export interface UserBalance {
  asset: AssetSymbol;
  available: string;
  locked: string;
  pendingWithdrawal: string;
  p2pEscrow: string;
  total: string;
}

// ==========================
// User, KYC & Identity
// ==========================
export enum KycTier {
  TIER_0_UNVERIFIED = 'TIER_0_UNVERIFIED',
  TIER_1_BASIC = 'TIER_1_BASIC',
  TIER_2_VERIFIED = 'TIER_2_VERIFIED',
  TIER_3_INSTITUTIONAL = 'TIER_3_INSTITUTIONAL'
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SECURITY_ADMIN = 'SECURITY_ADMIN',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  FINANCE_OFFICER = 'FINANCE_OFFICER',
  RISK_ANALYST = 'RISK_ANALYST',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  READ_ONLY_AUDITOR = 'READ_ONLY_AUDITOR'
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  /** Assigned administrative role. Undefined for standard customer accounts. */
  adminRole?: AdminRole;
  fullName?: string;
  country?: string;
  investmentGoals?: string;
  riskTolerance?: string;
  preferredIndustry?: string;
  totpSecret?: string;
  isTotpEnabled: boolean;
  kycTier: KycTier;
  kycStatus: KycStatus;
  isSuspended: boolean;
  isWithdrawalSuspended: boolean;
  antiPhishingCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiKey {
  id: string;
  userId: string;
  key: string;
  secretHash: string;
  label: string;
  permissions: {
    canRead: boolean;
    canTrade: boolean;
    canWithdraw: boolean;
  };
  ipWhitelist?: string[];
  lastUsedAt?: number;
  createdAt: number;
}

// ==========================
// Wallet, Deposit, Withdrawal
// ==========================
export enum DepositStatus {
  DETECTED = 'DETECTED',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  CREDITED = 'CREDITED',
  FAILED = 'FAILED'
}

export interface DepositRecord {
  id: string;
  userId: string;
  asset: AssetSymbol;
  network: string;
  address: string;
  txHash: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  status: DepositStatus;
  createdAt: number;
  updatedAt: number;
}

export enum WithdrawalStatus {
  REQUESTED = 'REQUESTED',
  PENDING_2FA = 'PENDING_2FA',
  RISK_REVIEW = 'RISK_REVIEW',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  BROADCASTED = 'BROADCASTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED'
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  asset: AssetSymbol;
  network: string;
  destinationAddress: string;
  amount: string;
  fee: string;
  netAmount: string;
  txHash?: string;
  status: WithdrawalStatus;
  riskScore: number;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================
// P2P Marketplace
// ==========================
export enum P2POrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum P2PEscrowStatus {
  CREATED = 'CREATED',
  ESCROW_LOCKED = 'ESCROW_LOCKED',
  FIAT_MARKED_PAID = 'FIAT_MARKED_PAID',
  RELEASED = 'RELEASED',
  DISPUTED = 'DISPUTED',
  CANCELED = 'CANCELED'
}

export interface P2PAd {
  id: string;
  merchantId: string;
  merchantName: string;
  type: P2POrderType; // Buy/Sell crypto
  asset: AssetSymbol;
  fiatCurrency: string; // e.g. USD, EUR, GBP
  price: string;
  totalCryptoAmount: string;
  availableCryptoAmount: string;
  minFiatLimit: string;
  maxFiatLimit: string;
  paymentMethods: string[];
  terms: string;
  isActive: boolean;
  createdAt: number;
}

export interface P2PTrade {
  id: string;
  adId: string;
  buyerUserId: string;
  sellerUserId: string;
  asset: AssetSymbol;
  cryptoAmount: string;
  fiatAmount: string;
  fiatCurrency: string;
  price: string;
  paymentMethod: string;
  status: P2PEscrowStatus;
  escrowLockedAt?: number;
  fiatPaidAt?: number;
  releasedAt?: number;
  disputeReason?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================
// Risk & Emergency Controls
// ==========================
export interface CircuitBreakers {
  isGlobalTradingHalted: boolean;
  haltedMarkets: Record<string, boolean>;
  isWithdrawalsPaused: boolean;
  isDepositsPaused: boolean;
  emergencyMaintenance: boolean;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  action: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// ==========================
// Transfers & Payments
// ==========================
export enum TransferType {
  INTERNAL = 'INTERNAL',
  EXTERNAL_CRYPTO = 'EXTERNAL_CRYPTO',
  EXTERNAL_FIAT = 'EXTERNAL_FIAT'
}

export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface TransferRecord {
  id: string;
  type: TransferType;
  senderUserId: string;
  senderEmail?: string;
  recipientIdentifier: string; // Recipient User ID, Email, or External Address / IBAN
  recipientUserId?: string;
  recipientEmail?: string;
  asset: AssetSymbol | string;
  network?: string;
  amount: string;
  fee: string;
  netAmount: string;
  status: TransferStatus;
  note?: string;
  txHash?: string;
  referenceId?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================
// Live Market Data Feeds
// ==========================
export interface LiveMarketFeedSummary {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  source: 'LIVE_BINANCE_API' | 'LIVE_COINGECKO_API' | 'HIGH_PRECISION_SIMULATOR';
  isLive: boolean;
  latencyMs: number;
  lastUpdated: number;
}

