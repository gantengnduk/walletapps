import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { AmountField, formatAmountWithCommas } from "../amount-field";
import { useTransfer } from "../../hooks/use-transactions";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import { Send, AlertTriangle, Info, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "../toast/toast-context";

export type TransferModalProps = {
  sourceWallet?: Wallet | null;
  wallets: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const TransferModal: React.FC<TransferModalProps> = ({
  sourceWallet,
  wallets = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sourceWallet?.id || "");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const transferMutation = useTransfer();
  const { showToast } = useToast();

  // Sync selected source wallet ID with prop or available wallets list
  useEffect(() => {
    if (sourceWallet?.id) {
      setSelectedSourceId(sourceWallet.id);
    } else if (wallets.length > 0 && (!selectedSourceId || !wallets.some((w) => w.id === selectedSourceId))) {
      setSelectedSourceId(wallets[0].id);
    }
  }, [sourceWallet, wallets, isOpen]);

  const activeSource =
    wallets.find((w) => w.id === selectedSourceId) || sourceWallet || wallets[0] || null;

  // Filter available target wallets to same currency and different ID
  const eligibleTargets = wallets.filter(
    (w) => activeSource && w.currency === activeSource.currency && w.id !== activeSource.id,
  );

  // Default target selection
  const effectiveTargetId =
    targetWalletId && eligibleTargets.some((w) => w.id === targetWalletId)
      ? targetWalletId
      : eligibleTargets[0]?.id || "";

  const activeTarget = wallets.find((w) => w.id === effectiveTargetId);

  const handleClose = () => {
    setTargetWalletId("");
    setAmount("");
    setDescription("");
    setFormError(null);
    setStep("form");
    onClose();
  };

  const handleSetMax = () => {
    if (activeSource) {
      setAmount(activeSource.balance);
    }
  };

  const currentBalance = activeSource ? parseFloat(activeSource.balance) || 0 : 0;
  const transferAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isExceedingBalance = transferAmount > currentBalance;

  const targetCurrentBalance = activeTarget ? parseFloat(activeTarget.balance) || 0 : 0;
  const projectedSourceBalance = Math.max(0, currentBalance - transferAmount).toFixed(2);
  const projectedTargetBalance = (targetCurrentBalance + transferAmount).toFixed(2);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSource) {
      setFormError("Please select a source wallet.");
      return;
    }
    setFormError(null);

    if (!effectiveTargetId) {
      setFormError("Please select a destination wallet.");
      return;
    }

    const cleanAmount = amount.replace(/,/g, "").trim();
    const val = parseFloat(cleanAmount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid transfer amount greater than 0.");
      return;
    }

    setStep("confirm");
  };

  const handleExecuteTransfer = async () => {
    if (!activeSource || !effectiveTargetId) return;
    setFormError(null);

    const cleanAmount = amount.replace(/,/g, "").trim();
    try {
      await transferMutation.mutateAsync({
        source_wallet_id: activeSource.id,
        target_wallet_id: effectiveTargetId,
        amount: cleanAmount,
        description: description.trim() || undefined,
      });
      showToast({
        type: "success",
        title: "Transfer Completed",
        message: `Transferred ${formatAmountWithCommas(cleanAmount)} ${activeSource.currency} from ${activeSource.name} to ${activeTarget?.name || "destination account"}.`,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to process transfer. Please try again.");
      }
      setStep("form");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "confirm" ? "Review Transfer" : "Transfer Funds"}
      description={
        step === "confirm"
          ? "Please review the transfer details below before confirming execution."
          : activeSource
          ? `Transfer ${activeSource.currency} between your accounts without currency conversion.`
          : "Transfer funds between your accounts."
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
              onClick={handleExecuteTransfer}
              isLoading={transferMutation.isPending}
              variant={isExceedingBalance ? "danger" : "primary"}
              leftIcon={<Send className="h-4 w-4" />}
            >
              {isExceedingBalance ? "Confirm (Audit Rejection)" : "Confirm & Transfer"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="quiet" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              form="transfer-form"
              disabled={eligibleTargets.length === 0}
              variant={isExceedingBalance ? "danger" : "primary"}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Review Transfer
            </Button>
          </>
        )
      }
    >
      {formError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Transfer Notice</p>
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
                {activeSource?.name} ({activeSource?.currency})
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Destination Account</span>
              <span className="font-bold text-slate-800">
                {activeTarget?.name} ({activeTarget?.currency})
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Transfer Amount</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {formatAmountWithCommas(amount)} {activeSource?.currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Source Balance After</span>
              <span className="font-mono font-bold text-slate-700">
                {projectedSourceBalance} {activeSource?.currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 pt-1">
              <span className="text-slate-700 font-bold">Destination Balance After</span>
              <span className="font-mono font-extrabold text-emerald-700 text-sm">
                {projectedTargetBalance} {activeTarget?.currency}
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
                Amount exceeds source balance. This transfer will be logged as an audited <strong>FAILED</strong> transaction without altering balances.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Double-entry debit and credit entries will be booked atomically.</span>
            </div>
          )}
        </div>
      ) : (
        /* Step 1: Input Form */
        <form id="transfer-form" onSubmit={handleProceedToReview} className="space-y-4">
          {/* Source Account Selection */}
          {wallets.length > 1 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Source Account
              </label>
              <Select
                value={activeSource?.id || ""}
                onChange={(e) => {
                  setSelectedSourceId(e.target.value);
                  setTargetWalletId("");
                }}
                className="text-xs"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency}) — Available: {w.balance} {w.currency}
                  </option>
                ))}
              </Select>
            </div>
          ) : activeSource ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Source Account</div>
                <div className="text-sm font-semibold text-slate-800">{activeSource.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Available Balance</div>
                <div className="text-sm font-bold text-slate-900">
                  {activeSource.balance} {activeSource.currency}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">No active wallets available.</div>
          )}

          {/* Destination Account Selection */}
          {activeSource && eligibleTargets.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination Account
              </label>
              <Select
                value={effectiveTargetId}
                onChange={(e) => setTargetWalletId(e.target.value)}
                required
                className="text-xs"
              >
                {eligibleTargets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency}) — Current: {w.balance} {w.currency}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No Matching Same-Currency Account</p>
                <p className="mt-0.5">
                  Direct transfers require another wallet with the same currency ({activeSource?.currency}).
                  To move funds between different currencies, use the <strong>Convert</strong> feature.
                </p>
              </div>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <AmountField
              label="Transfer Amount"
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
                  {activeSource && (
                    <span className="font-semibold text-slate-600">{activeSource.currency}</span>
                  )}
                </div>
              }
              autoFocus
              required
              disabled={eligibleTargets.length === 0}
            />

            {isExceedingBalance && activeSource && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Amount exceeds current balance ({activeSource.balance} {activeSource.currency}).
                  Submitting will trigger a server rejection and log an audited <strong>FAILED</strong> transaction.
                </span>
              </div>
            )}
          </div>

          <Field
            label="Description (Optional)"
            placeholder="e.g. Shared expenses, Rebalancing"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={eligibleTargets.length === 0}
          />
        </form>
      )}
    </Modal>
  );
};
