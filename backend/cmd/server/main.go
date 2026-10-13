package main

import (
	"context"
	"log"

	"walletapps/backend/config"
	"walletapps/backend/database"
	"walletapps/backend/internal/server"
)

func main() {
	cfg := config.LoadConfig()

	db, err := database.NewConnection(cfg.Database)
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.Close()

	srv := server.NewServer(context.Background(), cfg, db)
	if err := srv.Run(); err != nil {
		log.Printf("Server exited: %v", err)
	}
}

