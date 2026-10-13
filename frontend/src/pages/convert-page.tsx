import React, { useState } from "react";
import { Link } from "react-router";
import { useWallets } from "../hooks/use-wallets";
import { useRatePreview } from "../hooks/use-currencies";
import { useConvert } from "../hooks/use-transactions";
import { PageHead } from "../components/page-head";
import { Field } from "../components/field";
import { Select } from "../components/select";
import { Button } from "../components/button";
import { ApiError } from "../api/client";
import type { ConvertResponse } from "../api/transactions";
import {
  ArrowLeftRight,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export const ConvertPage: React.FC = () => {
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const convertMutation = useConvert();

  const [sourceWalletId, setSourceWalletId] = useState("");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<ConvertResponse | null>(null);

  // Set default source wallet if not set
  const allWallets = wallets ?? [];
  const selectedSource = allWallets.find((w) => w.id === sourceWalletId) ?? allWallets[0] ?? null;
  const effectiveSourceId = selectedSource?.id ?? "";

  // Filter target wallets to those with different currencies
  const eligibleTargets = allWallets.filter(
    (w) => selectedSource && w.currency !== selectedSource.currency,
  );

  const selectedTarget =
    eligibleTargets.find((w) => w.id === targetWalletId) ?? eligibleTargets[0] ?? null;
  const effectiveTargetId = selectedTarget?.id ?? "";

  const sourceCurrency = selectedSource?.currency ?? "";
  const targetCurrency = selectedTarget?.currency ?? "";

  // Live Rate Preview
  const shouldPreview = Boolean(
    sourceCurrency && targetCurrency && sourceCurrency !== targetCurrency && amount.trim() !== "",
  );

  const {
    data: ratePreview,
    isLoading: rateLoading,
    isFetching: rateFetching,
    error: rateError,
  } = useRatePreview(sourceCurrency, targetCurrency, amount, shouldPreview);

  // Swap wallets handler
  const handleSwap = () => {
    if (selectedSource && selectedTarget) {
      setSourceWalletId(selectedTarget.id);
      setTargetWalletId(selectedSource.id);
      setFormError(null);
      setSuccessResult(null);
    }
  };

  const handleSetMax = () => {
    if (selectedSource) {
      setAmount(selectedSource.balance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessResult(null);

    if (!effectiveSourceId || !effectiveTargetId) {
      setFormError("Please select both a source and target wallet.");
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid conversion amount greater than 0.");
      return;
    }

    try {
      const res = await convertMutation.mutateAsync({
        source_wallet_id: effectiveSourceId,
        target_wallet_id: effectiveTargetId,
        amount: amount.trim(),
        description: description.trim() || undefined,
      });

      setSuccessResult(res);
      setAmount("");
      setDescription("");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to execute currency conversion. Please check connection.");
      }
    }
  };

  // Check balance comparison
  const currentBalance = selectedSource ? parseFloat(selectedSource.balance) || 0 : 0;
  const requestedAmount = parseFloat(amount) || 0;
  const isOverdraft = requestedAmount > currentBalance;

  // Compute inverse rate
  let inverseRate: string | null = null;
  if (ratePreview?.rate) {
    const rateNum = parseFloat(ratePreview.rate);
    if (!isNaN(rateNum) && rateNum > 0) {
      inverseRate = (1 / rateNum).toFixed(6);
    }
  }

  // Check if user has suitable multi-currency wallets
  const distinctCurrencies = new Set(allWallets.map((w) => w.currency));
  const hasMultipleCurrencies = distinctCurrencies.size >= 2;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHead
        eyebrow="Foreign Exchange"
        title="Currency Conversion Desk"
        subtitle="Execute instant currency conversions at live European Central Bank exchange rates with atomic ledger postings."
      />

      {/* Guide notice if user lacks multi-currency accounts */}
      {!walletsLoading && allWallets.length > 0 && !hasMultipleCurrencies && (
        <div className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white shrink-0 mt-0.5">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">
                Create a wallet in another currency to enable conversion
              </h3>
              <p className="mt-1 text-xs text-indigo-800 leading-relaxed">
                All your existing accounts are currently denominated in{" "}
                <strong>{Array.from(distinctCurrencies).join(", ")}</strong>. To execute cross-currency conversions, create at least one additional wallet in a different currency (e.g. EUR, GBP, JPY).
              </p>
              <div className="mt-3">
                <Link to="/">
                  <Button size="sm" variant="primary">
                    Go to Wallets Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Success Alert */}
      {successResult && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="w-full">
              <h3 className="text-base font-bold text-emerald-900">
                Conversion Executed Successfully!
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                Debited <strong>{successResult.source_amount} {successResult.source_currency}</strong> and credited{" "}
                <strong>{successResult.target_amount} {successResult.target_currency}</strong> at rate {successResult.exchange_rate}.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-emerald-900 bg-white/70 p-3 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-sans">Source Balance</span>
                  <div className="font-bold">{successResult.source_new_balance} {successResult.source_currency}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-sans">Target Balance</span>
                  <div className="font-bold text-emerald-700">{successResult.target_new_balance} {successResult.target_currency}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Link to="/transactions">
                  <Button size="sm" variant="secondary">
                    View in Ledger History
                  </Button>
                </Link>
                <Button size="sm" variant="quiet" onClick={() => setSuccessResult(null)}>
                  Convert Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversion Form Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Conversion Error</p>
                <p className="mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Account Selectors Row with Swap Button */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Source Account */}
            <div className="md:col-span-5">
              <Select
                label="You Pay (Source Wallet)"
                value={effectiveSourceId}
                onChange={(e) => {
                  setSourceWalletId(e.target.value);
                  setSuccessResult(null);
                }}
                disabled={walletsLoading || allWallets.length === 0}
              >
                {allWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.balance} {w.currency}
                  </option>
                ))}
              </Select>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center pt-5">
              <button
                type="button"
                onClick={handleSwap}
                disabled={!selectedTarget}
                title="Swap source and target accounts"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>

            {/* Target Account */}
            <div className="md:col-span-5">
              <Select
                label="You Receive (Target Wallet)"
                value={effectiveTargetId}
                onChange={(e) => {
                  setTargetWalletId(e.target.value);
                  setSuccessResult(null);
                }}
                disabled={walletsLoading || eligibleTargets.length === 0}
              >
                {eligibleTargets.length > 0 ? (
                  eligibleTargets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.balance} {w.currency}
                    </option>
                  ))
                ) : (
                  <option value="">No other currency wallet found</option>
                )}
              </Select>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <Field
              label="Source Amount to Convert"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSuccessResult(null);
              }}
              suffix={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    MAX
                  </button>
                  <span className="font-semibold text-slate-700">{sourceCurrency || "—"}</span>
                </div>
              }
              required
            />

            {/* Overdraft Warning Banner */}
            {isOverdraft && (
              <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Amount exceeds available balance ({selectedSource?.balance} {sourceCurrency}).
                  Submitting will fail backend validation and log an audited <strong>FAILED</strong> transaction.
                </span>
              </div>
            )}
          </div>

          {/* Live Quote & Conversion Preview Panel */}
          {sourceCurrency && targetCurrency && sourceCurrency !== targetCurrency && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-900">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Live Exchange Rate Preview
                </span>

                {(rateLoading || rateFetching) && (
                  <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Fetching quote...
                  </span>
                )}
              </div>

              {ratePreview && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase font-medium">
                      Estimated You Receive
                    </span>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {ratePreview.target_amount} {targetCurrency}
                    </div>
                  </div>

                  <div className="sm:text-right font-mono text-xs">
                    <span className="text-[11px] text-slate-500 uppercase font-sans font-medium">
                      Market Rate
                    </span>
                    <div className="mt-1 font-semibold text-slate-800">
                      1 {sourceCurrency} = {ratePreview.rate} {targetCurrency}
                    </div>
                    {inverseRate && (
                      <div className="text-[11px] text-slate-400">
                        1 {targetCurrency} = {inverseRate} {sourceCurrency}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rateError && (
                <div className="mt-3 text-xs text-rose-600">
                  Unable to fetch live quote from Frankfurter. {rateError instanceof Error ? rateError.message : ""}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  No spread markup • Mid-market European Central Bank rate
                </span>
                <span>Powered by Frankfurter</span>
              </div>
            </div>
          )}

          {/* Description */}
          <Field
            label="Memo / Description (Optional)"
            placeholder="e.g. Travel fund conversion, Rebalance to EUR"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={convertMutation.isPending}
              disabled={!effectiveSourceId || !effectiveTargetId || eligibleTargets.length === 0}
              leftIcon={<ArrowRight className="h-5 w-5" />}
            >
              {isOverdraft
                ? "Submit Conversion (Test Overdraft Audit)"
                : `Convert ${amount ? `${amount} ${sourceCurrency}` : "Currency"}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
