import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import { useTransactions } from "../hooks/use-transactions";
import { useWallets } from "../hooks/use-wallets";
import type { Transaction } from "../api/transactions";
import { Button } from "../components/button";
import { Skeleton } from "../components/skeleton";
import { TransactionDetailModal } from "../components/modals/transaction-detail-modal";
import {
  PlusCircle,
  ArrowUpFromLine,
  Send,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  X,
} from "lucide-react";

function formatAmount(amountStr?: string, currency?: string): string {
  if (!amountStr) return "—";
  const num = parseFloat(amountStr);
  const formatted = isNaN(num)
    ? amountStr
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
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

export const TransactionsPage: React.FC = () => {
  const { data: wallets } = useWallets();

  // Filters & Pagination
  const [walletId, setWalletId] = useState("");
  const [txType, setTxType] = useState("");
  const [status, setStatus] = useState("");
  const [datePreset, setDatePreset] = useState<string>("ALL");
  const [txLimit, setTxLimit] = useState(10);

  // Inspection modal
  const [inspectTxId, setInspectTxId] = useState<string | null>(null);

  // Active query to backend
  const queryFilter = {
    wallet_id: walletId || undefined,
    type: txType || undefined,
    status: status || undefined,
    limit: txLimit,
  };

  const { data, isLoading, isError, error, refetch } = useTransactions(queryFilter);
  const rawTransactions = data?.transactions ?? [];
  const totalTxCount = data?.total ?? 0;

  // Client-side date filter filtering
  const filteredTransactions = useMemo(() => {
    if (datePreset === "ALL") return rawTransactions;

    const now = new Date();
    let threshold = new Date(0);

    if (datePreset === "TODAY") {
      threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (datePreset === "7D") {
      threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (datePreset === "30D") {
      threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return rawTransactions.filter((tx) => new Date(tx.created_at) >= threshold);
  }, [rawTransactions, datePreset]);

  const handleResetFilters = () => {
    setWalletId("");
    setTxType("");
    setStatus("");
    setDatePreset("ALL");
  };

  const hasActiveFilters = Boolean(walletId || txType || status || datePreset !== "ALL");

  const renderTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "DEPOSIT":
        return <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />;
      case "WITHDRAWAL":
        return <ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" />;
      case "TRANSFER":
        return <Send className="h-3.5 w-3.5 text-blue-600" />;
      case "CONVERT":
        return <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Transaction History
          </h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh logs"
            aria-label="Refresh logs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          History of all deposits, withdrawals, transfers, and conversions.
        </p>
      </div>

      {/* Streamlined Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* Account Selector */}
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Accounts</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.currency})
              </option>
            ))}
          </select>

          {/* Type Selector */}
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CONVERT">Convert</option>
          </select>

          {/* Status Selector */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Date Range Preset */}
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
          </select>

          {/* Clear Filters Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Record Counter */}
        <div className="text-xs text-slate-400 font-medium sm:text-right shrink-0">
          {filteredTransactions.length} {filteredTransactions.length === 1 ? "record" : "records"}
        </div>
      </div>

      {/* Error View */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 sm:p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-red-900">Failed to load transactions</h3>
          <p className="mt-1 text-xs text-red-700">
            {error instanceof Error ? error.message : "Network error occurred."}
          </p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTransactions.length === 0 && (
        <div className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Transactions Found</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {hasActiveFilters
              ? "No transactions match your current filter settings. Try adjusting or clearing your filters."
              : "No transactions have been recorded yet."}
          </p>
          {hasActiveFilters ? (
            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex justify-center">
              <Link to="/wallets">
                <Button size="sm" variant="primary">
                  Go to Dashboard & Transact
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Transactions: Desktop Table View (>= 768px) */}
      {!isLoading && !isError && filteredTransactions.length > 0 && (
        <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Account Flow</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredTransactions.map((tx) => {
                  const isCompleted = tx.status === "COMPLETED";

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setInspectTxId(tx.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {formatDate(tx.created_at)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tx.id.slice(0, 8)}...
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                          {renderTypeIcon(tx.type)}
                          {tx.type}
                        </span>
                      </td>

                      {/* Flow / Accounts */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {tx.type === "DEPOSIT" && (
                            <span>Simulated Funding → {tx.target_wallet_name || tx.source_wallet_name}</span>
                          )}
                          {tx.type === "WITHDRAWAL" && (
                            <span>{tx.source_wallet_name} → External Account</span>
                          )}
                          {tx.type === "TRANSFER" && (
                            <span>
                              {tx.source_wallet_name} → {tx.target_wallet_name}
                            </span>
                          )}
                          {tx.type === "CONVERT" && (
                            <span>
                              {tx.source_wallet_name} ({tx.source_currency}) → {tx.target_wallet_name} ({tx.target_currency})
                            </span>
                          )}
                        </div>
                        {tx.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {tx.description}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                        {tx.type === "CONVERT" ? (
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {formatAmount(tx.source_amount, tx.source_currency)}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-semibold block">
                              → {formatAmount(tx.target_amount, tx.target_currency)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">
                            {formatAmount(
                              tx.source_amount || tx.target_amount,
                              tx.source_currency || tx.target_currency,
                            )}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          {tx.status}
                        </span>

                        {!isCompleted && tx.failure_reason && (
                          <span className="block text-[10px] text-red-600 mt-0.5 truncate max-w-[120px] mx-auto font-sans">
                            {tx.failure_reason}
                          </span>
                        )}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectTxId(tx.id);
                          }}
                          className="group-hover:bg-blue-50 group-hover:text-blue-600"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions: Mobile Card Stack View (< 768px) */}
      {!isLoading && !isError && filteredTransactions.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredTransactions.map((tx) => {
            const isCompleted = tx.status === "COMPLETED";

            return (
              <div
                key={tx.id}
                onClick={() => setInspectTxId(tx.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs active:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                {/* Card Top: Type badge & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                    {renderTypeIcon(tx.type)}
                    {tx.type}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
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

                {/* Card Middle: Flow and Description */}
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
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

                  {tx.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {tx.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Amount, Date, and Inspect Chevron */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between">
                  <span className="text-[11px] text-slate-400">
                    {formatDate(tx.created_at)}
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="text-right font-mono">
                      {tx.type === "CONVERT" ? (
                        <div className="text-xs font-bold text-slate-900">
                          {formatAmount(tx.source_amount, tx.source_currency)} →{" "}
                          <span className="text-emerald-700">
                            {formatAmount(tx.target_amount, tx.target_currency)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-slate-900">
                          {formatAmount(
                            tx.source_amount || tx.target_amount,
                            tx.source_currency || tx.target_currency,
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {!isCompleted && tx.failure_reason && (
                  <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg font-sans">
                    <strong>Rejection reason:</strong> {tx.failure_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {filteredTransactions.length > 0 && totalTxCount > filteredTransactions.length && (
        <div className="pt-4 text-center">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setTxLimit((prev) => prev + 10)}
            className="min-h-[42px] px-6 text-blue-700 hover:bg-blue-50 hover:border-blue-200 font-semibold"
          >
            Load more...
          </Button>
        </div>
      )}
      {filteredTransactions.length > 0 && totalTxCount <= filteredTransactions.length && totalTxCount > 10 && (
        <p className="text-center text-xs text-slate-400 pt-3">
          All {totalTxCount} transactions loaded.
        </p>
      )}

      {/* Transaction Detail & Ledger Inspector Modal */}
      <TransactionDetailModal
        transactionId={inspectTxId}
        isOpen={Boolean(inspectTxId)}
        onClose={() => setInspectTxId(null)}
      />
    </div>
  );
};
