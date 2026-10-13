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

	"walletapps/backend/config"
	"walletapps/backend/database"
)

func TestServer_EdgeCasesAndInputValidation(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "server-edge-test-*")
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
	srv.frankfurterClient = &mockFrankfurterForServer{}
	if err := srv.mapHandlers(); err != nil {
		t.Fatalf("failed to map handlers: %v", err)
	}

	// 1. Edge Case: Create wallet with unsupported currency
	invalidCurrencyPayload := `{"name":"Bad Wallet","currency":"XYZ_NON_EXISTENT"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(invalidCurrencyPayload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for unsupported currency, got %d: %s", rec.Code, rec.Body.String())
	}

	// 2. Setup valid USD and EUR wallets for subsequent edge cases
	usdPayload := `{"name":"USD Wallet","currency":"USD"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(usdPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("failed to create USD wallet: %d", rec.Code)
	}
	var usdResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = jsonUnmarshal(rec.Body.Bytes(), &usdResp)
	usdID := usdResp.Data.ID

	eurPayload := `{"name":"EUR Wallet","currency":"EUR"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(eurPayload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	var eurResp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = jsonUnmarshal(rec.Body.Bytes(), &eurResp)
	eurID := eurResp.Data.ID

	// 3. Edge Case: Deposit negative amount
	negDeposit := `{"amount":"-50.00"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+usdID+"/deposit", strings.NewReader(negDeposit))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for negative deposit, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Edge Case: Deposit zero amount
	zeroDeposit := `{"amount":"0.00"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+usdID+"/deposit", strings.NewReader(zeroDeposit))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for zero deposit, got %d: %s", rec.Code, rec.Body.String())
	}

	// 5. Edge Case: Deposit non-numeric string
	nanDeposit := `{"amount":"not_a_number"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+usdID+"/deposit", strings.NewReader(nanDeposit))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for non-numeric deposit, got %d: %s", rec.Code, rec.Body.String())
	}

	// 6. Deposit valid 100.00 into USD
	valDeposit := `{"amount":"100.00"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets/"+usdID+"/deposit", strings.NewReader(valDeposit))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid deposit, got %d: %s", rec.Code, rec.Body.String())
	}

	// 7. Edge Case: Transfer between different currencies (USD to EUR)
	mismatchTransfer := fmt.Sprintf(`{"source_wallet_id":"%s","target_wallet_id":"%s","amount":"20.00"}`, usdID, eurID)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/transfers", strings.NewReader(mismatchTransfer))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for cross-currency transfer, got %d: %s", rec.Code, rec.Body.String())
	}

	// 8. Edge Case: Convert between same currency wallets (create second USD wallet)
	usd2Payload := `{"name":"USD Wallet 2","currency":"USD"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/wallets", strings.NewReader(usd2Payload))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	var usd2Resp struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = jsonUnmarshal(rec.Body.Bytes(), &usd2Resp)
	usd2ID := usd2Resp.Data.ID

	sameCurConvert := fmt.Sprintf(`{"source_wallet_id":"%s","target_wallet_id":"%s","amount":"20.00"}`, usdID, usd2ID)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/conversions", strings.NewReader(sameCurConvert))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for same-currency conversion, got %d: %s", rec.Code, rec.Body.String())
	}

	// 9. Edge Case: Convert with insufficient funds (1000.00 USD > 100.00 available)
	overdraftConvert := fmt.Sprintf(`{"source_wallet_id":"%s","target_wallet_id":"%s","amount":"1000.00"}`, usdID, eurID)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/conversions", strings.NewReader(overdraftConvert))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Echo().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for overdraft convert, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify failed conversion logged in DB
	var failedCount int
	err = db.QueryRow("SELECT COUNT(*) FROM transactions WHERE status = 'FAILED' AND type = 'CONVERT';").Scan(&failedCount)
	if err != nil || failedCount != 1 {
		t.Errorf("expected 1 audited FAILED conversion, got %d (err: %v)", failedCount, err)
	}
}

func jsonUnmarshal(b []byte, v interface{}) error {
	return json.Unmarshal(b, v)
}
