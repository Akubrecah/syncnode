import { Trade, LiveMarketFeedSummary } from '@syncnode/common';
export interface Candle {
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    quoteVolume: string;
    tradesCount: number;
}
export interface Ticker24h {
    symbol: string;
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
    high24h: string;
    low24h: string;
    volume24h: string;
    quoteVolume24h: string;
    bidPrice: string;
    askPrice: string;
    spread: string;
    timestamp: number;
}
export declare class MarketDataService {
    private readonly logger;
    private candleStorage;
    private baseSeedPrices;
    private isAutoSyncEnabled;
    private autoSyncTimer;
    private lastSyncTimestamp;
    private liveSource;
    private lastLatencyMs;
    constructor();
    private initializeCandles;
    private getIntervalMs;
    /**
     * Pull real-time live market data from public exchange APIs with high-resiliency fallback.
     */
    pullLiveMarketData(symbol?: string): Promise<LiveMarketFeedSummary[]>;
    /**
     * Inject a live price point into candle storage.
     */
    private injectLivePricePoint;
    /**
     * Get the current status of the live market data feed.
     */
    getLiveFeedStatus(): {
        isLive: boolean;
        provider: string;
        source: "LIVE_BINANCE_API" | "LIVE_COINGECKO_API" | "HIGH_PRECISION_SIMULATOR";
        latencyMs: number;
        autoSync: boolean;
        lastSyncTimestamp: number;
        supportedSymbols: string[];
    };
    /**
     * Toggle periodic auto-sync background timer.
     */
    setAutoSync(enabled: boolean, intervalMs?: number): boolean;
    /**
     * Ingest a new trade and update OHLCV candle streams across all intervals.
     */
    onTradeExecuted(trade: Trade): void;
    /**
     * Retrieve OHLCV candles for charting.
     */
    getCandles(symbol: string, interval?: string, limit?: number): Candle[];
    /**
     * Compute 24-hour rolling ticker statistics.
     */
    getTicker24h(symbol: string): Ticker24h;
    getRecentTrades(symbol: string, limit?: number): Trade[];
}
export declare const marketDataService: MarketDataService;
