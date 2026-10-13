import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance configured for caching financial data with
 * predictable invalidation and low-churn refetching.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Query family identifiers for deterministic key management and invalidation.
 */
export const FAMILY = {
  wallets: "wallets",
  wallet: "wallet",
  transactions: "transactions",
  transaction: "transaction",
  currencies: "currencies",
  ratePreview: "ratePreview",
} as const;

/**
 * Strongly typed query key factory used consistently across hooks and mutations.
 */
export const keys = {
  wallets: () => [FAMILY.wallets] as const,
  wallet: (id: string) => [FAMILY.wallet, id] as const,
  transactions: (filter?: Record<string, unknown>) => [FAMILY.transactions, filter ?? {}] as const,
  transaction: (id: string) => [FAMILY.transaction, id] as const,
  currencies: () => [FAMILY.currencies] as const,
  ratePreview: (from: string, to: string, amount: string) =>
    [FAMILY.ratePreview, from, to, amount] as const,
};

