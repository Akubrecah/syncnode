import {
  AssetSymbol,
  P2PAd,
  P2PTrade,
  P2POrderType,
  P2PEscrowStatus,
  AccountType,
  TransactionType,
  EntryDirection,
  Decimal,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';

export class P2PService {
  private readonly logger = new Logger('P2PService');

  constructor() {
    this.seedP2PAds();
  }

  private seedP2PAds(): void {
    // Seed verified institutional liquidity maker advertisements
    const initialAds: P2PAd[] = [
      {
        id: 'p2pad_usdt_usd_1',
        merchantId: 'merchant_apex_liquidity',
        merchantName: 'ApexGlobal (99.8% completion)',
        type: P2POrderType.SELL, // Sells USDT to user
        asset: AssetSymbol.USDT,
        fiatCurrency: 'USD',
        price: '1.00',
        totalCryptoAmount: '50000.00',
        availableCryptoAmount: '50000.00',
        minFiatLimit: '50.00',
        maxFiatLimit: '10000.00',
        paymentMethods: ['Bank Wire', 'Zelle', 'Revolut'],
        terms: 'Instant release upon proof of payment receipt. Fast & secure.',
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'p2pad_btc_usd_1',
        merchantId: 'merchant_sat_vault',
        merchantName: 'SatoshiVault (100% completion)',
        type: P2POrderType.SELL,
        asset: AssetSymbol.BTC,
        fiatCurrency: 'USD',
        price: '94300.00',
        totalCryptoAmount: '5.00000000',
        availableCryptoAmount: '5.00000000',
        minFiatLimit: '100.00',
        maxFiatLimit: '50000.00',
        paymentMethods: ['Bank Wire', 'Wise', 'SEPA'],
        terms: 'KYC verified buyers only. 15 minute payment window.',
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'p2pad_eth_eur_1',
        merchantId: 'merchant_euro_crypto',
        merchantName: 'EuroCryptoDirect (99.5%)',
        type: P2POrderType.SELL,
        asset: AssetSymbol.ETH,
        fiatCurrency: 'EUR',
        price: '3150.00',
        totalCryptoAmount: '25.00000',
        availableCryptoAmount: '25.00000',
        minFiatLimit: '50.00',
        maxFiatLimit: '20000.00',
        paymentMethods: ['SEPA Instant', 'Revolut'],
        terms: 'Strictly matching IBAN names only.',
        isActive: true,
        createdAt: Date.now()
      }
    ];

    for (const ad of initialAds) {
      db.p2pAds.set(ad.id, ad);
    }
  }

  public getAds(asset?: AssetSymbol, fiatCurrency?: string, type?: P2POrderType): P2PAd[] {
    return Array.from(db.p2pAds.values()).filter((ad) => {
      if (!ad.isActive) return false;
      if (asset && ad.asset !== asset) return false;
      if (fiatCurrency && ad.fiatCurrency !== fiatCurrency) return false;
      if (type && ad.type !== type) return false;
      return true;
    });
  }

  public createAd(params: Omit<P2PAd, 'id' | 'createdAt' | 'availableCryptoAmount' | 'isActive'>): P2PAd {
    const id = `p2pad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ad: P2PAd = {
      id,
      ...params,
      availableCryptoAmount: params.totalCryptoAmount,
      isActive: true,
      createdAt: Date.now()
    };
    db.p2pAds.set(ad.id, ad);
    return ad;
  }

  /**
   * Initiate a P2P Trade Order and lock cryptocurrency in Escrow.
   */
  public initiateTrade(params: {
    adId: string;
    buyerUserId: string;
    cryptoAmount: string;
    paymentMethod: string;
  }): P2PTrade {
    const ad = db.p2pAds.get(params.adId);
    if (!ad || !ad.isActive) throw new Error('P2P Advertisement is no longer available');

    const cryptoAmt = new Decimal(params.cryptoAmount);
    if (cryptoAmt.gt(ad.availableCryptoAmount)) {
      throw new Error(`Requested amount exceeds available advertisement capacity of ${ad.availableCryptoAmount}`);
    }

    const fiatAmount = cryptoAmt.times(ad.price).toFixed(2);
    if (new Decimal(fiatAmount).lt(ad.minFiatLimit) || new Decimal(fiatAmount).gt(ad.maxFiatLimit)) {
      throw new Error(`Fiat amount ${fiatAmount} ${ad.fiatCurrency} outside limit [${ad.minFiatLimit}, ${ad.maxFiatLimit}]`);
    }

    // Determine seller and buyer
    const isMerchantSeller = ad.type === P2POrderType.SELL;
    const sellerUserId = isMerchantSeller ? ad.merchantId : params.buyerUserId;
    const buyerUserId = isMerchantSeller ? params.buyerUserId : ad.merchantId;

    const tradeId = `p2ptrd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If seller is a regular user (not merchant system mock), lock their crypto in Escrow
    if (!sellerUserId.startsWith('merchant_')) {
      ledgerService.recordTransaction(
        TransactionType.P2P_ESCROW_LOCK,
        tradeId,
        `p2p_lock_${tradeId}`,
        `Lock ${params.cryptoAmount} ${ad.asset} in P2P Escrow for trade ${tradeId}`,
        [
          {
            userId: sellerUserId,
            accountType: AccountType.USER_AVAILABLE,
            asset: ad.asset,
            direction: EntryDirection.DEBIT,
            amount: params.cryptoAmount
          },
          {
            userId: sellerUserId,
            accountType: AccountType.USER_P2P_ESCROW,
            asset: ad.asset,
            direction: EntryDirection.CREDIT,
            amount: params.cryptoAmount
          }
        ]
      );
    }

    // Deduct available crypto from Ad
    ad.availableCryptoAmount = new Decimal(ad.availableCryptoAmount).minus(params.cryptoAmount).toString();

    const trade: P2PTrade = {
      id: tradeId,
      adId: ad.id,
      buyerUserId,
      sellerUserId,
      asset: ad.asset,
      cryptoAmount: params.cryptoAmount,
      fiatAmount,
      fiatCurrency: ad.fiatCurrency,
      price: ad.price,
      paymentMethod: params.paymentMethod,
      status: P2PEscrowStatus.ESCROW_LOCKED,
      escrowLockedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.p2pTrades.set(trade.id, trade);
    db.emitEvent('p2p.trade.created', { trade });
    return trade;
  }

  /**
   * Buyer marks fiat payment as sent.
   */
  public markFiatPaid(tradeId: string, buyerUserId: string): P2PTrade {
    const trade = db.p2pTrades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.buyerUserId !== buyerUserId) throw new Error('Unauthorized');
    if (trade.status !== P2PEscrowStatus.ESCROW_LOCKED) {
      throw new Error(`Cannot mark paid in status ${trade.status}`);
    }

    trade.status = P2PEscrowStatus.FIAT_MARKED_PAID;
    trade.fiatPaidAt = Date.now();
    trade.updatedAt = Date.now();

    db.emitEvent('p2p.trade.paid', { trade });
    return trade;
  }

  /**
   * Seller confirms receipt of fiat payment and releases crypto escrow to buyer.
   */
  public releaseEscrow(tradeId: string, sellerUserId: string): P2PTrade {
    const trade = db.p2pTrades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.sellerUserId !== sellerUserId && !sellerUserId.startsWith('admin_') && !trade.sellerUserId.startsWith('merchant_')) {
      throw new Error('Unauthorized to release this escrow');
    }
    if (trade.status !== P2PEscrowStatus.FIAT_MARKED_PAID && !sellerUserId.startsWith('admin_')) {
      throw new Error('Buyer has not yet confirmed fiat payment');
    }

    trade.status = P2PEscrowStatus.RELEASED;
    trade.releasedAt = Date.now();
    trade.updatedAt = Date.now();

    this.settleEscrowReleaseToBuyer(trade);

    db.emitEvent('p2p.trade.released', { trade });
    return trade;
  }

  /**
   * Ledger settlement moving escrowed crypto to the buyer's available balance.
   * Shared by seller release and admin dispute resolution.
   */
  private settleEscrowReleaseToBuyer(trade: P2PTrade): void {
    if (!trade.sellerUserId.startsWith('merchant_')) {
      ledgerService.recordTransaction(
        TransactionType.P2P_ESCROW_RELEASE,
        trade.id,
        `p2p_rel_${trade.id}`,
        `Release P2P Escrow ${trade.cryptoAmount} ${trade.asset} to buyer ${trade.buyerUserId}`,
        [
          {
            userId: trade.sellerUserId,
            accountType: AccountType.USER_P2P_ESCROW,
            asset: trade.asset,
            direction: EntryDirection.DEBIT,
            amount: trade.cryptoAmount
          },
          {
            userId: trade.buyerUserId,
            accountType: AccountType.USER_AVAILABLE,
            asset: trade.asset,
            direction: EntryDirection.CREDIT,
            amount: trade.cryptoAmount
          }
        ]
      );
    } else {
      // Merchant liquidity provider release -> Credit buyer available balance from hot wallet
      ledgerService.recordTransaction(
        TransactionType.P2P_ESCROW_RELEASE,
        trade.id,
        `p2p_rel_mch_${trade.id}`,
        `Credit buyer ${trade.buyerUserId} for P2P purchase of ${trade.cryptoAmount} ${trade.asset}`,
        [
          {
            accountType: AccountType.EXCHANGE_HOT_WALLET,
            asset: trade.asset,
            direction: EntryDirection.DEBIT,
            amount: trade.cryptoAmount
          },
          {
            userId: trade.buyerUserId,
            accountType: AccountType.USER_AVAILABLE,
            asset: trade.asset,
            direction: EntryDirection.CREDIT,
            amount: trade.cryptoAmount
          }
        ]
      );
    }
  }

  /**
   * Admin-level dispute resolution. Force-releases escrow to the buyer or
   * cancels the trade and refunds escrow to the seller. Fully audited.
   */
  public adminResolveDispute(
    tradeId: string,
    adminUserId: string,
    action: 'RELEASE' | 'CANCEL',
    reason: string
  ): P2PTrade {
    const trade = db.p2pTrades.get(tradeId);
    if (!trade) throw new Error(`P2P trade ${tradeId} not found`);
    if (!reason || reason.trim().length < 4) {
      throw new Error('A documented resolution reason (min 4 chars) is required');
    }

    const previousStatus = trade.status;

    if (action === 'RELEASE') {
      if (![P2PEscrowStatus.FIAT_MARKED_PAID, P2PEscrowStatus.DISPUTED, P2PEscrowStatus.ESCROW_LOCKED].includes(trade.status)) {
        throw new Error(`Cannot release escrow in status ${trade.status}`);
      }
      trade.status = P2PEscrowStatus.RELEASED;
      trade.releasedAt = Date.now();
      trade.updatedAt = Date.now();
      this.settleEscrowReleaseToBuyer(trade);
    } else {
      if (![P2PEscrowStatus.ESCROW_LOCKED, P2PEscrowStatus.DISPUTED, P2PEscrowStatus.FIAT_MARKED_PAID].includes(trade.status)) {
        throw new Error(`Cannot cancel escrow in status ${trade.status}`);
      }
      trade.status = P2PEscrowStatus.CANCELED;
      trade.updatedAt = Date.now();

      // Refund escrowed crypto to seller when the seller is a platform user
      if (!trade.sellerUserId.startsWith('merchant_')) {
        ledgerService.recordTransaction(
          TransactionType.P2P_ESCROW_RELEASE,
          trade.id,
          `p2p_admin_cancel_${trade.id}`,
          `Admin cancelled P2P escrow ${trade.cryptoAmount} ${trade.asset} refunded to seller ${trade.sellerUserId}`,
          [
            {
              userId: trade.sellerUserId,
              accountType: AccountType.USER_P2P_ESCROW,
              asset: trade.asset,
              direction: EntryDirection.DEBIT,
              amount: trade.cryptoAmount
            },
            {
              userId: trade.sellerUserId,
              accountType: AccountType.USER_AVAILABLE,
              asset: trade.asset,
              direction: EntryDirection.CREDIT,
              amount: trade.cryptoAmount
            }
          ]
        );
      }

      // Return crypto capacity to advertisement
      const ad = db.p2pAds.get(trade.adId);
      if (ad) {
        ad.availableCryptoAmount = new Decimal(ad.availableCryptoAmount).plus(trade.cryptoAmount).toString();
      }
    }

    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: action === 'RELEASE' ? 'P2P_DISPUTE_FORCE_RELEASED' : 'P2P_DISPUTE_FORCE_CANCELLED',
      targetId: tradeId,
      metadata: { reason, previousStatus, newStatus: trade.status, buyerUserId: trade.buyerUserId, sellerUserId: trade.sellerUserId, asset: trade.asset, cryptoAmount: trade.cryptoAmount }
    });

    db.emitEvent(action === 'RELEASE' ? 'p2p.trade.released' : 'p2p.trade.cancelled', { trade });
    return trade;
  }

  /**
   * All P2P trades newest first (admin surveillance view).
   */
  public getAllTrades(): P2PTrade[] {
    return Array.from(db.p2pTrades.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public openDispute(tradeId: string, userId: string, reason: string): P2PTrade {
    const trade = db.p2pTrades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.buyerUserId !== userId && trade.sellerUserId !== userId) throw new Error('Unauthorized');

    trade.status = P2PEscrowStatus.DISPUTED;
    trade.disputeReason = reason;
    trade.updatedAt = Date.now();

    db.logAudit({
      actorId: userId,
      actorType: 'USER',
      action: 'P2P_TRADE_DISPUTE_OPENED',
      targetId: tradeId,
      metadata: { reason }
    });

    return trade;
  }

  public getTradesByUser(userId: string): P2PTrade[] {
    return Array.from(db.p2pTrades.values())
      .filter((t) => t.buyerUserId === userId || t.sellerUserId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public cancelTrade(tradeId: string, userId: string): P2PTrade {
    const trade = db.p2pTrades.get(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.buyerUserId !== userId && trade.sellerUserId !== userId && !userId.startsWith('admin_')) {
      throw new Error('Unauthorized to cancel this trade');
    }
    if (trade.status !== P2PEscrowStatus.ESCROW_LOCKED) {
      throw new Error(`Cannot cancel trade in status ${trade.status}`);
    }

    trade.status = P2PEscrowStatus.CANCELED;
    trade.updatedAt = Date.now();

    // If seller is a regular user, unlock their escrow balance back to available
    if (!trade.sellerUserId.startsWith('merchant_')) {
      ledgerService.recordTransaction(
        TransactionType.P2P_ESCROW_RELEASE,
        trade.id,
        `p2p_cancel_${trade.id}`,
        `Unlock cancelled P2P escrow ${trade.cryptoAmount} ${trade.asset} to seller ${trade.sellerUserId}`,
        [
          {
            userId: trade.sellerUserId,
            accountType: AccountType.USER_P2P_ESCROW,
            asset: trade.asset,
            direction: EntryDirection.DEBIT,
            amount: trade.cryptoAmount
          },
          {
            userId: trade.sellerUserId,
            accountType: AccountType.USER_AVAILABLE,
            asset: trade.asset,
            direction: EntryDirection.CREDIT,
            amount: trade.cryptoAmount
          }
        ]
      );
    }

    // Return crypto capacity to Ad
    const ad = db.p2pAds.get(trade.adId);
    if (ad) {
      ad.availableCryptoAmount = new Decimal(ad.availableCryptoAmount).plus(trade.cryptoAmount).toString();
    }

    db.emitEvent('p2p.trade.cancelled', { trade });
    return trade;
  }
}

export const p2pService = new P2PService();
