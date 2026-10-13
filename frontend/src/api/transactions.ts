import { request } from "./client";

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "CONVERT";
export type TransactionStatus = "COMPLETED" | "FAILED";

export type Transaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  failure_reason?: string;
  source_wallet_id?: string;
  source_wallet_name?: string;
  target_wallet_id?: string;
  target_wallet_name?: string;
  source_amount?: string;
  source_currency?: string;
  target_amount?: string;
  target_currency?: string;
  exchange_rate?: string;
  description?: string;
  created_at: string;
};

export type LedgerEntryDetail = {
  id: string;
  transaction_id: string;
  wallet_id: string;
  wallet_name?: string;
  entry_type: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
  balance_after: string;
  created_at: string;
};

export type TransactionDetail = {
  transaction: Transaction;
  ledger_entries: LedgerEntryDetail[];
};

export type TransactionListResponse = {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
};

export type TransferInput = {
  source_wallet_id: string;
  target_wallet_id: string;
  amount: string;
  description?: string;
};

export type TransferResponse = {
  transaction_id: string;
  source_wallet_id: string;
  target_wallet_id: string;
  amount: string;
  currency: string;
  source_new_balance: string;
  target_new_balance: string;
  status: string;
  created_at: string;
};

export type ConvertInput = {
  source_wallet_id: string;
  target_wallet_id: string;
  amount: string;
  description?: string;
};

export type ConvertResponse = {
  transaction_id: string;
  source_wallet_id: string;
  target_wallet_id: string;
  source_amount: string;
  source_currency: string;
  target_amount: string;
  target_currency: string;
  exchange_rate: string;
  source_new_balance: string;
  target_new_balance: string;
  status: string;
  created_at: string;
};

export type TransactionFilter = {
  wallet_id?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export async function fetchTransactions(
  filter: TransactionFilter = {},
): Promise<TransactionListResponse> {
  const params = new URLSearchParams();
  if (filter.wallet_id) params.set("wallet_id", filter.wallet_id);
  if (filter.type) params.set("type", filter.type);
  if (filter.status) params.set("status", filter.status);
  if (filter.limit !== undefined) params.set("limit", filter.limit.toString());
  if (filter.offset !== undefined) params.set("offset", filter.offset.toString());

  const queryStr = params.toString();
  const path = queryStr ? `/api/v1/transactions?${queryStr}` : "/api/v1/transactions";
  return request<TransactionListResponse>(path);
}

export async function fetchTransaction(id: string): Promise<TransactionDetail> {
  return request<TransactionDetail>(`/api/v1/transactions/${encodeURIComponent(id)}`);
}

export async function transferFunds(data: TransferInput): Promise<TransferResponse> {
  return request<TransferResponse>("/api/v1/transfers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function convertFunds(data: ConvertInput): Promise<ConvertResponse> {
  return request<ConvertResponse>("/api/v1/conversions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

