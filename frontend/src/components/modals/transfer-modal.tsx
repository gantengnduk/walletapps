import React, { useState } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { useTransfer } from "../../hooks/use-transactions";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router";

export type TransferModalProps = {
  sourceWallet: Wallet | null;
  wallets: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const TransferModal: React.FC<TransferModalProps> = ({
  sourceWallet,
  wallets,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const transferMutation = useTransfer();

  // Filter available target wallets to same currency and different ID
  const eligibleTargets = wallets.filter(
    (w) => sourceWallet && w.currency === sourceWallet.currency && w.id !== sourceWallet.id,
  );

  // Default target selection
  const effectiveTargetId =
    targetWalletId && eligibleTargets.some((w) => w.id === targetWalletId)
      ? targetWalletId
      : eligibleTargets[0]?.id || "";

  const handleClose = () => {
    setTargetWalletId("");
    setAmount("");
    setDescription("");
    setFormError(null);
    onClose();
  };

  const handleSetMax = () => {
    if (sourceWallet) {
      setAmount(sourceWallet.balance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWallet) return;
    setFormError(null);

    if (!effectiveTargetId) {
      setFormError("Please select a destination wallet.");
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid transfer amount greater than 0.");
      return;
    }

    try {
      await transferMutation.mutateAsync({
        source_wallet_id: sourceWallet.id,
        target_wallet_id: effectiveTargetId,
        amount: amount.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to process transfer. Please try again.");
      }
    }
  };

  if (!sourceWallet) return null;

  const currentBalance = parseFloat(sourceWallet.balance) || 0;
  const transferAmount = parseFloat(amount) || 0;
  const isExceedingBalance = transferAmount > currentBalance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Funds"
      description={`Transfer ${sourceWallet.currency} between your accounts without currency conversion.`}
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="transfer-form"
            isLoading={transferMutation.isPending}
            disabled={eligibleTargets.length === 0}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            Transfer Funds
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Transfer Failed</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* Source Account Info */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Source Account</div>
            <div className="text-sm font-semibold text-slate-800">{sourceWallet.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Available Balance</div>
            <div className="text-sm font-bold text-slate-900">
              {sourceWallet.balance} {sourceWallet.currency}
            </div>
          </div>
        </div>

        {/* Destination Account Selection */}
        {eligibleTargets.length > 0 ? (
          <Select
            label="Destination Account"
            value={effectiveTargetId}
            onChange={(e) => setTargetWalletId(e.target.value)}
            required
          >
            {eligibleTargets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} (Balance: {w.balance} {w.currency})
              </option>
            ))}
          </Select>
        ) : (
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-4 text-xs text-indigo-900 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                You don't have another <strong>{sourceWallet.currency}</strong> wallet to transfer funds into.
              </span>
            </div>
            <p className="text-slate-600 pl-6">
              Create another {sourceWallet.currency} wallet first, or visit the{" "}
              <Link
                to="/convert"
                onClick={onClose}
                className="font-semibold text-indigo-700 underline hover:text-indigo-800"
              >
                Currency Convert Desk
              </Link>{" "}
              to exchange into a different currency.
            </p>
          </div>
        )}

        {/* Amount Field */}
        <div>
          <Field
            label="Transfer Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={eligibleTargets.length === 0}
            suffix={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  MAX
                </button>
                <span className="font-semibold text-slate-600">{sourceWallet.currency}</span>
              </div>
            }
            required
          />

          {isExceedingBalance && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Amount exceeds current balance ({sourceWallet.balance} {sourceWallet.currency}).
                Submitting will be rejected by the server and logged as a <strong>FAILED</strong> transaction.
              </span>
            </div>
          )}
        </div>

        <Field
          label="Description (Optional)"
          placeholder="e.g. Allocation to savings, Rebalance"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={eligibleTargets.length === 0}
        />
      </form>
    </Modal>
  );
};

