package wallet

import (
	"context"

	"walletapps/backend/internal/app/wallet/dtos"
)

type WalletUsecase interface {
	CreateWallet(ctx context.Context, req dtos.CreateWalletRequest) (*dtos.WalletResponse, error)
	GetWallet(ctx context.Context, id string) (*dtos.WalletDetailResponse, error)
	ListWallets(ctx context.Context) ([]dtos.WalletResponse, error)
	UpdateWallet(ctx context.Context, id string, req dtos.UpdateWalletRequest) (*dtos.WalletResponse, error)
	Deposit(ctx context.Context, walletID string, req dtos.DepositRequest) (*dtos.DepositResponse, error)
	Withdraw(ctx context.Context, walletID string, req dtos.WithdrawRequest) (*dtos.WithdrawResponse, error)
}

