package usecase

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/transaction"
	"walletapps/backend/internal/app/transaction/dtos"
	"walletapps/backend/internal/app/transaction/entities"
	"walletapps/backend/internal/integrations/frankfurter"
	"walletapps/backend/pkg/apperror"
	"walletapps/backend/pkg/constants"
)

type transactionUsecase struct {
	repo              transaction.TransactionRepository
	frankfurterClient frankfurter.FrankfurterClient
}

func NewTransactionUsecase(repo transaction.TransactionRepository, client frankfurter.FrankfurterClient) transaction.TransactionUsecase {
	return &transactionUsecase{
		repo:              repo,
		frankfurterClient: client,
	}
}

func (u *transactionUsecase) Transfer(ctx context.Context, req dtos.TransferRequest) (*dtos.TransferResponse, error) {
	if req.SourceWalletID == req.TargetWalletID {
		return nil, apperror.NewBadRequest("source and target wallets must be different")
	}

	amount, err := decimal.NewFromString(strings.TrimSpace(req.Amount))
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return nil, apperror.NewBadRequest("transfer amount must be a positive number")
	}
	amountStr := amount.StringFixed(2)

	// Validate both wallets exist and share the same currency
	sourceWallet, err := u.repo.GetWalletByID(ctx, req.SourceWalletID)
	if err != nil {
		return nil, err
	}
	targetWallet, err := u.repo.GetWalletByID(ctx, req.TargetWalletID)
	if err != nil {
		return nil, err
	}

	if sourceWallet.Currency != targetWallet.Currency {
		return nil, apperror.NewBadRequest(fmt.Sprintf(
			"transfer is only supported between wallets of the same currency (source is %s, target is %s); use convert instead",
			sourceWallet.Currency, targetWallet.Currency))
	}

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock wallets in consistent ID order to avoid deadlocks
	wSource, wTarget, err := u.lockWalletsInOrder(ctx, tx, req.SourceWalletID, req.TargetWalletID)
	if err != nil {
		return nil, err
	}

	sourceBal, err := decimal.NewFromString(wSource.Balance)
	if err != nil {
		return nil, fmt.Errorf("failed to parse source balance: %w", err)
	}
	targetBal, err := decimal.NewFromString(wTarget.Balance)
	if err != nil {
		return nil, fmt.Errorf("failed to parse target balance: %w", err)
	}

	txID := uuid.New().String()
	now := time.Now().UTC()

	// Check if source wallet has sufficient funds
	if sourceBal.LessThan(amount) {
		failReason := "insufficient balance"
		txRecord := &entities.Transaction{
			ID:             txID,
			Type:           constants.TransactionTypeTransfer.String(),
			Status:         constants.TransactionStatusFailed.String(),
			FailureReason:  &failReason,
			SourceWalletID: &req.SourceWalletID,
			TargetWalletID: &req.TargetWalletID,
			SourceAmount:   &amountStr,
			SourceCurrency: &sourceWallet.Currency,
			TargetAmount:   &amountStr,
			TargetCurrency: &targetWallet.Currency,
			Description:    req.Description,
			CreatedAt:      now,
		}
		if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, fmt.Errorf("failed to commit failed transfer audit: %w", err)
		}

		return nil, apperror.NewUnprocessableEntity(fmt.Sprintf(
			"insufficient balance: requested %s %s, available %s %s (transaction %s)",
			amountStr, sourceWallet.Currency, sourceBal.StringFixed(2), sourceWallet.Currency, txID))
	}

	// Calculate new balances
	sourceNewBal := sourceBal.Sub(amount)
	targetNewBal := targetBal.Add(amount)

	if err := u.repo.UpdateWalletBalance(ctx, tx, req.SourceWalletID, sourceNewBal, wSource.Version); err != nil {
		return nil, err
	}
	if err := u.repo.UpdateWalletBalance(ctx, tx, req.TargetWalletID, targetNewBal, wTarget.Version); err != nil {
		return nil, err
	}

	// Record COMPLETED transfer transaction
	txRecord := &entities.Transaction{
		ID:             txID,
		Type:           constants.TransactionTypeTransfer.String(),
		Status:         constants.TransactionStatusCompleted.String(),
		SourceWalletID: &req.SourceWalletID,
		TargetWalletID: &req.TargetWalletID,
		SourceAmount:   &amountStr,
		SourceCurrency: &sourceWallet.Currency,
		TargetAmount:   &amountStr,
		TargetCurrency: &targetWallet.Currency,
		Description:    req.Description,
		CreatedAt:      now,
	}
	if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
		return nil, err
	}

	// Record DEBIT ledger entry on source wallet
	debitEntry := &entities.LedgerEntry{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      req.SourceWalletID,
		EntryType:     constants.LedgerEntryDebit.String(),
		Amount:        amountStr,
		Currency:      sourceWallet.Currency,
		BalanceAfter:  sourceNewBal.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, debitEntry); err != nil {
		return nil, err
	}

	// Record CREDIT ledger entry on target wallet
	creditEntry := &entities.LedgerEntry{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      req.TargetWalletID,
		EntryType:     constants.LedgerEntryCredit.String(),
		Amount:        amountStr,
		Currency:      targetWallet.Currency,
		BalanceAfter:  targetNewBal.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, creditEntry); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transfer: %w", err)
	}

	return &dtos.TransferResponse{
		TransactionID:    txID,
		SourceWalletID:   req.SourceWalletID,
		TargetWalletID:   req.TargetWalletID,
		Amount:           amountStr,
		Currency:         sourceWallet.Currency,
		SourceNewBalance: sourceNewBal.StringFixed(2),
		TargetNewBalance: targetNewBal.StringFixed(2),
		Status:           constants.TransactionStatusCompleted.String(),
		CreatedAt:        now,
	}, nil
}

