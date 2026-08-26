// ==========================================================================
// SyncNode Admin Console - TypeScript interfaces mirroring backend responses.
// Every type reflects the authoritative API contract in
// services/api-gateway/src/server.ts. No invented fields.
// ==========================================================================

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'SECURITY_ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'FINANCE_OFFICER'
  | 'RISK_ANALYST'
  | 'SUPPORT_AGENT'
  | 'READ_ONLY_AUDITOR';

export type AssetSymbol = 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'USDC';

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
}

export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export interface AdminServiceStatus {
  name: string;
  status: ServiceStatus;
  detail: string;
}

export interface CircuitBreakersState {
  isGlobalTradingHalted: boolean;
  haltedMarkets: Record<string, boolean>;
  isWithdrawalsPaused: boolean;
  isDepositsPaused: boolean;
  emergencyMaintenance: boolean;
}

export interface SystemHealth {
  timestamp: number;
  uptimeSeconds: number;
  eventLoopLagMs: number;
  process: {
    nodeVersion: string;
    platform: string;
    pid: number;
    rssMb: number;
    heapUsedMb: number;
  };
  metrics: {
    totalUsers: number;
    usersActive24h: number;
    openOrders: number;
    trades24h: number;
    pendingKycReviews: number;
    pendingWithdrawals: number;
    depositsAwaitingConfirmation: number;
    disputedP2pTrades: number;
    websocketConnections: number;
    ledgerAccounts: number;
    ledgerTransactions: number;
    auditLogEntries: number;
  };
  services: AdminServiceStatus[];
  circuitBreakers: CircuitBreakersState;
}

export type KycTierValue = 'TIER_0_UNVERIFIED' | 'TIER_1_BASIC' | 'TIER_2_VERIFIED' | 'TIER_3_INSTITUTIONAL';
export type KycStatusValue = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type AssetSymbolValue = 'BTC' | 'ETH' | 'SOL' | 'USDT' | 'USDC';

