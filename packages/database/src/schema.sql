-- ==============================================================================
-- SYNCNODE POSTGRESQL PRODUCTION & MIGRATION SCHEMA (CRIT-005)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    country VARCHAR(10),
    password_hash VARCHAR(255) NOT NULL,
    is_totp_enabled BOOLEAN DEFAULT FALSE,
    totp_secret VARCHAR(255),
    kyc_tier VARCHAR(32) DEFAULT 'TIER_0_UNVERIFIED',
    kyc_status VARCHAR(32) DEFAULT 'NOT_SUBMITTED',
    is_suspended BOOLEAN DEFAULT FALSE,
    is_withdrawal_suspended BOOLEAN DEFAULT FALSE,
    investment_goals VARCHAR(255),
    risk_tolerance VARCHAR(255),
    preferred_industry VARCHAR(255),
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(64) NOT NULL,
    asset VARCHAR(32) NOT NULL,
    balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    UNIQUE(user_id, account_type, asset)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_asset ON accounts(user_id, asset);

CREATE TABLE IF NOT EXISTS ledger_transactions (
    id VARCHAR(64) PRIMARY KEY,
    transaction_type VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    reference_id VARCHAR(128),
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id VARCHAR(64) REFERENCES accounts(id),
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    asset VARCHAR(32) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tx ON journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_acc ON journal_entries(account_id);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    client_order_id VARCHAR(128),
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    side VARCHAR(8) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type VARCHAR(32) NOT NULL,
    price NUMERIC(36, 18),
    quantity NUMERIC(36, 18) NOT NULL,
    filled_quantity NUMERIC(36, 18) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    time_in_force VARCHAR(16) NOT NULL,
    self_trade_prevention VARCHAR(32) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol_status ON orders(symbol, status);

CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(64) PRIMARY KEY,
    symbol VARCHAR(32) NOT NULL,
    price NUMERIC(36, 18) NOT NULL,
    quantity NUMERIC(36, 18) NOT NULL,
    maker_order_id VARCHAR(64) REFERENCES orders(id),
    taker_order_id VARCHAR(64) REFERENCES orders(id),
    maker_user_id VARCHAR(64) REFERENCES users(id),
    taker_user_id VARCHAR(64) REFERENCES users(id),
    maker_fee NUMERIC(36, 18) NOT NULL,
    taker_fee NUMERIC(36, 18) NOT NULL,
    taker_side VARCHAR(8) NOT NULL,
    executed_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_maker_user ON trades(maker_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_taker_user ON trades(taker_user_id);

CREATE TABLE IF NOT EXISTS deposits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(32) NOT NULL,
    network VARCHAR(64) NOT NULL,
    address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    confirmations INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(32) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    fee NUMERIC(36, 18) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    network VARCHAR(64) NOT NULL,
    tx_hash VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS p2p_offers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(8) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    asset VARCHAR(32) NOT NULL,
    fiat_currency VARCHAR(16) NOT NULL,
    price NUMERIC(36, 18) NOT NULL,
    available_amount NUMERIC(36, 18) NOT NULL,
    min_limit NUMERIC(36, 18) NOT NULL,
    max_limit NUMERIC(36, 18) NOT NULL,
    payment_methods JSONB NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    details JSONB,
    ip_address VARCHAR(64),
    timestamp BIGINT NOT NULL
);
