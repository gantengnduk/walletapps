import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { AmountField, formatAmountWithCommas } from "../amount-field";
import { useWithdraw } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { ArrowUpFromLine, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "../toast/toast-context";

export type WithdrawModalProps = {
  wallet?: Wallet | null;
  wallets?: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
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
  const [step, setStep] = useState<"form" | "confirm">("form");

  const withdrawMutation = useWithdraw();
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
    setStep("form");
    onClose();
  };

  const currentBalance = activeWallet ? parseFloat(activeWallet.balance) || 0 : 0;
  const withdrawAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isExceedingBalance = withdrawAmount > currentBalance;
  const projectedBalance = Math.max(0, currentBalance - withdrawAmount).toFixed(2);

  const handleSetMax = () => {
    if (activeWallet) {
      setAmount(activeWallet.balance);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWallet) {
      setFormError("Please select a source wallet.");
      return;
    }
    setFormError(null);

    const cleanAmount = amount.replace(/,/g, "").trim();
    const val = parseFloat(cleanAmount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid withdrawal amount greater than 0.");
      return;
    }

    setStep("confirm");
  };

  const handleExecuteWithdrawal = async () => {
    if (!activeWallet) return;
    setFormError(null);

    const cleanAmount = amount.replace(/,/g, "").trim();
    try {
      await withdrawMutation.mutateAsync({
        walletID: activeWallet.id,
        data: {
          amount: cleanAmount,
          description: description.trim() || undefined,
        },
      });
      showToast({
        type: "success",
        title: "Withdrawal Completed",
        message: `Withdrew ${formatAmountWithCommas(cleanAmount)} ${activeWallet.currency} from ${activeWallet.name}.`,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to process withdrawal. Please try again.");
      }
      setStep("form");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "confirm" ? "Review Withdrawal" : "Withdraw Funds"}
      description={
        step === "confirm"
          ? "Please review the transaction details below before confirming execution."
          : activeWallet
          ? `Withdraw funds from ${activeWallet.name} (${activeWallet.currency}). Withdrawals are debited atomically.`
          : "Withdraw funds from your wallet account."
      }
      footer={
        step === "confirm" ? (
          <>
            <Button
              variant="secondary"
              onClick={() => setStep("form")}
              type="button"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              onClick={handleExecuteWithdrawal}
              isLoading={withdrawMutation.isPending}
              variant={isExceedingBalance ? "danger" : "primary"}
              leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
            >
              {isExceedingBalance ? "Confirm (Audit Rejection)" : "Confirm & Withdraw"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="quiet" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              form="withdraw-form"
              variant={isExceedingBalance ? "danger" : "primary"}
              leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
            >
              Review Withdrawal
            </Button>
          </>
        )
      }
    >
      {formError && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Transaction Notice</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {step === "confirm" ? (
        /* Step 2: Confirmation Sheet */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Source Account</span>
              <span className="font-bold text-slate-800">
                {activeWallet?.name} ({activeWallet?.currency})
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Current Balance</span>
              <span className="font-mono text-slate-700">
                {activeWallet?.balance} {activeWallet?.currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Withdrawal Amount</span>
              <span className="font-mono font-bold text-red-600">
                -{formatAmountWithCommas(amount)} {activeWallet?.currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 pt-2">
              <span className="text-slate-700 font-bold">Estimated Balance After</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                {projectedBalance} {activeWallet?.currency}
              </span>
            </div>
          </div>

          {description && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <strong className="text-slate-700">Note:</strong> {description}
            </div>
          )}

          {isExceedingBalance ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Amount exceeds current available balance. This withdrawal will be logged as an audited <strong>FAILED</strong> transaction without debiting your balance.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Simulated cash-out will be debited atomically with double-entry ledger bookkeeping.</span>
            </div>
          )}
        </div>
      ) : (
        /* Step 1: Input Form */
        <form id="withdraw-form" onSubmit={handleProceedToReview} className="space-y-4">
          {/* Source Account Selection */}
          {wallets.length > 1 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Source Account
              </label>
              <Select
                value={activeWallet?.id || ""}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="text-xs"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency}) — Available: {w.balance} {w.currency}
                  </option>
                ))}
              </Select>
            </div>
          ) : activeWallet ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Source Account</div>
                <div className="text-sm font-semibold text-slate-800">{activeWallet.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Available Balance</div>
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
              label="Withdrawal Amount"
              placeholder="0.00"
              value={amount}
              onChange={setAmount}
              suffix={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    MAX
                  </button>
                  {activeWallet && (
                    <span className="font-semibold text-slate-600">{activeWallet.currency}</span>
                  )}
                </div>
              }
              autoFocus
              required
            />

            {isExceedingBalance && activeWallet && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Amount exceeds current balance ({activeWallet.balance} {activeWallet.currency}).
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
      )}
    </Modal>
  );
};
