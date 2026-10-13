import React, { useState } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Button } from "../button";
import { useWithdraw } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { ArrowUpRight, AlertTriangle } from "lucide-react";

export type WithdrawModalProps = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const withdrawMutation = useWithdraw();

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setFormError(null);
    onClose();
  };

  const currentBalance = wallet ? parseFloat(wallet.balance) || 0 : 0;
  const withdrawAmount = parseFloat(amount) || 0;
  const isExceedingBalance = withdrawAmount > currentBalance;

  const handleSetMax = () => {
    if (wallet) {
      setAmount(wallet.balance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setFormError(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid withdrawal amount greater than 0.");
      return;
    }

    try {
      await withdrawMutation.mutateAsync({
        walletID: wallet.id,
        data: {
          amount: amount.trim(),
          description: description.trim() || undefined,
        },
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to process withdrawal. Please try again.");
      }
    }
  };

  if (!wallet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Withdraw Funds"
      description={`Withdraw funds from ${wallet.name} (${wallet.currency}). Withdrawals are debited atomically.`}
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="withdraw-form"
            isLoading={withdrawMutation.isPending}
            variant={isExceedingBalance ? "danger" : "primary"}
            leftIcon={<ArrowUpRight className="h-4 w-4" />}
          >
            {isExceedingBalance ? "Submit (Test Audit Log)" : "Withdraw Funds"}
          </Button>
        </>
      }
    >
      <form id="withdraw-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Transaction Rejected</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* Selected Wallet Card Preview */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Source Account</div>
            <div className="text-sm font-semibold text-slate-800">{wallet.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Available Balance</div>
            <div className="text-sm font-bold text-slate-900">
              {wallet.balance} {wallet.currency}
            </div>
          </div>
        </div>

        {/* Amount Field */}
        <div>
          <Field
            label="Withdrawal Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            suffix={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  MAX
                </button>
                <span className="font-semibold text-slate-600">{wallet.currency}</span>
              </div>
            }
            autoFocus
            required
          />

          {isExceedingBalance && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Amount exceeds current balance ({wallet.balance} {wallet.currency}).
                Submitting will trigger a server rejection and log an audited <strong>FAILED</strong> transaction.
              </span>
            </div>
          )}
        </div>

        <Field
          label="Description (Optional)"
          placeholder="e.g. ATM withdrawal, External payment, Bill"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </Modal>
  );
};

