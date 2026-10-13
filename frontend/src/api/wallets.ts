import { request } from "./client";

export type Wallet = {
  id: string;
  account_number?: string;
  name: string;
  currency: string;
  category: string;
  balance: string;
  created_at: string;
  updated_at: string;
};

export type LedgerEntry = {
  id: string;
  transaction_id: string;
  wallet_id: string;
  entry_type: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
  balance_after: string;
  created_at: string;
};

export type WalletDetail = {
  wallet: Wallet;
  recent_ledger_entries: LedgerEntry[];
};

export type CreateWalletInput = {
  name: string;
  currency: string;
  category?: string;
};

export type UpdateWalletInput = {
  name: string;
  category: string;
};

export type DepositInput = {
  amount: string;
  description?: string;
};

export type DepositResponse = {
  transaction_id: string;
  wallet_id: string;
  amount: string;
  currency: string;
  new_balance: string;
  status: string;
  created_at: string;
};

export type WithdrawInput = {
  amount: string;
  description?: string;
};

export type WithdrawResponse = {
  transaction_id: string;
  wallet_id: string;
  amount: string;
  currency: string;
  new_balance: string;
  status: string;
  created_at: string;
};

export async function fetchWallets(): Promise<Wallet[]> {
  return request<Wallet[]>("/api/v1/wallets");
}

export async function fetchWallet(id: string): Promise<WalletDetail> {
  return request<WalletDetail>(`/api/v1/wallets/${encodeURIComponent(id)}`);
}

export async function createWallet(data: CreateWalletInput): Promise<Wallet> {
  return request<Wallet>("/api/v1/wallets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function depositFunds(
  walletID: string,
  data: DepositInput,
): Promise<DepositResponse> {
  return request<DepositResponse>(`/api/v1/wallets/${encodeURIComponent(walletID)}/deposit`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function withdrawFunds(
  walletID: string,
  data: WithdrawInput,
): Promise<WithdrawResponse> {
  return request<WithdrawResponse>(`/api/v1/wallets/${encodeURIComponent(walletID)}/withdraw`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWallet(
  walletID: string,
  data: UpdateWalletInput,
): Promise<Wallet> {
  return request<Wallet>(`/api/v1/wallets/${encodeURIComponent(walletID)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

