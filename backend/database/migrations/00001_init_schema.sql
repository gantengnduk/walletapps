-- +goose Up
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance TEXT NOT NULL DEFAULT '0.00',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CONVERT')),
    status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'FAILED')),
    failure_reason TEXT,
    source_wallet_id TEXT REFERENCES wallets(id),
    target_wallet_id TEXT REFERENCES wallets(id),
    source_amount TEXT,
    source_currency TEXT,
    target_amount TEXT,
    target_currency TEXT,
    exchange_rate TEXT,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    wallet_id TEXT NOT NULL REFERENCES wallets(id),
    entry_type TEXT NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_target ON transactions(target_wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);

-- +goose Down
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;

