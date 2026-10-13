import React, { useState } from "react";
import { Modal } from "../modal";
import { Button } from "../button";
import { useTransaction } from "../../hooks/use-transactions";
import { LedgerBreakdown } from "../ledger-breakdown";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  TrendingUp,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export type TransactionDetailModalProps = {
  transactionId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

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
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return dateStr;
  }
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transactionId,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError, error } = useTransaction(transactionId ?? "");

  const handleCopyId = () => {
    if (transactionId) {
      navigator.clipboard.writeText(transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!transactionId) return null;

  const tx = data?.transaction;
  const isCompleted = tx?.status === "COMPLETED";

  // Compute inverse rate if exchange rate is available
  let inverseRate: string | null = null;
  if (tx?.exchange_rate) {
    const rateNum = parseFloat(tx.exchange_rate);
    if (!isNaN(rateNum) && rateNum > 0) {
      inverseRate = (1 / rateNum).toFixed(6);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Audit & Ledger Inspection"
      description="Inspect double-entry journal postings and transaction audit trail."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose} type="button">
          Close Inspector
        </Button>
      }
    >
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <span className="text-xs">Loading ledger entries from database...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700">
          Failed to load transaction details: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {tx && (
        <div className="space-y-6">
          {/* Top Status & ID Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  )}
                  {tx.status}
                </span>

                <span className="inline-flex items-center rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {tx.type}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 break-all select-all">
                  {tx.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Copy transaction ID"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500">
              <span className="block font-medium text-slate-700">Timestamp</span>
              <span>{formatDate(tx.created_at)}</span>
            </div>
          </div>

          {/* Failed Transaction Banner */}
          {!isCompleted && tx.failure_reason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-800 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Audit Alert: Transaction Rejected</p>
                <p className="mt-1">
                  <strong>Reason:</strong> {tx.failure_reason}
                </p>
                <p className="mt-1.5 text-red-700 leading-relaxed">
                  Per the double-entry accounting policy, no ledger entries were committed. Account balances remain unchanged.
                </p>
              </div>
            </div>
          )}

          {/* Flow / Conversion Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Source Account
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tx.source_wallet_name || tx.source_wallet_id || "External Deposit"}
              </p>
              {tx.source_amount && (
                <p className="mt-0.5 text-xs font-mono font-medium text-slate-600">
                  {formatAmount(tx.source_amount, tx.source_currency)}
                </p>
              )}
            </div>

            {(tx.target_wallet_id || tx.target_wallet_name || tx.target_amount) && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Target Account
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {tx.target_wallet_name || tx.target_wallet_id || "External Withdrawal"}
                </p>
                {tx.target_amount && (
                  <p className="mt-0.5 text-xs font-mono font-medium text-emerald-700 font-semibold">
                    {formatAmount(tx.target_amount, tx.target_currency)}
                  </p>
                )}
              </div>
            )}

            {/* Exchange Rate Box if Convert */}
            {tx.exchange_rate && (
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  Applied Frankfurter Rate:
                </span>
                <div className="text-right font-mono font-medium text-slate-900">
                  <span>
                    1 {tx.source_currency} = {tx.exchange_rate} {tx.target_currency}
                  </span>
                  {inverseRate && (
                    <span className="block text-[11px] text-slate-400">
                      (1 {tx.target_currency} = {inverseRate} {tx.source_currency})
                    </span>
                  )}
                </div>
              </div>
            )}

            {tx.description && (
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong>Memo:</strong> {tx.description}
                </span>
              </div>
            )}
          </div>

          {/* Double-Entry Ledger Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Double-Entry Ledger Postings ({data?.ledger_entries?.length ?? 0})
              </h4>
              <span className="text-[11px] text-slate-400">
                Debit / Credit journal entries
              </span>
            </div>

            <LedgerBreakdown entries={data?.ledger_entries} />
          </div>
        </div>
      )}
    </Modal>
  );
};
