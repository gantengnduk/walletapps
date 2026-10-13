-- +goose Up
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY,
    account_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Savings' CHECK (category IN ('Savings','Travel','Business','Investment','Daily Expense','Others')),
    balance TEXT NOT NULL DEFAULT '0.00',
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CONVERT')),
    status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'FAILED')),
    failure_reason TEXT,
    source_wallet_id UUID REFERENCES wallets(id),
    target_wallet_id UUID REFERENCES wallets(id),
    source_amount TEXT,
    source_currency TEXT,
    target_amount TEXT,
    target_currency TEXT,
    exchange_rate TEXT,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Source and target wallets must differ when both are present
    CHECK (source_wallet_id IS NULL OR target_wallet_id IS NULL OR source_wallet_id <> target_wallet_id),

    -- Required wallet references by transaction type
    CHECK (
        (type = 'DEPOSIT'    AND target_wallet_id IS NOT NULL AND source_wallet_id IS NULL) OR
        (type = 'WITHDRAWAL' AND source_wallet_id IS NOT NULL AND target_wallet_id IS NULL) OR
        (type IN ('TRANSFER','CONVERT') AND source_wallet_id IS NOT NULL AND target_wallet_id IS NOT NULL)
    ),

    -- Source amounts/currencies accompany source_wallet_id
    CHECK (
        (source_wallet_id IS NULL AND source_amount IS NULL AND source_currency IS NULL) OR
        (source_wallet_id IS NOT NULL AND source_amount IS NOT NULL AND source_currency IS NOT NULL)
    ),

    -- Target amounts/currencies accompany target_wallet_id
    CHECK (
        (target_wallet_id IS NULL AND target_amount IS NULL AND target_currency IS NULL) OR
        (target_wallet_id IS NOT NULL AND target_currency IS NOT NULL)
    ),

    -- Completed operations with target_wallet must have target_amount
    CHECK (
        status <> 'COMPLETED' OR target_wallet_id IS NULL OR target_amount IS NOT NULL
    ),

    -- Failure reason must be present for FAILED and absent for COMPLETED
    CHECK (
        (status = 'FAILED' AND failure_reason IS NOT NULL) OR
        (status = 'COMPLETED' AND failure_reason IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    entry_type TEXT NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_target ON transactions(target_wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_time ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);

-- +goose Down
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
