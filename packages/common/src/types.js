"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferStatus = exports.TransferType = exports.P2PEscrowStatus = exports.P2POrderType = exports.WithdrawalStatus = exports.DepositStatus = exports.AdminRole = exports.KycStatus = exports.KycTier = exports.EntryDirection = exports.TransactionType = exports.AccountType = exports.AccountCategory = exports.SelfTradePrevention = exports.OrderStatus = exports.TimeInForce = exports.OrderType = exports.OrderSide = exports.MARKET_REGISTRY = exports.ASSET_REGISTRY = exports.AssetSymbol = void 0;
var AssetSymbol;
(function (AssetSymbol) {
    AssetSymbol["BTC"] = "BTC";
    AssetSymbol["ETH"] = "ETH";
    AssetSymbol["SOL"] = "SOL";
    AssetSymbol["USDT"] = "USDT";
    AssetSymbol["USDC"] = "USDC";
})(AssetSymbol || (exports.AssetSymbol = AssetSymbol = {}));
exports.ASSET_REGISTRY = {
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
exports.MARKET_REGISTRY = {
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
var OrderSide;
(function (OrderSide) {
    OrderSide["BUY"] = "BUY";
    OrderSide["SELL"] = "SELL";
})(OrderSide || (exports.OrderSide = OrderSide = {}));
var OrderType;
(function (OrderType) {
    OrderType["LIMIT"] = "LIMIT";
    OrderType["MARKET"] = "MARKET";
    OrderType["STOP_LIMIT"] = "STOP_LIMIT";
})(OrderType || (exports.OrderType = OrderType = {}));
var TimeInForce;
(function (TimeInForce) {
    TimeInForce["GTC"] = "GTC";
    TimeInForce["IOC"] = "IOC";
    TimeInForce["FOK"] = "FOK";
    TimeInForce["POST_ONLY"] = "POST_ONLY";
})(TimeInForce || (exports.TimeInForce = TimeInForce = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["NEW"] = "NEW";
    OrderStatus["VALIDATED"] = "VALIDATED";
    OrderStatus["OPEN"] = "OPEN";
    OrderStatus["PARTIALLY_FILLED"] = "PARTIALLY_FILLED";
    OrderStatus["FILLED"] = "FILLED";
    OrderStatus["CANCEL_REQUESTED"] = "CANCEL_REQUESTED";
    OrderStatus["CANCELED"] = "CANCELED";
    OrderStatus["EXPIRED"] = "EXPIRED";
    OrderStatus["REJECTED"] = "REJECTED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var SelfTradePrevention;
(function (SelfTradePrevention) {
    SelfTradePrevention["CANCEL_MAKER"] = "CANCEL_MAKER";
    SelfTradePrevention["CANCEL_TAKER"] = "CANCEL_TAKER";
    SelfTradePrevention["CANCEL_BOTH"] = "CANCEL_BOTH";
    SelfTradePrevention["DECREMENT_AND_CANCEL"] = "DECREMENT_AND_CANCEL";
})(SelfTradePrevention || (exports.SelfTradePrevention = SelfTradePrevention = {}));
// ==========================
// Ledger & Accounting Types
// ==========================
var AccountCategory;
(function (AccountCategory) {
    AccountCategory["ASSET"] = "ASSET";
    AccountCategory["LIABILITY"] = "LIABILITY";
    AccountCategory["EQUITY"] = "EQUITY";
    AccountCategory["REVENUE"] = "REVENUE";
    AccountCategory["EXPENSE"] = "EXPENSE";
})(AccountCategory || (exports.AccountCategory = AccountCategory = {}));
var AccountType;
(function (AccountType) {
    // Exchange Vaults (Assets)
    AccountType["EXCHANGE_HOT_WALLET"] = "EXCHANGE_HOT_WALLET";
    AccountType["EXCHANGE_COLD_STORAGE"] = "EXCHANGE_COLD_STORAGE";
    // Customer Balances (Liabilities)
    AccountType["USER_AVAILABLE"] = "USER_AVAILABLE";
    AccountType["USER_LOCKED"] = "USER_LOCKED";
    AccountType["USER_WITHDRAWAL_PENDING"] = "USER_WITHDRAWAL_PENDING";
    AccountType["USER_P2P_ESCROW"] = "USER_P2P_ESCROW";
    // Exchange Earnings (Revenue)
    AccountType["TRADING_FEES"] = "TRADING_FEES";
    AccountType["WITHDRAWAL_FEES"] = "WITHDRAWAL_FEES";
    // Expenses
    AccountType["BLOCKCHAIN_GAS_EXPENSE"] = "BLOCKCHAIN_GAS_EXPENSE";
})(AccountType || (exports.AccountType = AccountType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAWAL_LOCK"] = "WITHDRAWAL_LOCK";
    TransactionType["WITHDRAWAL_FINALIZE"] = "WITHDRAWAL_FINALIZE";
    TransactionType["WITHDRAWAL_CANCEL"] = "WITHDRAWAL_CANCEL";
    TransactionType["INTERNAL_TRANSFER"] = "INTERNAL_TRANSFER";
    TransactionType["FIAT_DEPOSIT"] = "FIAT_DEPOSIT";
    TransactionType["FIAT_WITHDRAWAL"] = "FIAT_WITHDRAWAL";
    TransactionType["ORDER_LOCK"] = "ORDER_LOCK";
    TransactionType["ORDER_UNLOCK"] = "ORDER_UNLOCK";
    TransactionType["TRADE_SETTLEMENT"] = "TRADE_SETTLEMENT";
    TransactionType["P2P_ESCROW_LOCK"] = "P2P_ESCROW_LOCK";
    TransactionType["P2P_ESCROW_RELEASE"] = "P2P_ESCROW_RELEASE";
    TransactionType["P2P_ESCROW_CANCEL"] = "P2P_ESCROW_CANCEL";
    TransactionType["ADMIN_ADJUSTMENT"] = "ADMIN_ADJUSTMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var EntryDirection;
(function (EntryDirection) {
    EntryDirection["DEBIT"] = "DEBIT";
    EntryDirection["CREDIT"] = "CREDIT";
})(EntryDirection || (exports.EntryDirection = EntryDirection = {}));
// ==========================
// User, KYC & Identity
// ==========================
var KycTier;
(function (KycTier) {
    KycTier["TIER_0_UNVERIFIED"] = "TIER_0_UNVERIFIED";
    KycTier["TIER_1_BASIC"] = "TIER_1_BASIC";
    KycTier["TIER_2_VERIFIED"] = "TIER_2_VERIFIED";
    KycTier["TIER_3_INSTITUTIONAL"] = "TIER_3_INSTITUTIONAL";
})(KycTier || (exports.KycTier = KycTier = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["NOT_SUBMITTED"] = "NOT_SUBMITTED";
    KycStatus["PENDING"] = "PENDING";
    KycStatus["APPROVED"] = "APPROVED";
    KycStatus["REJECTED"] = "REJECTED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    AdminRole["SECURITY_ADMIN"] = "SECURITY_ADMIN";
    AdminRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
    AdminRole["FINANCE_OFFICER"] = "FINANCE_OFFICER";
    AdminRole["RISK_ANALYST"] = "RISK_ANALYST";
    AdminRole["SUPPORT_AGENT"] = "SUPPORT_AGENT";
    AdminRole["READ_ONLY_AUDITOR"] = "READ_ONLY_AUDITOR";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
// ==========================
// Wallet, Deposit, Withdrawal
// ==========================
var DepositStatus;
(function (DepositStatus) {
    DepositStatus["DETECTED"] = "DETECTED";
    DepositStatus["CONFIRMING"] = "CONFIRMING";
    DepositStatus["CONFIRMED"] = "CONFIRMED";
    DepositStatus["CREDITED"] = "CREDITED";
    DepositStatus["FAILED"] = "FAILED";
})(DepositStatus || (exports.DepositStatus = DepositStatus = {}));
var WithdrawalStatus;
(function (WithdrawalStatus) {
    WithdrawalStatus["REQUESTED"] = "REQUESTED";
    WithdrawalStatus["PENDING_2FA"] = "PENDING_2FA";
    WithdrawalStatus["RISK_REVIEW"] = "RISK_REVIEW";
    WithdrawalStatus["APPROVED"] = "APPROVED";
    WithdrawalStatus["PROCESSING"] = "PROCESSING";
    WithdrawalStatus["BROADCASTED"] = "BROADCASTED";
    WithdrawalStatus["CONFIRMED"] = "CONFIRMED";
    WithdrawalStatus["REJECTED"] = "REJECTED";
    WithdrawalStatus["CANCELED"] = "CANCELED";
})(WithdrawalStatus || (exports.WithdrawalStatus = WithdrawalStatus = {}));
// ==========================
// P2P Marketplace
// ==========================
var P2POrderType;
(function (P2POrderType) {
    P2POrderType["BUY"] = "BUY";
    P2POrderType["SELL"] = "SELL";
})(P2POrderType || (exports.P2POrderType = P2POrderType = {}));
var P2PEscrowStatus;
(function (P2PEscrowStatus) {
    P2PEscrowStatus["CREATED"] = "CREATED";
    P2PEscrowStatus["ESCROW_LOCKED"] = "ESCROW_LOCKED";
    P2PEscrowStatus["FIAT_MARKED_PAID"] = "FIAT_MARKED_PAID";
    P2PEscrowStatus["RELEASED"] = "RELEASED";
    P2PEscrowStatus["DISPUTED"] = "DISPUTED";
    P2PEscrowStatus["CANCELED"] = "CANCELED";
})(P2PEscrowStatus || (exports.P2PEscrowStatus = P2PEscrowStatus = {}));
// ==========================
// Transfers & Payments
// ==========================
var TransferType;
(function (TransferType) {
    TransferType["INTERNAL"] = "INTERNAL";
    TransferType["EXTERNAL_CRYPTO"] = "EXTERNAL_CRYPTO";
    TransferType["EXTERNAL_FIAT"] = "EXTERNAL_FIAT";
})(TransferType || (exports.TransferType = TransferType = {}));
var TransferStatus;
(function (TransferStatus) {
    TransferStatus["PENDING"] = "PENDING";
    TransferStatus["COMPLETED"] = "COMPLETED";
    TransferStatus["FAILED"] = "FAILED";
    TransferStatus["CANCELLED"] = "CANCELLED";
})(TransferStatus || (exports.TransferStatus = TransferStatus = {}));
//# sourceMappingURL=types.js.map