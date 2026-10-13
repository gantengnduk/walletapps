package wallet_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/shopspring/decimal"
	"walletapps/backend/config"
	"walletapps/backend/database"
	"walletapps/backend/internal/app/wallet"
	"walletapps/backend/internal/app/wallet/dtos"
	walletRepository "walletapps/backend/internal/app/wallet/repository"
	walletUsecase "walletapps/backend/internal/app/wallet/usecase"
	"walletapps/backend/pkg/apperror"
	"walletapps/backend/pkg/constants"
)

type mockFrankfurter struct{}

func (m *mockFrankfurter) GetCurrencies(ctx context.Context) (map[string]string, error) {
	return map[string]string{
		"USD": "United States Dollar",
		"EUR": "Euro",
		"GBP": "British Pound",
		"JPY": "Japanese Yen",
	}, nil
}

func (m *mockFrankfurter) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	return decimal.NewFromFloat(0.85), nil
}

func setupTestWalletUsecase(t *testing.T) (walletUsecaseInstance *wallet.WalletUsecase, cleanup func(), dbPath string) {
	tempDir, err := os.MkdirTemp("", "wallet-uc-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	testDBPath := filepath.Join(tempDir, "test.db")
	cfg := config.DatabaseConfig{
		Driver: "sqlite",
		Path:   testDBPath,
	}

	db, err := database.NewConnection(cfg)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	repo := walletRepository.NewWalletRepository(db)
	client := &mockFrankfurter{}
	uc := walletUsecase.NewWalletUsecase(repo, client)

	cleanupFn := func() {
		_ = db.Close()
		_ = os.RemoveAll(tempDir)
	}

	return &uc, cleanupFn, testDBPath
}

func TestWallet_FullLifecycleAndInsufficientBalanceAudit(t *testing.T) {
	ucPtr, cleanup, dbPath := setupTestWalletUsecase(t)
	defer cleanup()
	uc := *ucPtr
	ctx := context.Background()

	// 1. Create Wallet
	created, err := uc.CreateWallet(ctx, dtos.CreateWalletRequest{
		Name:     "Main USD Wallet",
		Currency: "USD",
	})
	if err != nil {
		t.Fatalf("failed to create wallet: %v", err)
	}

	if created.ID == "" || created.AccountNumber == "" || created.Name != "Main USD Wallet" || created.Currency != "USD" || created.Balance != "0.00" {
		t.Fatalf("unexpected wallet created state: %+v", created)
	}

	// 2. Reject Unsupported Currency
	_, err = uc.CreateWallet(ctx, dtos.CreateWalletRequest{
		Name:     "Fake Currency Wallet",
		Currency: "XYZ_UNSUPPORTED",
	})
	if err == nil {
		t.Errorf("expected error for unsupported currency, got nil")
	}

	// 3. List Wallets
	wallets, err := uc.ListWallets(ctx)
	if err != nil {
		t.Fatalf("failed to list wallets: %v", err)
	}
	if len(wallets) != 1 {
		t.Fatalf("expected 1 wallet, got %d", len(wallets))
	}

	// 4. Deposit Funds
	depositRes, err := uc.Deposit(ctx, created.ID, dtos.DepositRequest{
		Amount:      "500.00",
		Description: "Initial test deposit",
	})
	if err != nil {
		t.Fatalf("failed to deposit: %v", err)
	}
	if depositRes.NewBalance != "500.00" || depositRes.Status != constants.TransactionStatusCompleted.String() {
		t.Fatalf("unexpected deposit response: %+v", depositRes)
	}

	// Verify balance and ledger entry via GetWallet
	detail, err := uc.GetWallet(ctx, created.ID)
	if err != nil {
		t.Fatalf("failed to get wallet: %v", err)
	}
	if detail.Wallet.Balance != "500.00" {
		t.Errorf("expected balance 500.00, got %s", detail.Wallet.Balance)
	}
	if len(detail.RecentLedgerEntries) != 1 {
		t.Fatalf("expected 1 ledger entry, got %d", len(detail.RecentLedgerEntries))
	}
	if detail.RecentLedgerEntries[0].EntryType != constants.LedgerEntryCredit.String() ||
		detail.RecentLedgerEntries[0].Amount != "500.00" ||
		detail.RecentLedgerEntries[0].BalanceAfter != "500.00" {
		t.Errorf("unexpected ledger entry: %+v", detail.RecentLedgerEntries[0])
	}

	// 5. Successful Withdrawal
	withdrawRes, err := uc.Withdraw(ctx, created.ID, dtos.WithdrawRequest{
		Amount:      "200.00",
		Description: "ATM simulation withdrawal",
	})
	if err != nil {
		t.Fatalf("failed to withdraw: %v", err)
	}
	if withdrawRes.NewBalance != "300.00" || withdrawRes.Status != constants.TransactionStatusCompleted.String() {
		t.Fatalf("unexpected withdraw response: %+v", withdrawRes)
	}

	// Verify balance is now 300.00 and 2 ledger entries exist
	detail, err = uc.GetWallet(ctx, created.ID)
	if err != nil {
		t.Fatalf("failed to get wallet after withdrawal: %v", err)
	}
	if detail.Wallet.Balance != "300.00" {
		t.Errorf("expected balance 300.00, got %s", detail.Wallet.Balance)
	}
	if len(detail.RecentLedgerEntries) != 2 {
		t.Fatalf("expected 2 ledger entries, got %d", len(detail.RecentLedgerEntries))
	}
	if detail.RecentLedgerEntries[0].EntryType != constants.LedgerEntryDebit.String() ||
		detail.RecentLedgerEntries[0].Amount != "200.00" ||
		detail.RecentLedgerEntries[0].BalanceAfter != "300.00" {
		t.Errorf("unexpected debit ledger entry: %+v", detail.RecentLedgerEntries[0])
	}

	// 6. Insufficient Balance Withdrawal -> Must reject AND audit log a FAILED transaction
	_, err = uc.Withdraw(ctx, created.ID, dtos.WithdrawRequest{
		Amount:      "1000.00",
		Description: "Excessive withdrawal attempt",
	})
	if err == nil {
		t.Fatalf("expected withdrawal rejection for insufficient balance, got nil error")
	}

	appErr, ok := err.(*apperror.AppError)
	if !ok {
		t.Fatalf("expected *apperror.AppError, got %T: %v", err, err)
	}
	if appErr.Code != 422 {
		t.Errorf("expected HTTP 422 Unprocessable Entity, got %d", appErr.Code)
	}

	// Verify wallet balance is STILL 300.00 (untouched)
	detail, err = uc.GetWallet(ctx, created.ID)
	if err != nil {
		t.Fatalf("failed to get wallet: %v", err)
	}
	if detail.Wallet.Balance != "300.00" {
		t.Errorf("expected balance to remain 300.00, got %s", detail.Wallet.Balance)
	}
	// Verify ledger entries count did NOT increase (remains 2)
	if len(detail.RecentLedgerEntries) != 2 {
		t.Errorf("expected ledger entries to remain 2, got %d", len(detail.RecentLedgerEntries))
	}

	// Check underlying database directly to verify the FAILED transaction audit record was written
	cfg := config.DatabaseConfig{Driver: "sqlite", Path: dbPath}
	checkDB, err := database.NewConnection(cfg)
	if err != nil {
		t.Fatalf("failed to open check db: %v", err)
	}
	defer checkDB.Close()

	var failedTxCount int
	var failureReason string
	var failedType string
	err = checkDB.QueryRow(`
		SELECT COUNT(*), failure_reason, type
		FROM transactions
		WHERE status = 'FAILED' AND source_wallet_id = ?;
	`, created.ID).Scan(&failedTxCount, &failureReason, &failedType)
	if err != nil {
		t.Fatalf("failed to query failed transactions: %v", err)
	}

	if failedTxCount != 1 {
		t.Errorf("expected exactly 1 audited FAILED transaction, got %d", failedTxCount)
	}
	if failureReason != "insufficient balance" {
		t.Errorf("expected failure_reason 'insufficient balance', got '%s'", failureReason)
	}
	if failedType != constants.TransactionTypeWithdrawal.String() {
		t.Errorf("expected failed type 'WITHDRAWAL', got '%s'", failedType)
	}
}

func TestWalletUsecase_UpdateWallet(t *testing.T) {
	ucPtr, cleanup, _ := setupTestWalletUsecase(t)
	defer cleanup()
	uc := *ucPtr
	ctx := context.Background()

	// 1. Create wallet
	created, err := uc.CreateWallet(ctx, dtos.CreateWalletRequest{
		Name:     "Initial Name",
		Currency: "USD",
		Category: "Savings",
	})
	if err != nil {
		t.Fatalf("failed to create wallet: %v", err)
	}

	// 2. Successfully update name and category
	updated, err := uc.UpdateWallet(ctx, created.ID, dtos.UpdateWalletRequest{
		Name:     "Holiday Fund",
		Category: "Travel",
	})
	if err != nil {
		t.Fatalf("failed to update wallet: %v", err)
	}
	if updated.Name != "Holiday Fund" {
		t.Errorf("expected updated name 'Holiday Fund', got '%s'", updated.Name)
	}
	if updated.Category != "Travel" {
		t.Errorf("expected updated category 'Travel', got '%s'", updated.Category)
	}

	// 3. Test empty name validation
	_, err = uc.UpdateWallet(ctx, created.ID, dtos.UpdateWalletRequest{
		Name:     "   ",
		Category: "Business",
	})
	if err == nil {
		t.Error("expected error for empty name, got nil")
	}

	// 4. Test category normalization for unknown category
	updatedNormalized, err := uc.UpdateWallet(ctx, created.ID, dtos.UpdateWalletRequest{
		Name:     "Wild Card",
		Category: "UnknownCustomCategory",
	})
	if err != nil {
		t.Fatalf("unexpected error updating with unknown category: %v", err)
	}
	if updatedNormalized.Category != "Others" {
		t.Errorf("expected category to normalize to 'Others', got '%s'", updatedNormalized.Category)
	}

	// 5. Test not found
	_, err = uc.UpdateWallet(ctx, "non-existent-id", dtos.UpdateWalletRequest{
		Name:     "Ghost",
		Category: "Savings",
	})
	if err == nil {
		t.Error("expected error for non-existent wallet, got nil")
	}
}

func TestWallet_AccountNumberUniquenessAndFormat(t *testing.T) {
	ucPtr, cleanup, _ := setupTestWalletUsecase(t)
	defer cleanup()
	uc := *ucPtr
	ctx := context.Background()

	w1, err := uc.CreateWallet(ctx, dtos.CreateWalletRequest{Name: "Wallet 1", Currency: "USD"})
	if err != nil {
		t.Fatalf("failed to create wallet 1: %v", err)
	}

	w2, err := uc.CreateWallet(ctx, dtos.CreateWalletRequest{Name: "Wallet 2", Currency: "EUR"})
	if err != nil {
		t.Fatalf("failed to create wallet 2: %v", err)
	}

	if w1.AccountNumber == "" || w2.AccountNumber == "" {
		t.Fatalf("account number empty: w1=%s, w2=%s", w1.AccountNumber, w2.AccountNumber)
	}
	if w1.AccountNumber == w2.AccountNumber {
		t.Fatalf("account numbers must be unique: w1=%s, w2=%s", w1.AccountNumber, w2.AccountNumber)
	}
	// Account number should be 18 digits timestamp format (YYYYMMDDHHMMSS + 4 subsecond digits)
	if len(w1.AccountNumber) != 18 {
		t.Errorf("expected 18-digit account number, got %d digits (%s)", len(w1.AccountNumber), w1.AccountNumber)
	}
}
