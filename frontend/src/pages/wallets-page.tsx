import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useWallets } from "../hooks/use-wallets";
import { useTransactions } from "../hooks/use-transactions";
import { usePortfolio } from "../hooks/use-portfolio";
import type { Wallet } from "../api/wallets";
import { Button } from "../components/button";
import { WalletCard } from "../components/wallet-card";
import { WalletCardSkeleton } from "../components/skeleton";
import { LiveRatesTicker } from "../components/live-rates-ticker";
import { CreateWalletModal } from "../components/modals/create-wallet-modal";
import { DepositModal } from "../components/modals/deposit-modal";
import { WithdrawModal } from "../components/modals/withdraw-modal";
import { TransferModal } from "../components/modals/transfer-modal";
import { ConvertModal } from "../components/modals/convert-modal";
import { WalletDetailModal } from "../components/modals/wallet-detail-modal";
import { TransactionDetailModal } from "../components/modals/transaction-detail-modal";
import {
  Plus,
  Wallet as WalletIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  PlusCircle,
  ArrowUpFromLine,
  Send,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

function getCurrencySymbol(currency?: string): string {
  if (!currency) return "$";
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "SGD":
      return "S$";
    case "AUD":
      return "A$";
    case "CAD":
      return "C$";
    case "CHF":
      return "CHF ";
    case "IDR":
      return "Rp";
    default:
      return `${currency} `;
  }
}