export interface AdminUser {
  id: string;
  email: string;
  adminRole?: AdminRole;
  fullName?: string;
  country?: string;
  investmentGoals?: string;
  riskTolerance?: string;
  preferredIndustry?: string;
  isTotpEnabled: boolean;
  kycTier: KycTierValue;
  kycStatus: KycStatusValue;
  isSuspended: boolean;
  isWithdrawalSuspended: boolean;
  antiPhishingCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Paginated<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type OrderSideValue = 'BUY' | 'SELL';
export type OrderTypeValue = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';
export type OrderStatusValue =
  | 'NEW' | 'VALIDATED' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED'
  | 'CANCEL_REQUESTED' | 'CANCELED' | 'EXPIRED' | 'REJECTED';

export interface UserBalance {
  asset: AssetSymbolValue;
  available: string;
  locked: string;
  pendingWithdrawal: string;
  p2pEscrow: string;
  total: string;
}

export interface AdminOrder {
  id: string;
  clientOrderId?: string;
  userId: string;
  userEmail: string;
  symbol: string;
  side: OrderSideValue;
  type: OrderTypeValue;
  timeInForce: string;
  price?: string;
  stopPrice?: string;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  cumulativeQuoteQuantity: string;
  status: OrderStatusValue;
  lockedAmount: string;
  lockedAsset: AssetSymbolValue;
  createdAt: number;
  updatedAt: number;
}

export interface AdminTrade {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  buyerUserId: string;
  sellerUserId: string;
  makerSide: OrderSideValue;
  buyerFee: string;
  buyerFeeAsset: AssetSymbolValue;
  sellerFee: string;
  sellerFeeAsset: AssetSymbolValue;
  timestamp: number;
}

export type DepositStatusValue = 'DETECTED' | 'CONFIRMING' | 'CONFIRMED' | 'CREDITED' | 'FAILED';

export interface DepositRecord {
  id: string;
  userId: string;
  userEmail?: string;
  asset: AssetSymbolValue;
  network: string;
  address: string;
  txHash: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  status: DepositStatusValue;
  createdAt: number;
  updatedAt: number;
}

export type WithdrawalStatusValue =
  | 'REQUESTED' | 'PENDING_2FA' | 'RISK_REVIEW' | 'APPROVED' | 'PROCESSING'
  | 'BROADCASTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELED';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail?: string;
  asset: AssetSymbolValue;
  network: string;
  destinationAddress: string;
  amount: string;
  fee: string;
  netAmount: string;
  txHash?: string;
  status: WithdrawalStatusValue;
  riskScore: number;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

export type TransferTypeValue = 'INTERNAL' | 'EXTERNAL_CRYPTO' | 'EXTERNAL_FIAT';
export type TransferStatusValue = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface TransferRecord {
  id: string;
  type: TransferTypeValue;
  senderUserId: string;
  senderEmail?: string;
  recipientIdentifier: string;
  recipientUserId?: string;
  recipientEmail?: string;
  asset: AssetSymbolValue | string;
  network?: string;
  amount: string;
  fee: string;
  netAmount: string;
  status: TransferStatusValue;
  note?: string;
  txHash?: string;
  referenceId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KycApplication {
  id: string;
  userId: string;
  userEmail?: string;
  tier: KycTierValue;
  fullName: string;
  dateOfBirth: string;
  country: string;
  idDocumentType: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
  idNumber: string;
  status: KycStatusValue;
  rejectionReason?: string;
  reviewedBy?: string;
  submittedAt: number;
  reviewedAt?: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  action: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface TreasuryAssetSummary {
  hotWallet: string;
  coldStorage: string;
  totalExchangeAssets: string;
  liabilities: {
    available: string;
    locked: string;
    pendingWithdrawal: string;
    p2pEscrow: string;
    total: string;
  };
  revenue: { tradingFees: string; withdrawalFees: string };
  reserveRatio: string;
  isSolvent: boolean;
  withdrawalCapacityRatio: string;
}

export interface Fees24h {
  baseFees: string;
  quoteFees: string;
}

export interface ProofOfReservesAudit {
  isSolvent: boolean;
  assets: Record<string, {
    totalAssets: string;
    totalLiabilities: string;
    surplus: string;
    ratio: string;
  }>;
  timestamp: number;
}

export interface AdminMarketStats {
  openOrders: number;
  trades24h: number;
  volume24h: string;
  lastPrice: string | null;
  changePercent: string | null;
  isHalted: boolean;
}

export interface AdminMarket {
  symbol: string;
  baseAsset: AssetSymbolValue;
  quoteAsset: AssetSymbolValue;
  priceDecimals: number;
  qtyDecimals: number;
  minQty: string;
  maxQty: string;
  minNotional: string;
  tickSize: string;
  lotSize: string;
  makerFeeRate: string;
  takerFeeRate: string;
  isTradingEnabled: boolean;
  priceBandPercent: number;
  stats: AdminMarketStats;
}

export type P2PEscrowStatusValue =
  | 'CREATED' | 'ESCROW_LOCKED' | 'FIAT_MARKED_PAID' | 'RELEASED' | 'DISPUTED' | 'CANCELED';

export interface P2PEscrowTrade {
  id: string;
  adId: string;
  buyerUserId: string;
  buyerEmail: string;
  sellerUserId: string;
  sellerEmail: string;
  asset: AssetSymbolValue;
  cryptoAmount: string;
  fiatAmount: string;
  fiatCurrency: string;
  price: string;
  paymentMethod: string;
  status: P2PEscrowStatusValue;
  disputeReason?: string;
  escrowLockedAt?: number;
  fiatPaidAt?: number;
  releasedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiKeyMetadata {
  id: string;
  userId: string;
  userEmail: string;
  label: string;
  keyPrefix: string;
  permissions: { canRead: boolean; canTrade: boolean; canWithdraw: boolean };
  ipWhitelist?: string[];
  lastUsedAt?: number;
  createdAt: number;
}

export interface SecurityEventsResponse {
  events: AuditLog[];
  summary: {
    failedLoginAttempts: number;
    distinctTargetAccounts: number;
    topTargets: Array<{ actorId: string; count: number }>;
  };
}

export interface DepthLevel {
  price: string;
  quantity: string;
  total: string;
}

export interface MarketDepth {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
}

// ==========================================================================
// RBAC permission matrix (UI visibility only - the server enforces the same
// matrix authoritatively on every endpoint).
// ==========================================================================
export type AdminPermission =
  | 'viewDashboard'
  | 'manageCircuitBreakers'
  | 'viewRisk'
  | 'configureMarkets'
  | 'viewUsers'
  | 'manageUsers'
  | 'reviewKyc'
  | 'viewFinance'
  | 'approveWithdrawals'
  | 'resolveDisputes'
  | 'viewSecurity'
  | 'viewAuditLogs'
  | 'exportAuditLogs';

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: Object.values([
    'viewDashboard', 'manageCircuitBreakers', 'viewRisk', 'configureMarkets',
    'viewUsers', 'manageUsers', 'reviewKyc', 'viewFinance', 'approveWithdrawals',
    'resolveDisputes', 'viewSecurity', 'viewAuditLogs', 'exportAuditLogs'
  ] as AdminPermission[]),
  SECURITY_ADMIN: ['viewDashboard', 'manageCircuitBreakers', 'viewRisk', 'viewUsers', 'manageUsers', 'viewFinance', 'viewSecurity', 'viewAuditLogs', 'exportAuditLogs'],
  COMPLIANCE_OFFICER: ['viewDashboard', 'viewUsers', 'manageUsers', 'reviewKyc', 'resolveDisputes', 'viewSecurity', 'viewAuditLogs'],
  FINANCE_OFFICER: ['viewDashboard', 'viewFinance', 'approveWithdrawals', 'viewAuditLogs'],
  RISK_ANALYST: ['viewDashboard', 'manageCircuitBreakers', 'viewRisk', 'configureMarkets', 'viewAuditLogs'],
  SUPPORT_AGENT: ['viewDashboard', 'viewUsers', 'viewAuditLogs'],
  READ_ONLY_AUDITOR: ['viewDashboard', 'viewRisk', 'viewFinance', 'viewUsers', 'viewSecurity', 'viewAuditLogs', 'exportAuditLogs']
};

export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
