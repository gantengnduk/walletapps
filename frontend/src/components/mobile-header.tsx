import React from "react";
import { Link } from "react-router";
import { Wallet } from "lucide-react";

export const MobileHeader: React.FC = () => {
  return (
    <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a3e5c] to-[#122b40] text-white shadow-xs">
          <Wallet className="h-4 w-4" />
        </div>
        <span className="font-bold text-slate-900 tracking-tight text-base">
          Coco Wallet
        </span>
      </Link>

      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Simulated User (demo purposes)</span>
      </div>
    </header>
  );
};