function formatAmount(amountStr?: string, currency?: string): string {
  if (!amountStr) return "—";
  const num = parseFloat(amountStr);
  const formatted = isNaN(num)
    ? amountStr
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export const WalletsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recentLimit, setRecentLimit] = useState(5);
  const { data: wallets, isLoading, isError, error, refetch } = useWallets();
  const { data: txData } = useTransactions({ limit: recentLimit });

  // Portfolio calculation hook
  const portfolio = usePortfolio(wallets);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedWalletDetail, setSelectedWalletDetail] = useState<Wallet | null>(null);
  const [depositWallet, setDepositWallet] = useState<Wallet | null>(null);
  const [withdrawWallet, setWithdrawWallet] = useState<Wallet | null>(null);
  const [transferWallet, setTransferWallet] = useState<Wallet | null>(null);
  const [inspectTxId, setInspectTxId] = useState<string | null>(null);

  // Handle URL query action (e.g. /convert redirect)
  useEffect(() => {
    if (searchParams.get("action") === "convert") {
      setIsConvertOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("action");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const recentTransactions = txData?.transactions ?? [];
  const totalWallets = wallets?.length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Wallet Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your multi-currency accounts.
        </p>
      </div>

      {/* Live Market Rates Ticker */}
      <LiveRatesTicker />

      {/* Portfolio Summary Card (Premium Deep Navy Hero Card) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#234c6f] bg-gradient-to-br from-[#1a3e5c] via-[#16344d] to-[#122b40] p-5 sm:p-7 shadow-md text-white">
        {/* Subtle decorative ambient glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-2xl" />

        <div className="relative flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Total Estimated Balance
          </span>

          {/* Reference Currency Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300 font-medium">Reference:</span>
            <select
              value={portfolio.referenceCurrency}
              onChange={(e) => portfolio.setReferenceCurrency(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer min-h-[32px] transition-colors"
            >
              {portfolio.availableCurrencies.map((c) => (
                <option key={c} value={c} className="text-slate-900 bg-white">
                  {c} Total
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Balance Number */}
        <div className="relative pt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 leading-none">
              {portfolio.showBalances ? (
                portfolio.isEstimateAvailable ? (
                  <>
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none inline-flex items-center">
                      {getCurrencySymbol(portfolio.referenceCurrency)}{portfolio.totalEstimatedValue ?? "0.00"}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-white/15 text-white font-bold text-xs px-2.5 py-1 border border-white/20 backdrop-blur-xs leading-none">
                      {portfolio.referenceCurrency}
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Estimate unavailable (live exchange rate provider offline)</span>
                  </div>
                )
              ) : (
                <span className="text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-400 leading-none inline-flex items-center">
                  ••••••••••
                </span>
              )}

              {/* Show/Hide eye button beside amount */}
              <button
                type="button"
                onClick={portfolio.toggleShowBalances}
                className="inline-flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer leading-none"
                title={portfolio.showBalances ? "Hide balance" : "Show balance"}
                aria-label={portfolio.showBalances ? "Hide balance" : "Show balance"}
              >
                {portfolio.showBalances ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Calculated across {portfolio.distinctCurrencies.length || 0} currencies at live mid-market rates
            </p>
          </div>

          <div className="text-xs text-slate-300 sm:text-right mt-2 sm:mt-0">
            <span className="font-semibold text-white block">
              {totalWallets} Active {totalWallets === 1 ? "Account" : "Accounts"}
            </span>
            <span className="text-[11px] text-slate-300">
              {portfolio.distinctCurrencies.join(", ") || "No currencies"}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Actions Bar (Horizontal on desktop, 2x2 grid on mobile) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setDepositWallet(wallets?.[0] || null)}
            className="flex-col sm:flex-row h-16 sm:h-auto min-h-[48px] text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200 border-slate-200 font-semibold"
            leftIcon={<PlusCircle className="h-5 w-5 text-emerald-600 shrink-0" />}
          >
            Deposit
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setWithdrawWallet(wallets?.[0] || null)}
            className="flex-col sm:flex-row h-16 sm:h-auto min-h-[48px] text-slate-800 hover:bg-slate-100 border-slate-200 font-semibold"
            leftIcon={<ArrowUpFromLine className="h-5 w-5 text-red-600 shrink-0" />}
          >
            Withdraw
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsConvertOpen(true)}
            className="flex-col sm:flex-row h-16 sm:h-auto min-h-[48px] text-blue-700 hover:bg-blue-50 hover:border-blue-200 border-slate-200 font-semibold"
            leftIcon={<ArrowLeftRight className="h-5 w-5 text-blue-600 shrink-0" />}
          >
            Convert
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setTransferWallet(wallets?.[0] || null)}
            className="flex-col sm:flex-row h-16 sm:h-auto min-h-[48px] text-slate-800 hover:bg-slate-100 border-slate-200 font-semibold"
            leftIcon={<Send className="h-5 w-5 text-blue-600 shrink-0" />}
          >
            Transfer
          </Button>
        </div>
      </div>

      {/* Wallets Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Wallet Accounts
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {totalWallets}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Tap a card to view account details
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <WalletCardSkeleton />
            <WalletCardSkeleton />
            <WalletCardSkeleton />
            <WalletCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center max-w-lg mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-red-900">Failed to load wallets</h3>
            <p className="mt-1 text-xs text-red-700">
              {error instanceof Error ? error.message : "Network error occurred."}
            </p>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && wallets && wallets.length === 0 && (
          <div className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <WalletIcon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Wallets Created Yet</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Create your first wallet in any supported currency to deposit simulated funds, exchange at live ECB rates, and transfer between accounts.
            </p>
            <div className="mt-5">
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="md"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Your First Wallet
              </Button>
            </div>
          </div>
        )}

        {/* Wallets Grid (2-column on mobile, 3-column on desktop) */}
        {!isLoading && !isError && wallets && wallets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                showBalance={portfolio.showBalances}
                onClick={(w) => setSelectedWalletDetail(w)}
              />
            ))}

            {/* Add New Wallet Card */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-3.5 sm:p-5 text-center transition-all duration-100 hover:border-blue-400 hover:bg-blue-50/30 active:scale-[0.98] cursor-pointer min-h-[110px]"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                Add New Wallet
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Recent Transactions
            </h2>
          </div>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors p-1"
          >
            <span>View all transactions</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No transactions recorded yet. Make a deposit to begin.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isCompleted = tx.status === "COMPLETED";

              return (
                <div
                  key={tx.id}
                  onClick={() => setInspectTxId(tx.id)}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2 sm:px-3 -mx-2 sm:-mx-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      {tx.type === "DEPOSIT" && <PlusCircle className="h-4 w-4 text-emerald-600" />}
                      {tx.type === "WITHDRAWAL" && <ArrowUpFromLine className="h-4 w-4 text-red-600" />}
                      {tx.type === "TRANSFER" && <Send className="h-4 w-4 text-blue-600" />}
                      {tx.type === "CONVERT" && <ArrowLeftRight className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {tx.type === "DEPOSIT" && (
                          <span>Deposit to {tx.target_wallet_name || "Account"}</span>
                        )}
                        {tx.type === "WITHDRAWAL" && (
                          <span>Withdrawal from {tx.source_wallet_name || "Account"}</span>
                        )}
                        {tx.type === "TRANSFER" && (
                          <span>
                            {tx.source_wallet_name} → {tx.target_wallet_name}
                          </span>
                        )}
                        {tx.type === "CONVERT" && (
                          <span>
                            Convert {tx.source_currency} → {tx.target_currency}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                      {tx.type === "CONVERT" ? (
                        <span>
                          {formatAmount(tx.source_amount, tx.source_currency)} →{" "}
                          <span className="text-emerald-700 font-semibold">
                            {formatAmount(tx.target_amount, tx.target_currency)}
                          </span>
                        </span>
                      ) : (
                        <span>
                          {formatAmount(
                            tx.source_amount || tx.target_amount,
                            tx.source_currency || tx.target_currency,
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-red-600" />
                        )}
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Recent Transactions Button */}
            {recentTransactions.length > 0 && (txData?.total ?? 0) > recentTransactions.length && (
              <div className="pt-3.5 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setRecentLimit((prev) => prev + 5)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Load more...
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modals */}
      <CreateWalletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <ConvertModal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        wallets={wallets ?? []}
      />

      <WalletDetailModal
        wallet={selectedWalletDetail}
        isOpen={Boolean(selectedWalletDetail)}
        onClose={() => setSelectedWalletDetail(null)}
        onDeposit={(w) => setDepositWallet(w)}
        onWithdraw={(w) => setWithdrawWallet(w)}
        onTransfer={(w) => setTransferWallet(w)}
        onConvert={() => {
          setSelectedWalletDetail(null);
          setIsConvertOpen(true);
        }}
      />

      <DepositModal
        wallet={depositWallet}
        wallets={wallets ?? []}
        isOpen={Boolean(depositWallet)}
        onClose={() => setDepositWallet(null)}
      />

      <WithdrawModal
        wallet={withdrawWallet}
        wallets={wallets ?? []}
        isOpen={Boolean(withdrawWallet)}
        onClose={() => setWithdrawWallet(null)}
      />

      <TransferModal
        sourceWallet={transferWallet}
        wallets={wallets ?? []}
        isOpen={Boolean(transferWallet)}
        onClose={() => setTransferWallet(null)}
      />

      <TransactionDetailModal
        transactionId={inspectTxId}
        isOpen={Boolean(inspectTxId)}
        onClose={() => setInspectTxId(null)}
      />
    </div>
  );
};
