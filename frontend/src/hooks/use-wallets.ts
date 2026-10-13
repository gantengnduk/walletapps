import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWallet,
  depositFunds,
  fetchWallet,
  fetchWallets,
  withdrawFunds,
  type CreateWalletInput,
  type DepositInput,
  type WithdrawInput,
} from "../api/wallets";
import { keys } from "../query";

export function useWallets() {
  return useQuery({
    queryKey: keys.wallets(),
    queryFn: fetchWallets,
  });
}

export function useWallet(id: string) {
  return useQuery({
    queryKey: keys.wallet(id),
    queryFn: () => fetchWallet(id),
    enabled: Boolean(id),
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWalletInput) => createWallet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.wallets() });
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletID, data }: { walletID: string; data: DepositInput }) =>
      depositFunds(walletID, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.wallets() });
      queryClient.invalidateQueries({ queryKey: keys.wallet(variables.walletID) });
      queryClient.invalidateQueries({ queryKey: keys.transactions() });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletID, data }: { walletID: string; data: WithdrawInput }) =>
      withdrawFunds(walletID, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.wallets() });
      queryClient.invalidateQueries({ queryKey: keys.wallet(variables.walletID) });
      queryClient.invalidateQueries({ queryKey: keys.transactions() });
    },
  });
}

