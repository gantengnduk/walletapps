import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "../api/wallets";
import { fetchRatePreview } from "../api/currencies";

export type PortfolioSummary = {
  referenceCurrency: string;
  setReferenceCurrency: (currency: string) => void;
  showBalances: boolean;
  toggleShowBalances: () => void;
  totalEstimatedValue: string | null;
  isEstimateAvailable: boolean;
  isLoading: boolean;
  distinctCurrencies: string[];
  availableCurrencies: string[];
};

export const TOP_REFERENCE_CURRENCIES = ["USD", "SGD", "IDR"] as const;
export type ReferenceCurrency = (typeof TOP_REFERENCE_CURRENCIES)[number];

export function usePortfolio(wallets: Wallet[] | undefined): PortfolioSummary {
  // Persistence for privacy hide/show toggle
  const [showBalances, setShowBalances] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("coco_wallet_show_balances") ?? localStorage.getItem("nexus_wallet_show_balances");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleShowBalances = () => {
    setShowBalances((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("coco_wallet_show_balances", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Distinct currencies owned by user from active wallets
  const distinctCurrencies = Array.from(
    new Set(wallets?.map((w) => w.currency?.toUpperCase()).filter(Boolean) ?? []),
  ).sort();

  // Reference options are strictly based on user's active wallet currencies
  const availableCurrencies = distinctCurrencies.length > 0 ? distinctCurrencies : ["USD"];

  // Reference currency selection
  const [referenceCurrency, setReferenceCurrencyState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("coco_wallet_reference_currency");
      if (stored) {
        return stored;
      }
    } catch {
      // Ignore
    }
    return "USD";
  });

  // Ensure selected reference currency stays in sync with owned wallet currencies
  useEffect(() => {
    if (distinctCurrencies.length > 0 && !distinctCurrencies.includes(referenceCurrency)) {
      const fallback = distinctCurrencies[0];
      setReferenceCurrencyState(fallback);
      try {
        localStorage.setItem("coco_wallet_reference_currency", fallback);
      } catch {
        // Ignore
      }
    }
  }, [distinctCurrencies, referenceCurrency]);

  const setReferenceCurrency = (curr: string) => {
    setReferenceCurrencyState(curr);
    try {
      localStorage.setItem("coco_wallet_reference_currency", curr);
    } catch {
      // Ignore storage errors
    }
  };

  // Fetch conversion rates for foreign currencies to reference currency
  const foreignCurrencies = distinctCurrencies.filter((c) => c !== referenceCurrency);

  const {
    data: ratesMap,
    isLoading: ratesLoading,
    isError: ratesError,
  } = useQuery({
    queryKey: ["portfolio-rates", referenceCurrency, foreignCurrencies.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, number> = {};
      map[referenceCurrency] = 1.0;

      await Promise.all(
        foreignCurrencies.map(async (curr) => {
          try {
            const quote = await fetchRatePreview(curr, referenceCurrency, "1");
            const rate = parseFloat(quote.rate);
            if (!isNaN(rate) && rate > 0) {
              map[curr] = rate;
            }
          } catch {
            // Rate fetch failure handled below
          }
        }),
      );

      return map;
    },
    enabled: foreignCurrencies.length > 0,
    staleTime: 60_000, // 1 minute
  });

  // Calculate total
  let totalNum = 0;
  let hasMissingRate = false;

  if (wallets && wallets.length > 0) {
    for (const w of wallets) {
      const bal = parseFloat(w.balance);
      if (isNaN(bal)) continue;

      if (w.currency === referenceCurrency) {
        totalNum += bal;
      } else {
        const rate = ratesMap ? ratesMap[w.currency] : undefined;
        if (rate !== undefined) {
          totalNum += bal * rate;
        } else {
          hasMissingRate = true;
        }
      }
    }
  }

  const isEstimateAvailable =
    !ratesError && (!hasMissingRate || foreignCurrencies.length === 0);

  const formattedTotal = isEstimateAvailable
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(totalNum)
    : null;

  return {
    referenceCurrency,
    setReferenceCurrency,
    showBalances,
    toggleShowBalances,
    totalEstimatedValue: formattedTotal,
    isEstimateAvailable,
    isLoading: ratesLoading && foreignCurrencies.length > 0,
    distinctCurrencies,
    availableCurrencies,
  };
}

