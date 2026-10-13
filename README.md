# Multi-Currency Digital Wallet Application

A full-stack, enterprise-grade multi-currency digital wallet application built for a simulated user. The system supports multi-wallet account creation in any world currency, deposits, withdrawals, same-currency transfers, real-time foreign exchange conversions via Frankfurter, and complete double-entry ledger bookkeeping with automated audit logging for rejected operations.

---

## 1. Key Features

- **Multi-Currency Named Accounts**: Create multiple distinct accounts per currency (e.g., `Main USD`, `Savings USD`, `Travel EUR`, `Japan Trip JPY`).
- **Simulated Liquidity & Cash Outs**: Deposit funds into any account and withdraw funds atomically.
- **Double-Entry Ledger Bookkeeping**: Every balance-altering event records immutable debit (`DEBIT`) and credit (`CREDIT`) journal entries in `ledger_entries` along with running `balance_after` snapshots.
- **Strict Decimal Precision**: Built with `github.com/shopspring/decimal` and SQLite string storage to prevent floating-point rounding errors.
- **Live Foreign Exchange**: Real-time European Central Bank (ECB) rates powered by the Frankfurter API (`https://api.frankfurter.dev/`) with zero spread markup, live rate quotes, and inverse rate calculations.
- **Audited Failure Compliance**: Overdraft attempts and invalid operations are recorded as immutable `FAILED` transactions in the `transactions` table with detailed `failure_reason` strings, while leaving ledger balances intact.
- **Modern Responsive Interface**: React 19, TypeScript, Vite, Tailwind CSS v4, and TanStack React Query with fine-grained cache invalidations.

---

## 2. System Architecture

### Backend Architecture (Go + Echo + SQLite)
The backend follows a clean, layered domain pattern with strict separation of concerns:

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Server bootstrap and graceful shutdown lifecycle
├── config/
│   └── config.go                # Strongly typed environment configuration
├── database/
│   ├── connection.go            # SQLite connection setup & automatic Goose migration runner
│   └── migrations/
│       └── 00001_init_schema.sql # Goose schema migration (wallets, transactions, ledger_entries)
├── internal/
│   ├── app/
│   │   ├── currency/            # Supported currencies and live exchange rate previews
│   │   │   ├── dtos/
│   │   │   ├── usecase/
│   │   │   └── delivery/v1/
│   │   ├── wallet/              # Wallet lifecycle, deposits, and withdrawals
│   │   │   ├── entities/
│   │   │   ├── dtos/
│   │   │   ├── repository/
│   │   │   ├── usecase/
│   │   │   └── delivery/v1/
│   │   └── transaction/         # Transfers, FX conversions, queries, and ledger audit inspection
│   │       ├── entities/
│   │       ├── dtos/
│   │       ├── repository/
│   │       ├── usecase/
│   │       └── delivery/v1/
│   ├── integrations/
│   │   └── frankfurter/         # HTTP client for Frankfurter API with fail-safe fallbacks
│   └── server/
│       ├── server.go            # Server struct, lifecycle, and Echo configuration
│       └── handler.go           # Route mapping and dependency wiring
└── pkg/
    ├── apperror/                # Uniform application errors mapping to HTTP codes
    ├── constants/               # Standard transaction types, statuses, and messages
    ├── echo/                    # Echo factory, CORS, recover middleware, and error handling
    └── response/                # Standardized response envelopes ({ code, message, data })
```

### Frontend Architecture (React 19 + TypeScript + Vite)
```
frontend/
├── src/
│   ├── api/                     # Type-safe API clients (client.ts, wallets.ts, transactions.ts, currencies.ts)
│   ├── components/              # Reusable UI primitives (Button, Field, Select, Modal, PageHead, Masthead, etc.)
│   │   └── modals/              # Action dialogs (CreateWallet, Deposit, Withdraw, Transfer, TransactionDetail)
│   ├── hooks/                   # React Query domain hooks (use-wallets.ts, use-transactions.ts, use-currencies.ts)
│   ├── pages/                   # Application views:
│   │   ├── wallets-page.tsx     # Portfolio dashboard & wallet grid
│   │   ├── convert-page.tsx     # Live FX desk with real-time rate previews
│   │   ├── transactions-page.tsx# Filterable transaction ledger log
│   │   └── not-found-page.tsx   # 404 handler
│   ├── styles/                  # Design tokens and Tailwind configuration
│   ├── app.tsx                  # Root layout shell
│   ├── routes.tsx               # Route definitions
│   └── query.ts                 # React Query client & centralized query key factory
```

---

## 3. Database Schema

- **`wallets`**: Stores named user accounts (`id`, `name`, `currency`, `balance`, timestamps).
- **`transactions`**: High-level audit log of every operation (`id`, `type`, `status`, `failure_reason`, `source_wallet_id`, `target_wallet_id`, `source_amount`, `source_currency`, `target_amount`, `target_currency`, `exchange_rate`, `description`, `created_at`).
  - `type` $\in$ (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`, `CONVERT`).
  - `status` $\in$ (`COMPLETED`, `FAILED`).
