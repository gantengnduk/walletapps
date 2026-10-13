package frankfurter

import (
	"context"

	"github.com/shopspring/decimal"
)

// FrankfurterClient defines the interface for interacting with the Frankfurter exchange rate API.
type FrankfurterClient interface {
	GetCurrencies(ctx context.Context) (map[string]string, error)
	GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error)
}

