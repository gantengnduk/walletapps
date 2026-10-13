import { request } from "./client";

export type CurrencyItem = {
  code: string;
  name: string;
};

export type RatePreviewResponse = {
  from: string;
  to: string;
  rate: string;
  source_amount: string;
  target_amount: string;
};

export async function fetchCurrencies(): Promise<CurrencyItem[]> {
  return request<CurrencyItem[]>("/api/v1/currencies");
}

export async function fetchRatePreview(
  from: string,
  to: string,
  amount: string,
): Promise<RatePreviewResponse> {
  const params = new URLSearchParams({ from, to });
  if (amount.trim() !== "") {
    params.set("amount", amount.trim());
  }
  return request<RatePreviewResponse>(`/api/v1/rates/preview?${params.toString()}`);
}

export type MarketRateItem = {
  pair: string;
  from: string;
  to: string;
  rate: string;
  inverse_rate: string;
};

export type MarketRatesResponse = {
  date: string;
  provider: string;
  pairs: MarketRateItem[];
};

export async function fetchMarketRates(): Promise<MarketRatesResponse> {
  return request<MarketRatesResponse>("/api/v1/rates/market");
}