- **`ledger_entries`**: Double-entry bookkeeping postings (`id`, `transaction_id`, `wallet_id`, `entry_type`, `amount`, `currency`, `balance_after`, `created_at`).
  - `entry_type` $\in$ (`DEBIT`, `CREDIT`).

---

## 4. Prerequisites

- **Go**: Version 1.23+
- **Node.js**: Version 18+ (Node 20+ recommended)
- **npm** or **pnpm**

---

## 5. Getting Started

### 1. Start the Backend Server

```bash
cd backend

# Build and run the server (automatically applies SQLite migrations on startup)
go run ./cmd/server
```

The server will initialize SQLite database `./wallet.db`, run Goose schema migrations, and start listening on port `8080`:
```
Database migrations applied successfully.
⇨ http server started on [::]:8080
```

#### Environment Variables (Optional):
| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port for the Echo HTTP server |
| `ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `DB_DRIVER` | `sqlite` | Database driver |
| `DB_PATH` | `./wallet.db` | File path to SQLite database |
| `FRANKFURTER_BASE_URL` | `https://api.frankfurter.dev` | Frankfurter exchange API base URL |

---

### 2. Start the Frontend Application

In a separate terminal:

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Vite automatically proxies `/api` calls to the backend on `http://localhost:8080`.

---

## 6. API Reference

All successful responses return a uniform JSON envelope:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### Health & Currencies
- **`GET /api/v1/ping`**: Health check.
- **`GET /api/v1/currencies`**: Returns all world currencies supported by Frankfurter.
- **`GET /api/v1/rates/preview?from=USD&to=EUR&amount=100`**: Live rate conversion preview without executing a transaction.

### Wallets
- **`POST /api/v1/wallets`**: Create a named wallet.
  ```json
  { "name": "Main USD", "currency": "USD" }
  ```
- **`GET /api/v1/wallets`**: List all user wallets with current balances.
- **`GET /api/v1/wallets/:id`**: Inspect specific wallet details and recent ledger entries.
- **`POST /api/v1/wallets/:id/deposit`**: Deposit simulated funds.
  ```json
  { "amount": "500.00", "description": "Payroll deposit" }
  ```
- **`POST /api/v1/wallets/:id/withdraw`**: Withdraw funds (returns 422 if balance is insufficient and logs a `FAILED` transaction).
  ```json
  { "amount": "100.00", "description": "Cash withdrawal" }
  ```

### Transactions & Foreign Exchange
- **`POST /api/v1/transfers`**: Transfer between two wallets with the **same** currency.
  ```json
  {
    "source_wallet_id": "uuid-1",
    "target_wallet_id": "uuid-2",
    "amount": "150.00",
    "description": "Savings allocation"
  }
  ```
- **`POST /api/v1/conversions`**: Convert funds between two wallets with **different** currencies at live mid-market Frankfurter rates.
  ```json
  {
    "source_wallet_id": "uuid-usd",
    "target_wallet_id": "uuid-eur",
    "amount": "250.00",
    "description": "Travel currency exchange"
  }
  ```
- **`GET /api/v1/transactions?wallet_id=...&type=...&status=...`**: Filterable transaction history.
- **`GET /api/v1/transactions/:id`**: Inspect transaction metadata and its double-entry `ledger_entries` breakdown.

---

## 7. Running Automated Tests

### Backend Test Suite
The backend test suite covers repository operations, business usecases, Frankfurter mock client, HTTP delivery handlers, and input edge cases (insufficient balance audit logs, currency mismatch rejections, zero/negative amounts):

```bash
cd backend
go test -v ./...
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```
Validates all TypeScript types and compiles optimized production assets into `frontend/dist/`.

