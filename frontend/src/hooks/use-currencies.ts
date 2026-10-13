import { useQuery } from "@tanstack/react-query";
import { fetchCurrencies, fetchMarketRates, fetchRatePreview } from "../api/currencies";
import { keys } from "../query";

export function useCurrencies() {
  return useQuery({
    queryKey: keys.currencies(),
    queryFn: fetchCurrencies,
    staleTime: 60 * 60_000, // Currencies list rarely changes
  });
}

export function useRatePreview(from: string, to: string, amount: string, enabled = true) {
  const shouldFetch = enabled && from.trim() !== "" && to.trim() !== "" && from !== to;

  return useQuery({
    queryKey: keys.ratePreview(from, to, amount),
    queryFn: () => fetchRatePreview(from, to, amount),
    enabled: shouldFetch,
    staleTime: 10_000, // 10 seconds for conversion preview
  });
}

export function useMarketRates() {
  return useQuery({
    queryKey: keys.marketRates(),
    queryFn: fetchMarketRates,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

