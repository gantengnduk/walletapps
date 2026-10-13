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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between h-56">
      <div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-9 w-44" />
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
};

