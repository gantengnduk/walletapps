package transaction_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/shopspring/decimal"
	"walletapps/backend/config"
	"walletapps/backend/database"
	"walletapps/backend/internal/app/transaction/dtos"
	transactionRepository "walletapps/backend/internal/app/transaction/repository"
	transactionUsecase "walletapps/backend/internal/app/transaction/usecase"
	walletEntities "walletapps/backend/internal/app/wallet/entities"
	walletRepository "walletapps/backend/internal/app/wallet/repository"
	"walletapps/backend/pkg/apperror"
	"walletapps/backend/pkg/constants"
)

type mockFrankfurter struct {
	rate decimal.Decimal
}

func (m *mockFrankfurter) GetCurrencies(ctx context.Context) (map[string]string, error) {
	return map[string]string{
		"USD": "United States Dollar",
		"EUR": "Euro",
	}, nil
}

func (m *mockFrankfurter) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	return m.rate, nil
}

func TestTransaction_TransferAndConvertFullFlow(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "tx-flow-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	cfg := config.DatabaseConfig{Driver: "sqlite", Path: dbPath}
	db, err := database.NewConnection(cfg)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer db.Close()

	wRepo := walletRepository.NewWalletRepository(db)
	txRepo := transactionRepository.NewTransactionRepository(db)
	client := &mockFrankfurter{rate: decimal.NewFromFloat(0.85)}
	uc := transactionUsecase.NewTransactionUsecase(txRepo, client)
	ctx := context.Background()

	// Seed 3 wallets
	wUSD1 := &walletEntities.Wallet{
		ID:       "w-usd-1",
		Name:     "Main USD",
		Currency: "USD",
		Balance:  decimal.NewFromInt(1000),
	}
	wUSD2 := &walletEntities.Wallet{
		ID:       "w-usd-2",
		Name:     "Savings USD",
		Currency: "USD",
		Balance:  decimal.NewFromInt(100),
	}
	wEUR := &walletEntities.Wallet{
		ID:       "w-eur",
		Name:     "Travel EUR",
		Currency: "EUR",
		Balance:  decimal.NewFromInt(50),
	}
	if err := wRepo.Create(ctx, wUSD1); err != nil {
		t.Fatalf("failed to seed wUSD1: %v", err)
	}
	if err := wRepo.Create(ctx, wUSD2); err != nil {
		t.Fatalf("failed to seed wUSD2: %v", err)
	}
	if err := wRepo.Create(ctx, wEUR); err != nil {
		t.Fatalf("failed to seed wEUR: %v", err)
	}

	// 1. Same-Currency Transfer (200.00 USD from USD1 to USD2)
	transferRes, err := uc.Transfer(ctx, dtos.TransferRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-usd-2",
		Amount:         "200.00",
		Description:    "Monthly savings transfer",
	})
	if err != nil {
		t.Fatalf("transfer failed: %v", err)
	}
	if transferRes.SourceNewBalance != "800.00" || transferRes.TargetNewBalance != "300.00" {
		t.Errorf("unexpected transfer balances: %+v", transferRes)
	}

	// Verify ledger entries for transfer
	detail, err := uc.GetTransactionByID(ctx, transferRes.TransactionID)
	if err != nil {
		t.Fatalf("failed to get transfer detail: %v", err)
	}
	if len(detail.LedgerEntries) != 2 {
		t.Fatalf("expected 2 ledger entries for transfer, got %d", len(detail.LedgerEntries))
	}
	if detail.LedgerEntries[0].EntryType != "DEBIT" || detail.LedgerEntries[0].WalletID != "w-usd-1" || detail.LedgerEntries[0].BalanceAfter != "800.00" {
		t.Errorf("unexpected debit entry: %+v", detail.LedgerEntries[0])
	}
	if detail.LedgerEntries[1].EntryType != "CREDIT" || detail.LedgerEntries[1].WalletID != "w-usd-2" || detail.LedgerEntries[1].BalanceAfter != "300.00" {
		t.Errorf("unexpected credit entry: %+v", detail.LedgerEntries[1])
	}

	// 2. Transfer Rejection: Different currencies
	_, err = uc.Transfer(ctx, dtos.TransferRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-eur",
		Amount:         "50.00",
	})
	if err == nil {
		t.Errorf("expected error when transferring across different currencies, got nil")
	}

	// 3. Transfer Rejection: Insufficient balance with FAILED audit log
	_, err = uc.Transfer(ctx, dtos.TransferRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-usd-2",
		Amount:         "5000.00",
		Description:    "Overdraft transfer attempt",
	})
	if err == nil {
		t.Fatalf("expected error for insufficient transfer, got nil")
	}
	appErr, ok := err.(*apperror.AppError)
	if !ok || appErr.Code != 422 {
		t.Errorf("expected 422 error, got %v", err)
	}

	// Verify failed transfer was logged in transactions table
	var failedTransferCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM transactions 
		WHERE type = 'TRANSFER' AND status = 'FAILED' AND source_wallet_id = 'w-usd-1';
	`).Scan(&failedTransferCount)
	if err != nil || failedTransferCount != 1 {
		t.Errorf("expected 1 audited failed transfer, got count %d (err: %v)", failedTransferCount, err)
	}

	// 4. Cross-Currency Conversion (100.00 USD to EUR at rate 0.85 -> 85.00 EUR)
	convertRes, err := uc.Convert(ctx, dtos.ConvertRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-eur",
		Amount:         "100.00",
		Description:    "Vacation exchange",
	})
	if err != nil {
		t.Fatalf("conversion failed: %v", err)
	}
	if convertRes.SourceNewBalance != "700.00" || convertRes.TargetNewBalance != "135.00" {
		t.Errorf("unexpected conversion balances: %+v", convertRes)
	}
	if convertRes.TargetAmount != "85.00" || convertRes.ExchangeRate != "0.85" {
		t.Errorf("unexpected conversion rates: %+v", convertRes)
	}

	// Verify conversion detail and ledger entries
	convDetail, err := uc.GetTransactionByID(ctx, convertRes.TransactionID)
	if err != nil {
		t.Fatalf("failed to get conversion detail: %v", err)
	}
	if len(convDetail.LedgerEntries) != 2 {
		t.Fatalf("expected 2 ledger entries for conversion, got %d", len(convDetail.LedgerEntries))
	}
	if convDetail.LedgerEntries[0].EntryType != "DEBIT" || convDetail.LedgerEntries[0].Amount != "100.00" || convDetail.LedgerEntries[0].Currency != "USD" {
		t.Errorf("unexpected conversion debit entry: %+v", convDetail.LedgerEntries[0])
	}
	if convDetail.LedgerEntries[1].EntryType != "CREDIT" || convDetail.LedgerEntries[1].Amount != "85.00" || convDetail.LedgerEntries[1].Currency != "EUR" {
		t.Errorf("unexpected conversion credit entry: %+v", convDetail.LedgerEntries[1])
	}

	// 5. Conversion Rejection: Same currencies
	_, err = uc.Convert(ctx, dtos.ConvertRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-usd-2",
		Amount:         "50.00",
	})
	if err == nil {
		t.Errorf("expected error converting same currency, got nil")
	}

	// 6. Conversion Rejection: Insufficient balance with FAILED audit log
	_, err = uc.Convert(ctx, dtos.ConvertRequest{
		SourceWalletID: "w-usd-1",
		TargetWalletID: "w-eur",
		Amount:         "9999.00",
		Description:    "Exorbitant exchange attempt",
	})
	if err == nil {
		t.Fatalf("expected error for excessive convert, got nil")
	}

	var failedConvertCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM transactions 
		WHERE type = 'CONVERT' AND status = 'FAILED' AND source_wallet_id = 'w-usd-1';
	`).Scan(&failedConvertCount)
	if err != nil || failedConvertCount != 1 {
		t.Errorf("expected 1 audited failed conversion, got %d", failedConvertCount)
	}

	// 7. List Transactions with filtering
	// All transactions for w-usd-1
	listAll, err := uc.ListTransactions(ctx, dtos.TransactionQuery{
		WalletID: "w-usd-1",
	})
	if err != nil {
		t.Fatalf("failed to list transactions: %v", err)
	}
	// Expected: 1 successful transfer + 1 failed transfer + 1 successful convert + 1 failed convert = 4 transactions
	if listAll.Total != 4 {
		t.Errorf("expected 4 total transactions for w-usd-1, got %d", listAll.Total)
	}

	// Filter by status COMPLETED
	listCompleted, err := uc.ListTransactions(ctx, dtos.TransactionQuery{
		WalletID: "w-usd-1",
		Status:   constants.TransactionStatusCompleted.String(),
	})
	if err != nil {
		t.Fatalf("failed to list completed: %v", err)
	}
	if listCompleted.Total != 2 {
		t.Errorf("expected 2 completed transactions, got %d", listCompleted.Total)
	}

	// Filter by type CONVERT
	listConverts, err := uc.ListTransactions(ctx, dtos.TransactionQuery{
		Type: constants.TransactionTypeConvert.String(),
	})
	if err != nil {
		t.Fatalf("failed to list converts: %v", err)
	}
	if listConverts.Total != 2 { // 1 completed, 1 failed
		t.Errorf("expected 2 conversion transactions total, got %d", listConverts.Total)
	}
}
