package transaction

import (
	"context"
	"database/sql"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/transaction/dtos"
	"walletapps/backend/internal/app/transaction/entities"
)

type TransactionRepository interface {
	BeginTx(ctx context.Context) (*sql.Tx, error)
	GetWalletByID(ctx context.Context, id string) (*entities.WalletInfo, error)
	GetWalletForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entities.WalletInfo, error)
	UpdateWalletBalance(ctx context.Context, tx *sql.Tx, id string, newBalance decimal.Decimal) error
	RecordTransaction(ctx context.Context, tx *sql.Tx, txRecord *entities.Transaction) error
	RecordLedgerEntry(ctx context.Context, tx *sql.Tx, entry *entities.LedgerEntry) error
	ListTransactions(ctx context.Context, query dtos.TransactionQuery) ([]dtos.TransactionItemResponse, int, error)
	GetTransactionByID(ctx context.Context, id string) (*dtos.TransactionDetailResponse, error)
}

