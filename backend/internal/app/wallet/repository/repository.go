package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/wallet"
	"walletapps/backend/internal/app/wallet/entities"
	"walletapps/backend/pkg/apperror"
)

var (
	accountNumberMu sync.Mutex
	lastTimestamp   int64
)

func generateAccountNumber() string {
	accountNumberMu.Lock()
	defer accountNumberMu.Unlock()

	now := time.Now().UTC()
	nano := now.UnixNano()
	if nano <= lastTimestamp {
		nano = lastTimestamp + 1
	}
	lastTimestamp = nano

	t := time.Unix(0, nano).UTC()
	return fmt.Sprintf("%s%04d", t.Format("20060102150405"), (t.Nanosecond()/100000)%10000)
}

type walletRepository struct {
	db *sql.DB
}

func NewWalletRepository(db *sql.DB) wallet.WalletRepository {
	return &walletRepository{db: db}
}

func (r *walletRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

func (r *walletRepository) Create(ctx context.Context, w *entities.Wallet) error {
	query := `
		INSERT INTO wallets (id, account_number, name, currency, category, balance, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);
	`
	now := time.Now().UTC()
	w.CreatedAt = now
	w.UpdatedAt = now
	if w.Category == "" {
		w.Category = "Savings"
	}
	if w.AccountNumber == "" {
		w.AccountNumber = generateAccountNumber()
	}

	_, err := r.db.ExecContext(ctx, query,
		w.ID,
		w.AccountNumber,
		w.Name,
		w.Currency,
		w.Category,
		w.Balance.StringFixed(2),
		w.CreatedAt,
		w.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert wallet: %w", err)
	}
	return nil
}

func (r *walletRepository) GetByID(ctx context.Context, id string) (*entities.Wallet, error) {
	query := `
		SELECT id, COALESCE(account_number, ''), name, currency, category, balance, version, created_at, updated_at
		FROM wallets
		WHERE id = ?;
	`
	var w entities.Wallet
	var balanceStr string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&w.ID,
		&w.AccountNumber,
		&w.Name,
		&w.Currency,
		&w.Category,
		&balanceStr,
		&w.Version,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.NewNotFound("wallet not found")
		}
		return nil, fmt.Errorf("failed to query wallet by ID: %w", err)
	}

	bal, err := decimal.NewFromString(balanceStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse wallet balance: %w", err)
	}
	w.Balance = bal
	return &w, nil
}

func (r *walletRepository) GetByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entities.Wallet, error) {
	query := `
		SELECT id, COALESCE(account_number, ''), name, currency, category, balance, version, created_at, updated_at
		FROM wallets
		WHERE id = ?;
	`
	var w entities.Wallet
	var balanceStr string
	err := tx.QueryRowContext(ctx, query, id).Scan(
		&w.ID,
		&w.AccountNumber,
		&w.Name,
		&w.Currency,
		&w.Category,
		&balanceStr,
		&w.Version,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.NewNotFound("wallet not found")
		}
		return nil, fmt.Errorf("failed to query wallet for update: %w", err)
	}

	bal, err := decimal.NewFromString(balanceStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse wallet balance: %w", err)
	}
	w.Balance = bal
	return &w, nil
}

