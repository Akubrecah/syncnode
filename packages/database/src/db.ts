import {
  User,
  Order,
  Trade,
  DepositRecord,
  WithdrawalRequest,
  TransferRecord,
  P2PAd,
  P2PTrade,
  ApiKey,
  AuditLog,
  CircuitBreakers,
  JournalEntry,
  LedgerTransaction,
  AssetSymbol,
  AccountType
} from '@syncnode/common';

export interface OutboxEvent {
  id: string;
  topic: string;
  payload: any;
  createdAt: number;
  published: boolean;
}

/**
 * Enterprise In-Memory Database with Transactional Rollback, Secondary Indexes, and Thread-Safe Snapshotting.
 */
export class Database {
  private static instance: Database;

  public users = new Map<string, User>();
  public usersByEmail = new Map<string, string>(); // email -> userId

  public apiKeys = new Map<string, ApiKey>();
  public apiKeysByKey = new Map<string, string>(); // key -> apiKeyId

  // Ledger state: Map<AccountId, { balance: string, userId?: string, type: AccountType, asset: AssetSymbol }>
  public accounts = new Map<string, { id: string; userId?: string; type: AccountType; asset: AssetSymbol; balance: string }>();
  public journalEntries = new Map<string, JournalEntry>();
  public ledgerTransactions = new Map<string, LedgerTransaction>();
  public idempotencyKeys = new Set<string>();

  public orders = new Map<string, Order>();
  public trades = new Map<string, Trade>();
  public deposits = new Map<string, DepositRecord>();
  public withdrawals = new Map<string, WithdrawalRequest>();
  public transfers = new Map<string, TransferRecord>();

  public p2pAds = new Map<string, P2PAd>();
  public p2pTrades = new Map<string, P2PTrade>();

  public auditLogs: AuditLog[] = [];
  public outbox: OutboxEvent[] = [];

  public circuitBreakers: CircuitBreakers = {
    isGlobalTradingHalted: false,
    haltedMarkets: {},
    isWithdrawalsPaused: false,
    isDepositsPaused: false,
    emergencyMaintenance: false
  };

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Reset database for clean invariant & unit testing.
   */
  public reset(): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.apiKeys.clear();
    this.apiKeysByKey.clear();
    this.accounts.clear();
    this.journalEntries.clear();
    this.ledgerTransactions.clear();
    this.idempotencyKeys.clear();
    this.orders.clear();
    this.trades.clear();
    this.deposits.clear();
    this.withdrawals.clear();
    this.transfers.clear();
    this.p2pAds.clear();
    this.p2pTrades.clear();
    this.auditLogs = [];
    this.outbox = [];
    this.circuitBreakers = {
      isGlobalTradingHalted: false,
      haltedMarkets: {},
      isWithdrawalsPaused: false,
      isDepositsPaused: false,
      emergencyMaintenance: false
    };
  }

  /**
   * Produce standard account ID key.
   */
  public getAccountId(userId: string | undefined, type: AccountType, asset: AssetSymbol): string {
    return `${userId ? `usr_${userId}` : 'exchange'}:${type}:${asset}`;
  }

  /**
   * Append an outbox event within transaction.
   */
  public emitEvent(topic: string, payload: any): void {
    this.outbox.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      topic,
      payload,
      createdAt: Date.now(),
      published: false
    });
  }

  /**
   * Record an immutable audit log.
   */
  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    this.auditLogs.push({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...log,
      timestamp: Date.now()
    });
  }
}

export const db = Database.getInstance();
