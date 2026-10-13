import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Button } from "../button";
import { useWallet } from "../../hooks/use-wallets";
import type { Wallet, LedgerEntry } from "../../api/wallets";
import { CategoryIcon, normalizeCategory } from "../wallet-category";
import { EditWalletModal } from "./edit-wallet-modal";
import {
  PlusCircle,
  ArrowUpFromLine,
  Send,
  ArrowLeftRight,
  Copy,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";

export type WalletDetailModalProps = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (wallet: Wallet) => void;
  onWithdraw: (wallet: Wallet) => void;
  onTransfer: (wallet: Wallet) => void;
  onConvert: (wallet: Wallet) => void;
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
    });
  } catch {
    return dateStr;
  }
}

export const WalletDetailModal: React.FC<WalletDetailModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onDeposit,
  onWithdraw,
  onTransfer,
  onConvert,
}) => {
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(wallet);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: detailData, isLoading } = useWallet(wallet?.id ?? "");

  useEffect(() => {
    setCurrentWallet(wallet);
  }, [wallet]);

  useEffect(() => {
    if (detailData?.wallet) {
      setCurrentWallet(detailData.wallet);
    }
  }, [detailData?.wallet]);

  const activeWallet = currentWallet ?? wallet;

  const handleCopyAccountNumber = () => {
    const accNum = activeWallet?.account_number || activeWallet?.id;
    if (accNum) {
      navigator.clipboard.writeText(accNum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!activeWallet) return null;

  const entries = detailData?.recent_ledger_entries ?? [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[260px] sm:max-w-md">{activeWallet.name}</span>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200/80 active:scale-95"
              title="Edit account name & category"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
        }
        size="lg"
        bodyClassName="pt-2.5 sm:pt-3 pb-5"
        footer={
          <Button variant="secondary" onClick={onClose} type="button">
            Close
          </Button>
        }
      >
      <div className="space-y-4 sm:space-y-5">
        {/* Balance Card Banner */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Balance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatAmount(activeWallet.balance)}
              </span>
              <span className="text-base font-bold text-slate-600">{activeWallet.currency}</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">
                Acc No: {activeWallet.account_number || activeWallet.id}
              </span>
              <button
                type="button"
                onClick={handleCopyAccountNumber}
                className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Copy account number"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold">
              <CategoryIcon category={activeWallet.category} className="h-3.5 w-3.5 text-slate-500" />
              {normalizeCategory(activeWallet.category)}
            </span>
            <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-bold tracking-wider">
              {activeWallet.currency}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons for This Wallet */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Account Actions
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onDeposit(activeWallet);
              }}
              className="text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200"
              leftIcon={<PlusCircle className="h-3.5 w-3.5 text-emerald-600" />}
            >
              Deposit
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onWithdraw(activeWallet);
              }}
              className="text-slate-700 hover:bg-slate-100"
              leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" />}
            >
              Withdraw
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onConvert(activeWallet);
              }}
              className="text-blue-700 hover:bg-blue-50 hover:border-blue-200"
              leftIcon={<ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />}
            >
              Convert
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                onTransfer(activeWallet);
              }}
              className="text-slate-700 hover:bg-slate-100"
              leftIcon={<Send className="h-3.5 w-3.5 text-slate-600" />}
            >
              Transfer
            </Button>
          </div>
        </div>

        {/* Recent Ledger Entries for This Wallet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Account Activity
            </span>
            <span className="text-[11px] text-slate-400">
              Double-entry postings
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No ledger activity recorded yet for this wallet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Entry</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance After</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {entries.map((entry: LedgerEntry) => {
                      const isCredit = entry.entry_type === "CREDIT";
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                isCredit
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {entry.entry_type}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              isCredit ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatAmount(entry.amount)} {entry.currency}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {formatAmount(entry.balance_after)} {entry.currency}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans text-slate-400 text-[11px]">
                            {formatDate(entry.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>

    <EditWalletModal
      wallet={activeWallet}
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      onSuccess={(updated) => {
        setCurrentWallet(updated);
      }}
    />
  </>
  );
};
