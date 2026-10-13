package v1

import (
	"strconv"

	"github.com/labstack/echo/v4"
	"walletapps/backend/internal/app/transaction"
	"walletapps/backend/internal/app/transaction/dtos"
	"walletapps/backend/pkg/response"
)

type TransactionHandler struct {
	usecase transaction.TransactionUsecase
}

func NewTransactionHandler(u transaction.TransactionUsecase) *TransactionHandler {
	return &TransactionHandler{usecase: u}
}

func (h *TransactionHandler) Transfer(c echo.Context) error {
	ctx := c.Request().Context()
	var req dtos.TransferRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	result, err := h.usecase.Transfer(ctx, req)
	if err != nil {
		return err
	}

	return response.SuccessCreatedBuilder(result).Send(c)
}

func (h *TransactionHandler) Convert(c echo.Context) error {
	ctx := c.Request().Context()
	var req dtos.ConvertRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	result, err := h.usecase.Convert(ctx, req)
	if err != nil {
		return err
	}

	return response.SuccessCreatedBuilder(result).Send(c)
}

func (h *TransactionHandler) ListTransactions(c echo.Context) error {
	ctx := c.Request().Context()
	query := dtos.TransactionQuery{
		WalletID: c.QueryParam("wallet_id"),
		Type:     c.QueryParam("type"),
		Status:   c.QueryParam("status"),
	}

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			query.Limit = limit
		}
	}
	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			query.Offset = offset
		}
	}

	result, err := h.usecase.ListTransactions(ctx, query)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h *TransactionHandler) GetTransactionByID(c echo.Context) error {
	ctx := c.Request().Context()
	id := c.Param("id")

	result, err := h.usecase.GetTransactionByID(ctx, id)
	if err != nil {
		return err
	}

	return response.SuccessBuilder(result).Send(c)
}

