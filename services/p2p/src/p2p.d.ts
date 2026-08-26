import { AssetSymbol, P2PAd, P2PTrade, P2POrderType } from '@syncnode/common';
export declare class P2PService {
    private readonly logger;
    constructor();
    private seedP2PAds;
    getAds(asset?: AssetSymbol, fiatCurrency?: string, type?: P2POrderType): P2PAd[];
    createAd(params: Omit<P2PAd, 'id' | 'createdAt' | 'availableCryptoAmount' | 'isActive'>): P2PAd;
    /**
     * Initiate a P2P Trade Order and lock cryptocurrency in Escrow.
     */
    initiateTrade(params: {
        adId: string;
        buyerUserId: string;
        cryptoAmount: string;
        paymentMethod: string;
    }): P2PTrade;
    /**
     * Buyer marks fiat payment as sent.
     */
    markFiatPaid(tradeId: string, buyerUserId: string): P2PTrade;
    /**
     * Seller confirms receipt of fiat payment and releases crypto escrow to buyer.
     */
    releaseEscrow(tradeId: string, sellerUserId: string): P2PTrade;
    openDispute(tradeId: string, userId: string, reason: string): P2PTrade;
    getTradesByUser(userId: string): P2PTrade[];
    cancelTrade(tradeId: string, userId: string): P2PTrade;
}
export declare const p2pService: P2PService;
