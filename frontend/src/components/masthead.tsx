import React from "react";
import { NavLink, Link } from "react-router";
import { Wallet, ArrowLeftRight, History, Layers } from "lucide-react";

export const Masthead: React.FC = () => {
  const navItems = [
    { to: "/", label: "Wallets", icon: Layers, end: true },
    { to: "/convert", label: "Convert", icon: ArrowLeftRight },
    { to: "/transactions", label: "Ledger History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs transition-transform group-hover:scale-105">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-900 leading-tight">
                Nexus Wallet
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600">
                Multi-Currency Ledger
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User / Environment Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Simulated User Active</span>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="sm:hidden flex items-center justify-around border-t border-slate-100 px-2 py-1.5 bg-slate-50/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-md text-xs font-medium ${
                  isActive
                    ? "text-indigo-600 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};

