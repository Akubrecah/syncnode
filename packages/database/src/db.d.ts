import { User, Order, Trade, DepositRecord, WithdrawalRequest, TransferRecord, P2PAd, P2PTrade, ApiKey, AuditLog, CircuitBreakers, JournalEntry, LedgerTransaction, AssetSymbol, AccountType } from '@syncnode/common';
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
export declare class Database {
    private static instance;
    users: Map<string, User>;
    usersByEmail: Map<string, string>;
    apiKeys: Map<string, ApiKey>;
    apiKeysByKey: Map<string, string>;
    accounts: Map<string, {
        id: string;
        userId?: string;
        type: AccountType;
        asset: AssetSymbol;
        balance: string;
    }>;
    journalEntries: Map<string, JournalEntry>;
    ledgerTransactions: Map<string, LedgerTransaction>;
    idempotencyKeys: Set<string>;
    orders: Map<string, Order>;
    trades: Map<string, Trade>;
    deposits: Map<string, DepositRecord>;
    withdrawals: Map<string, WithdrawalRequest>;
    transfers: Map<string, TransferRecord>;
    p2pAds: Map<string, P2PAd>;
    p2pTrades: Map<string, P2PTrade>;
    auditLogs: AuditLog[];
    outbox: OutboxEvent[];
    circuitBreakers: CircuitBreakers;
    private constructor();
    static getInstance(): Database;
    /**
     * Reset database for clean invariant & unit testing.
     */
    reset(): void;
    /**
     * Produce standard account ID key.
     */
    getAccountId(userId: string | undefined, type: AccountType, asset: AssetSymbol): string;
    /**
     * Append an outbox event within transaction.
     */
    emitEvent(topic: string, payload: any): void;
    /**
     * Record an immutable audit log.
     */
    logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void;
}
export declare const db: Database;
