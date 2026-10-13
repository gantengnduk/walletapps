package dtos

import (
	"time"
)

type TransferRequest struct {
	SourceWalletID string `json:"source_wallet_id" validate:"required"`
	TargetWalletID string `json:"target_wallet_id" validate:"required"`
	Amount         string `json:"amount" validate:"required"`
	Description    string `json:"description"`
}

type TransferResponse struct {
	TransactionID    string    `json:"transaction_id"`
	SourceWalletID   string    `json:"source_wallet_id"`
	TargetWalletID   string    `json:"target_wallet_id"`
	Amount           string    `json:"amount"`
	Currency         string    `json:"currency"`
	SourceNewBalance string    `json:"source_new_balance"`
	TargetNewBalance string    `json:"target_new_balance"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

