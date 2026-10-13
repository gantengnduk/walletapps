import React from "react";
import { NavLink } from "react-router";
import { LayoutDashboard, History } from "lucide-react";

export const BottomNav: React.FC = () => {
  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/transactions", label: "Transactions", icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xs pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="grid grid-cols-2 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-colors select-none min-h-[44px] ${
                  isActive
                    ? "text-[#1a3e5c] font-semibold"
                    : "text-slate-500 hover:text-slate-900 active:bg-slate-50"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

