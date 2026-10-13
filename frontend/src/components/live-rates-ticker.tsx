import React from "react";
import { RefreshCw } from "lucide-react";
import { useMarketRates } from "../hooks/use-currencies";

function formatDisplayRate(rateStr: string): string {
  const num = parseFloat(rateStr);
  if (isNaN(num)) return rateStr;

  const decimalPart = rateStr.includes(".") ? rateStr.split(".")[1] : "";
  const decimals = decimalPart.length;

  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return rateStr;
  }
}

export const LiveRatesTicker: React.FC = () => {
  const { data, isLoading, isError, refetch } = useMarketRates();

  // Create 4 repetitions of the pairs so the marquee loops seamlessly across all screen widths
  const tickerItems = data?.pairs
    ? [...data.pairs, ...data.pairs, ...data.pairs, ...data.pairs]
    : [];

  return (
    <div className="relative flex items-center overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      {/* Fixed Left Badge (Non-scrolling anchor) */}
      <div className="relative z-20 flex items-center gap-1.5 sm:gap-2 border-r border-slate-200/80 bg-slate-50/95 px-3 sm:px-3.5 py-2 sm:py-2.5 shrink-0 text-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Live Market
          </span>
        </div>
      </div>

      {/* Ticker Running Area */}
      <div className="relative flex-1 overflow-hidden py-2 sm:py-2.5">
        {/* Edge gradient fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white to-transparent z-10" />
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2 px-4 text-xs text-slate-400 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-ping" />
            <span>Loading European Central Bank benchmark rates...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="flex items-center gap-2 px-4 text-xs text-slate-400">
            <span>Market rates temporarily unavailable</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Running Ticker Marquee */}
        {!isLoading && !isError && tickerItems.length > 0 && (
          <div
            className="animate-ticker items-center cursor-default select-none group"
            title="Hover to pause ticker"
          >
            {tickerItems.map((item, index) => (
              <div
                key={`${item.pair}-${index}`}
                className="flex items-center gap-2 px-3.5 sm:px-4 shrink-0"
              >
                {/* Pair Code */}
                <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                  {item.from}/{item.to}
                </span>

                {/* Live Exchange Rate */}
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">
                  {formatDisplayRate(item.rate)}
                </span>

                {/* Subtitle Formula breakdown */}
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  (1 {item.from} = {formatDisplayRate(item.rate)} {item.to})
                </span>

                {/* Dot Separator */}
                <span className="text-slate-300 ml-1.5 sm:ml-2 select-none">•</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

