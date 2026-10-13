package server

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	"walletapps/backend/config"
	"walletapps/backend/internal/integrations/frankfurter"
	app_echo "walletapps/backend/pkg/echo"
)

type Server struct {
	db                *sql.DB
	echo              *echo.Echo
	cfg               config.Config
	frankfurterClient frankfurter.FrankfurterClient
}

func NewServer(ctx context.Context, cfg config.Config, db *sql.DB) *Server {
	frankfurterClient := frankfurter.NewClient(cfg.External.FrankfurterBaseURL, 10*time.Second)
	echoServer := app_echo.NewEchoServer(cfg)

	return &Server{
		db:                db,
		echo:              echoServer,
		cfg:               cfg,
		frankfurterClient: frankfurterClient,
	}
}

func (s *Server) Run() error {
	if err := s.mapHandlers(); err != nil {
		return fmt.Errorf("failed to map handlers: %w", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-quit
		log.Println("Server is shutting down...")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if s.db != nil {
			_ = s.db.Close()
		}
		_ = s.echo.Shutdown(ctx)
	}()

	addr := fmt.Sprintf(":%s", s.cfg.Server.Port)
	log.Printf("Server listening on http://localhost%s\n", addr)
	return s.echo.Start(addr)
}

// Echo returns the underlying echo instance (useful for testing)
func (s *Server) Echo() *echo.Echo {
	return s.echo
}

