-- ==============================================================================
-- SYNCNODE CRYPTOCURRENCY EXCHANGE & ENGINE - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Execute this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    country VARCHAR(8) DEFAULT 'KE',
    is_totp_enabled BOOLEAN DEFAULT FALSE,
    totp_secret VARCHAR(64),
    kyc_tier VARCHAR(32) DEFAULT 'TIER_1_BASIC',
    kyc_status VARCHAR(32) DEFAULT 'APPROVED',
    admin_roles TEXT[] DEFAULT '{}',
    is_suspended BOOLEAN DEFAULT FALSE,
    is_withdrawal_suspended BOOLEAN DEFAULT FALSE,
    investment_goals VARCHAR(255),
    risk_tolerance VARCHAR(255),
    preferred_industry VARCHAR(255),
    referral_code VARCHAR(32),
    referred_by VARCHAR(64),
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- 2. ACCOUNTS & BALANCES TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    asset VARCHAR(16) NOT NULL,
    account_type VARCHAR(32) DEFAULT 'SPOT',
    available NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    locked NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    UNIQUE(user_id, asset, account_type)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_asset ON public.accounts(user_id, asset);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    market VARCHAR(16) NOT NULL,
    side VARCHAR(8) NOT NULL, -- BUY, SELL
    type VARCHAR(16) NOT NULL, -- LIMIT, MARKET, STOP_LIMIT
    price NUMERIC(36, 18),
    amount NUMERIC(36, 18) NOT NULL,
    filled_amount NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    remaining_amount NUMERIC(36, 18) NOT NULL,
    status VARCHAR(32) DEFAULT 'NEW', -- NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_market_status ON public.orders(market, status);

-- 4. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id VARCHAR(64) PRIMARY KEY,
    market VARCHAR(16) NOT NULL,
    price NUMERIC(36, 18) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    buyer_order_id VARCHAR(64),
    seller_order_id VARCHAR(64),
    buyer_user_id VARCHAR(64) REFERENCES public.users(id),
    seller_user_id VARCHAR(64) REFERENCES public.users(id),
    taker_side VARCHAR(8) NOT NULL,
    fee NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    fee_asset VARCHAR(16),
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_market_created ON public.trades(market, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON public.trades(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON public.trades(seller_user_id);

-- 5. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS public.deposits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    asset VARCHAR(16) NOT NULL,
    network VARCHAR(32) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    tx_hash VARCHAR(128),
    status VARCHAR(32) DEFAULT 'COMPLETED',
    deposit_address VARCHAR(128),
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id);

-- 6. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    asset VARCHAR(16) NOT NULL,
    network VARCHAR(32) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    fee NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    destination_address VARCHAR(128) NOT NULL,
    tx_hash VARCHAR(128),
    status VARCHAR(32) DEFAULT 'PENDING',
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);

-- 7. INTERNAL TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS public.transfers (
    id VARCHAR(64) PRIMARY KEY,
    from_user_id VARCHAR(64) REFERENCES public.users(id),
    to_user_id VARCHAR(64) REFERENCES public.users(id),
    asset VARCHAR(16) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    fee NUMERIC(36, 18) DEFAULT 0.000000000000000000,
    status VARCHAR(32) DEFAULT 'COMPLETED',
    note TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_user ON public.transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_user ON public.transfers(to_user_id);

-- 8. USER INVESTMENTS (EARN MATRIX) TABLE
CREATE TABLE IF NOT EXISTS public.user_investments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    deposit_amount_usd NUMERIC(18, 2) NOT NULL,
    total_return_usd NUMERIC(18, 2) NOT NULL,
    daily_yield_percent NUMERIC(8, 2) NOT NULL,
    duration_days INT NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CANCELLED
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investments_user ON public.user_investments(user_id);

-- 9. ADMIN DEPOSIT WALLET ADDRESSES
CREATE TABLE IF NOT EXISTS public.deposit_addresses (
    asset VARCHAR(16) PRIMARY KEY,
    network VARCHAR(32) NOT NULL,
    address VARCHAR(128) NOT NULL,
    memo VARCHAR(64),
    qr_code_url TEXT,
    min_deposit NUMERIC(36, 18) DEFAULT 0.0001,
    confirmations_required INT DEFAULT 1,
    updated_at BIGINT NOT NULL
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64),
    target_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- DEFAULT SEED DATA
-- ==============================================================================

-- Seed Default Hot Deposit Addresses
INSERT INTO public.deposit_addresses (asset, network, address, memo, qr_code_url, min_deposit, confirmations_required, updated_at)
VALUES
    ('BTC', 'BTC', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', NULL, 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 0.0005, 1, EXTRACT(EPOCH FROM NOW())*1000),
    ('ETH', 'ERC20', '0x71C8366420A092679b5436194448873305370caD', NULL, 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x71C8366420A092679b5436194448873305370caD', 0.01, 12, EXTRACT(EPOCH FROM NOW())*1000),
    ('USDT', 'TRC20', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', NULL, 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 10.0, 1, EXTRACT(EPOCH FROM NOW())*1000),
    ('SOL', 'SOL', 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', NULL, 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', 0.1, 1, EXTRACT(EPOCH FROM NOW())*1000),
    ('BNB', 'BEP20', '0x71C8366420A092679b5436194448873305370caD', NULL, 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x71C8366420A092679b5436194448873305370caD', 0.05, 5, EXTRACT(EPOCH FROM NOW())*1000)
ON CONFLICT (asset) DO NOTHING;

-- Enable Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow Service Role full access to all tables
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Service role full access on accounts" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Service role full access on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Service role full access on trades" ON public.trades FOR ALL USING (true);
CREATE POLICY "Service role full access on deposits" ON public.deposits FOR ALL USING (true);
CREATE POLICY "Service role full access on withdrawals" ON public.withdrawals FOR ALL USING (true);
CREATE POLICY "Service role full access on transfers" ON public.transfers FOR ALL USING (true);
CREATE POLICY "Service role full access on user_investments" ON public.user_investments FOR ALL USING (true);
CREATE POLICY "Service role full access on deposit_addresses" ON public.deposit_addresses FOR ALL USING (true);
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL USING (true);
