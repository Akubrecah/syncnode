import { AssetSymbol, AccountType, TransactionType, EntryDirection, LedgerTransaction, UserBalance } from '@syncnode/common';
export interface EntrySpec {
    userId?: string;
    accountType: AccountType;
    asset: AssetSymbol;
    direction: EntryDirection;
    amount: string;
}
export declare class LedgerService {
    private readonly logger;
    /**
     * Fetch or initialize an account balance in the ledger.
     */
    getOrCreateAccount(userId: string | undefined, type: AccountType, asset: AssetSymbol): {
        id: string;
        userId?: string;
        type: AccountType;
        asset: AssetSymbol;
        balance: string;
    };
    /**
     * Execute an atomic, multi-entry double-entry ledger transaction.
     * Enforces mathematical invariant: Debits == Credits per asset.
     */
    recordTransaction(type: TransactionType, referenceId: string, idempotencyKey: string, description: string, entriesSpec: EntrySpec[]): LedgerTransaction;
    /**
     * Retrieve structured multi-asset balances for a user.
     */
    getUserBalances(userId: string): UserBalance[];
    /**
     * Get single asset balance for a user.
     */
    getUserAssetBalance(userId: string, asset: AssetSymbol): UserBalance;
    /**
     * Proof of Solvency & Reserves Mathematical Audit.
     * Compares Total Vault Assets vs Total Customer Liabilities & Exchange Equity.
     */
    performProofOfReservesAudit(): {
        isSolvent: boolean;
        assets: Record<string, {
            totalAssets: string;
            totalLiabilities: string;
            surplus: string;
            ratio: string;
        }>;
        timestamp: number;
    };
}
export declare const ledgerService: LedgerService;
