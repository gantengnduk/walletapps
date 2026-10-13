package v1

import (
	"github.com/labstack/echo/v4"
)

func (h *WalletHandler) MapRoutes(group *echo.Group) {
	group.POST("/wallets", h.CreateWallet)
	group.GET("/wallets", h.ListWallets)
	group.GET("/wallets/:id", h.GetWallet)
	group.POST("/wallets/:id/deposit", h.Deposit)
	group.POST("/wallets/:id/withdraw", h.Withdraw)
}

