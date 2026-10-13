import React from "react";
import { Activity } from "lucide-react";

export const SiteFooter: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            Live ECB Rates via Frankfurter
          </span>
        </div>
      </div>
    </footer>
  );
};

