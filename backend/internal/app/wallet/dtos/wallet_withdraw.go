package dtos

import (
	"time"
)

type WithdrawRequest struct {
	Amount      string `json:"amount" validate:"required"`
	Description string `json:"description"`
}

type WithdrawResponse struct {
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	NewBalance    string    `json:"new_balance"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

