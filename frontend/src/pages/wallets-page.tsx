import React, { useState } from "react";
import { useWallets } from "../hooks/use-wallets";
import type { Wallet } from "../api/wallets";
import { PageHead } from "../components/page-head";
import { Button } from "../components/button";
import { WalletCard } from "../components/wallet-card";
import { WalletCardSkeleton } from "../components/skeleton";
import { CreateWalletModal } from "../components/modals/create-wallet-modal";
import { DepositModal } from "../components/modals/deposit-modal";
import { WithdrawModal } from "../components/modals/withdraw-modal";
import { TransferModal } from "../components/modals/transfer-modal";
import {
  Plus,
  Coins,
  Wallet as WalletIcon,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

export const WalletsPage: React.FC = () => {
  const { data: wallets, isLoading, isError, error, refetch } = useWallets();

  // Modal visibility and active target wallet states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [depositWallet, setDepositWallet] = useState<Wallet | null>(null);
  const [withdrawWallet, setWithdrawWallet] = useState<Wallet | null>(null);
  const [transferWallet, setTransferWallet] = useState<Wallet | null>(null);

  // Compute portfolio metrics
  const totalWallets = wallets?.length ?? 0;
  const uniqueCurrencies = Array.from(new Set(wallets?.map((w) => w.currency) ?? []));

  return (
    <div>
      <PageHead
        eyebrow="Portfolio Dashboard"
        title="Multi-Currency Wallets"
        subtitle="Manage your multi-currency accounts, deposit simulated liquidity, withdraw funds, and transfer between wallets."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            size="md"
          >
            New Wallet
          </Button>
        }
      />

      {/* Metric Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Wallets</span>
            <WalletIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalWallets}</div>
          <p className="mt-1 text-xs text-slate-400">Total accounts under management</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Currencies Held</span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{uniqueCurrencies.length}</div>
          <p className="mt-1 text-xs text-slate-400">
            {uniqueCurrencies.length > 0 ? uniqueCurrencies.join(", ") : "None yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ledger Security</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">ACID Audited</div>
          <p className="mt-1 text-xs text-slate-400">Double-entry ledger with atomic commits</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WalletCardSkeleton />
          <WalletCardSkeleton />
          <WalletCardSkeleton />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-900">Failed to load wallets</h3>
          <p className="mt-1 text-xs text-rose-700">
            {error instanceof Error ? error.message : "An unexpected network error occurred."}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && wallets && wallets.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-xl mx-auto my-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <WalletIcon className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Wallets Created Yet</h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Create your first wallet in any supported world currency (USD, EUR, GBP, JPY, and more).
            You can hold multiple accounts per currency, deposit simulated funds, and execute real-time conversions.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Your First Wallet
            </Button>
          </div>
        </div>
      )}

      {/* Wallets Grid */}
      {!isLoading && !isError && wallets && wallets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onDeposit={(w) => setDepositWallet(w)}
              onWithdraw={(w) => setWithdrawWallet(w)}
              onTransfer={(w) => setTransferWallet(w)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateWalletModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <DepositModal
        wallet={depositWallet}
        isOpen={Boolean(depositWallet)}
        onClose={() => setDepositWallet(null)}
      />

      <WithdrawModal
        wallet={withdrawWallet}
        isOpen={Boolean(withdrawWallet)}
        onClose={() => setWithdrawWallet(null)}
      />

      <TransferModal
        sourceWallet={transferWallet}
        wallets={wallets ?? []}
        isOpen={Boolean(transferWallet)}
        onClose={() => setTransferWallet(null)}
      />
    </div>
  );
};

