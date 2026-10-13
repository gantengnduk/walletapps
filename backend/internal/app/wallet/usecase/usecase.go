package usecase

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/wallet"
	"walletapps/backend/internal/app/wallet/dtos"
	"walletapps/backend/internal/app/wallet/entities"
	"walletapps/backend/internal/integrations/frankfurter"
	"walletapps/backend/pkg/apperror"
	"walletapps/backend/pkg/constants"
)

type walletUsecase struct {
	repo              wallet.WalletRepository
	frankfurterClient frankfurter.FrankfurterClient
}

func NewWalletUsecase(repo wallet.WalletRepository, client frankfurter.FrankfurterClient) wallet.WalletUsecase {
	return &walletUsecase{
		repo:              repo,
		frankfurterClient: client,
	}
}

var (
	accountNumberMu sync.Mutex
	lastTimestamp   int64
)

// generateAccountNumber produces a guaranteed-unique, timestamp-derived account number (YYYYMMDDHHMMSS + subsecond).
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

var validCategories = map[string]bool{
	"Savings":       true,
	"Travel":        true,
	"Business":      true,
	"Investment":    true,
	"Daily Expense": true,
	"Others":        true,
}

func normalizeCategory(c string) string {
	c = strings.TrimSpace(c)
	if c == "" {
		return "Savings"
	}
	for valid := range validCategories {
		if strings.EqualFold(valid, c) {
			return valid
		}
	}
	return "Others"
}

func (u *walletUsecase) CreateWallet(ctx context.Context, req dtos.CreateWalletRequest) (*dtos.WalletResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperror.NewBadRequest("wallet name cannot be empty")
	}

	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		return nil, apperror.NewBadRequest("currency cannot be empty")
	}

	category := normalizeCategory(req.Category)

	// Validate currency against Frankfurter supported currencies
	if u.frankfurterClient != nil {
		currencies, err := u.frankfurterClient.GetCurrencies(ctx)
		if err == nil && len(currencies) > 0 {
			if _, ok := currencies[currency]; !ok {
				return nil, apperror.NewBadRequest(fmt.Sprintf("currency '%s' is not supported by exchange provider", currency))
			}
		}
	}

	newWallet := &entities.Wallet{
		ID:            uuid.New().String(),
		AccountNumber: generateAccountNumber(),
		Name:          name,
		Currency:      currency,
		Category:      category,
		Balance:       decimal.NewFromInt(0),
	}

	if err := u.repo.Create(ctx, newWallet); err != nil {
		return nil, err
	}

	return &dtos.WalletResponse{
		ID:            newWallet.ID,
		AccountNumber: newWallet.AccountNumber,
		Name:          newWallet.Name,
		Currency:      newWallet.Currency,
		Category:      newWallet.Category,
		Balance:       newWallet.Balance.StringFixed(2),
		CreatedAt:     newWallet.CreatedAt,
		UpdatedAt:     newWallet.UpdatedAt,
	}, nil
}

func (u *walletUsecase) GetWallet(ctx context.Context, id string) (*dtos.WalletDetailResponse, error) {
	w, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	entries, err := u.repo.GetLedgerEntriesByWalletID(ctx, id, 20)
	if err != nil {
		return nil, err
	}

	ledgerResponses := make([]dtos.LedgerEntryResponse, len(entries))
	for i, e := range entries {
		ledgerResponses[i] = dtos.LedgerEntryResponse{
			ID:            e.ID,
			TransactionID: e.TransactionID,
			WalletID:      e.WalletID,
			EntryType:     e.EntryType,
			Amount:        e.Amount,
			Currency:      e.Currency,
			BalanceAfter:  e.BalanceAfter,
			CreatedAt:     e.CreatedAt,
		}
	}

	return &dtos.WalletDetailResponse{
		Wallet: dtos.WalletResponse{
			ID:            w.ID,
			AccountNumber: w.AccountNumber,
			Name:          w.Name,
			Currency:      w.Currency,
			Category:      w.Category,
			Balance:       w.Balance.StringFixed(2),
			CreatedAt:     w.CreatedAt,
			UpdatedAt:     w.UpdatedAt,
		},
		RecentLedgerEntries: ledgerResponses,
	}, nil
}

func (u *walletUsecase) ListWallets(ctx context.Context) ([]dtos.WalletResponse, error) {
	wallets, err := u.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	responses := make([]dtos.WalletResponse, len(wallets))
	for i, w := range wallets {
		responses[i] = dtos.WalletResponse{
			ID:            w.ID,
			AccountNumber: w.AccountNumber,
			Name:          w.Name,
			Currency:      w.Currency,
			Category:      w.Category,
			Balance:       w.Balance.StringFixed(2),
			CreatedAt:     w.CreatedAt,
			UpdatedAt:     w.UpdatedAt,
		}
	}

	return responses, nil
}

