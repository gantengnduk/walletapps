package wallet_test

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/shopspring/decimal"
	"walletapps/backend/config"
	"walletapps/backend/database"
	"walletapps/backend/internal/app/wallet/entities"
	walletRepository "walletapps/backend/internal/app/wallet/repository"
)

func TestSchemaIntegrity_ConstraintsAndIndexes(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "schema-integrity-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	cfg := config.DatabaseConfig{Driver: "sqlite", Path: dbPath}
	db, err := database.NewConnection(cfg)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// 1. Account number NOT NULL check
	_, err = db.ExecContext(ctx, `
		INSERT INTO wallets (id, account_number, name, currency, category, balance)
		VALUES ('w-null-acc', NULL, 'Null Acc', 'USD', 'Savings', '10.00');
	`)
	if err == nil {
		t.Errorf("expected NOT NULL constraint failure for null account_number, got nil")
	}

	// 2. Category CHECK constraint check
	_, err = db.ExecContext(ctx, `
		INSERT INTO wallets (id, account_number, name, currency, category, balance)
		VALUES ('w-bad-cat', '202610130000000001', 'Bad Cat', 'USD', 'IllegalCategory', '10.00');
	`)
	if err == nil {
		t.Errorf("expected CHECK constraint failure for invalid category, got nil")
	}

	// Insert valid wallets for transaction constraint tests
	_, err = db.ExecContext(ctx, `
		INSERT INTO wallets (id, account_number, name, currency, category, balance)
		VALUES ('w-src', '202610130000000002', 'Source Wallet', 'USD', 'Savings', '100.00'),
		       ('w-tgt', '202610130000000003', 'Target Wallet', 'USD', 'Travel', '50.00');
	`)
	if err != nil {
		t.Fatalf("failed to seed test wallets: %v", err)
	}

	// 3. Transaction consistency: same source and target
	_, err = db.ExecContext(ctx, `
		INSERT INTO transactions (
			id, type, status, source_wallet_id, target_wallet_id,
			source_amount, source_currency, target_amount, target_currency
		) VALUES (
			'tx-same', 'TRANSFER', 'COMPLETED', 'w-src', 'w-src',
			'10.00', 'USD', '10.00', 'USD'
		);
	`)
	if err == nil {
		t.Errorf("expected CHECK failure when source_wallet_id equals target_wallet_id, got nil")
	}

	// 4. Transaction consistency: DEPOSIT must have target_wallet_id and no source_wallet_id
	_, err = db.ExecContext(ctx, `
		INSERT INTO transactions (
			id, type, status, source_wallet_id, target_wallet_id, target_amount, target_currency
		) VALUES (
			'tx-dep-err', 'DEPOSIT', 'COMPLETED', 'w-src', 'w-tgt', '10.00', 'USD'
		);
	`)
	if err == nil {
		t.Errorf("expected CHECK failure for DEPOSIT having source_wallet_id, got nil")
	}

	// 5. Transaction consistency: WITHDRAWAL must have source_wallet_id and no target_wallet_id
	_, err = db.ExecContext(ctx, `
		INSERT INTO transactions (
			id, type, status, source_wallet_id, target_wallet_id, source_amount, source_currency
		) VALUES (
			'tx-with-err', 'WITHDRAWAL', 'COMPLETED', 'w-src', 'w-tgt', '10.00', 'USD'
		);
	`)
	if err == nil {
		t.Errorf("expected CHECK failure for WITHDRAWAL having target_wallet_id, got nil")
	}

	// 6. Transaction status alignment: FAILED without failure_reason must fail
	_, err = db.ExecContext(ctx, `
		INSERT INTO transactions (
			id, type, status, failure_reason, source_wallet_id, source_amount, source_currency
		) VALUES (
			'tx-fail-noreason', 'WITHDRAWAL', 'FAILED', NULL, 'w-src', '10.00', 'USD'
		);
	`)
	if err == nil {
		t.Errorf("expected CHECK failure for FAILED status with null failure_reason, got nil")
	}

	// 7. Transaction status alignment: COMPLETED with failure_reason must fail
	_, err = db.ExecContext(ctx, `
		INSERT INTO transactions (
			id, type, status, failure_reason, source_wallet_id, source_amount, source_currency
		) VALUES (
			'tx-comp-reason', 'WITHDRAWAL', 'COMPLETED', 'some error', 'w-src', '10.00', 'USD'
		);
	`)
	if err == nil {
		t.Errorf("expected CHECK failure for COMPLETED status with non-null failure_reason, got nil")
	}
}

