import React from "react";

export type SkeletonProps = {
  className?: string;
};

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
      aria-hidden="true"
    />
  );
};

export const WalletCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl" />
        <Skeleton className="h-5 w-10 sm:w-12 rounded-full" />
      </div>
      <div className="mt-2 sm:mt-2.5">
        <Skeleton className="h-3.5 w-24 sm:w-32" />
      </div>
      <div className="mt-2 sm:mt-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="mt-1 h-5 sm:h-6 w-28 sm:w-36" />
      </div>
    </div>
  );
};

