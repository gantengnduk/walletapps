package wallet

import (
	"context"
	"database/sql"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/wallet/entities"
)

type WalletRepository interface {
	BeginTx(ctx context.Context) (*sql.Tx, error)
	Create(ctx context.Context, wallet *entities.Wallet) error
	GetByID(ctx context.Context, id string) (*entities.Wallet, error)
	GetByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entities.Wallet, error)
	List(ctx context.Context) ([]entities.Wallet, error)
	UpdateBalance(ctx context.Context, tx *sql.Tx, id string, newBalance decimal.Decimal) error
	RecordTransaction(ctx context.Context, tx *sql.Tx, txRecord *entities.TransactionRecord) error
	RecordLedgerEntry(ctx context.Context, tx *sql.Tx, entry *entities.LedgerEntryRecord) error
	GetLedgerEntriesByWalletID(ctx context.Context, walletID string, limit int) ([]entities.LedgerEntryRecord, error)
}

