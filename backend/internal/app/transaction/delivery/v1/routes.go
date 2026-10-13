package v1

import (
	"github.com/labstack/echo/v4"
)

func (h *TransactionHandler) MapRoutes(group *echo.Group) {
	group.POST("/transfers", h.Transfer)
	group.POST("/conversions", h.Convert)
	group.GET("/transactions", h.ListTransactions)
	group.GET("/transactions/:id", h.GetTransactionByID)
}