func (u *walletUsecase) UpdateWallet(ctx context.Context, id string, req dtos.UpdateWalletRequest) (*dtos.WalletResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperror.NewBadRequest("wallet name cannot be empty")
	}

	w, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	category := normalizeCategory(req.Category)

	w.Name = name
	w.Category = category

	if err := u.repo.Update(ctx, w); err != nil {
		return nil, err
	}

	return &dtos.WalletResponse{
		ID:            w.ID,
		AccountNumber: w.AccountNumber,
		Name:          w.Name,
		Currency:      w.Currency,
		Category:      w.Category,
		Balance:       w.Balance.StringFixed(2),
		CreatedAt:     w.CreatedAt,
		UpdatedAt:     w.UpdatedAt,
	}, nil
}

func (u *walletUsecase) Deposit(ctx context.Context, walletID string, req dtos.DepositRequest) (*dtos.DepositResponse, error) {
	amount, err := decimal.NewFromString(strings.TrimSpace(req.Amount))
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return nil, apperror.NewBadRequest("deposit amount must be a positive number")
	}

	amountStr := amount.StringFixed(2)

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	w, err := u.repo.GetByIDForUpdate(ctx, tx, walletID)
	if err != nil {
		return nil, err
	}

	newBalance := w.Balance.Add(amount)
	if err := u.repo.UpdateBalance(ctx, tx, walletID, newBalance, w.Version); err != nil {
		return nil, err
	}

	txID := uuid.New().String()
	now := time.Now().UTC()

	// Record master transaction
	txRecord := &entities.TransactionRecord{
		ID:             txID,
		Type:           constants.TransactionTypeDeposit.String(),
		Status:         constants.TransactionStatusCompleted.String(),
		TargetWalletID: &walletID,
		TargetAmount:   &amountStr,
		TargetCurrency: &w.Currency,
		Description:    req.Description,
		CreatedAt:      now,
	}
	if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
		return nil, err
	}

	// Record CREDIT ledger entry
	ledgerRecord := &entities.LedgerEntryRecord{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      walletID,
		EntryType:     constants.LedgerEntryCredit.String(),
		Amount:        amountStr,
		Currency:      w.Currency,
		BalanceAfter:  newBalance.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, ledgerRecord); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit deposit: %w", err)
	}

	return &dtos.DepositResponse{
		TransactionID: txID,
		WalletID:      walletID,
		Amount:        amountStr,
		Currency:      w.Currency,
		NewBalance:    newBalance.StringFixed(2),
		Status:        constants.TransactionStatusCompleted.String(),
		CreatedAt:     now,
	}, nil
}

func (u *walletUsecase) Withdraw(ctx context.Context, walletID string, req dtos.WithdrawRequest) (*dtos.WithdrawResponse, error) {
	amount, err := decimal.NewFromString(strings.TrimSpace(req.Amount))
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return nil, apperror.NewBadRequest("withdraw amount must be a positive number")
	}

	amountStr := amount.StringFixed(2)

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	w, err := u.repo.GetByIDForUpdate(ctx, tx, walletID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	txID := uuid.New().String()

	// Check if balance is sufficient
	if w.Balance.LessThan(amount) {
		// Audit failed attempt: Log transaction with status 'FAILED' and reason
		txRecord := &entities.TransactionRecord{
			ID:             txID,
			Type:           constants.TransactionTypeWithdrawal.String(),
			Status:         constants.TransactionStatusFailed.String(),
			FailureReason:  "insufficient balance",
			SourceWalletID: &walletID,
			SourceAmount:   &amountStr,
			SourceCurrency: &w.Currency,
			Description:    req.Description,
			CreatedAt:      now,
		}
		// Write failed transaction inside tx and commit so audit trail persists
		if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, fmt.Errorf("failed to commit failed transaction record: %w", err)
		}

		return nil, apperror.NewUnprocessableEntity(fmt.Sprintf("insufficient balance: requested %s %s, available %s %s (transaction %s)",
			amountStr, w.Currency, w.Balance.StringFixed(2), w.Currency, txID))
	}

	// Balance is sufficient: execute withdrawal
	newBalance := w.Balance.Sub(amount)
	if err := u.repo.UpdateBalance(ctx, tx, walletID, newBalance, w.Version); err != nil {
		return nil, err
	}

	// Record COMPLETED transaction
	txRecord := &entities.TransactionRecord{
		ID:             txID,
		Type:           constants.TransactionTypeWithdrawal.String(),
		Status:         constants.TransactionStatusCompleted.String(),
		SourceWalletID: &walletID,
		SourceAmount:   &amountStr,
		SourceCurrency: &w.Currency,
		Description:    req.Description,
		CreatedAt:      now,
	}
	if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
		return nil, err
	}

	// Record DEBIT ledger entry
	ledgerRecord := &entities.LedgerEntryRecord{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      walletID,
		EntryType:     constants.LedgerEntryDebit.String(),
		Amount:        amountStr,
		Currency:      w.Currency,
		BalanceAfter:  newBalance.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, ledgerRecord); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit withdrawal: %w", err)
	}

	return &dtos.WithdrawResponse{
		TransactionID: txID,
		WalletID:      walletID,
		Amount:        amountStr,
		Currency:      w.Currency,
		NewBalance:    newBalance.StringFixed(2),
		Status:        constants.TransactionStatusCompleted.String(),
		CreatedAt:     now,
	}, nil
}

