import React from "react";
import { Routes, Route } from "react-router";
import { AppLayout } from "./app";
import { WalletsPage } from "./pages/wallets-page";
import { ConvertPage } from "./pages/convert-page";
import { TransactionsPage } from "./pages/transactions-page";
import { NotFoundPage } from "./pages/not-found-page";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<WalletsPage />} />
        <Route path="convert" element={<ConvertPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