func (u *transactionUsecase) Convert(ctx context.Context, req dtos.ConvertRequest) (*dtos.ConvertResponse, error) {
	if req.SourceWalletID == req.TargetWalletID {
		return nil, apperror.NewBadRequest("source and target wallets must be different")
	}

	amount, err := decimal.NewFromString(strings.TrimSpace(req.Amount))
	if err != nil || amount.LessThanOrEqual(decimal.Zero) {
		return nil, apperror.NewBadRequest("conversion amount must be a positive number")
	}
	amountStr := amount.StringFixed(2)

	// Validate both wallets exist and have DIFFERENT currencies
	sourceWallet, err := u.repo.GetWalletByID(ctx, req.SourceWalletID)
	if err != nil {
		return nil, err
	}
	targetWallet, err := u.repo.GetWalletByID(ctx, req.TargetWalletID)
	if err != nil {
		return nil, err
	}

	if sourceWallet.Currency == targetWallet.Currency {
		return nil, apperror.NewBadRequest(fmt.Sprintf(
			"conversion requires wallets of different currencies; both wallets are %s, use transfer instead",
			sourceWallet.Currency))
	}

	// Fetch live exchange rate from Frankfurter synchronously
	rate, err := u.frankfurterClient.GetLatestRate(ctx, sourceWallet.Currency, targetWallet.Currency)
	now := time.Now().UTC()
	txID := uuid.New().String()

	if err != nil {
		// Audit failed conversion attempt due to rate lookup failure
		failReason := fmt.Sprintf("exchange rate lookup failed: %v", err)
		txRecord := &entities.Transaction{
			ID:             txID,
			Type:           constants.TransactionTypeConvert.String(),
			Status:         constants.TransactionStatusFailed.String(),
			FailureReason:  &failReason,
			SourceWalletID: &req.SourceWalletID,
			TargetWalletID: &req.TargetWalletID,
			SourceAmount:   &amountStr,
			SourceCurrency: &sourceWallet.Currency,
			TargetCurrency: &targetWallet.Currency,
			Description:    req.Description,
			CreatedAt:      now,
		}
		_ = u.repo.RecordTransaction(ctx, nil, txRecord)
		return nil, apperror.NewUnprocessableEntity(failReason)
	}

	targetAmount := amount.Mul(rate)
	targetAmountStr := targetAmount.StringFixed(2)
	rateStr := rate.String()

	tx, err := u.repo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock wallets in consistent ID order to avoid deadlocks
	wSource, wTarget, err := u.lockWalletsInOrder(ctx, tx, req.SourceWalletID, req.TargetWalletID)
	if err != nil {
		return nil, err
	}

	sourceBal, err := decimal.NewFromString(wSource.Balance)
	if err != nil {
		return nil, fmt.Errorf("failed to parse source balance: %w", err)
	}
	targetBal, err := decimal.NewFromString(wTarget.Balance)
	if err != nil {
		return nil, fmt.Errorf("failed to parse target balance: %w", err)
	}

	// Check if source wallet has sufficient funds
	if sourceBal.LessThan(amount) {
		failReason := "insufficient balance"
		txRecord := &entities.Transaction{
			ID:             txID,
			Type:           constants.TransactionTypeConvert.String(),
			Status:         constants.TransactionStatusFailed.String(),
			FailureReason:  &failReason,
			SourceWalletID: &req.SourceWalletID,
			TargetWalletID: &req.TargetWalletID,
			SourceAmount:   &amountStr,
			SourceCurrency: &sourceWallet.Currency,
			TargetAmount:   &targetAmountStr,
			TargetCurrency: &targetWallet.Currency,
			ExchangeRate:   &rateStr,
			Description:    req.Description,
			CreatedAt:      now,
		}
		if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, fmt.Errorf("failed to commit failed conversion audit: %w", err)
		}

		return nil, apperror.NewUnprocessableEntity(fmt.Sprintf(
			"insufficient balance: requested %s %s, available %s %s (transaction %s)",
			amountStr, sourceWallet.Currency, sourceBal.StringFixed(2), sourceWallet.Currency, txID))
	}

	// Calculate new balances
	sourceNewBal := sourceBal.Sub(amount)
	targetNewBal := targetBal.Add(targetAmount)

	if err := u.repo.UpdateWalletBalance(ctx, tx, req.SourceWalletID, sourceNewBal, wSource.Version); err != nil {
		return nil, err
	}
	if err := u.repo.UpdateWalletBalance(ctx, tx, req.TargetWalletID, targetNewBal, wTarget.Version); err != nil {
		return nil, err
	}

	// Record COMPLETED conversion transaction
	txRecord := &entities.Transaction{
		ID:             txID,
		Type:           constants.TransactionTypeConvert.String(),
		Status:         constants.TransactionStatusCompleted.String(),
		SourceWalletID: &req.SourceWalletID,
		TargetWalletID: &req.TargetWalletID,
		SourceAmount:   &amountStr,
		SourceCurrency: &sourceWallet.Currency,
		TargetAmount:   &targetAmountStr,
		TargetCurrency: &targetWallet.Currency,
		ExchangeRate:   &rateStr,
		Description:    req.Description,
		CreatedAt:      now,
	}
	if err := u.repo.RecordTransaction(ctx, tx, txRecord); err != nil {
		return nil, err
	}

	// Record DEBIT ledger entry on source wallet
	debitEntry := &entities.LedgerEntry{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      req.SourceWalletID,
		EntryType:     constants.LedgerEntryDebit.String(),
		Amount:        amountStr,
		Currency:      sourceWallet.Currency,
		BalanceAfter:  sourceNewBal.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, debitEntry); err != nil {
		return nil, err
	}

	// Record CREDIT ledger entry on target wallet
	creditEntry := &entities.LedgerEntry{
		ID:            uuid.New().String(),
		TransactionID: txID,
		WalletID:      req.TargetWalletID,
		EntryType:     constants.LedgerEntryCredit.String(),
		Amount:        targetAmountStr,
		Currency:      targetWallet.Currency,
		BalanceAfter:  targetNewBal.StringFixed(2),
		CreatedAt:     now,
	}
	if err := u.repo.RecordLedgerEntry(ctx, tx, creditEntry); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit conversion: %w", err)
	}

	return &dtos.ConvertResponse{
		TransactionID:    txID,
		SourceWalletID:   req.SourceWalletID,
		TargetWalletID:   req.TargetWalletID,
		SourceAmount:     amountStr,
		SourceCurrency:   sourceWallet.Currency,
		TargetAmount:     targetAmountStr,
		TargetCurrency:   targetWallet.Currency,
		ExchangeRate:     rateStr,
		SourceNewBalance: sourceNewBal.StringFixed(2),
		TargetNewBalance: targetNewBal.StringFixed(2),
		Status:           constants.TransactionStatusCompleted.String(),
		CreatedAt:        now,
	}, nil
}

