package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/transaction"
	"walletapps/backend/internal/app/transaction/dtos"
	"walletapps/backend/internal/app/transaction/entities"
	"walletapps/backend/pkg/apperror"
)

type transactionRepository struct {
	db *sql.DB
}

func NewTransactionRepository(db *sql.DB) transaction.TransactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

func (r *transactionRepository) GetWalletByID(ctx context.Context, id string) (*entities.WalletInfo, error) {
	query := `
		SELECT id, name, currency, balance
		FROM wallets
		WHERE id = ?;
	`
	var w entities.WalletInfo
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&w.ID,
		&w.Name,
		&w.Currency,
		&w.Balance,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.NewNotFound(fmt.Sprintf("wallet %s not found", id))
		}
		return nil, fmt.Errorf("failed to query wallet: %w", err)
	}
	return &w, nil
}

func (r *transactionRepository) GetWalletForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entities.WalletInfo, error) {
	query := `
		SELECT id, name, currency, balance
		FROM wallets
		WHERE id = ?;
	`
	var w entities.WalletInfo
	err := tx.QueryRowContext(ctx, query, id).Scan(
		&w.ID,
		&w.Name,
		&w.Currency,
		&w.Balance,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.NewNotFound(fmt.Sprintf("wallet %s not found", id))
		}
		return nil, fmt.Errorf("failed to query wallet for update: %w", err)
	}
	return &w, nil
}

func (r *transactionRepository) UpdateWalletBalance(ctx context.Context, tx *sql.Tx, id string, newBalance decimal.Decimal) error {
	query := `
		UPDATE wallets
		SET balance = ?, updated_at = ?
		WHERE id = ?;
	`
	now := time.Now().UTC()
	result, err := tx.ExecContext(ctx, query, newBalance.StringFixed(2), now, id)
	if err != nil {
		return fmt.Errorf("failed to update wallet balance: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return apperror.NewNotFound("wallet not found for balance update")
	}
	return nil
}

func (r *transactionRepository) RecordTransaction(ctx context.Context, tx *sql.Tx, txRecord *entities.Transaction) error {
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
		txRecord.FailureReason,
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

func (r *transactionRepository) RecordLedgerEntry(ctx context.Context, tx *sql.Tx, entry *entities.LedgerEntry) error {
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

func (r *transactionRepository) ListTransactions(ctx context.Context, query dtos.TransactionQuery) ([]dtos.TransactionItemResponse, int, error) {
	whereClauses := []string{"1=1"}
	var args []any

	if query.WalletID != "" {
		whereClauses = append(whereClauses, "(t.source_wallet_id = ? OR t.target_wallet_id = ?)")
		args = append(args, query.WalletID, query.WalletID)
	}

	if query.Type != "" {
		whereClauses = append(whereClauses, "t.type = ?")
		args = append(args, strings.ToUpper(query.Type))
	}

	if query.Status != "" {
		whereClauses = append(whereClauses, "t.status = ?")
		args = append(args, strings.ToUpper(query.Status))
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	// Count total query
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM transactions t WHERE %s;", whereSQL)
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	// Pagination
	limit := query.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := query.Offset
	if offset < 0 {
		offset = 0
	}

	selectSQL := fmt.Sprintf(`
		SELECT 
			t.id, t.type, t.status, t.failure_reason,
			t.source_wallet_id, sw.name as source_wallet_name,
			t.target_wallet_id, tw.name as target_wallet_name,
			t.source_amount, t.source_currency,
			t.target_amount, t.target_currency,
			t.exchange_rate, t.description, t.created_at
		FROM transactions t
		LEFT JOIN wallets sw ON t.source_wallet_id = sw.id
		LEFT JOIN wallets tw ON t.target_wallet_id = tw.id
		WHERE %s
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?;
	`, whereSQL)

	queryArgs := append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, selectSQL, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query transactions: %w", err)
	}
	defer rows.Close()

	var items []dtos.TransactionItemResponse
	for rows.Next() {
		var item dtos.TransactionItemResponse
		var desc sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.Type,
			&item.Status,
			&item.FailureReason,
			&item.SourceWalletID,
			&item.SourceWalletName,
			&item.TargetWalletID,
			&item.TargetWalletName,
			&item.SourceAmount,
			&item.SourceCurrency,
			&item.TargetAmount,
			&item.TargetCurrency,
			&item.ExchangeRate,
			&desc,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan transaction row: %w", err)
		}
		if desc.Valid {
			item.Description = desc.String
		}
		items = append(items, item)
	}

	return items, total, nil
}

func (r *transactionRepository) GetTransactionByID(ctx context.Context, id string) (*dtos.TransactionDetailResponse, error) {
	query := `
		SELECT 
			t.id, t.type, t.status, t.failure_reason,
			t.source_wallet_id, sw.name as source_wallet_name,
			t.target_wallet_id, tw.name as target_wallet_name,
			t.source_amount, t.source_currency,
			t.target_amount, t.target_currency,
			t.exchange_rate, t.description, t.created_at
		FROM transactions t
		LEFT JOIN wallets sw ON t.source_wallet_id = sw.id
		LEFT JOIN wallets tw ON t.target_wallet_id = tw.id
		WHERE t.id = ?;
	`
	var txItem dtos.TransactionItemResponse
	var desc sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&txItem.ID,
		&txItem.Type,
		&txItem.Status,
		&txItem.FailureReason,
		&txItem.SourceWalletID,
		&txItem.SourceWalletName,
		&txItem.TargetWalletID,
		&txItem.TargetWalletName,
		&txItem.SourceAmount,
		&txItem.SourceCurrency,
		&txItem.TargetAmount,
		&txItem.TargetCurrency,
		&txItem.ExchangeRate,
		&desc,
		&txItem.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, apperror.NewNotFound("transaction not found")
		}
		return nil, fmt.Errorf("failed to query transaction: %w", err)
	}
	if desc.Valid {
		txItem.Description = desc.String
	}

	// Query child ledger entries
	ledgerQuery := `
		SELECT 
			le.id, le.transaction_id, le.wallet_id, w.name as wallet_name,
			le.entry_type, le.amount, le.currency, le.balance_after, le.created_at
		FROM ledger_entries le
		LEFT JOIN wallets w ON le.wallet_id = w.id
		WHERE le.transaction_id = ?
		ORDER BY le.created_at ASC;
	`
	rows, err := r.db.QueryContext(ctx, ledgerQuery, id)
	if err != nil {
		return nil, fmt.Errorf("failed to query ledger entries: %w", err)
	}
	defer rows.Close()

	var ledgerEntries []dtos.LedgerEntryItemResponse
	for rows.Next() {
		var e dtos.LedgerEntryItemResponse
		var wName sql.NullString
		if err := rows.Scan(
			&e.ID,
			&e.TransactionID,
			&e.WalletID,
			&wName,
			&e.EntryType,
			&e.Amount,
			&e.Currency,
			&e.BalanceAfter,
			&e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan ledger entry: %w", err)
		}
		if wName.Valid {
			e.WalletName = wName.String
		}
		ledgerEntries = append(ledgerEntries, e)
	}

	return &dtos.TransactionDetailResponse{
		Transaction:   txItem,
		LedgerEntries: ledgerEntries,
	}, nil
}

func nullableString(s string) any {
	if s == "" {
		return nil
	}
	return s
}

