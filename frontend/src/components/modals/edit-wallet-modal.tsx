import React, { useState, useEffect } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { useUpdateWallet } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";
import { useToast } from "../toast/toast-context";
import type { Wallet } from "../../api/wallets";
import {
  WALLET_CATEGORIES,
  DEFAULT_WALLET_CATEGORY,
  type WalletCategory,
  normalizeCategory,
} from "../wallet-category";

export type EditWalletModalProps = {
  wallet: Wallet | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedWallet: Wallet) => void;
};

export const EditWalletModal: React.FC<EditWalletModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WalletCategory>(DEFAULT_WALLET_CATEGORY);
  const [formError, setFormError] = useState<string | null>(null);

  const updateWallet = useUpdateWallet();
  const { showToast } = useToast();

  useEffect(() => {
    if (wallet && isOpen) {
      setName(wallet.name);
      setCategory(normalizeCategory(wallet.category) as WalletCategory);
      setFormError(null);
    }
  }, [wallet, isOpen]);

  const handleClose = () => {
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    setFormError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Wallet name cannot be blank.");
      return;
    }

    try {
      const updated = await updateWallet.mutateAsync({
        walletID: wallet.id,
        data: {
          name: trimmedName,
          category,
        },
      });

      showToast({
        type: "success",
        title: "Account Updated",
        message: `Updated account "${trimmedName}".`,
      });

      handleClose();
      onSuccess?.(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to update wallet. Please try again.");
      }
    }
  };

  if (!wallet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Wallet"
      description="Update the category and display name for this account."
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-wallet-form"
            isLoading={updateWallet.isPending}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-wallet-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {formError}
          </div>
        )}

        {/* 1st Order: Category */}
        <Select
          label="Category"
          hint="Categorize this account by financial purpose"
          value={category}
          onChange={(e) => setCategory(e.target.value as WalletCategory)}
        >
          {WALLET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>

        {/* 2nd Order: Wallet Name */}
        <Field
          label="Wallet Name"
          placeholder="e.g. Main USD, Emergency Fund, Holiday EUR"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        {/* 3rd Order: Currency (Read-Only) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Currency</label>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm select-none">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 tracking-wider">
                {wallet.currency}
              </span>
              <span className="text-xs text-slate-400">account currency</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
              Fixed at creation
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Account currency cannot be modified after creation to preserve ledger integrity.
          </p>
        </div>
      </form>
    </Modal>
  );
};

