import React, { useState } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Button } from "../button";
import { useDeposit } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { ArrowDownLeft } from "lucide-react";

export type DepositModalProps = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const DepositModal: React.FC<DepositModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const depositMutation = useDeposit();

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setFormError(null);
    onClose();
  };

  const handleQuickAdd = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    const next = (current + addValue).toFixed(2);
    setAmount(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setFormError(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid deposit amount greater than 0.");
      return;
    }

    try {
      await depositMutation.mutateAsync({
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
        setFormError("Failed to process deposit. Please try again.");
      }
    }
  };

  if (!wallet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Deposit Simulated Funds"
      description={`Add funds to ${wallet.name} (${wallet.currency}). Funds are credited immediately with double-entry ledger bookkeeping.`}
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="deposit-form"
            isLoading={depositMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
            leftIcon={<ArrowDownLeft className="h-4 w-4" />}
          >
            Deposit {amount ? `${amount} ${wallet.currency}` : "Funds"}
          </Button>
        </>
      }
    >
      <form id="deposit-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {formError}
          </div>
        )}

        {/* Selected Wallet Card Preview */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Target Account</div>
            <div className="text-sm font-semibold text-slate-800">{wallet.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Current Balance</div>
            <div className="text-sm font-bold text-slate-900">
              {wallet.balance} {wallet.currency}
            </div>
          </div>
        </div>

        {/* Amount Field */}
        <div>
          <Field
            label="Deposit Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            suffix={<span className="font-semibold text-slate-600">{wallet.currency}</span>}
            autoFocus
            required
          />

          {/* Quick Amount Chips */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1">Quick add:</span>
            {[100, 500, 1000, 5000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleQuickAdd(v)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
              >
                +{v}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Description (Optional)"
          placeholder="e.g. Monthly salary, Initial funding, Top-up"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </Modal>
  );
};

