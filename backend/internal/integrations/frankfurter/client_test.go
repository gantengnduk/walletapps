package frankfurter

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

func TestFrankfurterClient_GetCurrencies(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/currencies" {
			t.Errorf("unexpected path: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"USD":"United States Dollar","EUR":"Euro","GBP":"British Pound"}`)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 2*time.Second)
	currencies, err := client.GetCurrencies(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(currencies) != 3 {
		t.Errorf("expected 3 currencies, got %d", len(currencies))
	}
	if currencies["USD"] != "United States Dollar" {
		t.Errorf("expected United States Dollar, got %s", currencies["USD"])
	}
}

func TestFrankfurterClient_GetLatestRate(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/latest" {
			t.Errorf("unexpected path: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		from := r.URL.Query().Get("from")
		to := r.URL.Query().Get("to")
		if from == "USD" && to == "EUR" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintln(w, `{"amount":1.0,"base":"USD","date":"2026-10-12","rates":{"EUR":0.89437}}`)
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, `{"message":"bad currency pair"}`)
	}))
	defer ts.Close()

	client := NewClient(ts.URL, 2*time.Second)

	// Test cross-currency
	rate, err := client.GetLatestRate(context.Background(), "USD", "EUR")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected, _ := decimal.NewFromString("0.89437")
	if !rate.Equal(expected) {
		t.Errorf("expected rate %s, got %s", expected, rate)
	}

	// Test same-currency identity
	sameRate, err := client.GetLatestRate(context.Background(), "USD", "USD")
	if err != nil {
		t.Fatalf("unexpected error for same currency: %v", err)
	}
	if !sameRate.Equal(decimal.NewFromInt(1)) {
		t.Errorf("expected 1.0 for same currency, got %s", sameRate)
	}

	// Test invalid currency pair
	_, err = client.GetLatestRate(context.Background(), "USD", "INVALID")
	if err == nil {
		t.Error("expected error for invalid currency, got nil")
	}
}

