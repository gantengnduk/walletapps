import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  convertFunds,
  fetchTransaction,
  fetchTransactions,
  transferFunds,
  type ConvertInput,
  type TransactionFilter,
  type TransferInput,
} from "../api/transactions";
import { keys } from "../query";

export function useTransactions(filter?: TransactionFilter) {
  return useQuery({
    queryKey: keys.transactions(filter as Record<string, unknown> | undefined),
    queryFn: () => fetchTransactions(filter),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: keys.transaction(id),
    queryFn: () => fetchTransaction(id),
    enabled: Boolean(id),
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferInput) => transferFunds(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.wallets() });
      queryClient.invalidateQueries({ queryKey: keys.transactions() });
    },
  });
}

export function useConvert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertInput) => convertFunds(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.wallets() });
      queryClient.invalidateQueries({ queryKey: keys.transactions() });
    },
  });
}

