package usecase

import (
	"context"
	"sort"
	"strings"
	"time"

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

var marketPairs = []struct {
	Pair      string
	From      string
	To        string
	Precision int32
}{
	{Pair: "EUR/USD", From: "EUR", To: "USD", Precision: 4},
	{Pair: "USD/SGD", From: "USD", To: "SGD", Precision: 4},
	{Pair: "USD/IDR", From: "USD", To: "IDR", Precision: 2},
	{Pair: "GBP/USD", From: "GBP", To: "USD", Precision: 4},
	{Pair: "USD/JPY", From: "USD", To: "JPY", Precision: 2},
}

func (u *currencyUsecase) GetMarketRates(ctx context.Context) (*dtos.MarketRatesResponse, error) {
	pairs := make([]dtos.MarketRateItem, 0, len(marketPairs))

	for _, p := range marketPairs {
		rate, err := u.frankfurterClient.GetLatestRate(ctx, p.From, p.To)
		if err != nil {
			return nil, err
		}

		var inverseStr string
		if !rate.IsZero() {
			inverse := decimal.NewFromInt(1).Div(rate)
			invPrecision := int32(4)
			if p.From == "IDR" || p.From == "JPY" {
				invPrecision = 2
			}
			inverseStr = inverse.StringFixed(invPrecision)
		}

		pairs = append(pairs, dtos.MarketRateItem{
			Pair:        p.Pair,
			From:        p.From,
			To:          p.To,
			Rate:        rate.StringFixed(p.Precision),
			InverseRate: inverseStr,
		})
	}

	return &dtos.MarketRatesResponse{
		Date:     time.Now().UTC().Format("2006-01-02"),
		Provider: "European Central Bank (ECB)",
		Pairs:    pairs,
	}, nil
}

