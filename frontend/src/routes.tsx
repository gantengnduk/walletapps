import React from "react";
import { Routes, Route, Navigate } from "react-router";
import { AppLayout } from "./app";
import { WalletsPage } from "./pages/wallets-page";
import { TransactionsPage } from "./pages/transactions-page";
import { NotFoundPage } from "./pages/not-found-page";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<WalletsPage />} />
        {/* Redirect legacy /convert to Dashboard with modal trigger */}
        <Route path="convert" element={<Navigate to="/?action=convert" replace />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
