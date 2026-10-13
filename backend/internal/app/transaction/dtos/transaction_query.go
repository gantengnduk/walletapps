package dtos

import (
	"time"
)

type TransactionQuery struct {
	WalletID string `query:"wallet_id"`
	Type     string `query:"type"`
	Status   string `query:"status"`
	Limit    int    `query:"limit"`
	Offset   int    `query:"offset"`
}

type TransactionItemResponse struct {
	ID               string    `json:"id"`
	Type             string    `json:"type"`
	Status           string    `json:"status"`
	FailureReason    *string   `json:"failure_reason,omitempty"`
	SourceWalletID   *string   `json:"source_wallet_id,omitempty"`
	SourceWalletName *string   `json:"source_wallet_name,omitempty"`
	TargetWalletID   *string   `json:"target_wallet_id,omitempty"`
	TargetWalletName *string   `json:"target_wallet_name,omitempty"`
	SourceAmount     *string   `json:"source_amount,omitempty"`
	SourceCurrency   *string   `json:"source_currency,omitempty"`
	TargetAmount     *string   `json:"target_amount,omitempty"`
	TargetCurrency   *string   `json:"target_currency,omitempty"`
	ExchangeRate     *string   `json:"exchange_rate,omitempty"`
	Description      string    `json:"description,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

type LedgerEntryItemResponse struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	WalletName    string    `json:"wallet_name"`
	EntryType     string    `json:"entry_type"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	BalanceAfter  string    `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}

type TransactionDetailResponse struct {
	Transaction   TransactionItemResponse   `json:"transaction"`
	LedgerEntries []LedgerEntryItemResponse `json:"ledger_entries"`
}

type TransactionListResponse struct {
	Transactions []TransactionItemResponse `json:"transactions"`
	Total        int                       `json:"total"`
	Limit        int                       `json:"limit"`
	Offset       int                       `json:"offset"`
}

