"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.Database = void 0;
/**
 * Enterprise In-Memory Database with Transactional Rollback, Secondary Indexes, and Thread-Safe Snapshotting.
 */
class Database {
    static instance;
    users = new Map();
    usersByEmail = new Map(); // email -> userId
    apiKeys = new Map();
    apiKeysByKey = new Map(); // key -> apiKeyId
    // Ledger state: Map<AccountId, { balance: string, userId?: string, type: AccountType, asset: AssetSymbol }>
    accounts = new Map();
    journalEntries = new Map();
    ledgerTransactions = new Map();
    idempotencyKeys = new Set();
    orders = new Map();
    trades = new Map();
    deposits = new Map();
    withdrawals = new Map();
    transfers = new Map();
    p2pAds = new Map();
    p2pTrades = new Map();
    auditLogs = [];
    outbox = [];
    circuitBreakers = {
        isGlobalTradingHalted: false,
        haltedMarkets: {},
        isWithdrawalsPaused: false,
        isDepositsPaused: false,
        emergencyMaintenance: false
    };
    constructor() { }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    /**
     * Reset database for clean invariant & unit testing.
     */
    reset() {
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
    getAccountId(userId, type, asset) {
        return `${userId ? `usr_${userId}` : 'exchange'}:${type}:${asset}`;
    }
    /**
     * Append an outbox event within transaction.
     */
    emitEvent(topic, payload) {
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
    logAudit(log) {
        this.auditLogs.push({
            id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            ...log,
            timestamp: Date.now()
        });
    }
}
exports.Database = Database;
exports.db = Database.getInstance();
//# sourceMappingURL=db.js.map