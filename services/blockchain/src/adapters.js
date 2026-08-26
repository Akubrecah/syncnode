"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainAdapterFactory = exports.SolanaAdapter = exports.EthereumAdapter = exports.BitcoinAdapter = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const common_1 = require("@syncnode/common");
class BitcoinAdapter {
    networkName = 'Bitcoin-Mainnet';
    generateAddress(userId) {
        const hash = node_crypto_1.default.createHash('sha256').update(`btc_${userId}_syncnode_salt`).digest('hex');
        return `bc1q${hash.substring(0, 38)}`;
    }
    validateAddress(address) {
        return /^bc1q[a-zA-HJ-NP-Z0-9]{38,59}$/.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
    }
    estimateFee(asset) {
        return common_1.ASSET_REGISTRY[common_1.AssetSymbol.BTC].withdrawalFee;
    }
    async broadcastTransaction(toAddress, amount, asset) {
        if (!this.validateAddress(toAddress)) {
            throw new Error(`Invalid Bitcoin destination address: ${toAddress}`);
        }
        const txHash = node_crypto_1.default.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
        return `0x${txHash}`;
    }
}
exports.BitcoinAdapter = BitcoinAdapter;
class EthereumAdapter {
    networkName = 'Ethereum-Mainnet';
    generateAddress(userId) {
        const hash = node_crypto_1.default.createHash('sha256').update(`eth_${userId}_syncnode_salt`).digest('hex');
        return `0x${hash.substring(0, 40)}`;
    }
    validateAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    estimateFee(asset) {
        return common_1.ASSET_REGISTRY[asset]?.withdrawalFee || '0.002';
    }
    async broadcastTransaction(toAddress, amount, asset) {
        if (!this.validateAddress(toAddress)) {
            throw new Error(`Invalid Ethereum destination address: ${toAddress}`);
        }
        const txHash = node_crypto_1.default.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
        return `0x${txHash}`;
    }
}
exports.EthereumAdapter = EthereumAdapter;
class SolanaAdapter {
    networkName = 'Solana-Mainnet';
    generateAddress(userId) {
        const hash = node_crypto_1.default.createHash('sha256').update(`sol_${userId}_syncnode_salt`).digest('base64');
        return hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 44);
    }
    validateAddress(address) {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    estimateFee(asset) {
        return common_1.ASSET_REGISTRY[common_1.AssetSymbol.SOL].withdrawalFee;
    }
    async broadcastTransaction(toAddress, amount, asset) {
        if (!this.validateAddress(toAddress)) {
            throw new Error(`Invalid Solana destination address: ${toAddress}`);
        }
        const txHash = node_crypto_1.default.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
        return txHash;
    }
}
exports.SolanaAdapter = SolanaAdapter;
class BlockchainAdapterFactory {
    static btc = new BitcoinAdapter();
    static eth = new EthereumAdapter();
    static sol = new SolanaAdapter();
    static getAdapter(asset, network) {
        switch (asset) {
            case common_1.AssetSymbol.BTC:
                return this.btc;
            case common_1.AssetSymbol.ETH:
            case common_1.AssetSymbol.USDT:
            case common_1.AssetSymbol.USDC:
                return this.eth;
            case common_1.AssetSymbol.SOL:
                return this.sol;
            default:
                return this.eth;
        }
    }
}
exports.BlockchainAdapterFactory = BlockchainAdapterFactory;
//# sourceMappingURL=adapters.js.map