package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/shopspring/decimal"
	"walletapps/backend/config"
	"walletapps/backend/database"
)

type mockFrankfurterForServer struct{}

func (m *mockFrankfurterForServer) GetCurrencies(ctx context.Context) (map[string]string, error) {
	return map[string]string{
		"USD": "United States Dollar",
		"EUR": "Euro",
	}, nil
}

func (m *mockFrankfurterForServer) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	return decimal.NewFromFloat(0.85), nil
}

func TestServer_Routes(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "server-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	cfg := config.Config{
		Server: config.ServerConfig{
			Port: "8080",
			Env:  "test",
		},
		Database: config.DatabaseConfig{
			Driver: "sqlite",
			Path:   filepath.Join(tempDir, "test.db"),
		},
	}

	db, err := database.NewConnection(cfg.Database)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	srv := NewServer(context.Background(), cfg, db)
	// Inject mock client for predictable test
	srv.frankfurterClient = &mockFrankfurterForServer{}
	if err := srv.mapHandlers(); err != nil {
		t.Fatalf("failed to map handlers: %v", err)
	}

	// 1. Test /api/v1/ping
	req := httptest.NewRequest(http.MethodGet, "/api/v1/ping", nil)
	rec := httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for /ping, got %d", rec.Code)
	}

	// 2. Test /api/v1/currencies
	req = httptest.NewRequest(http.MethodGet, "/api/v1/currencies", nil)
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for /currencies, got %d: %s", rec.Code, rec.Body.String())
	}

	// 3. Test /api/v1/rates/preview
	req = httptest.NewRequest(http.MethodGet, "/api/v1/rates/preview?from=USD&to=EUR&amount=100", nil)
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for /rates/preview, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Test POST /api/v1/wallets
	walletPayload := `{"name":"Personal USD","currency":"USD"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(walletPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for POST /wallets, got %d: %s", rec.Code, rec.Body.String())
	}

	var createRes struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &createRes)
	walletID := createRes.Data.ID
	if walletID == "" {
		t.Fatalf("expected created wallet ID, got empty")
	}

	// 5. Test GET /api/v1/wallets
	req = httptest.NewRequest(http.MethodGet, "/api/v1/wallets", nil)
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for GET /wallets, got %d", rec.Code)
	}

	// 6. Test POST /api/v1/wallets/:id/deposit
	depositPayload := `{"amount":"150.00","description":"Initial deposit"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+walletID+"/deposit", strings.NewReader(depositPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for deposit, got %d: %s", rec.Code, rec.Body.String())
	}

	// 7. Test POST /api/v1/wallets/:id/withdraw (insufficient funds)
	withdrawFailPayload := `{"amount":"500.00","description":"Too much"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+walletID+"/withdraw", strings.NewReader(withdrawFailPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for insufficient balance withdraw, got %d: %s", rec.Code, rec.Body.String())
	}

	// 8. Test POST /api/v1/wallets/:id/withdraw (success)
	withdrawSuccessPayload := `{"amount":"50.00","description":"Partial cash out"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+walletID+"/withdraw", strings.NewReader(withdrawSuccessPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid withdraw, got %d: %s", rec.Code, rec.Body.String())
	}

	// 9. Create second USD wallet and EUR wallet for transfers/conversions
	w2Payload := `{"name":"Savings USD","currency":"USD"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(w2Payload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	var w2Res struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &w2Res)
	walletID2 := w2Res.Data.ID

	wEurPayload := `{"name":"Holiday EUR","currency":"EUR"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(wEurPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	var wEurRes struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &wEurRes)
	walletEUR := wEurRes.Data.ID

	// 10. Test POST /api/v1/transfers (transfer 20.00 USD from walletID to walletID2)
	transferPayload := fmt.Sprintf(`{"source_wallet_id":"%s","target_wallet_id":"%s","amount":"20.00","description":"Vault transfer"}`, walletID, walletID2)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/transfers", strings.NewReader(transferPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for transfer, got %d: %s", rec.Code, rec.Body.String())
	}
	var transferRes struct {
		Data struct {
			TransactionID string `json:"transaction_id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &transferRes)
	transferTxID := transferRes.Data.TransactionID

	// 11. Test POST /api/v1/conversions (convert 30.00 USD from walletID to walletEUR)
	convertPayload := fmt.Sprintf(`{"source_wallet_id":"%s","target_wallet_id":"%s","amount":"30.00","description":"Currency swap"}`, walletID, walletEUR)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/conversions", strings.NewReader(convertPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for conversion, got %d: %s", rec.Code, rec.Body.String())
	}

	// 12. Test GET /api/v1/transactions
	req = httptest.NewRequest(http.MethodGet, "/api/v1/transactions?wallet_id="+walletID, nil)
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /transactions, got %d: %s", rec.Code, rec.Body.String())
	}

	// 13. Test GET /api/v1/transactions/:id
	req = httptest.NewRequest(http.MethodGet, "/api/v1/transactions/"+transferTxID, nil)
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for GET /transactions/:id, got %d: %s", rec.Code, rec.Body.String())
	}
}

