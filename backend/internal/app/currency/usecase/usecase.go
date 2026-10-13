package usecase

import (
	"context"
	"sort"
	"strings"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/currency"
	"walletapps/backend/internal/app/currency/dtos"
	"walletapps/backend/internal/integrations/frankfurter"
	"walletapps/backend/pkg/apperror"
)

type currencyUsecase struct {
	frankfurterClient frankfurter.FrankfurterClient
}

func NewCurrencyUsecase(client frankfurter.FrankfurterClient) currency.CurrencyUsecase {
	return &currencyUsecase{
		frankfurterClient: client,
	}
}

func (u *currencyUsecase) GetCurrencies(ctx context.Context) ([]dtos.CurrencyItem, error) {
	currMap, err := u.frankfurterClient.GetCurrencies(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]dtos.CurrencyItem, 0, len(currMap))
	for code, name := range currMap {
		items = append(items, dtos.CurrencyItem{
			Code: code,
			Name: name,
		})
	}

	// Sort alphabetically by currency code for consistent display
	sort.Slice(items, func(i, j int) bool {
		return items[i].Code < items[j].Code
	})

	return items, nil
}

func (u *currencyUsecase) PreviewRate(ctx context.Context, req dtos.RatePreviewRequest) (*dtos.RatePreviewResponse, error) {
	from := strings.ToUpper(strings.TrimSpace(req.From))
	to := strings.ToUpper(strings.TrimSpace(req.To))

	if from == "" || to == "" {
		return nil, apperror.NewBadRequest("query parameters 'from' and 'to' are required")
	}

	amountStr := strings.TrimSpace(req.Amount)
	var amount decimal.Decimal
	var err error

	if amountStr == "" {
		amount = decimal.NewFromInt(1)
	} else {
		amount, err = decimal.NewFromString(amountStr)
		if err != nil {
			return nil, apperror.NewBadRequest("invalid amount format")
		}
	}

	if amount.LessThanOrEqual(decimal.Zero) {
		return nil, apperror.NewBadRequest("amount must be greater than zero")
	}

	rate, err := u.frankfurterClient.GetLatestRate(ctx, from, to)
	if err != nil {
		return nil, err
	}

	targetAmount := amount.Mul(rate)

	return &dtos.RatePreviewResponse{
		From:         from,
		To:           to,
		Rate:         rate.String(),
		SourceAmount: amount.String(),
		TargetAmount: targetAmount.StringFixed(2),
	}, nil
}

