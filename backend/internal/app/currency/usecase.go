package currency

import (
	"context"

	"walletapps/backend/internal/app/currency/dtos"
)

type CurrencyUsecase interface {
	GetCurrencies(ctx context.Context) ([]dtos.CurrencyItem, error)
	PreviewRate(ctx context.Context, req dtos.RatePreviewRequest) (*dtos.RatePreviewResponse, error)
}

