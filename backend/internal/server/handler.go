package server

import (
	"net/http"

	"github.com/labstack/echo/v4"
	currencyDelivery "walletapps/backend/internal/app/currency/delivery/v1"
	currencyUsecase "walletapps/backend/internal/app/currency/usecase"
	transactionDelivery "walletapps/backend/internal/app/transaction/delivery/v1"
	transactionRepository "walletapps/backend/internal/app/transaction/repository"
	transactionUsecase "walletapps/backend/internal/app/transaction/usecase"
	walletDelivery "walletapps/backend/internal/app/wallet/delivery/v1"
	walletRepository "walletapps/backend/internal/app/wallet/repository"
	walletUsecase "walletapps/backend/internal/app/wallet/usecase"
)

type routeMapper interface {
	MapRoutes(group *echo.Group)
}

func (s *Server) mapHandlers() error {
	v1 := s.echo.Group("/api/v1")

	// Base health check
	v1.GET("/ping", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"message": "wallet API is healthy",
		})
	})

	// Currency domain initialization
	currencyUC := currencyUsecase.NewCurrencyUsecase(s.frankfurterClient)
	currencyH := currencyDelivery.NewCurrencyHandler(currencyUC)

	// Wallet domain initialization
	walletRepo := walletRepository.NewWalletRepository(s.db)
	walletUC := walletUsecase.NewWalletUsecase(walletRepo, s.frankfurterClient)
	walletH := walletDelivery.NewWalletHandler(walletUC)

	// Transaction domain initialization
	transactionRepo := transactionRepository.NewTransactionRepository(s.db)
	transactionUC := transactionUsecase.NewTransactionUsecase(transactionRepo, s.frankfurterClient)
	transactionH := transactionDelivery.NewTransactionHandler(transactionUC)

	handlers := []routeMapper{
		currencyH,
		walletH,
		transactionH,
	}

	for _, h := range handlers {
		h.MapRoutes(v1)
	}

	return nil
}

