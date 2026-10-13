import React from "react";
import type { Wallet } from "../api/wallets";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Wallet as WalletIcon } from "lucide-react";
import { Button } from "./button";

export type WalletCardProps = {
  wallet: Wallet;
  onDeposit: (wallet: Wallet) => void;
  onWithdraw: (wallet: Wallet) => void;
  onTransfer: (wallet: Wallet) => void;
};

// Helper for formatting currencies nicely
function formatCurrencyBalance(amountStr: string, currency: string): string {
  const num = parseFloat(amountStr);
  if (isNaN(num)) return `${amountStr} ${currency}`;

  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  } catch {
    return `${amountStr} ${currency}`;
  }
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onDeposit,
  onWithdraw,
  onTransfer,
}) => {
  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
      <div>
        {/* Top Header: Name & Currency Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <WalletIcon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-slate-900 truncate text-base" title={wallet.name}>
              {wallet.name}
            </h3>
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tracking-wider text-slate-800">
            {wallet.currency}
          </span>
        </div>

        {/* Balance Display */}
        <div className="mt-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Available Balance
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {formatCurrencyBalance(wallet.balance, wallet.currency)}
            </span>
            <span className="text-sm font-semibold text-slate-500">
              {wallet.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
          onClick={() => onDeposit(wallet)}
          leftIcon={<ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />}
        >
          Deposit
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-slate-700 hover:bg-slate-100"
          onClick={() => onWithdraw(wallet)}
          leftIcon={<ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />}
        >
          Withdraw
        </Button>

        <Button
          variant="quiet"
          size="sm"
          className="flex-1 text-indigo-600 hover:bg-indigo-50"
          onClick={() => onTransfer(wallet)}
          leftIcon={<ArrowRight className="h-3.5 w-3.5 text-indigo-600" />}
        >
          Transfer
        </Button>
      </div>
    </div>
  );
};

