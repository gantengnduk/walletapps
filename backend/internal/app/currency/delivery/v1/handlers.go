package v1

import (
	"github.com/labstack/echo/v4"
	"walletapps/backend/internal/app/currency"
	"walletapps/backend/internal/app/currency/dtos"
	"walletapps/backend/pkg/response"
)

type CurrencyHandler struct {
	usecase currency.CurrencyUsecase
}

func NewCurrencyHandler(u currency.CurrencyUsecase) *CurrencyHandler {
	return &CurrencyHandler{usecase: u}
}

func (h *CurrencyHandler) GetCurrencies(c echo.Context) error {
	ctx := c.Request().Context()
	currencies, err := h.usecase.GetCurrencies(ctx)
	if err != nil {
		return err
	}
	return response.SuccessBuilder(currencies).Send(c)
}

func (h *CurrencyHandler) PreviewRate(c echo.Context) error {
	ctx := c.Request().Context()
	var req dtos.RatePreviewRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	preview, err := h.usecase.PreviewRate(ctx, req)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(preview).Send(c)
}

func (h *CurrencyHandler) GetMarketRates(c echo.Context) error {
	ctx := c.Request().Context()
	rates, err := h.usecase.GetMarketRates(ctx)
	if err != nil {
		return err
	}
	return response.SuccessBuilder(rates).Send(c)
}

