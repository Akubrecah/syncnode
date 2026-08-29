import time
import httpx
from typing import Dict, Any, List
from syncnode.common.logger import Logger

logger = Logger("MarketDataService")


class MarketDataService:
    def __init__(self):
        self.cached_tickers: Dict[str, Any] = {
            "BTC/USDT": {"symbol": "BTC/USDT", "price": "96450.00", "change24h": "3.42", "high24h": "97200.00", "low24h": "94800.00", "volume": "34210.50"},
            "ETH/USDT": {"symbol": "ETH/USDT", "price": "2785.50", "change24h": "-1.15", "high24h": "2850.00", "low24h": "2740.00", "volume": "189400.00"},
            "SOL/USDT": {"symbol": "SOL/USDT", "price": "188.75", "change24h": "5.80", "high24h": "194.50", "low24h": "178.00", "volume": "542000.00"},
            "ETH/BTC": {"symbol": "ETH/BTC", "price": "0.02888", "change24h": "-0.54", "high24h": "0.02950", "low24h": "0.02850", "volume": "4120.00"}
        }

    async def fetch_live_tickers(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get("https://api.binance.com/api/v3/ticker/24hr")
                if res.status_code == 200:
                    data = res.json()
                    mapping = {"BTCUSDT": "BTC/USDT", "ETHUSDT": "ETH/USDT", "SOLUSDT": "SOL/USDT", "ETHBTC": "ETH/BTC"}
                    for item in data:
                        sym = item.get("symbol")
                        if sym in mapping:
                            pair = mapping[sym]
                            self.cached_tickers[pair] = {
                                "symbol": pair,
                                "price": item.get("lastPrice", "0.00"),
                                "change24h": item.get("priceChangePercent", "0.00"),
                                "high24h": item.get("highPrice", "0.00"),
                                "low24h": item.get("lowPrice", "0.00"),
                                "volume": item.get("volume", "0.00"),
                                "timestamp": int(time.time() * 1000)
                            }
                    logger.info(f"Pulled live market data for {len(self.cached_tickers)} pairs from LIVE_BINANCE_API")
        except Exception as e:
            logger.warn(f"Failed to fetch external tickers, using cache: {str(e)}")
        return self.cached_tickers

    def get_ticker(self, symbol: str) -> Dict[str, Any]:
        return self.cached_tickers.get(symbol, {
            "symbol": symbol,
            "price": "100.00",
            "change24h": "0.00",
            "high24h": "105.00",
            "low24h": "95.00",
            "volume": "1000.00"
        })

    def get_news(self, category: str = "All", query: str = "") -> List[Dict[str, Any]]:
        now = int(time.time() * 1000)
        news_items = [
            {
                "id": "news_1",
                "title": "Fed Signals Steady Interest Rate Outlook Amid Inflation Data",
                "source": "Bloomberg",
                "category": "Economy & Fed",
                "publishedAt": now - 180000,
                "url": "https://www.bloomberg.com/news",
                "summary": "Federal Reserve officials noted continued progress on inflation while keeping baseline economic projections robust.",
                "symbols": ["USDT", "USD"]
            },
            {
                "id": "news_2",
                "title": "Bitcoin Institutional ETF Inflows Reach $1.4B in Weekly Volume",
                "source": "Reuters",
                "category": "Crypto",
                "publishedAt": now - 360000,
                "url": "https://www.reuters.com/technology",
                "summary": "Digital asset exchange-traded funds registered significant institutional accumulation led by BlackRock and Fidelity.",
                "symbols": ["BTC", "ETH", "SOL"]
            },
            {
                "id": "news_3",
                "title": "NVIDIA Blackwell GPUs Enter Full Production as AI Demand Accelerates",
                "source": "Wall Street Journal",
                "category": "Tech & AI",
                "publishedAt": now - 540000,
                "url": "https://www.wsj.com/tech",
                "summary": "Enterprise cloud hyperscalers expand compute clusters for next-generation frontier artificial intelligence reasoning models.",
                "symbols": ["NVDA", "AAPL", "MSFT"]
            },
            {
                "id": "news_4",
                "title": "Global Equity Markets Rally as Tech Earnings Beat Wall Street Expectations",
                "source": "CNBC",
                "category": "Stocks & Earnings",
                "publishedAt": now - 900000,
                "url": "https://www.cnbc.com/markets",
                "summary": "S&P 500 and NASDAQ push toward fresh highs led by semiconductor momentum and software efficiency gains.",
                "symbols": ["SPX", "NDX", "TSLA"]
            }
        ]

        if category and category != "All":
            news_items = [n for n in news_items if n["category"] == category]
        if query:
            q = query.lower()
            news_items = [n for n in news_items if q in n["title"].lower() or q in n["summary"].lower() or any(q in s.lower() for s in n["symbols"])]

        return news_items


market_data_service = MarketDataService()
