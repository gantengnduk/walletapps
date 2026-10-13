import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { AmountField, formatAmountWithCommas } from "../amount-field";
import { useRatePreview } from "../../hooks/use-currencies";
import { useConvert } from "../../hooks/use-transactions";
import { ApiError } from "../../api/client";
import type { Wallet } from "../../api/wallets";
import {
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "../toast/toast-context";

export type ConvertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  initialSourceWalletId?: string;
  onSuccess?: () => void;
};

export const ConvertModal: React.FC<ConvertModalProps> = ({
  isOpen,
  onClose,
  wallets,
  initialSourceWalletId,
  onSuccess,
}) => {
  const [sourceWalletId, setSourceWalletId] = useState(initialSourceWalletId || "");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");

  const convertMutation = useConvert();
  const { showToast } = useToast();

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      if (initialSourceWalletId) {
        setSourceWalletId(initialSourceWalletId);
      } else if (!sourceWalletId && wallets.length > 0) {
        setSourceWalletId(wallets[0].id);
      }
      setAmount("");
      setDescription("");
      setFormError(null);
      setStep("form");
    }
  }, [isOpen, initialSourceWalletId, wallets]);

  const selectedSource = wallets.find((w) => w.id === sourceWalletId) ?? wallets[0] ?? null;
  const effectiveSourceId = selectedSource?.id ?? "";

  // Filter target wallets to different currencies
  const eligibleTargets = wallets.filter(
    (w) => selectedSource && w.currency !== selectedSource.currency,
  );

  const selectedTarget =
    eligibleTargets.find((w) => w.id === targetWalletId) ?? eligibleTargets[0] ?? null;
  const effectiveTargetId = selectedTarget?.id ?? "";

  const sourceCurrency = selectedSource?.currency ?? "";
  const targetCurrency = selectedTarget?.currency ?? "";

  const cleanAmount = amount.replace(/,/g, "").trim();

  // Live Rate Preview
  const shouldPreview = Boolean(
    sourceCurrency && targetCurrency && sourceCurrency !== targetCurrency && cleanAmount !== "",
  );

  const {
    data: ratePreview,
    isLoading: rateLoading,
    isFetching: rateFetching,
    error: rateError,
  } = useRatePreview(sourceCurrency, targetCurrency, cleanAmount, shouldPreview);

  const handleSwap = () => {
    if (selectedSource && selectedTarget) {
      setSourceWalletId(selectedTarget.id);
      setTargetWalletId(selectedSource.id);
      setFormError(null);
    }
  };

  const handleSetMax = () => {
    if (selectedSource) {
      setAmount(selectedSource.balance);
    }
  };

  const handleClose = () => {
    setFormError(null);
    setStep("form");
    onClose();
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!effectiveSourceId || !effectiveTargetId) {
      setFormError("Please select both a source and target wallet.");
      return;
    }

    const val = parseFloat(cleanAmount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid conversion amount greater than 0.");
      return;
    }

    setStep("confirm");
  };

  const handleExecuteConvert = async () => {
    if (!effectiveSourceId || !effectiveTargetId) return;
    setFormError(null);

    try {
      await convertMutation.mutateAsync({
        source_wallet_id: effectiveSourceId,
        target_wallet_id: effectiveTargetId,
        amount: cleanAmount,
        description: description.trim() || undefined,
      });

      showToast({
        type: "success",
        title: "Conversion Completed",
        message: `Converted ${formatAmountWithCommas(cleanAmount)} ${sourceCurrency} to ~${ratePreview?.target_amount ? formatAmountWithCommas(ratePreview.target_amount) : ""} ${targetCurrency}.`,
      });

      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to execute currency conversion. Please check connection.");
      }
      setStep("form");
    }
  };

  const currentBalance = selectedSource ? parseFloat(selectedSource.balance) || 0 : 0;
  const requestedAmount = parseFloat(cleanAmount) || 0;
  const isOverdraft = requestedAmount > currentBalance;
  const projectedSourceBalance = Math.max(0, currentBalance - requestedAmount).toFixed(2);

  let inverseRate: string | null = null;
  if (ratePreview?.rate) {
    const rateNum = parseFloat(ratePreview.rate);
    if (!isNaN(rateNum) && rateNum > 0) {
      inverseRate = (1 / rateNum).toFixed(6);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "confirm" ? "Review Currency Conversion" : "Convert Currency"}
      description={
        step === "confirm"
          ? "Please review the exchange rate quote and conversion details before confirming."
          : "Exchange currencies instantly at European Central Bank rates with double-entry ledger postings."
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
              onClick={handleExecuteConvert}
              isLoading={convertMutation.isPending}
              variant={isOverdraft ? "danger" : "primary"}
              leftIcon={<ArrowLeftRight className="h-4 w-4" />}
            >
              {isOverdraft ? "Confirm (Audit Overdraft)" : "Confirm & Convert"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="quiet" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              form="convert-form"
              disabled={!effectiveSourceId || !effectiveTargetId || eligibleTargets.length === 0}
              variant={isOverdraft ? "danger" : "primary"}
              leftIcon={<ArrowLeftRight className="h-4 w-4" />}
            >
              Review Conversion
            </Button>
          </>
        )
      }
    >
      {formError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Conversion Error</p>
            <p className="mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      {step === "confirm" ? (
        /* Step 2: Confirmation Sheet */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">You Pay</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatAmountWithCommas(amount)} {sourceCurrency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">From Account</span>
              <span className="font-semibold text-slate-800">
                {selectedSource?.name}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">You Receive (Estimated)</span>
              <span className="font-mono font-extrabold text-emerald-700 text-sm">
                ~{ratePreview?.target_amount || "—"} {targetCurrency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Into Account</span>
              <span className="font-semibold text-slate-800">
                {selectedTarget?.name}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">ECB Mid-Market Rate</span>
              <span className="font-mono font-bold text-blue-700">
                1 {sourceCurrency} = {ratePreview?.rate} {targetCurrency}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 pt-1">
              <span className="text-slate-700 font-bold">Source Balance After</span>
              <span className="font-mono font-bold text-slate-700">
                {projectedSourceBalance} {sourceCurrency}
              </span>
            </div>
          </div>

          {description && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <strong className="text-slate-700">Note:</strong> {description}
            </div>
          )}

          {isOverdraft ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Amount exceeds current source balance. This conversion will be recorded as an audited <strong>FAILED</strong> transaction without altering balances.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Live Frankfurter ECB quote. Exact target amount booked atomically.</span>
            </div>
          )}
        </div>
      ) : (
        /* Step 1: Input Form */
        <form id="convert-form" onSubmit={handleProceedToReview} className="space-y-4">
          {/* Source & Destination Wallet Selectors */}
          <div className="space-y-3">
            <Select
              label="You Pay (Source Wallet)"
              value={effectiveSourceId}
              onChange={(e) => setSourceWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — Balance: {w.balance} {w.currency}
                </option>
              ))}
            </Select>

            {/* Quick Swap Button */}
            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwap}
                disabled={!selectedTarget}
                title="Swap accounts"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <Select
              label="You Receive (Target Wallet)"
              value={effectiveTargetId}
              onChange={(e) => setTargetWalletId(e.target.value)}
              disabled={eligibleTargets.length === 0}
            >
              {eligibleTargets.length > 0 ? (
                eligibleTargets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — Balance: {w.balance} {w.currency}
                  </option>
                ))
              ) : (
                <option value="">No other currency wallets available</option>
              )}
            </Select>
          </div>

          {/* Amount Field */}
          <div>
            <AmountField
              label={`Amount in ${sourceCurrency || "Source Currency"}`}
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
                  <span className="font-semibold text-slate-600">{sourceCurrency}</span>
                </div>
              }
              autoFocus
              required
            />

            {/* Overdraft Warning Banner */}
            {isOverdraft && selectedSource && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Amount exceeds current balance ({selectedSource.balance} {sourceCurrency}).
                  Submitting will record an audited <strong>FAILED</strong> transaction.
                </span>
              </div>
            )}
          </div>

          {/* Live Exchange Rate & Estimated Target Amount Box */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                Live ECB Exchange Rate
              </span>
              {rateLoading || rateFetching ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  Fetching...
                </span>
              ) : ratePreview?.rate ? (
                <span className="font-mono font-bold text-slate-800">
                  1 {sourceCurrency} = {ratePreview.rate} {targetCurrency}
                </span>
              ) : (
                <span className="text-slate-400">Enter amount</span>
              )}
            </div>

            {inverseRate && (
              <div className="text-[11px] text-slate-400 font-mono flex justify-end">
                1 {targetCurrency} = {inverseRate} {sourceCurrency}
              </div>
            )}

            {ratePreview?.target_amount && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Estimated Received:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  ~{ratePreview.target_amount} {targetCurrency}
                </span>
              </div>
            )}

            {rateError && (
              <div className="pt-2 border-t border-red-100 text-red-600 text-[11px]">
                Unable to fetch live quote:{" "}
                {rateError instanceof Error ? rateError.message : "Service offline"}
              </div>
            )}
          </div>

          <Field
            label="Description (Optional)"
            placeholder="e.g. Travel money, Hedging, Investment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      )}
    </Modal>
  );
};
