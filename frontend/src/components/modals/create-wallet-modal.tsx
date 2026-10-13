import React, { useState } from "react";
import { Modal } from "../modal";
import { Field } from "../field";
import { Select } from "../select";
import { Button } from "../button";
import { useCurrencies } from "../../hooks/use-currencies";
import { useCreateWallet } from "../../hooks/use-wallets";
import { ApiError } from "../../api/client";

export type CreateWalletModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies();
  const createWallet = useCreateWallet();

  const handleClose = () => {
    setName("");
    setCurrency("USD");
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Wallet name cannot be blank.");
      return;
    }

    try {
      await createWallet.mutateAsync({
        name: trimmedName,
        currency: currency.toUpperCase(),
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to create wallet. Please try again.");
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Wallet"
      description="Create a dedicated multi-currency wallet account for your portfolio."
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-wallet-form"
            isLoading={createWallet.isPending}
          >
            Create Wallet
          </Button>
        </>
      }
    >
      <form id="create-wallet-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {formError}
          </div>
        )}

        <Field
          label="Wallet Name"
          placeholder="e.g. Main USD, Emergency Fund, Holiday EUR"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />

        <Select
          label="Currency"
          hint={currenciesLoading ? "Loading supported currencies..." : `${currencies?.length ?? 0} currencies`}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          disabled={currenciesLoading}
        >
          {currencies && currencies.length > 0 ? (
            currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))
          ) : (
            <>
              <option value="USD">USD — United States Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="JPY">JPY — Japanese Yen</option>
              <option value="SGD">SGD — Singapore Dollar</option>
            </>
          )}
        </Select>
      </form>
    </Modal>
  );
};

