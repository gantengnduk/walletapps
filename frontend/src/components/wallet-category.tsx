import React from "react";
import {
  PiggyBank,
  Plane,
  Briefcase,
  TrendingUp,
  ShoppingCart,
  Tag,
} from "lucide-react";

export const WALLET_CATEGORIES = [
  "Savings",
  "Travel",
  "Business",
  "Investment",
  "Daily Expense",
  "Others",
] as const;

export type WalletCategory = (typeof WALLET_CATEGORIES)[number];

export const DEFAULT_WALLET_CATEGORY: WalletCategory = "Savings";

export function normalizeCategory(category?: string | null): WalletCategory {
  if (!category || !category.trim()) {
    return DEFAULT_WALLET_CATEGORY;
  }
  const clean = category.trim();
  const found = WALLET_CATEGORIES.find(
    (c) => c.toLowerCase() === clean.toLowerCase(),
  );
  return found || "Others";
}

export type CategoryIconProps = {
  category?: string | null;
  className?: string;
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  className = "h-4 w-4",
}) => {
  const norm = normalizeCategory(category);

  switch (norm) {
    case "Savings":
      return <PiggyBank className={className} />;
    case "Travel":
      return <Plane className={className} />;
    case "Business":
      return <Briefcase className={className} />;
    case "Investment":
      return <TrendingUp className={className} />;
    case "Daily Expense":
      return <ShoppingCart className={className} />;
    case "Others":
    default:
      return <Tag className={className} />;
  }
};
