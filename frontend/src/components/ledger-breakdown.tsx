import React from "react";
import type { LedgerEntryDetail } from "../api/transactions";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export type LedgerBreakdownProps = {
  entries: LedgerEntryDetail[] | null | undefined;
};

function formatAmount(amountStr: string): string {
  const num = parseFloat(amountStr);
  if (isNaN(num)) return amountStr;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export const LedgerBreakdown: React.FC<LedgerBreakdownProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
        No ledger postings for this transaction. (Failed or non-posting event).
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2.5 px-3">Entry Type</th>
              <th className="py-2.5 px-3">Account</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-right">Balance After</th>
              <th className="py-2.5 px-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {entries.map((entry) => {
              const isCredit = entry.entry_type === "CREDIT";

              return (
                <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Entry Type Badge */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider font-sans ${
                        isCredit
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-rose-600" />
                      )}
                      {entry.entry_type}
                    </span>
                  </td>

                  {/* Account Name */}
                  <td className="py-3 px-3 font-sans">
                    <div className="font-medium text-slate-900">
                      {entry.wallet_name || `Wallet (${entry.wallet_id.slice(0, 8)}...)`}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {entry.wallet_id.slice(0, 13)}...
                    </div>
                  </td>

                  {/* Amount */}
                  <td
                    className={`py-3 px-3 text-right font-semibold text-sm ${
                      isCredit ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isCredit ? "+" : "-"}
                    {formatAmount(entry.amount)} {entry.currency}
                  </td>

                  {/* Running Balance After */}
                  <td className="py-3 px-3 text-right text-slate-700 font-medium">
                    {formatAmount(entry.balance_after)} {entry.currency}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-3 text-right text-slate-400 font-sans text-[11px]">
                    {formatDate(entry.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

