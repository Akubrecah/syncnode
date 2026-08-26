import { AssetSymbol } from '@syncnode/common';
export interface BlockchainAdapter {
    networkName: string;
    generateAddress(userId: string): string;
    validateAddress(address: string): boolean;
    estimateFee(asset: AssetSymbol): string;
    broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string>;
}
export declare class BitcoinAdapter implements BlockchainAdapter {
    readonly networkName = "Bitcoin-Mainnet";
    generateAddress(userId: string): string;
    validateAddress(address: string): boolean;
    estimateFee(asset: AssetSymbol): string;
    broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string>;
}
export declare class EthereumAdapter implements BlockchainAdapter {
    readonly networkName = "Ethereum-Mainnet";
    generateAddress(userId: string): string;
    validateAddress(address: string): boolean;
    estimateFee(asset: AssetSymbol): string;
    broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string>;
}
export declare class SolanaAdapter implements BlockchainAdapter {
    readonly networkName = "Solana-Mainnet";
    generateAddress(userId: string): string;
    validateAddress(address: string): boolean;
    estimateFee(asset: AssetSymbol): string;
    broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string>;
}
export declare class BlockchainAdapterFactory {
    private static btc;
    private static eth;
    private static sol;
    static getAdapter(asset: AssetSymbol, network?: string): BlockchainAdapter;
}
