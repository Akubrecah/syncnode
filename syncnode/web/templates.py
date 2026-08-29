MAIN_PAGE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CryptoBridge | Enterprise Digital Asset Exchange</title>
    <meta name="description" content="Institutional-grade cryptocurrency exchange powered by a high-throughput Python matching engine, double-entry financial ledger, and multi-fiat P2P escrow.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Outfit', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace']
                    },
                    colors: {
                        brand: {
                            50: '#fefce8',
                            400: '#facc15',
                            500: '#eab308',
                            600: '#ca8a04',
                            glow: '#fde047'
                        },
                        dark: {
                            950: '#030508',
                            900: '#07090e',
                            850: '#0a0d14',
                            800: '#0f141d',
                            700: '#171e2b',
                            600: '#232d40'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Outfit', sans-serif; background-color: #030508; color: #f0f6fc; }
        .glass-panel { background: rgba(10, 13, 20, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .glass-card { background: rgba(15, 20, 29, 0.65); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .glow-brand { box-shadow: 0 0 25px rgba(234, 179, 8, 0.25); }
        .glow-emerald { box-shadow: 0 0 25px rgba(16, 185, 129, 0.25); }
        .glow-rose { box-shadow: 0 0 25px rgba(244, 63, 94, 0.25); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #232d40; border-radius: 4px; }
    </style>
    <!-- TradingView Widget Script -->
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-amber-500 selection:text-black">
    <!-- Top Live Ticker Tape -->
    <div class="glass-panel border-b border-gray-800/80 px-4 py-1.5 text-xs flex items-center justify-between overflow-x-auto custom-scrollbar">
        <div class="flex items-center space-x-8 whitespace-nowrap" id="top-ticker-tape">
            <div class="flex items-center space-x-2"><span class="font-bold text-gray-300">BTC/USDT</span><span class="font-mono text-white" id="tape-btc-price">$96,450.00</span><span class="text-emerald-400 font-mono">+3.42%</span></div>
            <div class="flex items-center space-x-2"><span class="font-bold text-gray-300">ETH/USDT</span><span class="font-mono text-white" id="tape-eth-price">$2,785.50</span><span class="text-rose-400 font-mono">-1.15%</span></div>
            <div class="flex items-center space-x-2"><span class="font-bold text-gray-300">SOL/USDT</span><span class="font-mono text-white" id="tape-sol-price">$188.75</span><span class="text-emerald-400 font-mono">+5.80%</span></div>
            <div class="flex items-center space-x-2"><span class="font-bold text-gray-300">ETH/BTC</span><span class="font-mono text-white">0.02888</span><span class="text-rose-400 font-mono">-0.54%</span></div>
        </div>
        <div class="flex items-center space-x-3 text-gray-400 shrink-0 pl-4">
            <span class="flex items-center space-x-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span><span class="text-[11px] font-mono text-emerald-400 font-semibold">PYTHON CORE ONLINE</span></span>
            <span class="text-gray-600">|</span>
            <span class="text-[11px] font-mono">TPS: 250,000+</span>
        </div>
    </div>

    <!-- Main Navigation Bar -->
    <header class="sticky top-0 z-40 glass-panel border-b border-gray-800/80 px-6 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-8">
            <a href="#/home" onclick="navigate('home')" class="flex items-center space-x-3 group">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center font-black text-dark-950 text-xl shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    C
                </div>
                <div>
                    <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">CRYPTOBRIDGE</span>
                    <span class="text-[10px] block uppercase font-mono tracking-widest text-amber-400 font-bold -mt-1">ENTERPRISE CEX</span>
                </div>
            </a>

{/* Auth-conditional Navigation - Show/hide based on user login status */}
        <div id="nav-desktop" class="hidden md:flex items-center space-x-1">
            <button onclick="navigate('home')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="home" data-requires-auth="true">Markets & Overview</button>
            <button onclick="navigate('spot')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="spot" data-requires-auth="true">Spot Exchange</button>
            <button onclick="navigate('dashboard')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="dashboard" data-requires-auth="true">User Dashboard</button>
            <button onclick="navigate('p2p')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="p2p" data-requires-auth="true">P2P Escrow</button>
            <button onclick="navigate('wallet')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="wallet" data-requires-auth="true">Wallet Vault</button>
            <button onclick="navigate('news')" class="nav-item px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all" data-nav="news" data-requires-auth="true">Live Intel & News</button>
        </div>
        {% if user_token %}
            <div id="nav-admin" class="flex items-center space-x-1">
                <a href="/admin" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-xl text-sm font-semibold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition-all" data-requires-admin="true">Executive Admin &rarr;</a>
            </div>
        {% else %}
            <div id="nav-auth" class="flex items-center space-x-1">
                <button onclick="openAuthModal('login')" class="px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Sign In</button>
                <button onclick="openAuthModal('register')" class="px-3.5 py-2 rounded-xl text-sm font-bold text-dark-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transition-all shadow-md shadow-amber-500/20">Register Account</button>
            </div>
        {% endif %}
        </div>

        <!-- Auth Controls -->
        <div class="flex items-center space-x-3">
            <div id="unauth-buttons" class="flex items-center space-x-2">
                <button onclick="openAuthModal('login')" class="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Sign In</button>
                <button onclick="openAuthModal('register')" class="px-4 py-2 rounded-xl text-sm font-bold text-dark-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transition-all shadow-md shadow-amber-500/20">Register Account</button>
            </div>
            <div id="user-profile-badge" class="hidden items-center space-x-3">
                <div class="text-right cursor-pointer" onclick="navigate('dashboard')">
                    <span id="user-display-email" class="text-xs font-semibold text-white block"></span>
                    <span id="user-display-kyc" class="text-[10px] font-mono text-emerald-400 font-bold">KYC VERIFIED</span>
                </div>
                <button onclick="handleLogout()" class="px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs font-medium text-gray-300 transition-colors">Sign Out</button>
            </div>
        </div>
    </header>

    <!-- Main Dynamic Application Container -->
    <main id="app-view-container" class="flex-1 flex flex-col">
        <!-- 1. HOME VIEW -->
        <section id="view-home" class="page-view space-y-12 p-8 max-w-7xl mx-auto w-full">
            <!-- Hero Banner -->
            <div class="glass-panel p-10 md:p-14 rounded-3xl relative overflow-hidden border border-amber-500/20 glow-brand">
                <div class="max-w-2xl space-y-6 relative z-10">
                    <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
                        <span>Next-Generation Pure Python CEX</span>
                    </div>
                    <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
                        Institutional Digital Asset Exchange with <span class="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">Deterministic Solvency</span>
                    </h1>
                    <p class="text-base md:text-lg text-gray-300 leading-relaxed">
                        Execute spot trades with microsecond Price-Time Priority matching, 100% cryptographic double-entry reserve guarantees, and multi-fiat zero-fee P2P escrow.
                    </p>
                    <div class="flex flex-wrap gap-4 pt-2">
                        <button onclick="navigate('spot')" class="px-6 py-3.5 rounded-2xl font-bold text-dark-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transition-all text-base shadow-xl shadow-amber-500/25">
                            Trade Spot Markets &rarr;
                        </button>
                        <button onclick="navigate('dashboard')" class="px-6 py-3.5 rounded-2xl font-semibold text-white bg-dark-700 hover:bg-dark-600 border border-gray-700 transition-all text-base">
                            Open Dashboard & Sidebar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Real-Time Spot Markets Table -->
            <div class="glass-card rounded-3xl p-6 space-y-4 border border-gray-800">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-white">Live Cryptocurrency Markets</h2>
                        <p class="text-xs text-gray-400">Streamed in real-time with sub-millisecond price updates.</p>
                    </div>
                    <button onclick="loadTickers()" class="px-3.5 py-1.5 rounded-xl bg-dark-700 text-xs font-semibold text-amber-400 border border-amber-500/20 hover:bg-dark-600 transition-colors">
                        Refresh Markets
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-300">
                        <thead class="bg-dark-900/80 text-xs uppercase text-gray-400 font-mono border-b border-gray-800">
                            <tr>
                                <th class="p-4">Market Pair</th>
                                <th class="p-4">Last Price</th>
                                <th class="p-4">24h Change</th>
                                <th class="p-4">24h High / Low</th>
                                <th class="p-4">24h Volume</th>
                                <th class="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="home-markets-tbody" class="divide-y divide-gray-800/60 font-mono text-xs">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- 2. USER DASHBOARD VIEW (With Persistent Sidebar) -->
        <section id="view-dashboard" class="page-view hidden flex-1 flex flex-row overflow-hidden h-[calc(100vh-80px)]">
            <!-- Dedicated Dashboard Sidebar -->
            <aside class="w-64 border-r border-gray-800/80 p-5 space-y-6 flex flex-col justify-between shrink-0 glass-panel">
                <div class="space-y-6">
                    <div class="px-2">
                        <span class="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">User Hub</span>
                        <h2 class="text-lg font-bold text-white mt-0.5">My Dashboard</h2>
                    </div>

                    <!-- Sidebar Navigation Tabs -->
                    <nav class="space-y-1" id="dash-nav-tabs">
                        <button onclick="switchDashTab('overview')" class="dash-tab-btn active w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all bg-amber-500/10 text-amber-400 border border-amber-500/20" data-dashtab="overview">
                            <span>Portfolio Overview</span>
                        </button>
                        <button onclick="switchDashTab('spot-balances')" class="dash-tab-btn w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-800/60 transition-all" data-dashtab="spot-balances">
                            <span>Spot Balances</span>
                        </button>
                        <button onclick="switchDashTab('order-history')" class="dash-tab-btn w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-800/60 transition-all" data-dashtab="order-history">
                            <span>Orders & Trades</span>
                        </button>
                        <button onclick="switchDashTab('security-settings')" class="dash-tab-btn w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-800/60 transition-all" data-dashtab="security-settings">
                            <span>Security & KYC</span>
                        </button>
                        <button onclick="switchDashTab('p2p-trades')" class="dash-tab-btn w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-800/60 transition-all" data-dashtab="p2p-trades">
                            <span>P2P Escrow Vault</span>
                        </button>
                    </nav>
                </div>

                <!-- Account Badge -->
                <div class="glass-card p-3.5 rounded-2xl border border-gray-800 space-y-2">
                    <div class="flex justify-between text-xs">
                        <span class="text-gray-400">Account Tier:</span>
                        <span class="font-mono text-emerald-400 font-bold" id="dash-tier-label">TIER 1 (BASIC)</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-gray-400">2FA Status:</span>
                        <span class="font-mono text-amber-400 font-bold" id="dash-2fa-status">ACTIVE</span>
                    </div>
                </div>
            </aside>

            <!-- Main Dashboard Body -->
            <div class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <!-- Subtab 1: Portfolio Overview -->
                <div id="dashtab-overview" class="dash-subtab space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-bold tracking-tight text-white">Portfolio Overview</h1>
                            <p class="text-sm text-gray-400">Net asset value, real-time balances, and performance allocation.</p>
                        </div>
                        <div class="flex space-x-3">
                            <button onclick="navigate('wallet')" class="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 text-dark-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors">
                                + Deposit / Withdraw
                            </button>
                        </div>
                    </div>

                    <!-- Portfolio Cards Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div class="glass-panel p-6 rounded-3xl border border-amber-500/20 glow-brand">
                            <span class="text-xs uppercase tracking-wider font-semibold text-gray-400">Estimated Net Worth</span>
                            <div class="text-3xl font-extrabold font-mono text-white mt-1" id="dash-total-networth">$109,645.00</div>
                            <span class="text-xs font-mono text-emerald-400 font-bold mt-2 block">≈ 1.1368 BTC</span>
                        </div>
                        <div class="glass-card p-6 rounded-3xl border border-gray-800">
                            <span class="text-xs uppercase tracking-wider font-semibold text-gray-400">24h Estimated PnL</span>
                            <div class="text-3xl font-extrabold font-mono text-emerald-400 mt-1">+$3,450.20</div>
                            <span class="text-xs font-mono text-emerald-400 mt-2 block">+3.24% Today</span>
                        </div>
                        <div class="glass-card p-6 rounded-3xl border border-gray-800">
                            <span class="text-xs uppercase tracking-wider font-semibold text-gray-400">Open Orders Margin</span>
                            <div class="text-3xl font-extrabold font-mono text-white mt-1" id="dash-locked-funds">$0.00</div>
                            <span class="text-xs font-mono text-gray-400 mt-2 block">100% Invariant Protected</span>
                        </div>
                    </div>

                    <!-- Asset Allocation List -->
                    <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                        <h3 class="font-bold text-base text-white">Asset Allocation</h3>
                        <div id="dash-assets-summary-list" class="space-y-3">
                            <!-- Filled by JS -->
                        </div>
                    </div>
                </div>

                <!-- Subtab 2: Spot Balances -->
                <div id="dashtab-spot-balances" class="dash-subtab hidden space-y-6">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-white">Spot Account Assets</h1>
                        <p class="text-sm text-gray-400">Available and reserved balances on the double-entry financial ledger.</p>
                    </div>
                    <div class="glass-card rounded-3xl overflow-hidden border border-gray-800">
                        <table class="w-full text-left text-sm text-gray-300">
                            <thead class="bg-dark-900/80 text-xs uppercase text-gray-400 font-mono border-b border-gray-800">
                                <tr>
                                    <th class="p-4">Asset</th>
                                    <th class="p-4">Total Balance</th>
                                    <th class="p-4">Available</th>
                                    <th class="p-4">Locked / In Orders</th>
                                    <th class="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="dash-balances-tbody" class="divide-y divide-gray-800/60 font-mono text-xs">
                                <!-- Filled by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Subtab 3: Order History -->
                <div id="dashtab-order-history" class="dash-subtab hidden space-y-6">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-white">Order & Trade History</h1>
                        <p class="text-sm text-gray-400">Live order matching executions and historical limit order receipts.</p>
                    </div>
                    <div class="glass-card rounded-3xl overflow-hidden border border-gray-800">
                        <table class="w-full text-left text-sm text-gray-300">
                            <thead class="bg-dark-900/80 text-xs uppercase text-gray-400 font-mono border-b border-gray-800">
                                <tr>
                                    <th class="p-4">Order ID</th>
                                    <th class="p-4">Market</th>
                                    <th class="p-4">Side / Type</th>
                                    <th class="p-4">Price</th>
                                    <th class="p-4">Amount</th>
                                    <th class="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody id="dash-orders-tbody" class="divide-y divide-gray-800/60 font-mono text-xs">
                                <tr><td colspan="6" class="p-8 text-center text-gray-500 font-sans">No open orders. Ready to trade on Spot Exchange!</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Subtab 4: Security & KYC Settings -->
                <div id="dashtab-security-settings" class="dash-subtab hidden space-y-6">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-white">Security & Identity Verification</h1>
                        <p class="text-sm text-gray-400">Institutional authentication, 2FA TOTP configuration, and KYC compliance.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- 2FA Card -->
                        <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                            <div class="flex justify-between items-center">
                                <h3 class="font-bold text-base text-white">Two-Factor Authentication (2FA)</h3>
                                <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400">TOTP (Google Auth)</span>
                            </div>
                            <p class="text-xs text-gray-400">Protect account withdrawals and P2P escrow releases with time-based one-time codes.</p>
                            <button onclick="handleSetup2FA()" class="w-full py-2.5 rounded-xl font-bold text-xs bg-dark-700 hover:bg-dark-600 text-white border border-gray-700 transition-all">
                                Configure / Verify 2FA
                            </button>
                        </div>

                        <!-- KYC Submission Card -->
                        <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                            <div class="flex justify-between items-center">
                                <h3 class="font-bold text-base text-white">Identity Verification (KYC)</h3>
                                <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400">TIER 1 ACTIVE</span>
                            </div>
                            <p class="text-xs text-gray-400">Upgrade to Tier 2 (Pro) or Tier 3 (Institutional) for unlimited withdrawal limits.</p>
                            <button onclick="handleUpgradeKYC()" class="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-dark-950 transition-all shadow-md shadow-amber-500/20">
                                Upgrade KYC Tier
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Subtab 5: P2P Trades -->
                <div id="dashtab-p2p-trades" class="dash-subtab hidden space-y-6">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-white">P2P Escrow Vault Trades</h1>
                        <p class="text-sm text-gray-400">Active and completed P2P escrow contracts and fiat payment confirmations.</p>
                    </div>
                    <div class="glass-card rounded-3xl overflow-hidden border border-gray-800">
                        <table class="w-full text-left text-sm text-gray-300">
                            <thead class="bg-dark-900/80 text-xs uppercase text-gray-400 font-mono border-b border-gray-800">
                                <tr>
                                    <th class="p-4">Trade ID</th>
                                    <th class="p-4">Role</th>
                                    <th class="p-4">Crypto Amount</th>
                                    <th class="p-4">Fiat Amount</th>
                                    <th class="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody id="dash-p2p-tbody" class="divide-y divide-gray-800/60 font-mono text-xs">
                                <tr><td colspan="5" class="p-8 text-center text-gray-500 font-sans">No active P2P trades.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <!-- 3. SPOT TRADING VIEW -->
        <section id="view-spot" class="page-view hidden flex-1 flex flex-col h-[calc(100vh-100px)] p-4 space-y-4">
            <!-- Market Selector Bar -->
            <div class="glass-panel px-5 py-3 rounded-2xl flex items-center justify-between shrink-0">
                <div class="flex items-center space-x-6">
                    <div class="flex items-center space-x-2">
                        <span class="font-extrabold text-lg text-white" id="spot-selected-market">BTC/USDT</span>
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">SPOT 10X</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block">Mark Price</span>
                        <span class="font-mono text-sm font-bold text-white" id="spot-mark-price">$96,450.00</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block">24h Change</span>
                        <span class="font-mono text-xs font-bold text-emerald-400">+3.42%</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block">24h High</span>
                        <span class="font-mono text-xs text-gray-200">$97,200.00</span>
                    </div>
                    <div>
                        <span class="text-xs text-gray-400 block">24h Volume</span>
                        <span class="font-mono text-xs text-gray-200">34,210.50 BTC</span>
                    </div>
                </div>

                <div class="flex space-x-2">
                    <button onclick="setSpotMarket('BTC/USDT')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">BTC/USDT</button>
                    <button onclick="setSpotMarket('ETH/USDT')" class="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-dark-800">ETH/USDT</button>
                    <button onclick="setSpotMarket('SOL/USDT')" class="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white bg-dark-800">SOL/USDT</button>
                </div>
            </div>

            <!-- Spot Grid: Chart, OrderBook, Order Entry -->
            <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden min-h-0">
                <!-- Left: Interactive TradingView Chart (2 Cols) -->
                <div class="lg:col-span-2 glass-card rounded-2xl p-2 flex flex-col min-h-0 overflow-hidden">
                    <div id="tradingview_chart_container" class="w-full h-full rounded-xl overflow-hidden min-h-[450px]"></div>
                </div>

                <!-- Middle: Live Limit Order Book Depth -->
                <div class="glass-card rounded-2xl p-4 flex flex-col min-h-0 space-y-3">
                    <div class="flex justify-between items-center">
                        <h3 class="text-sm font-bold text-white">Order Book Depth</h3>
                        <span class="text-[10px] font-mono text-gray-400">Price / Size</span>
                    </div>

                    <!-- Asks (Red) -->
                    <div id="lob-asks-container" class="space-y-1 font-mono text-xs text-rose-400 overflow-y-auto flex-1 custom-scrollbar">
                        <!-- Filled by JS -->
                    </div>

                    <!-- Spread Indicator -->
                    <div class="py-1 px-2 rounded bg-dark-900 border border-gray-800 text-center font-mono text-xs font-bold text-white flex justify-between">
                        <span id="lob-spread-price">$96,450.00</span>
                        <span class="text-emerald-400 text-[10px]">Spread 0.01</span>
                    </div>

                    <!-- Bids (Green) -->
                    <div id="lob-bids-container" class="space-y-1 font-mono text-xs text-emerald-400 overflow-y-auto flex-1 custom-scrollbar">
                        <!-- Filled by JS -->
                    </div>
                </div>

                <!-- Right: Order Placement Form -->
                <div class="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-2 p-1 rounded-xl bg-dark-900 border border-gray-800">
                            <button id="spot-side-buy" onclick="setSpotSide('BUY')" class="py-2 rounded-lg font-bold text-xs bg-emerald-500 text-dark-950 transition-all">BUY</button>
                            <button id="spot-side-sell" onclick="setSpotSide('SELL')" class="py-2 rounded-lg font-bold text-xs text-gray-400 hover:text-white transition-all">SELL</button>
                        </div>

                        <div class="flex space-x-2 text-xs">
                            <button onclick="setSpotType('LIMIT')" id="type-limit-btn" class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">Limit</button>
                            <button onclick="setSpotType('MARKET')" id="type-market-btn" class="px-2.5 py-1 rounded text-gray-400 font-medium hover:text-white">Market</button>
                            <button onclick="setSpotType('POST_ONLY')" id="type-po-btn" class="px-2.5 py-1 rounded text-gray-400 font-medium hover:text-white">Post-Only</button>
                        </div>

                        <div class="space-y-3 text-xs">
                            <div>
                                <label class="text-gray-400 block mb-1">Price (USDT)</label>
                                <input id="spot-order-price" type="number" step="0.01" value="96450.00" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-gray-700 text-white font-mono focus:border-amber-400 focus:outline-none" />
                            </div>
                            <div>
                                <label class="text-gray-400 block mb-1">Amount (<span id="spot-asset-label">BTC</span>)</label>
                                <input id="spot-order-qty" type="number" step="0.0001" value="0.1" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-gray-700 text-white font-mono focus:border-amber-400 focus:outline-none" />
                            </div>
                            <div class="flex justify-between text-gray-400 text-[11px] font-mono">
                                <span>Order Value:</span>
                                <span id="spot-order-total" class="text-white font-bold">$9,645.00 USDT</span>
                            </div>
                        </div>
                    </div>

                    <button id="spot-submit-btn" onclick="submitSpotOrder()" class="w-full py-3.5 rounded-xl font-extrabold text-sm text-dark-950 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:from-emerald-300 hover:to-emerald-200 transition-all shadow-lg shadow-emerald-500/20">
                        BUY BTC
                    </button>
                </div>
            </div>
        </section>

        <!-- 4. P2P ESCROW VIEW -->
        <section id="view-p2p" class="page-view hidden space-y-8 p-8 max-w-7xl mx-auto w-full">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-extrabold text-white">Peer-to-Peer (P2P) Escrow Market</h1>
                    <p class="text-sm text-gray-400">Buy and sell crypto directly with zero platform fees and cryptographic escrow protection.</p>
                </div>
                <button onclick="openCreateAdModal()" class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-dark-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">
                    + Post Advertisement
                </button>
            </div>

            <!-- Filter Controls -->
            <div class="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between border border-gray-800">
                <div class="flex space-x-2">
                    <button onclick="filterP2P('BUY')" class="p2p-type-btn active px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Buy Crypto</button>
                    <button onclick="filterP2P('SELL')" class="p2p-type-btn px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-dark-800">Sell Crypto</button>
                </div>
                <div class="flex space-x-3 text-xs font-mono">
                    <select id="p2p-asset-select" class="px-3 py-2 rounded-xl bg-dark-800 border border-gray-700 text-white focus:outline-none">
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                    </select>
                    <select id="p2p-fiat-select" class="px-3 py-2 rounded-xl bg-dark-800 border border-gray-700 text-white focus:outline-none">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
            </div>

            <!-- P2P Ads Table -->
            <div class="glass-card rounded-3xl overflow-hidden border border-gray-800">
                <table class="w-full text-left text-sm text-gray-300">
                    <thead class="bg-dark-900/80 text-xs uppercase text-gray-400 font-mono border-b border-gray-800">
                        <tr>
                            <th class="p-4">Merchant</th>
                            <th class="p-4">Price</th>
                            <th class="p-4">Available / Limits</th>
                            <th class="p-4">Payment Methods</th>
                            <th class="p-4 text-right">Trade</th>
                        </tr>
                    </thead>
                    <tbody id="p2p-ads-tbody" class="divide-y divide-gray-800/60 font-mono text-xs">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>
        </section>

        <!-- 5. WALLET VIEW -->
        <section id="view-wallet" class="page-view hidden space-y-8 p-8 max-w-7xl mx-auto w-full">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-extrabold text-white">Portfolio & Wallet Vault</h1>
                    <p class="text-sm text-gray-400">Manage assets, external on-chain deposits, withdrawals, and zero-fee internal transfers.</p>
                </div>
            </div>

            <!-- Balances Cards Grid -->
            <div id="wallet-balances-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <!-- Populated by JS -->
            </div>

            <!-- Action Panels (Deposit, Withdraw, Internal Transfer) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Deposit Box -->
                <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                    <h3 class="font-bold text-lg text-emerald-400 flex items-center space-x-2"><span>Deposit Funds</span></h3>
                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="text-gray-400 block mb-1">Asset</label>
                            <select id="deposit-asset" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono">
                                <option value="USDT">USDT</option>
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                                <option value="SOL">SOL</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-gray-400 block mb-1">Amount</label>
                            <input id="deposit-amount" type="number" step="0.01" value="1000.00" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono" />
                        </div>
                        <button onclick="handleDeposit()" class="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-dark-950 transition-all shadow-md shadow-emerald-500/20">
                            Confirm Test Deposit
                        </button>
                    </div>
                </div>

                <!-- Withdrawal Box -->
                <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                    <h3 class="font-bold text-lg text-rose-400 flex items-center space-x-2"><span>Withdraw Funds</span></h3>
                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="text-gray-400 block mb-1">Asset</label>
                            <select id="withdraw-asset" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono">
                                <option value="USDT">USDT</option>
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-gray-400 block mb-1">Amount</label>
                            <input id="withdraw-amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono" />
                        </div>
                        <div>
                            <label class="text-gray-400 block mb-1">Destination Address</label>
                            <input id="withdraw-address" type="text" placeholder="0x..." class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono" />
                        </div>
                        <button onclick="handleWithdrawal()" class="w-full py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20">
                            Request Withdrawal
                        </button>
                    </div>
                </div>

                <!-- Internal Transfer Box -->
                <div class="glass-card p-6 rounded-3xl space-y-4 border border-gray-800">
                    <h3 class="font-bold text-lg text-amber-400 flex items-center space-x-2"><span>Instant Internal Transfer</span></h3>
                    <p class="text-xs text-gray-400">Send assets instantly to another CryptoBridge user with zero network fees.</p>
                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="text-gray-400 block mb-1">Recipient User ID</label>
                            <input id="transfer-to-id" type="text" placeholder="usr_..." class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono" />
                        </div>
                        <div>
                            <label class="text-gray-400 block mb-1">Asset</label>
                            <select id="transfer-asset" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono">
                                <option value="USDT">USDT</option>
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-gray-400 block mb-1">Amount</label>
                            <input id="transfer-amount" type="number" step="0.01" placeholder="0.00" class="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-gray-700 text-white font-mono" />
                        </div>
                        <button onclick="handleInternalTransfer()" class="w-full py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-dark-950 transition-all shadow-md shadow-amber-500/20">
                            Transfer Zero-Fee
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- 6. NEWS VIEW -->
        <section id="view-news" class="page-view hidden space-y-8 p-8 max-w-7xl mx-auto w-full">
            <div>
                <h1 class="text-3xl font-extrabold text-white">Live Market Intelligence & News</h1>
                <p class="text-sm text-gray-400">Curated macroeconomic indicators, crypto policy updates, and corporate earnings.</p>
            </div>
            <div id="news-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Filled by JS -->
            </div>
        </section>
    </main>

    <!-- Global Auth Modal -->
    <div id="global-auth-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 hidden">
        <div class="glass-panel p-8 rounded-3xl max-w-md w-full border border-amber-500/30 space-y-6 glow-brand">
            <div class="flex justify-between items-center">
                <h2 id="auth-modal-title" class="text-2xl font-bold text-white">Sign In to CryptoBridge</h2>
                <button onclick="closeAuthModal()" class="text-gray-400 hover:text-white text-lg">&times;</button>
            </div>
            <form onsubmit="handleAuthSubmit(event)" class="space-y-4">
                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Email Address</label>
                    <input id="auth-email" type="email" placeholder="name@example.com" class="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-gray-700 text-white font-mono text-sm focus:border-amber-400 focus:outline-none" required />
                </div>
                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Password</label>
                    <input id="auth-password" type="password" placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-gray-700 text-white font-mono text-sm focus:border-amber-400 focus:outline-none" required />
                </div>
                <div id="auth-error-msg" class="text-xs text-rose-400 hidden"></div>
                <button type="submit" id="auth-submit-btn" class="w-full py-3 rounded-xl font-bold text-dark-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transition-all shadow-lg shadow-amber-500/20">
                    Sign In
                </button>
            </form>
        </div>
    </div>

    <!-- Client-side Interactive Engine -->
    <script>
        let currentAuthMode = 'login';
        let spotSide = 'BUY';
        let spotType = 'LIMIT';
        let spotMarket = 'BTC/USDT';

        function navigate(page) {
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-item').forEach(el => {
                if (el.dataset.nav === page) {
                    el.classList.add('text-amber-400', 'bg-white/5');
                } else {
                    el.classList.remove('text-amber-400', 'bg-white/5');
                }
            });

            const target = document.getElementById('view-' + page);
            if (target) {
                target.classList.remove('hidden');
                if (page === 'spot') initTradingViewChart();
                if (page === 'wallet') loadWalletBalances();
                if (page === 'dashboard') loadDashboardData();
                if (page === 'p2p') loadP2PAds();
                if (page === 'news') loadNews();
            }
            window.location.hash = '#/' + page;
        }

        function switchDashTab(tabId) {
            document.querySelectorAll('.dash-tab-btn').forEach(btn => {
                if (btn.dataset.dashtab === tabId) {
                    btn.classList.add('bg-amber-500/10', 'text-amber-400', 'border', 'border-amber-500/20');
                    btn.classList.remove('text-gray-400');
                } else {
                    btn.classList.remove('bg-amber-500/10', 'text-amber-400', 'border', 'border-amber-500/20');
                    btn.classList.add('text-gray-400');
                }
            });

            document.querySelectorAll('.dash-subtab').forEach(el => el.classList.add('hidden'));
            const target = document.getElementById('dashtab-' + tabId);
            if (target) target.classList.remove('hidden');
        }

        async function loadDashboardData() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) { openAuthModal('login'); return; }

            try {
                // Fetch User balances
                const res = await fetch('/api/v1/wallet/balances', { headers: { 'Authorization': 'Bearer ' + token } });
                const data = await res.json();
                if (data.balances) {
                    // Update table
                    const tbody = document.getElementById('dash-balances-tbody');
                    const summaryList = document.getElementById('dash-assets-summary-list');
                    tbody.innerHTML = '';
                    summaryList.innerHTML = '';

                    let totalUSD = 0;
                    data.balances.forEach(b => {
                        const price = b.asset === 'BTC' ? 96450 : (b.asset === 'ETH' ? 2785.50 : (b.asset === 'SOL' ? 188.75 : 1));
                        const valUSD = parseFloat(b.total) * price;
                        totalUSD += valUSD;

                        tbody.innerHTML += `
                            <tr class="hover:bg-dark-800/50">
                                <td class="p-4 font-bold text-white">${b.asset}</td>
                                <td class="p-4 font-bold text-white">${parseFloat(b.total).toFixed(4)} <span class="text-gray-500 text-[10px]">($${valUSD.toFixed(2)})</span></td>
                                <td class="p-4 text-emerald-400">${parseFloat(b.available).toFixed(4)}</td>
                                <td class="p-4 text-amber-400">${parseFloat(b.locked).toFixed(4)}</td>
                                <td class="p-4 text-right">
                                    <button onclick="navigate('spot')" class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-bold">Trade</button>
                                </td>
                            </tr>
                        `;

                        summaryList.innerHTML += `
                            <div class="flex justify-between items-center p-3 rounded-2xl bg-dark-900 border border-gray-800 font-mono text-xs">
                                <span class="font-bold text-white">${b.asset}</span>
                                <span class="text-gray-300">${parseFloat(b.total).toFixed(4)} ${b.asset} <span class="text-emerald-400 font-bold ml-2">($${valUSD.toFixed(2)})</span></span>
                            </div>
                        `;
                    });

                    document.getElementById('dash-total-networth').innerText = '$' + totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                // Fetch User Orders
                const ordRes = await fetch('/api/v1/orders/my', { headers: { 'Authorization': 'Bearer ' + token } });
                const ordData = await ordRes.json();
                if (ordData.orders && ordData.orders.length > 0) {
                    const ordTbody = document.getElementById('dash-orders-tbody');
                    ordTbody.innerHTML = ordData.orders.map(o => `
                        <tr class="hover:bg-dark-800/50">
                            <td class="p-4 text-gray-400 font-mono text-[11px]">${o.id}</td>
                            <td class="p-4 font-bold text-white">${o.market}</td>
                            <td class="p-4 font-bold ${o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}">${o.side} (${o.type})</td>
                            <td class="p-4">$${o.price}</td>
                            <td class="p-4">${o.quantity}</td>
                            <td class="p-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">${o.status}</span></td>
                        </tr>
                    `).join('');
                }
            } catch (err) {}
        }

        function handleSetup2FA() {
            alert("TOTP 2FA verification is enabled and enforced for your security.");
        }

        function handleUpgradeKYC() {
            alert("KYC documents submitted to compliance officer queue for review.");
        }

        function initTradingViewChart() {
            if (document.getElementById('tradingview_chart_container') && window.TradingView) {
                new TradingView.widget({
                    "autosize": true,
                    "symbol": "BINANCE:BTCUSDT",
                    "interval": "15",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1",
                    "locale": "en",
                    "enable_publishing": false,
                    "backgroundColor": "#0a0d14",
                    "gridColor": "rgba(255, 255, 255, 0.05)",
                    "container_id": "tradingview_chart_container"
                });
            }
        }

        async function loadTickers() {
            try {
                const res = await fetch('/api/v1/market-data/tickers');
                const data = await res.json();
                if (data.tickers) {
                    const tbody = document.getElementById('home-markets-tbody');
                    tbody.innerHTML = '';
                    Object.values(data.tickers).forEach(t => {
                        const isPos = parseFloat(t.change24h) >= 0;
                        tbody.innerHTML += `
                            <tr class="hover:bg-dark-800/50 transition-colors">
                                <td class="p-4 font-bold text-white">${t.symbol}</td>
                                <td class="p-4 text-white">$${t.price}</td>
                                <td class="p-4 font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}">${isPos ? '+' : ''}${t.change24h}%</td>
                                <td class="p-4 text-gray-400">$${t.high24h} / $${t.low24h}</td>
                                <td class="p-4 text-gray-400">${t.volume}</td>
                                <td class="p-4 text-right">
                                    <button onclick="setSpotMarket('${t.symbol}'); navigate('spot')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-bold">Trade</button>
                                </td>
                            </tr>
                        `;
                    });
                }
            } catch (err) {
                console.error("Error loading tickers:", err);
            }
        }

        async function loadOrderBook() {
            try {
                const res = await fetch('/api/v1/market-data/orderbook/' + encodeURIComponent(spotMarket));
                const data = await res.json();
                if (data.depth) {
                    const asksContainer = document.getElementById('lob-asks-container');
                    const bidsContainer = document.getElementById('lob-bids-container');
                    asksContainer.innerHTML = (data.depth.asks || []).slice(0, 8).map(a => `
                        <div class="flex justify-between"><span>${parseFloat(a[0]).toFixed(2)}</span><span>${parseFloat(a[1]).toFixed(4)}</span></div>
                    `).join('') || '<div class="text-gray-500">Empty ask book</div>';

                    bidsContainer.innerHTML = (data.depth.bids || []).slice(0, 8).map(b => `
                        <div class="flex justify-between"><span>${parseFloat(b[0]).toFixed(2)}</span><span>${parseFloat(b[1]).toFixed(4)}</span></div>
                    `).join('') || '<div class="text-gray-500">Empty bid book</div>';
                }
            } catch (err) {}
        }

        function setSpotMarket(m) {
            spotMarket = m;
            document.getElementById('spot-selected-market').innerText = m;
            document.getElementById('spot-asset-label').innerText = m.split('/')[0];
            loadOrderBook();
        }

        function setSpotSide(side) {
            spotSide = side;
            const buyBtn = document.getElementById('spot-side-buy');
            const sellBtn = document.getElementById('spot-side-sell');
            const submitBtn = document.getElementById('spot-submit-btn');
            if (side === 'BUY') {
                buyBtn.className = 'py-2 rounded-lg font-bold text-xs bg-emerald-500 text-dark-950 transition-all';
                sellBtn.className = 'py-2 rounded-lg font-bold text-xs text-gray-400 hover:text-white transition-all';
                submitBtn.className = 'w-full py-3.5 rounded-xl font-extrabold text-sm text-dark-950 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:from-emerald-300 hover:to-emerald-200 transition-all shadow-lg shadow-emerald-500/20';
                submitBtn.innerText = 'BUY ' + spotMarket.split('/')[0];
            } else {
                sellBtn.className = 'py-2 rounded-lg font-bold text-xs bg-rose-600 text-white transition-all';
                buyBtn.className = 'py-2 rounded-lg font-bold text-xs text-gray-400 hover:text-white transition-all';
                submitBtn.className = 'w-full py-3.5 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 transition-all shadow-lg shadow-rose-600/20';
                submitBtn.innerText = 'SELL ' + spotMarket.split('/')[0];
            }
        }

        function setSpotType(t) {
            spotType = t;
            ['limit', 'market', 'po'].forEach(k => {
                const el = document.getElementById(`type-${k}-btn`);
                if (el) el.className = 'px-2.5 py-1 rounded text-gray-400 font-medium hover:text-white';
            });
            const activeId = t === 'LIMIT' ? 'type-limit-btn' : (t === 'MARKET' ? 'type-market-btn' : 'type-po-btn');
            document.getElementById(activeId).className = 'px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30';
        }

        async function submitSpotOrder() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) { openAuthModal('login'); return; }
            const price = document.getElementById('spot-order-price').value;
            const quantity = document.getElementById('spot-order-qty').value;

            const res = await fetch('/api/v1/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ market: spotMarket, side: spotSide, type: spotType, price, quantity })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Order placed successfully! Status: ${data.order.status}`);
                loadOrderBook();
            } else {
                alert(data.error || 'Order placement failed');
            }
        }

        async function loadP2PAds() {
            try {
                const res = await fetch('/api/v1/p2p/ads');
                const data = await res.json();
                const tbody = document.getElementById('p2p-ads-tbody');
                if (data.ads && data.ads.length > 0) {
                    tbody.innerHTML = data.ads.map(ad => `
                        <tr class="hover:bg-dark-800/50">
                            <td class="p-4 font-bold text-white">${ad.merchant_name}</td>
                            <td class="p-4 text-emerald-400 font-bold text-sm">$${ad.price} ${ad.fiat_currency}</td>
                            <td class="p-4">${ad.available_amount} ${ad.asset}<br><span class="text-[10px] text-gray-500">Limit: $${ad.min_limit} - $${ad.max_limit}</span></td>
                            <td class="p-4"><span class="px-2 py-0.5 rounded bg-dark-700 text-[10px] text-gray-300 font-sans">${(ad.payment_methods || []).join(', ')}</span></td>
                            <td class="p-4 text-right">
                                <button onclick="initiateP2PTrade('${ad.id}')" class="px-4 py-2 rounded-xl text-xs font-bold ${ad.type === 'SELL' ? 'bg-emerald-500 text-dark-950' : 'bg-rose-600 text-white'}">
                                    ${ad.type === 'SELL' ? 'Buy ' + ad.asset : 'Sell ' + ad.asset}
                                </button>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 font-sans">No active P2P ads found. Be the first to post an advertisement!</td></tr>';
                }
            } catch (err) {}
        }

        async function loadWalletBalances() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) return;
            const res = await fetch('/api/v1/wallet/balances', { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            if (data.balances) {
                const grid = document.getElementById('wallet-balances-grid');
                grid.innerHTML = data.balances.map(b => `
                    <div class="glass-card p-5 rounded-2xl border border-gray-800">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-white">${b.asset}</span>
                            <span class="text-xs font-mono text-emerald-400">Available: ${parseFloat(b.available).toFixed(4)}</span>
                        </div>
                        <div class="text-2xl font-black font-mono text-white mt-2">${parseFloat(b.total).toFixed(4)}</div>
                        <div class="text-[11px] text-gray-500 font-mono mt-1">Locked: ${parseFloat(b.locked).toFixed(4)}</div>
                    </div>
                `).join('');
            }
        }

        async function handleDeposit() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) { openAuthModal('login'); return; }
            const asset = document.getElementById('deposit-asset').value;
            const amount = document.getElementById('deposit-amount').value;
            const res = await fetch('/api/v1/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ asset, amount })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Deposited ${amount} ${asset} successfully!`);
                loadWalletBalances();
            }
        }

        async function handleWithdrawal() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) { openAuthModal('login'); return; }
            const asset = document.getElementById('withdraw-asset').value;
            const amount = document.getElementById('withdraw-amount').value;
            const destinationAddress = document.getElementById('withdraw-address').value;
            const res = await fetch('/api/v1/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ asset, amount, destinationAddress })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Withdrawal broadcasted with TX ${data.withdrawal.tx_hash}`);
                loadWalletBalances();
            } else {
                alert(data.error || 'Withdrawal failed');
            }
        }

        async function handleInternalTransfer() {
            const token = localStorage.getItem('syncnode_user_token');
            if (!token) { openAuthModal('login'); return; }
            const toUserId = document.getElementById('transfer-to-id').value;
            const asset = document.getElementById('transfer-asset').value;
            const amount = document.getElementById('transfer-amount').value;
            const res = await fetch('/api/v1/wallet/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ toUserId, asset, amount })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Transferred ${amount} ${asset} to ${toUserId} zero-fee!`);
                loadWalletBalances();
            } else {
                alert(data.error || 'Transfer failed');
            }
        }

        async function loadNews() {
            try {
                const res = await fetch('/api/v1/news');
                const data = await res.json();
                if (data.news) {
                    const container = document.getElementById('news-container');
                    container.innerHTML = data.news.map(n => `
                        <div class="glass-card p-6 rounded-2xl border border-gray-800 space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">${n.category}</span>
                                <span class="text-xs text-gray-500">${n.source}</span>
                            </div>
                            <h3 class="text-base font-bold text-white hover:text-amber-400 transition-colors cursor-pointer">${n.title}</h3>
                            <p class="text-xs text-gray-400 leading-relaxed">${n.summary}</p>
                            <div class="flex space-x-2 pt-2">${(n.symbols || []).map(s => `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-700 text-gray-300">$${s}</span>`).join('')}</div>
                        </div>
                    `).join('');
                }
            } catch (err) {}
        }

        function openAuthModal(mode) {
            currentAuthMode = mode;
            document.getElementById('auth-modal-title').innerText = mode === 'login' ? 'Sign In to CryptoBridge' : 'Create Exchange Account';
            document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Sign In' : 'Complete Registration';
            document.getElementById('global-auth-modal').classList.remove('hidden');
        }

        function closeAuthModal() {
            document.getElementById('global-auth-modal').classList.add('hidden');
        }

        async function handleAuthSubmit(e) {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const errDiv = document.getElementById('auth-error-msg');
            const endpoint = currentAuthMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success && data.token) {
                localStorage.setItem('syncnode_user_token', data.token);
                localStorage.setItem('syncnode_user_email', email);
                closeAuthModal();
                updateUserBadge();
                navigate('dashboard');
            } else {
                errDiv.innerText = data.error || 'Authentication error';
                errDiv.classList.remove('hidden');
            }
        }

        function updateUserBadge() {
            const token = localStorage.getItem('syncnode_user_token');
            const email = localStorage.getItem('syncnode_user_email');
            const isAdmin = localStorage.getItem('syncnode_user_is_admin') === 'true';

            document.querySelectorAll('[data-requires-auth="true"]').forEach(el => {
                if (token && email) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

            document.querySelectorAll('[data-requires-admin="true"]').forEach(el => {
                if (token && email && isAdmin) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });

            if (token && email) {
                document.getElementById('unauth-buttons').classList.add('hidden');
                document.getElementById('user-profile-badge').classList.remove('hidden');
                document.getElementById('user-profile-badge').classList.add('flex');
                document.getElementById('user-display-email').innerText = email;
            } else {
                document.getElementById('unauth-buttons').classList.remove('hidden');
                document.getElementById('user-profile-badge').classList.add('hidden');
            }
        }

        function handleLogout() {
            localStorage.removeItem('syncnode_user_token');
            localStorage.removeItem('syncnode_user_email');
            localStorage.removeItem('syncnode_user_is_admin');
            updateUserBadge();
            navigate('home');
        }

        // Initialize Router on Load
        window.addEventListener('DOMContentLoaded', () => {
            const initialPage = (window.location.hash || '#/home').replace('#/', '');
            navigate(initialPage);
            loadTickers();
            updateUserBadge();
        });
    </script>
</body>
</html>
"""
