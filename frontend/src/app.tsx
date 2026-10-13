import React from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./components/sidebar";
import { MobileHeader } from "./components/mobile-header";
import { BottomNav } from "./components/bottom-nav";
import { SiteFooter } from "./components/site-footer";
import { ToastProvider } from "./components/toast/toast-context";

export const AppLayout: React.FC = () => {
  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 antialiased font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar />

      {/* Mobile Sticky Top Header */}
      <MobileHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-10">
          <Outlet />
        </main>
        <SiteFooter />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
    </ToastProvider>
  );
};
