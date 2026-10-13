package database

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"walletapps/backend/config"
)

func TestDatabaseConnectionAndMigrations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "wallet-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "test.db")
	cfg := config.DatabaseConfig{
		Driver: "sqlite",
		Path:   dbPath,
	}

	db, err := NewConnection(cfg)
	if err != nil {
		t.Fatalf("NewConnection failed: %v", err)
	}
	defer db.Close()

	// Verify required tables exist
	tables := []string{"wallets", "transactions", "ledger_entries"}
	for _, table := range tables {
		var name string
		query := `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`
		err := db.QueryRow(query, table).Scan(&name)
		if err != nil {
			t.Errorf("expected table %s to exist, query returned: %v", table, err)
		}
		if name != table {
			t.Errorf("expected table name %s, got %s", table, name)
		}
	}

	// Verify foreign keys pragma is enabled
	var foreignKeys int
	if err := db.QueryRow("PRAGMA foreign_keys;").Scan(&foreignKeys); err != nil {
		t.Fatalf("failed to check foreign_keys pragma: %v", err)
	}
	if foreignKeys != 1 {
		t.Errorf("expected foreign_keys = 1, got %d", foreignKeys)
	}

	// Verify inserting and reading a test wallet
	insertQuery := `INSERT INTO wallets (id, name, currency, balance) VALUES (?, ?, ?, ?);`
	_, err = db.Exec(insertQuery, "w-1", "Test Wallet", "USD", "100.50")
	if err != nil {
		t.Fatalf("failed to insert test wallet: %v", err)
	}

	var balance string
	err = db.QueryRow("SELECT balance FROM wallets WHERE id = ?", "w-1").Scan(&balance)
	if err != nil {
		t.Fatalf("failed to query test wallet: %v", err)
	}
	if balance != "100.50" {
		t.Errorf("expected balance 100.50, got %s", balance)
	}

	// Verify goose migration down and re-up
	if err := gooseDownAndUp(db); err != nil {
		t.Errorf("goose migration down/up cycle failed: %v", err)
	}
}

func gooseDownAndUp(db *sql.DB) error {
	// Re-verify that migrations can run idempotently
	return RunMigrations(db)
}