func (r *walletRepository) List(ctx context.Context) ([]entities.Wallet, error) {
	query := `
		SELECT id, COALESCE(account_number, ''), name, currency, category, balance, version, created_at, updated_at
		FROM wallets
		ORDER BY created_at ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list wallets: %w", err)
	}
	defer rows.Close()

	var wallets []entities.Wallet
	for rows.Next() {
		var w entities.Wallet
		var balanceStr string
		if err := rows.Scan(
			&w.ID,
			&w.AccountNumber,
			&w.Name,
			&w.Currency,
			&w.Category,
			&balanceStr,
			&w.Version,
			&w.CreatedAt,
			&w.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan wallet row: %w", err)
		}
		bal, err := decimal.NewFromString(balanceStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse wallet balance: %w", err)
		}
		w.Balance = bal
		wallets = append(wallets, w)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during wallets iteration: %w", err)
	}
	return wallets, nil
}

func (r *walletRepository) Update(ctx context.Context, wallet *entities.Wallet) error {
	query := `
		UPDATE wallets
		SET name = ?, category = ?, updated_at = ?
		WHERE id = ?;
	`
	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, query, wallet.Name, wallet.Category, now, wallet.ID)
	if err != nil {
		return fmt.Errorf("failed to update wallet: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return apperror.NewNotFound("wallet not found")
	}
	wallet.UpdatedAt = now
	return nil
}

func (r *walletRepository) UpdateBalance(ctx context.Context, tx *sql.Tx, id string, newBalance decimal.Decimal, expectedVersion int64) error {
	query := `
		UPDATE wallets
		SET balance = ?, version = version + 1, updated_at = ?
		WHERE id = ? AND version = ?;
	`
	now := time.Now().UTC()
	result, err := tx.ExecContext(ctx, query, newBalance.StringFixed(2), now, id, expectedVersion)
	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return apperror.NewConflict("concurrent update detected on wallet balance, please retry")
	}
	return nil
}

func (r *walletRepository) RecordTransaction(ctx context.Context, tx *sql.Tx, txRecord *entities.TransactionRecord) error {
	query := `
		INSERT INTO transactions (
			id, type, status, failure_reason,
			source_wallet_id, target_wallet_id,
			source_amount, source_currency,
			target_amount, target_currency,
			exchange_rate, description, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
	`
	if txRecord.CreatedAt.IsZero() {
		txRecord.CreatedAt = time.Now().UTC()
	}

	var execer interface {
		ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	} = r.db

	if tx != nil {
		execer = tx
	}

	_, err := execer.ExecContext(ctx, query,
		txRecord.ID,
		txRecord.Type,
		txRecord.Status,
		nullableString(txRecord.FailureReason),
		txRecord.SourceWalletID,
		txRecord.TargetWalletID,
		txRecord.SourceAmount,
		txRecord.SourceCurrency,
		txRecord.TargetAmount,
		txRecord.TargetCurrency,
		txRecord.ExchangeRate,
		nullableString(txRecord.Description),
		txRecord.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert transaction record: %w", err)
	}
	return nil
}

func (r *walletRepository) RecordLedgerEntry(ctx context.Context, tx *sql.Tx, entry *entities.LedgerEntryRecord) error {
	query := `
		INSERT INTO ledger_entries (id, transaction_id, wallet_id, entry_type, amount, currency, balance_after, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);
	`
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}

	var execer interface {
		ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	} = r.db

	if tx != nil {
		execer = tx
	}

	_, err := execer.ExecContext(ctx, query,
		entry.ID,
		entry.TransactionID,
		entry.WalletID,
		entry.EntryType,
		entry.Amount,
		entry.Currency,
		entry.BalanceAfter,
		entry.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert ledger entry: %w", err)
	}
	return nil
}

func (r *walletRepository) GetLedgerEntriesByWalletID(ctx context.Context, walletID string, limit int) ([]entities.LedgerEntryRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	query := `
		SELECT id, transaction_id, wallet_id, entry_type, amount, currency, balance_after, created_at
		FROM ledger_entries
		WHERE wallet_id = ?
		ORDER BY created_at DESC
		LIMIT ?;
	`
	rows, err := r.db.QueryContext(ctx, query, walletID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query ledger entries: %w", err)
	}
	defer rows.Close()

	var entries []entities.LedgerEntryRecord
	for rows.Next() {
		var e entities.LedgerEntryRecord
		if err := rows.Scan(
			&e.ID,
			&e.TransactionID,
			&e.WalletID,
			&e.EntryType,
			&e.Amount,
			&e.Currency,
			&e.BalanceAfter,
			&e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan ledger entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func nullableString(s string) any {
	if s == "" {
		return nil
	}
	return s
}
