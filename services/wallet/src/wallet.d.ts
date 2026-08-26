import { AssetSymbol, DepositRecord, WithdrawalRequest, TransferRecord } from '@syncnode/common';
export declare class WalletService {
    private readonly logger;
    /**
     * Derive or retrieve a deposit address for a specific user and network.
     */
    getDepositAddress(userId: string, asset: AssetSymbol, network?: string): {
        address: string;
        asset: AssetSymbol;
        network: string;
    };
    /**
     * Ingest blockchain deposit detection and credit customer balance upon reaching required confirmations.
     */
    processDeposit(params: {
        userId: string;
        asset: AssetSymbol;
        network: string;
        address: string;
        txHash: string;
        amount: string;
        confirmations: number;
    }): DepositRecord;
    /**
     * Request a new withdrawal with 2FA TOTP verification, pre-withdrawal risk scoring, and balance reservation.
     */
    requestWithdrawal(params: {
        userId: string;
        asset: AssetSymbol;
        network?: string;
        destinationAddress: string;
        amount: string;
        totpCode?: string;
    }): Promise<WithdrawalRequest>;
    /**
     * Broadcast approved withdrawal to blockchain network and finalize ledger.
     */
    executeBroadcast(request: WithdrawalRequest): Promise<void>;
    /**
     * Approve a manual risk-held withdrawal by compliance officer.
     */
    approveWithdrawal(withdrawalId: string, adminUserId: string): Promise<WithdrawalRequest>;
    /**
     * Reject withdrawal and refund locked funds back to customer available balance.
     */
    rejectWithdrawal(withdrawalId: string, adminUserId: string, reason: string): WithdrawalRequest;
    /**
     * Execute an instant, zero-fee internal transfer between two platform users with atomic double-entry ledger settlement.
     */
    transferInternal(params: {
        senderUserId: string;
        recipientIdentifier: string;
        asset: AssetSymbol;
        amount: string;
        note?: string;
    }): TransferRecord;
    /**
     * Process fiat money deposit (e.g. Bank Wire, Card top-up) and credit USDT equivalent.
     */
    processFiatDeposit(params: {
        userId: string;
        amount: string;
        currency?: string;
        paymentMethod?: string;
        referenceCode?: string;
    }): {
        deposit: DepositRecord;
        transfer: TransferRecord;
    };
    /**
     * Process a fiat payout / bank withdrawal.
     */
    processFiatWithdrawal(params: {
        userId: string;
        amount: string;
        currency?: string;
        bankDetails: {
            bankName: string;
            accountName: string;
            iban?: string;
            accountNumber?: string;
            routingNumber?: string;
            swiftBic?: string;
        };
        totpCode?: string;
    }): Promise<TransferRecord>;
    /**
     * Get all transfers for a user (sent and received).
     */
    getUserTransfers(userId: string): TransferRecord[];
    /**
     * Get all deposits for a user.
     */
    getUserDeposits(userId: string): DepositRecord[];
    /**
     * Get transfer details by ID.
     */
    getTransferById(transferId: string): TransferRecord | undefined;
}
export declare const walletService: WalletService;
