package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/shopspring/decimal"
	"walletapps/backend/internal/app/currency/dtos"
)

type mockFrankfurterClient struct {
	currencies map[string]string
	rates      map[string]decimal.Decimal
	err        error
}

func (m *mockFrankfurterClient) GetCurrencies(ctx context.Context) (map[string]string, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.currencies, nil
}

func (m *mockFrankfurterClient) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	if m.err != nil {
		return decimal.Zero, m.err
	}
	key := from + "_" + to
	rate, ok := m.rates[key]
	if !ok {
		return decimal.Zero, errors.New("rate not found")
	}
	return rate, nil
}

func TestCurrencyUsecase_GetCurrencies(t *testing.T) {
	mock := &mockFrankfurterClient{
		currencies: map[string]string{
			"USD": "United States Dollar",
			"AUD": "Australian Dollar",
			"EUR": "Euro",
		},
	}
	uc := NewCurrencyUsecase(mock)

	items, err := uc.GetCurrencies(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(items))
	}

	// Verify items are sorted alphabetically by Code
	if items[0].Code != "AUD" || items[1].Code != "EUR" || items[2].Code != "USD" {
		t.Errorf("items not properly sorted: %+v", items)
	}
}

func TestCurrencyUsecase_PreviewRate(t *testing.T) {
	mock := &mockFrankfurterClient{
		rates: map[string]decimal.Decimal{
			"USD_EUR": decimal.NewFromFloat(0.85),
		},
	}
	uc := NewCurrencyUsecase(mock)

	// Valid preview
	res, err := uc.PreviewRate(context.Background(), dtos.RatePreviewRequest{
		From:   "USD",
		To:     "EUR",
		Amount: "100",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Rate != "0.85" {
		t.Errorf("expected rate 0.85, got %s", res.Rate)
	}
	if res.TargetAmount != "85.00" {
		t.Errorf("expected target amount 85.00, got %s", res.TargetAmount)
	}

	// Missing from/to
	_, err = uc.PreviewRate(context.Background(), dtos.RatePreviewRequest{
		From: "",
		To:   "EUR",
	})
	if err == nil {
		t.Error("expected error for missing from, got nil")
	}

	// Negative amount
	_, err = uc.PreviewRate(context.Background(), dtos.RatePreviewRequest{
		From:   "USD",
		To:     "EUR",
		Amount: "-10",
	})
	if err == nil {
		t.Error("expected error for negative amount, got nil")
	}

	// Invalid amount format
	_, err = uc.PreviewRate(context.Background(), dtos.RatePreviewRequest{
		From:   "USD",
		To:     "EUR",
		Amount: "abc",
	})
	if err == nil {
		t.Error("expected error for invalid amount format, got nil")
	}
}

