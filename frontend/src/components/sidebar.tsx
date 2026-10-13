import React from "react";
import { NavLink } from "react-router";
import { Wallet, LayoutDashboard, History, ShieldCheck } from "lucide-react";

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/transactions", label: "Transactions", icon: History },
  ];

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 shrink-0 border-r border-slate-200 bg-white min-h-screen sticky top-0 h-screen select-none z-30 transition-all">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 lg:px-6 h-18 border-b border-slate-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a3e5c] to-[#122b40] text-white shadow-xs">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="hidden lg:flex flex-col overflow-hidden">
          <span className="font-bold text-slate-900 tracking-tight text-base leading-tight truncate">
            Coco Wallet
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-[#1a3e5c] truncate">
            by Coconut Lab
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 lg:px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-center lg:justify-start gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? "bg-[#1a3e5c]/10 text-[#1a3e5c] font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`
              }
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Simulated User Status Notice */}
      <div className="p-3 lg:p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="hidden lg:flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-800 leading-tight">Simulated User (demo purposes)</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
              No authentication or real payment gateway is used.
            </p>
          </div>
        </div>

        <div className="flex lg:hidden justify-center py-1" title="Simulated User Mode Active">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
      </div>
    </aside>
  );
};

