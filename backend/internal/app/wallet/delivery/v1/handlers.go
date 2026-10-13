package v1

import (
	"github.com/labstack/echo/v4"
	"walletapps/backend/internal/app/wallet"
	"walletapps/backend/internal/app/wallet/dtos"
	"walletapps/backend/pkg/response"
)

type WalletHandler struct {
	usecase wallet.WalletUsecase
}

func NewWalletHandler(u wallet.WalletUsecase) *WalletHandler {
	return &WalletHandler{usecase: u}
}

func (h *WalletHandler) CreateWallet(c echo.Context) error {
	ctx := c.Request().Context()
	var req dtos.CreateWalletRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	result, err := h.usecase.CreateWallet(ctx, req)
	if err != nil {
		return err
	}

	return response.SuccessCreatedBuilder(result).Send(c)
}

func (h *WalletHandler) GetWallet(c echo.Context) error {
	ctx := c.Request().Context()
	id := c.Param("id")

	result, err := h.usecase.GetWallet(ctx, id)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h *WalletHandler) ListWallets(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.usecase.ListWallets(ctx)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h *WalletHandler) Deposit(c echo.Context) error {
	ctx := c.Request().Context()
	id := c.Param("id")

	var req dtos.DepositRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	result, err := h.usecase.Deposit(ctx, id, req)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h *WalletHandler) Withdraw(c echo.Context) error {
	ctx := c.Request().Context()
	id := c.Param("id")

	var req dtos.WithdrawRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	result, err := h.usecase.Withdraw(ctx, id, req)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

