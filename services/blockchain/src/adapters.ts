import crypto from 'node:crypto';
import { AssetSymbol, ASSET_REGISTRY, Decimal } from '@syncnode/common';

export interface BlockchainAdapter {
  networkName: string;
  generateAddress(userId: string): string;
  validateAddress(address: string): boolean;
  estimateFee(asset: AssetSymbol): string;
  broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string>;
}

export class BitcoinAdapter implements BlockchainAdapter {
  public readonly networkName = 'Bitcoin-Mainnet';

  public generateAddress(userId: string): string {
    const hash = crypto.createHash('sha256').update(`btc_${userId}_syncnode_salt`).digest('hex');
    return `bc1q${hash.substring(0, 38)}`;
  }

  public validateAddress(address: string): boolean {
    return /^bc1q[a-zA-HJ-NP-Z0-9]{38,59}$/.test(address) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  }

  public estimateFee(asset: AssetSymbol): string {
    return ASSET_REGISTRY[AssetSymbol.BTC].withdrawalFee;
  }

  public async broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string> {
    if (!this.validateAddress(toAddress)) {
      throw new Error(`Invalid Bitcoin destination address: ${toAddress}`);
    }
    const txHash = crypto.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
    return `0x${txHash}`;
  }
}

export class EthereumAdapter implements BlockchainAdapter {
  public readonly networkName = 'Ethereum-Mainnet';

  public generateAddress(userId: string): string {
    const hash = crypto.createHash('sha256').update(`eth_${userId}_syncnode_salt`).digest('hex');
    return `0x${hash.substring(0, 40)}`;
  }

  public validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  public estimateFee(asset: AssetSymbol): string {
    return ASSET_REGISTRY[asset]?.withdrawalFee || '0.002';
  }

  public async broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string> {
    if (!this.validateAddress(toAddress)) {
      throw new Error(`Invalid Ethereum destination address: ${toAddress}`);
    }
    const txHash = crypto.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
    return `0x${txHash}`;
  }
}

export class SolanaAdapter implements BlockchainAdapter {
  public readonly networkName = 'Solana-Mainnet';

  public generateAddress(userId: string): string {
    const hash = crypto.createHash('sha256').update(`sol_${userId}_syncnode_salt`).digest('base64');
    return hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 44);
  }

  public validateAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  public estimateFee(asset: AssetSymbol): string {
    return ASSET_REGISTRY[AssetSymbol.SOL].withdrawalFee;
  }

  public async broadcastTransaction(toAddress: string, amount: string, asset: AssetSymbol): Promise<string> {
    if (!this.validateAddress(toAddress)) {
      throw new Error(`Invalid Solana destination address: ${toAddress}`);
    }
    const txHash = crypto.createHash('sha256').update(`${Date.now()}_${toAddress}_${amount}`).digest('hex');
    return txHash;
  }
}

export class BlockchainAdapterFactory {
  private static btc = new BitcoinAdapter();
  private static eth = new EthereumAdapter();
  private static sol = new SolanaAdapter();

  public static getAdapter(asset: AssetSymbol, network?: string): BlockchainAdapter {
    switch (asset) {
      case AssetSymbol.BTC:
        return this.btc;
      case AssetSymbol.ETH:
      case AssetSymbol.USDT:
      case AssetSymbol.USDC:
        return this.eth;
      case AssetSymbol.SOL:
        return this.sol;
      default:
        return this.eth;
    }
  }
}
