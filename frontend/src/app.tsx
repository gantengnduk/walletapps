import React from "react";
import { Outlet } from "react-router";
import { Masthead } from "./components/masthead";
import { SiteFooter } from "./components/site-footer";

export const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Masthead />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};