func (u *transactionUsecase) ListTransactions(ctx context.Context, query dtos.TransactionQuery) (*dtos.TransactionListResponse, error) {
	items, total, err := u.repo.ListTransactions(ctx, query)
	if err != nil {
		return nil, err
	}

	limit := query.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := query.Offset
	if offset < 0 {
		offset = 0
	}

	return &dtos.TransactionListResponse{
		Transactions: items,
		Total:        total,
		Limit:        limit,
		Offset:       offset,
	}, nil
}

func (u *transactionUsecase) GetTransactionByID(ctx context.Context, id string) (*dtos.TransactionDetailResponse, error) {
	return u.repo.GetTransactionByID(ctx, id)
}

// lockWalletsInOrder locks two wallets in deterministic alphabetical order to avoid deadlocks.
func (u *transactionUsecase) lockWalletsInOrder(ctx context.Context, tx *sql.Tx, sourceID, targetID string) (*entities.WalletInfo, *entities.WalletInfo, error) {
	firstID, secondID := sourceID, targetID
	if firstID > secondID {
		firstID, secondID = targetID, sourceID
	}

	w1, err := u.repo.GetWalletForUpdate(ctx, tx, firstID)
	if err != nil {
		return nil, nil, err
	}
	w2, err := u.repo.GetWalletForUpdate(ctx, tx, secondID)
	if err != nil {
		return nil, nil, err
	}

	if w1.ID == sourceID {
		return w1, w2, nil
	}
	return w2, w1, nil
}
