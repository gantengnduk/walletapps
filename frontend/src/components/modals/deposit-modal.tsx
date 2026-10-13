import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { AmountField, formatAmountWithCommas } from "../amount-field";
import { useDeposit } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { PlusCircle } from "lucide-react";
import { useToast } from "../toast/toast-context";

export type DepositModalProps = {
  wallet?: Wallet | null;
  wallets?: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const DepositModal: React.FC<DepositModalProps> = ({
  wallet,
  wallets = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallet?.id || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const depositMutation = useDeposit();
  const { showToast } = useToast();

  // Sync selected wallet ID with prop or available wallets list
  useEffect(() => {
    if (wallet?.id) {
      setSelectedWalletId(wallet.id);
    } else if (wallets.length > 0 && (!selectedWalletId || !wallets.some((w) => w.id === selectedWalletId))) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallet, wallets, isOpen]);

  const activeWallet =
    wallets.find((w) => w.id === selectedWalletId) || wallet || wallets[0] || null;

  const handleClose = () => {
    setAmount("");
    setDescription("");
    setFormError(null);
    onClose();
  };

  const handleQuickAdd = (addValue: number) => {
    const current = parseFloat(amount.replace(/,/g, "")) || 0;
    const next = (current + addValue).toFixed(2);
    setAmount(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWallet) {
      setFormError("Please select a destination wallet.");
      return;
    }
    setFormError(null);

    const cleanAmount = amount.replace(/,/g, "").trim();
    const val = parseFloat(cleanAmount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid deposit amount greater than 0.");
      return;
    }

    try {
      await depositMutation.mutateAsync({
        walletID: activeWallet.id,
        data: {
          amount: cleanAmount,
          description: description.trim() || undefined,
        },
      });
      showToast({
        type: "success",
        title: "Deposit Successful",
        message: `Deposited ${formatAmountWithCommas(cleanAmount)} ${activeWallet.currency} into ${activeWallet.name}.`,
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Deposit Simulated Funds"
      description={
        activeWallet
          ? `Add funds to ${activeWallet.name} (${activeWallet.currency}). Funds are credited immediately with double-entry ledger bookkeeping.`
          : "Add funds to your wallet account."
      }
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
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Deposit {amount && activeWallet ? `${amount} ${activeWallet.currency}` : "Funds"}
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

        {/* Destination Account Selection */}
        {wallets.length > 1 ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Destination Account
            </label>
            <Select
              value={activeWallet?.id || ""}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="text-xs"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency}) — Balance: {w.balance} {w.currency}
                </option>
              ))}
            </Select>
          </div>
        ) : activeWallet ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Target Account</div>
              <div className="text-sm font-semibold text-slate-800">{activeWallet.name}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Current Balance</div>
              <div className="text-sm font-bold text-slate-900">
                {activeWallet.balance} {activeWallet.currency}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">No active wallets available.</div>
        )}

        {/* Amount Field */}
        <div>
          <AmountField
            label="Deposit Amount"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
            currency={activeWallet?.currency}
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

