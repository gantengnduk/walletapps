import React from "react";
import type { Wallet } from "../api/wallets";
import { ChevronRight } from "lucide-react";
import { CategoryIcon, normalizeCategory } from "./wallet-category";

export type WalletCardProps = {
  wallet: Wallet;
  showBalance?: boolean;
  onClick?: (wallet: Wallet) => void;
};

function formatCurrencyBalance(amountStr: string): string {
  const num = parseFloat(amountStr);
  if (isNaN(num)) return amountStr;

  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return amountStr;
  }
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  showBalance = true,
  onClick,
}) => {
  const category = normalizeCategory(wallet.category);

  return (
    <div
      onClick={() => onClick?.(wallet)}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs transition-all duration-100 hover:border-blue-400 hover:shadow-md active:scale-[0.98] cursor-pointer select-none min-h-[110px]"
    >
      {/* Top Row: Category Icon, Category Badge, and Currency Code Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <CategoryIcon category={category} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center rounded-full bg-slate-100 border border-blue-200 px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wider">
            {category}
          </span>
          <ChevronRight className="hidden sm:block h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Middle: Account Name */}
      <div className="mt-2 sm:mt-2.5 truncate">
        <h3
          className="font-semibold text-slate-900 truncate text-xs sm:text-sm leading-tight group-hover:text-blue-700 transition-colors"
          title={wallet.name}
        >
          {wallet.name}
        </h3>
      </div>

      {/* Bottom: Available Balance */}
      <div className="mt-2 sm:mt-3">
        <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Available Balance
        </span>
        <div className="mt-0.5 flex items-baseline gap-1 sm:gap-1.5 truncate">
          {showBalance ? (
            <>
              <span className="text-sm sm:text-lg lg:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                {formatCurrencyBalance(wallet.balance)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 shrink-0">
                {wallet.currency}
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-lg font-extrabold tracking-widest text-slate-400">
              ••••••••
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