func TestOptimisticLocking_PreventsLostUpdates(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "optimistic-lock-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	cfg := config.DatabaseConfig{Driver: "sqlite", Path: dbPath}
	db, err := database.NewConnection(cfg)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	repo := walletRepository.NewWalletRepository(db)

	walletID := "w-optimistic-test"
	initialWallet := &entities.Wallet{
		ID:            walletID,
		AccountNumber: "202610139999999999",
		Name:          "Concurrency Test Wallet",
		Currency:      "USD",
		Category:      "Savings",
		Balance:       decimal.NewFromInt(100),
	}
	if err := repo.Create(ctx, initialWallet); err != nil {
		t.Fatalf("failed to create initial wallet: %v", err)
	}

	// Both concurrent transactions read the initial state
	w1, err := repo.GetByID(ctx, walletID)
	if err != nil {
		t.Fatalf("failed to read w1: %v", err)
	}
	w2, err := repo.GetByID(ctx, walletID)
	if err != nil {
		t.Fatalf("failed to read w2: %v", err)
	}

	if w1.Version != 0 || w2.Version != 0 {
		t.Fatalf("expected version 0, got %d and %d", w1.Version, w2.Version)
	}

	// Start two concurrent updates
	var wg sync.WaitGroup
	results := make([]error, 2)

	// Thread 1
	wg.Add(1)
	go func() {
		defer wg.Done()
		tx1, err := repo.BeginTx(ctx)
		if err != nil {
			results[0] = err
			return
		}
		defer tx1.Rollback()

		newBal := w1.Balance.Add(decimal.NewFromInt(50)) // 150.00
		err = repo.UpdateBalance(ctx, tx1, walletID, newBal, w1.Version)
		if err != nil {
			results[0] = err
			return
		}
		results[0] = tx1.Commit()
	}()

	// Wait for Thread 1 to finish so version is incremented
	wg.Wait()

	if results[0] != nil {
		t.Fatalf("thread 1 failed: %v", results[0])
	}

	// Thread 2 attempts to update using stale version 0
	wg.Add(1)
	go func() {
		defer wg.Done()
		tx2, err := repo.BeginTx(ctx)
		if err != nil {
			results[1] = err
			return
		}
		defer tx2.Rollback()

		newBal := w2.Balance.Add(decimal.NewFromInt(30)) // Stale update
		err = repo.UpdateBalance(ctx, tx2, walletID, newBal, w2.Version)
		if err != nil {
			results[1] = err
			return
		}
		results[1] = tx2.Commit()
	}()

	wg.Wait()

	// Thread 2 MUST fail with conflict error (preventing lost update)
	if results[1] == nil {
		t.Fatalf("expected optimistic lock conflict for thread 2, but it succeeded silently!")
	}

	// Final verification: Balance should be exactly 150.00 from Thread 1
	finalWallet, err := repo.GetByID(ctx, walletID)
	if err != nil {
		t.Fatalf("failed to get final wallet: %v", err)
	}
	if !finalWallet.Balance.Equal(decimal.NewFromInt(150)) {
		t.Errorf("lost update occurred! expected 150.00, got %s", finalWallet.Balance.StringFixed(2))
	}
	if finalWallet.Version != 1 {
		t.Errorf("expected version 1, got %d", finalWallet.Version)
	}
}

