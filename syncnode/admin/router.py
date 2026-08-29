import os
import json
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse, JSONResponse
from jinja2 import Template

from syncnode.database.db import db
from syncnode.database.repository import user_repository, order_repository, trade_repository
from syncnode.services.ledger import ledger_service
from syncnode.services.risk import risk_service
from syncnode.services.compliance import compliance_service
from syncnode.services.market_data import market_data_service
from syncnode.common.types import AssetSymbol, AdminRole, KycStatus, KycTier

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en" dir="ltr" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SyncNode Pro | Enterprise CRM & Exchange Admin Console</title>
    
    <!-- NexLink Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Instrument Sans', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace']
                    },
                    colors: {
                        brand: {
                            50: '#fefce8',
                            400: '#facc15',
                            500: '#fcd535',
                            600: '#eab308',
                            hover: '#f0b90b'
                        },
                        nex: {
                            bg: '#0e1217',
                            sidebar: '#12161c',
                            card: '#181c24',
                            cardHover: '#1e232d',
                            border: '#23272e',
                            borderLight: '#2b313a',
                            muted: '#5e6673',
                            subtle: '#848e9c',
                            text: '#eaecef'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Instrument Sans', sans-serif; background-color: #0e1217; color: #eaecef; }
        .nex-card { background: #181c24; border: 1px solid #23272e; border-radius: 14px; transition: all 0.2s ease; }
        .nex-card:hover { border-color: #2b313a; }
        .nex-stat-card { background: #181c24; border: 1px solid #23272e; border-radius: 14px; padding: 20px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .nex-stat-card:hover { transform: translateY(-2px); border-color: #383f4a; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45); }
        .nex-btn { border-radius: 8px; font-weight: 600; transition: all 0.15s; }
        
        /* RTL Transitions and Layout */
        html[dir="rtl"] { direction: rtl; text-align: right; }
        html[dir="rtl"] .app-sidebar { border-right: none; border-left: 1px solid #23272e; }
        html[dir="rtl"] .tab-btn { text-align: right; }
        html[dir="rtl"] .text-right { text-align: left; }
        html[dir="rtl"] .space-x-2 > :not([hidden]) ~ :not([hidden]) { --tw-space-x-reverse: 1; }
        html[dir="rtl"] .space-x-3 > :not([hidden]) ~ :not([hidden]) { --tw-space-x-reverse: 1; }
        html[dir="rtl"] .space-x-4 > :not([hidden]) ~ :not([hidden]) { --tw-space-x-reverse: 1; }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #12161c; }
        ::-webkit-scrollbar-thumb { background: #23272e; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #383f4a; }
    </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-brand-500 selection:text-black">

    <!-- ==========================================
         1. NEXLINK APP HEADER
         ========================================== -->
    <header class="sticky top-0 z-50 bg-[#12161c] border-b border-[#23272e] h-16 px-5 flex items-center justify-between">
        <!-- Start: Toggler + Search Bar + KPI Badge -->
        <div class="flex items-center space-x-4">
            <button onclick="toggleSidebar()" class="w-9 h-9 rounded-lg bg-[#181c24] border border-[#23272e] flex items-center justify-center text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            <!-- NexLink Search Box -->
            <div class="relative hidden md:block w-72">
                <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" placeholder="Search anything's..." class="w-full pl-9 pr-12 py-2 bg-[#181c24] border border-[#23272e] rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors">
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 bg-[#12161c] border border-[#23272e] rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-400 font-bold">⌘K</span>
            </div>

            <!-- NexLink KPI Lead Badge -->
            <div class="hidden lg:flex items-center space-x-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-xs text-gray-200">
                <span class="text-gray-400">Today Trades:</span>
                <span class="font-bold text-brand-500">1,482</span>
                <span class="w-1 h-1 rounded-full bg-gray-500"></span>
                <span class="text-emerald-400 font-semibold">$2.48M Vol</span>
            </div>
        </div>

        <!-- End: Quick Actions + RTL Toggle + Theme + Notifications + Profile -->
        <div class="flex items-center space-x-3">
            <!-- Ingest / Credit Quick Action -->
            <button onclick="openCreditFundsModal()" class="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-[#0e1217] font-bold text-xs hover:bg-brand-hover shadow-md shadow-brand-500/10 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>+ Credit / Ingest</span>
            </button>

            <!-- RTL / LTR Toggle Button (Matching index-rtl.html) -->
            <button onclick="toggleRTL()" id="btn-rtl-toggle" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#23272e] text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span id="rtl-label">LTR Mode</span>
            </button>

            <!-- Notifications Center -->
            <div class="relative">
                <button onclick="toggleNotifs()" class="w-9 h-9 rounded-lg bg-[#181c24] border border-[#23272e] flex items-center justify-center text-gray-300 hover:text-white relative">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#12161c]"></span>
                </button>
                <div id="notif-menu" class="hidden absolute right-0 mt-2 w-80 bg-[#181c24] border border-[#23272e] rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div class="p-3 border-b border-[#23272e] flex justify-between items-center">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-xs text-white">Notifications</span>
                            <span class="px-1.5 py-0.5 bg-brand-500 text-black text-[10px] font-bold rounded-full">4 New</span>
                        </div>
                        <span class="text-[11px] text-brand-400 font-semibold cursor-pointer">Mark read</span>
                    </div>
                    <div class="max-h-64 overflow-y-auto divide-y divide-[#23272e] text-xs">
                        <div class="p-3 hover:bg-[#1e232d] transition-colors cursor-pointer">
                            <div class="font-semibold text-gray-200">Withdrawal Approval #w_981</div>
                            <div class="text-gray-400 text-[11px] mt-0.5">2,500.00 USDT requested to TRC20 address.</div>
                            <div class="text-[10px] text-gray-500 mt-1">3 min ago</div>
                        </div>
                        <div class="p-3 hover:bg-[#1e232d] transition-colors cursor-pointer">
                            <div class="font-semibold text-gray-200">KYC Tier 2 Verification</div>
                            <div class="text-gray-400 text-[11px] mt-0.5">Submitted by trader for institutional tier.</div>
                            <div class="text-[10px] text-gray-500 mt-1">18 min ago</div>
                        </div>
                        <div class="p-3 hover:bg-[#1e232d] transition-colors cursor-pointer">
                            <div class="font-semibold text-gray-200">100% Solvency Audit Clean</div>
                            <div class="text-gray-400 text-[11px] mt-0.5">Proof of Reserves verified zero discrepancies.</div>
                            <div class="text-[10px] text-gray-500 mt-1">1 hr ago</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Admin Profile Chip -->
            <div class="flex items-center space-x-2.5 pl-2">
                <div class="relative">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center shadow-md">
                        P
                    </div>
                    <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#12161c]"></span>
                </div>
                <div class="hidden sm:block text-left">
                    <div class="text-xs font-bold text-gray-200 leading-tight">poweldayck</div>
                    <div class="text-[10px] text-brand-400 font-semibold font-mono">SUPER_ADMIN</div>
                </div>
                <button onclick="logoutAdmin()" title="Sign Out" class="p-1.5 text-gray-400 hover:text-rose-400 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
            </div>
        </div>
    </header>

    <!-- ==========================================
         2. MAIN LAYOUT: SIDEBAR + CONTENT
         ========================================== -->
    <div class="flex-1 flex overflow-hidden">
        
        <!-- NEXLINK SIDEBAR -->
        <aside id="app-sidebar" class="app-sidebar w-64 bg-[#12161c] border-r border-[#23272e] flex flex-col justify-between shrink-0 transition-all duration-200 overflow-y-auto">
            <div class="p-4 space-y-6">
                <!-- NexLink Brand Logo -->
                <div class="flex items-center space-x-3 px-2 py-1">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-hover flex items-center justify-center text-[#0e1217] font-black text-lg shadow-lg shadow-brand-500/20">
                        ⚡
                    </div>
                    <div>
                        <div class="font-extrabold text-base tracking-tight text-white leading-tight">SyncNode Pro</div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-brand-400">Enterprise CRM</div>
                    </div>
                </div>

                <!-- Navigation Groups -->
                <nav class="space-y-4 text-xs font-medium" id="nav-tabs">
                    <!-- MAIN -->
                    <div class="space-y-1">
                        <div class="text-[10px] font-bold tracking-wider text-gray-500 uppercase px-2 mb-1.5">Main</div>
                        <button onclick="switchTab('dashboard')" class="tab-btn active w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all bg-brand-500/10 text-brand-500 font-bold border border-brand-500/30" data-tab="dashboard">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                <span>Dashboard &amp; Overview</span>
                            </span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-400">Live</span>
                        </button>
                    </div>

                    <!-- RISK & GOVERNANCE -->
                    <div class="space-y-1">
                        <div class="text-[10px] font-bold tracking-wider text-gray-500 uppercase px-2 mb-1.5">Risk &amp; Governance</div>
                        <button onclick="switchTab('circuit-breakers')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="circuit-breakers">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                <span>Circuit Breakers</span>
                            </span>
                        </button>
                    </div>

                    <!-- USER MANAGEMENT -->
                    <div class="space-y-1">
                        <div class="text-[10px] font-bold tracking-wider text-gray-500 uppercase px-2 mb-1.5">User Management</div>
                        <button onclick="switchTab('users')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="users">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                <span>Users Directory</span>
                            </span>
                        </button>
                        <button onclick="switchTab('kyc')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="kyc">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                <span>KYC Compliance</span>
                            </span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">Queue</span>
                        </button>
                    </div>

                    <!-- FINANCIAL ENGINE -->
                    <div class="space-y-1">
                        <div class="text-[10px] font-bold tracking-wider text-gray-500 uppercase px-2 mb-1.5">Financial Engine</div>
                        <button onclick="switchTab('reserves')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="reserves">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="5 6 12 3 19 6"></polyline><line x1="4" y1="10" x2="4" y2="21"></line><line x1="20" y1="10" x2="20" y2="21"></line></svg>
                                <span>Proof of Reserves</span>
                            </span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">100%</span>
                        </button>
                        <button onclick="switchTab('wallet')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="wallet">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                <span>Deposits &amp; Transfers</span>
                            </span>
                        </button>
                    </div>

                    <!-- P2P & AUDIT -->
                    <div class="space-y-1">
                        <div class="text-[10px] font-bold tracking-wider text-gray-500 uppercase px-2 mb-1.5">Escrow &amp; Security</div>
                        <button onclick="switchTab('p2p')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="p2p">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                                <span>P2P Escrows</span>
                            </span>
                        </button>
                        <button onclick="switchTab('audit')" class="tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all" data-tab="audit">
                            <span class="flex items-center space-x-2.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                <span>Privileged Audit Trail</span>
                            </span>
                        </button>
                    </div>
                </nav>
            </div>

            <!-- Sidebar Footer Widget -->
            <div class="p-4 m-3 bg-[#181c24] border border-[#23272e] rounded-xl space-y-2.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-400">System Solvency</span>
                    <span class="text-emerald-400 font-bold font-mono">100.0%</span>
                </div>
                <div class="w-full bg-[#12161c] h-1.5 rounded-full overflow-hidden">
                    <div class="bg-emerald-400 h-full w-full rounded-full"></div>
                </div>
                <div class="flex items-center space-x-1.5 text-[11px] text-gray-300 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>FastAPI + SQLite WAL Engine</span>
                </div>
            </div>
        </aside>

        <!-- DYNAMIC CONTENT BODY -->
        <main class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            
            <!-- ==========================================
                 TAB 1: NEXLINK DASHBOARD OVERVIEW
                 ========================================== -->
            <div id="tab-dashboard" class="tab-content space-y-6">
                <!-- Welcome Banner -->
                <div class="nex-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2 mb-1.5">
                            <span class="text-xs font-bold text-brand-500 uppercase tracking-wider">Exchange Operations Command Center</span>
                            <span class="w-1 h-1 rounded-full bg-gray-500"></span>
                            <span class="text-xs text-emerald-400 font-semibold">● All Systems Online</span>
                        </div>
                        <h1 class="text-2xl font-black text-white tracking-tight">Welcome back, Executive Admin 👋</h1>
                        <p class="text-xs text-gray-400 mt-1">Real-time ledger state, order matching depth, and liquidity volume.</p>
                    </div>

                    <div class="flex items-center space-x-2.5 flex-wrap">
                        <div class="flex bg-[#12161c] border border-[#23272e] rounded-lg p-1 text-xs">
                            <button class="px-2.5 py-1 rounded font-bold bg-brand-500 text-black">24H</button>
                            <button class="px-2.5 py-1 rounded text-gray-400 hover:text-white">7D</button>
                            <button class="px-2.5 py-1 rounded text-gray-400 hover:text-white">30D</button>
                        </div>
                        <button onclick="fetchAdminData()" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#23272e] text-xs font-semibold text-gray-200 hover:text-white hover:border-gray-600 transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <!-- NexLink 8-Card Stat Metrics Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- 1. Total Registered Users -->
                    <div class="nex-stat-card">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs font-semibold text-gray-400">Total Registered Users</span>
                            <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                            </div>
                        </div>
                        <div id="stat-total-users" class="text-2xl font-black font-mono text-white mb-1.5">--</div>
                        <div class="flex items-center space-x-1.5 text-xs">
                            <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">+27 Today</span>
                            <span class="text-gray-500">Active Traders</span>
                        </div>
                    </div>

                    <!-- 2. Total Limit Orders -->
                    <div class="nex-stat-card">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs font-semibold text-gray-400">Open Limit Orders</span>
                            <div class="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </div>
                        </div>
                        <div id="stat-total-orders" class="text-2xl font-black font-mono text-white mb-1.5">--</div>
                        <div class="flex items-center space-x-1.5 text-xs">
                            <span class="px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400 font-bold">LOB Active</span>
                            <span class="text-gray-500">Matching Engine</span>
                        </div>
                    </div>

                    <!-- 3. Settled Trades -->
                    <div class="nex-stat-card">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs font-semibold text-gray-400">Settled Executions</span>
                            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </div>
                        <div id="stat-total-trades" class="text-2xl font-black font-mono text-white mb-1.5">--</div>
                        <div class="flex items-center space-x-1.5 text-xs">
                            <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">+14.2%</span>
                            <span class="text-gray-500">Double-Entry Settled</span>
                        </div>
                    </div>

                    <!-- 4. Deposits Processed -->
                    <div class="nex-stat-card">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xs font-semibold text-gray-400">Deposits Ingested</span>
                            <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                            </div>
                        </div>
                        <div id="stat-total-deposits" class="text-2xl font-black font-mono text-white mb-1.5">--</div>
                        <div class="flex items-center space-x-1.5 text-xs">
                            <span class="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">100% Backed</span>
                            <span class="text-gray-500">Audited Vault</span>
                        </div>
                    </div>
                </div>

                <!-- Live Markets Tickers -->
                <div class="nex-card p-5 space-y-3">
                    <div class="flex justify-between items-center">
                        <h2 class="text-sm font-bold text-white flex items-center space-x-2">
                            <span class="w-2 h-2 rounded-full bg-brand-500"></span>
                            <span>Live Spot Market Feeds</span>
                        </h2>
                        <span class="text-xs text-gray-400 font-mono">Binance Live Relay</span>
                    </div>
                    <div id="live-tickers-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <!-- Filled by JS -->
                    </div>
                </div>
            </div>

            <!-- ==========================================
                 TAB 2: CIRCUIT BREAKERS & RISK
                 ========================================== -->
            <div id="tab-circuit-breakers" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">Risk Governance &amp; Emergency Levers</h1>
                    <p class="text-xs text-gray-400 mt-1">Instant switches to halt trading, pause withdrawals, or lock markets.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="nex-card p-6 space-y-4 border-rose-500/30">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-base font-bold text-rose-400">Global Trading Halt</h3>
                                <p class="text-xs text-gray-400 mt-1">Instantly suspend all order placement and execution across all pairs.</p>
                            </div>
                            <span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded">P0 CRITICAL</span>
                        </div>
                        <button id="btn-toggle-global-halt" onclick="toggleGlobalHalt()" class="w-full py-3 rounded-lg font-bold text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 transition-colors">
                            TRIGGER GLOBAL HALT
                        </button>
                    </div>

                    <div class="nex-card p-6 space-y-4">
                        <h3 class="text-base font-bold text-white">Market-Specific Circuit Breakers</h3>
                        <p class="text-xs text-gray-400">Halt individual trading pairs in case of external oracle deviation.</p>
                        <div class="flex gap-2">
                            <button onclick="toggleMarketHalt('BTC/USDT')" class="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#12161c] hover:bg-[#1e232d] border border-[#23272e] text-gray-200">
                                Halt BTC/USDT
                            </button>
                            <button onclick="toggleMarketHalt('ETH/USDT')" class="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#12161c] hover:bg-[#1e232d] border border-[#23272e] text-gray-200">
                                Halt ETH/USDT
                            </button>
                            <button onclick="toggleMarketHalt('SOL/USDT')" class="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#12161c] hover:bg-[#1e232d] border border-[#23272e] text-gray-200">
                                Halt SOL/USDT
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==========================================
                 TAB 3: USERS & ACCOUNTS DIRECTORY
                 ========================================== -->
            <div id="tab-users" class="tab-content hidden space-y-6">
                <div class="nex-card p-6 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-xl font-bold text-white">User Directory &amp; Balance Adjustments</h1>
                        <p class="text-xs text-gray-400 mt-1">Audit user accounts, adjust balances with double-entry safety, or freeze accounts.</p>
                    </div>
                    <button onclick="openCreditFundsModal()" class="px-4 py-2 bg-brand-500 hover:bg-brand-hover text-black font-bold text-xs rounded-lg shadow-md transition-all">
                        + Credit Funds to User
                    </button>
                </div>

                <div class="nex-card overflow-hidden">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="bg-[#12161c] border-b border-[#23272e] text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th class="p-3.5">User / ID</th>
                                <th class="p-3.5">KYC Status</th>
                                <th class="p-3.5">Ledger Balances</th>
                                <th class="p-3.5">Account State</th>
                                <th class="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body" class="divide-y divide-[#23272e]">
                            <!-- Dynamic Rows -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ==========================================
                 TAB 4: KYC QUEUE
                 ========================================== -->
            <div id="tab-kyc" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">KYC Verification &amp; Compliance Queue</h1>
                    <p class="text-xs text-gray-400 mt-1">Review applicant identity records and tier progression requests.</p>
                </div>

                <div class="nex-card overflow-hidden">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="bg-[#12161c] border-b border-[#23272e] text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th class="p-3.5">User</th>
                                <th class="p-3.5">Requested Tier</th>
                                <th class="p-3.5">Current Status</th>
                                <th class="p-3.5 text-right">Verification Action</th>
                            </tr>
                        </thead>
                        <tbody id="kyc-table-body" class="divide-y divide-[#23272e]">
                            <!-- Dynamic Rows -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ==========================================
                 TAB 5: PROOF OF RESERVES
                 ========================================== -->
            <div id="tab-reserves" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">Proof of Reserves &amp; Solvency Monitor</h1>
                    <p class="text-xs text-gray-400 mt-1">100% full-reserve backing verification across all asset vaults.</p>
                </div>

                <div id="reserves-cards-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Dynamic Solvency Cards -->
                </div>
            </div>

            <!-- ==========================================
                 TAB 6: WALLET & TRANSFERS
                 ========================================== -->
            <div id="tab-wallet" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">Deposits &amp; Internal Transfers Log</h1>
                    <p class="text-xs text-gray-400 mt-1">Real-time ledger monitor for incoming deposits and zero-fee user transfers.</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div class="nex-card p-5 space-y-3">
                        <h3 class="text-sm font-bold text-white">Incoming Deposits</h3>
                        <div id="deposits-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>
                    <div class="nex-card p-5 space-y-3">
                        <h3 class="text-sm font-bold text-white">Instant Internal Transfers</h3>
                        <div id="transfers-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
                    </div>
                </div>
            </div>

            <!-- ==========================================
                 TAB 7: P2P ESCROWS
                 ========================================== -->
            <div id="tab-p2p" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">P2P Escrow Surveillance &amp; Dispute Resolution</h1>
                    <p class="text-xs text-gray-400 mt-1">Multi-sig escrow desk and arbitrator dispute tools.</p>
                </div>
                <div class="nex-card p-8 text-center text-gray-400 text-xs">
                    <p>P2P Escrow channels operational. No open disputes currently require arbitration.</p>
                </div>
            </div>

            <!-- ==========================================
                 TAB 8: AUDIT LOGS
                 ========================================== -->
            <div id="tab-audit" class="tab-content hidden space-y-6">
                <div class="nex-card p-6">
                    <h1 class="text-xl font-bold text-white">Privileged Security Audit Trail</h1>
                    <p class="text-xs text-gray-400 mt-1">Cryptographically logged administrative operations and access triggers.</p>
                </div>
                <div class="nex-card p-5">
                    <div class="space-y-2 text-xs font-mono">
                        <div class="p-3 rounded-lg bg-[#12161c] border border-[#23272e] flex justify-between items-center">
                            <div>
                                <span class="text-brand-500 font-bold">[ADMIN_AUTH]</span>
                                <span class="text-gray-300 ml-2">poweldayck@gmail.com authenticated from 127.0.0.1</span>
                            </div>
                            <span class="text-gray-500 text-[11px]">Just now</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[#12161c] border border-[#23272e] flex justify-between items-center">
                            <div>
                                <span class="text-emerald-400 font-bold">[SOLVENCY_CHECK]</span>
                                <span class="text-gray-300 ml-2">Automated PoR check passed (100.0% coverage)</span>
                            </div>
                            <span class="text-gray-500 text-[11px]">10 min ago</span>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- ==========================================
         3. CREDIT / INGEST FUNDS MODAL
         ========================================== -->
    <div id="credit-funds-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-[#181c24] border border-[#23272e] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div class="flex justify-between items-center border-b border-[#23272e] pb-3">
                <h3 class="text-base font-bold text-white">Credit Funds to User (Double-Entry)</h3>
                <button onclick="closeCreditFundsModal()" class="text-gray-400 hover:text-white text-sm">✕</button>
            </div>

            <form onsubmit="handleCreditFundsSubmit(event)" class="space-y-3.5">
                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Target User ID or Email</label>
                    <input id="credit-user-target" type="text" placeholder="e.g. user@crypto.com or usr_123" class="w-full px-3.5 py-2 rounded-lg bg-[#12161c] border border-[#23272e] text-white text-xs focus:border-brand-500 focus:outline-none font-mono" required />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-semibold text-gray-300 block mb-1">Asset Symbol</label>
                        <select id="credit-asset-select" class="w-full px-3 py-2 rounded-lg bg-[#12161c] border border-[#23272e] text-white text-xs focus:border-brand-500 focus:outline-none">
                            <option value="USDT">USDT (Tether)</option>
                            <option value="BTC">BTC (Bitcoin)</option>
                            <option value="ETH">ETH (Ethereum)</option>
                            <option value="SOL">SOL (Solana)</option>
                            <option value="BNB">BNB (Binance Coin)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold text-gray-300 block mb-1">Amount</label>
                        <input id="credit-amount-input" type="number" step="0.0001" placeholder="1000.00" class="w-full px-3.5 py-2 rounded-lg bg-[#12161c] border border-[#23272e] text-white text-xs focus:border-brand-500 focus:outline-none font-mono" required />
                    </div>
                </div>

                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Audit Reason</label>
                    <input id="credit-reason-input" type="text" value="Executive Ingestion & Portfolio Deposit" class="w-full px-3.5 py-2 rounded-lg bg-[#12161c] border border-[#23272e] text-white text-xs focus:border-brand-500 focus:outline-none" required />
                </div>

                <div id="credit-status-msg" class="text-xs hidden font-medium"></div>

                <button id="btn-credit-submit" type="submit" class="w-full py-2.5 rounded-lg font-bold text-xs text-[#0e1217] bg-brand-500 hover:bg-brand-hover transition-all">
                    Confirm &amp; Deposit to User Account
                </button>
            </form>
        </div>
    </div>

    <!-- ==========================================
         4. ADMIN LOGIN MODAL
         ========================================== -->
    <div id="admin-login-modal" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 hidden">
        <div class="bg-[#181c24] border border-[#23272e] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div class="text-center space-y-2">
                <div class="w-12 h-12 rounded-2xl bg-brand-500 text-black font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
                    ⚡
                </div>
                <h2 class="text-xl font-bold text-white">Admin Authentication</h2>
                <p class="text-xs text-gray-400">Provide executive credentials to unlock exchange control plane.</p>
            </div>

            <form onsubmit="handleAdminLogin(event)" class="space-y-3.5">
                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Admin Email</label>
                    <input id="login-email" type="email" value="poweldayck@gmail.com" class="w-full px-3.5 py-2.5 rounded-lg bg-[#12161c] border border-[#23272e] text-white font-mono text-xs focus:border-brand-500 focus:outline-none" required />
                </div>
                <div>
                    <label class="text-xs font-semibold text-gray-300 block mb-1">Password</label>
                    <input id="login-password" type="password" value="Kapenguria@12" class="w-full px-3.5 py-2.5 rounded-lg bg-[#12161c] border border-[#23272e] text-white font-mono text-xs focus:border-brand-500 focus:outline-none" required />
                </div>
                <div id="login-error" class="text-xs text-rose-400 hidden"></div>
                <button type="submit" class="w-full py-2.5 rounded-lg font-bold text-xs text-[#0e1217] bg-brand-500 hover:bg-brand-hover transition-all">
                    Unlock Admin Console
                </button>
            </form>
        </div>
    </div>

    <!-- ==========================================
         5. CLIENT-SIDE INTERACTIVE SCRIPT
         ========================================== -->
    <script>
        let adminToken = localStorage.getItem('syncnode_admin_token') || localStorage.getItem('syncnode_token');
        let currentTab = 'dashboard';
        let isRTL = localStorage.getItem('syncnode_admin_rtl') === 'true';

        // Initialize RTL mode
        if (isRTL) {
            document.documentElement.setAttribute('dir', 'rtl');
            const label = document.getElementById('rtl-label');
            if (label) label.innerText = 'RTL Mode';
        }

        function toggleRTL() {
            isRTL = !isRTL;
            localStorage.setItem('syncnode_admin_rtl', String(isRTL));
            document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
            const label = document.getElementById('rtl-label');
            if (label) label.innerText = isRTL ? 'RTL Mode' : 'LTR Mode';
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('app-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('hidden');
            }
        }

        function toggleNotifs() {
            const menu = document.getElementById('notif-menu');
            if (menu) menu.classList.toggle('hidden');
        }

        function switchTab(tabId) {
            currentTab = tabId;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === tabId) {
                    btn.className = 'tab-btn active w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all bg-brand-500/10 text-brand-500 font-bold border border-brand-500/30';
                } else {
                    btn.className = 'tab-btn w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#181c24] transition-all';
                }
            });

            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.add('hidden');
            });
            const target = document.getElementById('tab-' + tabId);
            if (target) target.classList.remove('hidden');
        }

        async function fetchAdminData() {
            if (!adminToken) {
                document.getElementById('admin-login-modal').classList.remove('hidden');
                return;
            }

            try {
                // 1. Fetch Stats
                const statsRes = await fetch('/api/v1/admin/stats', {
                    headers: { 'Authorization': 'Bearer ' + adminToken }
                });
                if (statsRes.status === 401 || statsRes.status === 403) {
                    localStorage.removeItem('syncnode_admin_token');
                    adminToken = null;
                    document.getElementById('admin-login-modal').classList.remove('hidden');
                    return;
                }
                const statsData = await statsRes.json();
                if (statsData.success && statsData.stats) {
                    document.getElementById('stat-total-users').innerText = (statsData.stats.totalUsers || 0).toLocaleString();
                    document.getElementById('stat-total-orders').innerText = (statsData.stats.totalOrders || 0).toLocaleString();
                    document.getElementById('stat-total-trades').innerText = (statsData.stats.totalTrades || 0).toLocaleString();
                    document.getElementById('stat-total-deposits').innerText = (statsData.stats.totalDeposits || 0).toLocaleString();
                }

                // 2. Fetch Live Tickers
                const tickersRes = await fetch('/api/v1/market-data/tickers');
                const tickersData = await tickersRes.json();
                if (tickersData.tickers) {
                    const grid = document.getElementById('live-tickers-grid');
                    grid.innerHTML = '';
                    Object.values(tickersData.tickers).forEach(t => {
                        const isPos = parseFloat(t.change24h) >= 0;
                        grid.innerHTML += `
                            <div class="bg-[#12161c] p-3.5 rounded-xl border border-[#23272e] flex justify-between items-center">
                                <div>
                                    <p class="font-bold text-xs text-white">${t.symbol}</p>
                                    <p class="text-[11px] text-gray-400 font-mono mt-0.5">$${t.price}</p>
                                </div>
                                <span class="px-2 py-0.5 rounded text-xs font-bold font-mono ${isPos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}">
                                    ${isPos ? '+' : ''}${t.change24h}%
                                </span>
                            </div>
                        `;
                    });
                }

                // 3. Fetch Users
                const usersRes = await fetch('/api/v1/admin/users', {
                    headers: { 'Authorization': 'Bearer ' + adminToken }
                });
                const usersData = await usersRes.json();
                if (usersData.users) {
                    const tbody = document.getElementById('users-table-body');
                    tbody.innerHTML = '';
                    usersData.users.forEach(u => {
                        tbody.innerHTML += `
                            <tr class="hover:bg-[#1e232d] transition-colors">
                                <td class="p-3.5">
                                    <div class="font-semibold text-white">${u.email}</div>
                                    <div class="text-[10px] font-mono text-gray-500">${u.id}</div>
                                </td>
                                <td class="p-3.5">
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#12161c] text-brand-400">${u.kyc_tier}</span>
                                    <div class="text-[11px] text-gray-400 mt-0.5">${u.kyc_status}</div>
                                </td>
                                <td class="p-3.5 font-mono text-xs text-gray-300">
                                    ${(u.balances || []).map(b => `<span class="mr-2">${b.asset}: ${parseFloat(b.total).toFixed(4)}</span>`).join('')}
                                </td>
                                <td class="p-3.5">
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_suspended ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}">
                                        ${u.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                                    </span>
                                </td>
                                <td class="p-3.5 text-right space-x-1.5">
                                    <button onclick="openCreditFundsModal('${u.id}', '${u.email}')" class="px-2.5 py-1 rounded bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-bold font-mono">
                                        + Funds
                                    </button>
                                    <button onclick="toggleUserSuspend('${u.id}')" class="px-2.5 py-1 rounded text-xs font-medium ${u.is_suspended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                                        ${u.is_suspended ? 'Unfreeze' : 'Freeze'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    // KYC Queue Table
                    const kycTbody = document.getElementById('kyc-table-body');
                    kycTbody.innerHTML = '';
                    usersData.users.forEach(u => {
                        kycTbody.innerHTML += `
                            <tr class="hover:bg-[#1e232d]">
                                <td class="p-3.5">
                                    <div class="font-semibold text-white">${u.email}</div>
                                    <div class="text-[10px] text-gray-500 font-mono">${u.id}</div>
                                </td>
                                <td class="p-3.5 font-mono text-xs">${u.kyc_tier}</td>
                                <td class="p-3.5">
                                    <span class="px-2 py-0.5 rounded text-xs font-bold ${u.kyc_status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                        ${u.kyc_status}
                                    </span>
                                </td>
                                <td class="p-3.5 text-right space-x-1.5">
                                    <button onclick="reviewKyc('${u.id}', true)" class="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500 text-black">Approve</button>
                                    <button onclick="reviewKyc('${u.id}', false)" class="px-2.5 py-1 rounded text-xs font-bold bg-rose-500/20 text-rose-400">Reject</button>
                                </td>
                            </tr>
                        `;
                    });
                }

                // 4. Fetch Proof of Reserves
                const porRes = await fetch('/api/v1/admin/proof-of-reserves', {
                    headers: { 'Authorization': 'Bearer ' + adminToken }
                });
                const porData = await porRes.json();
                if (porData.proofOfReserves) {
                    const grid = document.getElementById('reserves-cards-grid');
                    grid.innerHTML = '';
                    Object.entries(porData.proofOfReserves).forEach(([asset, data]) => {
                        grid.innerHTML += `
                            <div class="nex-stat-card space-y-2.5 border-t-2 border-t-emerald-400">
                                <div class="flex justify-between items-center">
                                    <h3 class="text-base font-extrabold font-mono text-white">${asset} Vault</h3>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">100% SOLVENT</span>
                                </div>
                                <div class="space-y-1 text-xs">
                                    <div class="flex justify-between text-gray-400">
                                        <span>Reserves:</span>
                                        <span class="font-mono text-white">${data.vault_reserve}</span>
                                    </div>
                                    <div class="flex justify-between text-gray-400">
                                        <span>Liabilities:</span>
                                        <span class="font-mono text-white">${data.customer_liabilities}</span>
                                    </div>
                                    <div class="flex justify-between text-gray-400">
                                        <span>Ratio:</span>
                                        <span class="font-mono font-bold text-emerald-400">${data.collateral_ratio_pct}%</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

                // 5. Fetch Wallet ops
                const depRes = await fetch('/api/v1/admin/deposits', { headers: { 'Authorization': 'Bearer ' + adminToken } });
                const depData = await depRes.json();
                const depList = document.getElementById('deposits-list');
                depList.innerHTML = (depData.deposits || []).map(d => `
                    <div class="p-3 rounded-lg bg-[#12161c] border border-[#23272e] text-xs flex justify-between items-center font-mono">
                        <div>
                            <span class="text-emerald-400 font-bold">+${d.amount} ${d.asset}</span>
                            <span class="text-gray-500 ml-2">User: ${d.user_id}</span>
                        </div>
                        <span class="text-gray-400 text-[11px]">${d.status}</span>
                    </div>
                `).join('') || '<p class="text-gray-500 text-xs">No deposits logged.</p>';

                const trfRes = await fetch('/api/v1/admin/internal-transfers', { headers: { 'Authorization': 'Bearer ' + adminToken } });
                const trfData = await trfRes.json();
                const trfList = document.getElementById('transfers-list');
                trfList.innerHTML = (trfData.transfers || []).map(t => `
                    <div class="p-3 rounded-lg bg-[#12161c] border border-[#23272e] text-xs flex justify-between items-center font-mono">
                        <div>
                            <span class="text-brand-500 font-bold">${t.amount} ${t.asset}</span>
                            <span class="text-gray-500 ml-2">${t.from_user_id} &rarr; ${t.to_user_id}</span>
                        </div>
                        <span class="text-emerald-400 text-[11px]">COMPLETED</span>
                    </div>
                `).join('') || '<p class="text-gray-500 text-xs">No internal transfers logged.</p>';

            } catch (err) {
                console.error("Failed to load admin data:", err);
            }
        }

        async function handleAdminLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errDiv = document.getElementById('login-error');

            try {
                const res = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success && data.token) {
                    adminToken = data.token;
                    localStorage.setItem('syncnode_admin_token', adminToken);
                    localStorage.setItem('syncnode_token', adminToken);
                    document.getElementById('admin-login-modal').classList.add('hidden');
                    fetchAdminData();
                } else {
                    errDiv.innerText = data.error || 'Authentication failed';
                    errDiv.classList.remove('hidden');
                }
            } catch (err) {
                errDiv.innerText = 'Server connection error';
                errDiv.classList.remove('hidden');
            }
        }

        function openCreditFundsModal(userId = '', userEmail = '') {
            const targetInput = document.getElementById('credit-user-target');
            if (userId) {
                targetInput.value = userEmail || userId;
            } else {
                targetInput.value = '';
            }
            document.getElementById('credit-status-msg').classList.add('hidden');
            document.getElementById('credit-funds-modal').classList.remove('hidden');
        }

        function closeCreditFundsModal() {
            document.getElementById('credit-funds-modal').classList.add('hidden');
        }

        async function handleCreditFundsSubmit(e) {
            e.preventDefault();
            const target = document.getElementById('credit-user-target').value.trim();
            const asset = document.getElementById('credit-asset-select').value;
            const amount = document.getElementById('credit-amount-input').value;
            const reason = document.getElementById('credit-reason-input').value;
            const msgDiv = document.getElementById('credit-status-msg');
            const submitBtn = document.getElementById('btn-credit-submit');

            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing Double-Entry Credit...';

            try {
                const isEmail = target.includes('@');
                const payload = {
                    userId: isEmail ? null : target,
                    email: isEmail ? target : null,
                    asset: asset,
                    amount: amount,
                    reason: reason
                };

                const res = await fetch('/api/v1/admin/users/credit-funds', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + adminToken
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    msgDiv.className = 'text-xs text-emerald-400 font-bold p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30';
                    msgDiv.innerText = `✓ ${data.message}`;
                    msgDiv.classList.remove('hidden');
                    setTimeout(() => {
                        closeCreditFundsModal();
                        fetchAdminData();
                    }, 1200);
                } else {
                    msgDiv.className = 'text-xs text-rose-400 font-bold p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30';
                    msgDiv.innerText = `✗ ${data.error || 'Failed to credit funds'}`;
                    msgDiv.classList.remove('hidden');
                }
            } catch (err) {
                msgDiv.className = 'text-xs text-rose-400 font-bold p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30';
                msgDiv.innerText = '✗ Network connection error';
                msgDiv.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirm & Deposit to User Account';
            }
        }

        async function toggleUserSuspend(userId) {
            await fetch(`/api/v1/admin/users/${userId}/suspend`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + adminToken }
            });
            fetchAdminData();
        }

        async function reviewKyc(userId, approved) {
            await fetch(`/api/v1/admin/users/${userId}/kyc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
                body: JSON.stringify({ approved })
            });
            fetchAdminData();
        }

        async function toggleGlobalHalt() {
            const btn = document.getElementById('btn-toggle-global-halt');
            const isCurrentlyHalted = btn.innerText.includes('RESUME');
            await fetch('/api/v1/admin/circuit-breakers/global-halt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
                body: JSON.stringify({ halted: !isCurrentlyHalted })
            });
            btn.innerText = !isCurrentlyHalted ? 'RESUME GLOBAL TRADING' : 'TRIGGER GLOBAL HALT';
            fetchAdminData();
        }

        async function toggleMarketHalt(market) {
            await fetch('/api/v1/admin/circuit-breakers/market-halt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
                body: JSON.stringify({ halted: true, market })
            });
            alert(`Circuit breaker triggered for ${market}`);
            fetchAdminData();
        }

        function logoutAdmin() {
            localStorage.removeItem('syncnode_admin_token');
            adminToken = null;
            document.getElementById('admin-login-modal').classList.remove('hidden');
        }

        // Auto-bootstrap
        window.addEventListener('DOMContentLoaded', () => {
            fetchAdminData();
        });
    </script>
</body>
</html>
"""


@admin_router.get("", response_class=HTMLResponse)
@admin_router.get("/", response_class=HTMLResponse)
@admin_router.get("/dashboard", response_class=HTMLResponse)
async def serve_admin_page():
    template = Template(ADMIN_HTML_TEMPLATE)
    return HTMLResponse(content=template.render(), status_code=200)
