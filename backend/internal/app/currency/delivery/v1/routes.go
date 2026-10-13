package v1

import (
	"github.com/labstack/echo/v4"
)

func (h *CurrencyHandler) MapRoutes(group *echo.Group) {
	group.GET("/currencies", h.GetCurrencies)
	group.GET("/rates/preview", h.PreviewRate)
	group.GET("/rates/market", h.GetMarketRates)
}

