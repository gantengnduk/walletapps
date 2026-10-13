package entities

import (
	"time"
)

type Transaction struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"`
	Status         string    `json:"status"`
	FailureReason  *string   `json:"failure_reason,omitempty"`
	SourceWalletID *string   `json:"source_wallet_id,omitempty"`
	TargetWalletID *string   `json:"target_wallet_id,omitempty"`
	SourceAmount   *string   `json:"source_amount,omitempty"`
	SourceCurrency *string   `json:"source_currency,omitempty"`
	TargetAmount   *string   `json:"target_amount,omitempty"`
	TargetCurrency *string   `json:"target_currency,omitempty"`
	ExchangeRate   *string   `json:"exchange_rate,omitempty"`
	Description    string    `json:"description,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type LedgerEntry struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	EntryType     string    `json:"entry_type"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	BalanceAfter  string    `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}

type WalletInfo struct {
	ID       string
	Name     string
	Currency string
	Balance  string
	Version  int64
}

