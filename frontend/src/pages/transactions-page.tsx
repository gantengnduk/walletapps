import React, { useState } from "react";
import { useTransactions } from "../hooks/use-transactions";
import { useWallets } from "../hooks/use-wallets";
import type { Transaction } from "../api/transactions";
import { PageHead } from "../components/page-head";
import { Select } from "../components/select";
import { Button } from "../components/button";
import { Skeleton } from "../components/skeleton";
import { TransactionDetailModal } from "../components/modals/transaction-detail-modal";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
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

  // Filters
  const [walletId, setWalletId] = useState("");
  const [txType, setTxType] = useState("");
  const [status, setStatus] = useState("");

  // Inspection modal
  const [inspectTxId, setInspectTxId] = useState<string | null>(null);

  // Active query
  const queryFilter = {
    wallet_id: walletId || undefined,
    type: txType || undefined,
    status: status || undefined,
  };

  const { data, isLoading, isError, error, refetch } = useTransactions(queryFilter);
  const transactions = data?.transactions ?? [];

  // Metrics
  const totalCount = data?.total ?? transactions.length;
  const completedCount = transactions.filter((t) => t.status === "COMPLETED").length;
  const failedCount = transactions.filter((t) => t.status === "FAILED").length;

  const handleResetFilters = () => {
    setWalletId("");
    setTxType("");
    setStatus("");
  };

  const hasActiveFilters = Boolean(walletId || txType || status);

  const renderTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "DEPOSIT":
        return <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />;
      case "WITHDRAWAL":
        return <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />;
      case "TRANSFER":
        return <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />;
      case "CONVERT":
        return <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="Audit & Compliance"
        title="Transaction Ledger History"
        subtitle="Complete immutable double-entry journal logs, transfer audits, and conversion statements."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Logs
          </Button>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Transactions
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
            Completed (Committed)
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{completedCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
            Failed (Audit Logged)
          </span>
          <div className="mt-1 text-2xl font-bold text-rose-700">{failedCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="h-4 w-4 text-indigo-600" />
            <span>Filter Transactions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 md:max-w-3xl">
            {/* Wallet Filter */}
            <Select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="">All Accounts</option>
              {wallets?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </Select>

            {/* Type Filter */}
            <Select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="">All Transaction Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
              <option value="CONVERT">Conversions</option>
            </Select>

            {/* Status Filter */}
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="quiet"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs shrink-0 self-end md:self-auto"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Error View */}
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-900">Failed to load transactions</h3>
          <p className="mt-1 text-xs text-rose-700">
            {error instanceof Error ? error.message : "Network error occurred."}
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && transactions.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-lg mx-auto my-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Transactions Found</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {hasActiveFilters
              ? "No transactions match your current filter settings. Try adjusting or clearing your filters."
              : "No transactions have been recorded yet. Make a deposit, transfer, or conversion to begin building your audit log."}
          </p>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && !isError && transactions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Account Flow</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {transactions.map((tx) => {
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
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-rose-600" />
                          )}
                          {tx.status}
                        </span>

                        {!isCompleted && tx.failure_reason && (
                          <span className="block text-[10px] text-rose-600 mt-0.5 truncate max-w-[120px] mx-auto font-sans">
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
                          className="group-hover:bg-indigo-50 group-hover:text-indigo-600"
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

      {/* Transaction Detail & Ledger Inspector Modal */}
      <TransactionDetailModal
        transactionId={inspectTxId}
        isOpen={Boolean(inspectTxId)}
        onClose={() => setInspectTxId(null)}
      />
    </div>
  );
};
