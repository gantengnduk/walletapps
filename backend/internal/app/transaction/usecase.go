package transaction

import (
	"context"

	"walletapps/backend/internal/app/transaction/dtos"
)

type TransactionUsecase interface {
	Transfer(ctx context.Context, req dtos.TransferRequest) (*dtos.TransferResponse, error)
	Convert(ctx context.Context, req dtos.ConvertRequest) (*dtos.ConvertResponse, error)
	ListTransactions(ctx context.Context, query dtos.TransactionQuery) (*dtos.TransactionListResponse, error)
	GetTransactionByID(ctx context.Context, id string) (*dtos.TransactionDetailResponse, error)
}

