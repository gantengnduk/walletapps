package entities

import (
	"time"

	"github.com/shopspring/decimal"
)

type Wallet struct {
	ID            string          `json:"id"`
	AccountNumber string          `json:"account_number"`
	Name          string          `json:"name"`
	Currency      string          `json:"currency"`
	Category      string          `json:"category"`
	Balance       decimal.Decimal `json:"balance"`
	Version       int64           `json:"version"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

type TransactionRecord struct {
	ID             string
	Type           string
	Status         string
	FailureReason  string
	SourceWalletID *string
	TargetWalletID *string
	SourceAmount   *string
	SourceCurrency *string
	TargetAmount   *string
	TargetCurrency *string
	ExchangeRate   *string
	Description    string
	CreatedAt      time.Time
}

type LedgerEntryRecord struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	EntryType     string    `json:"entry_type"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	BalanceAfter  string    `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}

