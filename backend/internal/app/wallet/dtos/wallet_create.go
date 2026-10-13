package dtos

import (
	"time"
)

type CreateWalletRequest struct {
	Name     string `json:"name" validate:"required"`
	Currency string `json:"currency" validate:"required"`
}

type WalletResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Currency  string    `json:"currency"`
	Balance   string    `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LedgerEntryResponse struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	EntryType     string    `json:"entry_type"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	BalanceAfter  string    `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}

type WalletDetailResponse struct {
	Wallet              WalletResponse        `json:"wallet"`
	RecentLedgerEntries []LedgerEntryResponse `json:"recent_ledger_entries"`
}

