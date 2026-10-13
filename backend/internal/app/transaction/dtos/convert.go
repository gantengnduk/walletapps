package dtos

import (
	"time"
)

type ConvertRequest struct {
	SourceWalletID string `json:"source_wallet_id" validate:"required"`
	TargetWalletID string `json:"target_wallet_id" validate:"required"`
	Amount         string `json:"amount" validate:"required"`
	Description    string `json:"description"`
}

type ConvertResponse struct {
	TransactionID    string    `json:"transaction_id"`
	SourceWalletID   string    `json:"source_wallet_id"`
	TargetWalletID   string    `json:"target_wallet_id"`
	SourceAmount     string    `json:"source_amount"`
	SourceCurrency   string    `json:"source_currency"`
	TargetAmount     string    `json:"target_amount"`
	TargetCurrency   string    `json:"target_currency"`
	ExchangeRate     string    `json:"exchange_rate"`
	SourceNewBalance string    `json:"source_new_balance"`
	TargetNewBalance string    `json:"target_new_balance"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

