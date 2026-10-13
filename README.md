# Coco Wallet — Multi-Currency Digital Wallet Application

A full-stack, enterprise-grade multi-currency digital wallet application built for a simulated user. The system supports multi-wallet account creation in any world currency, account categorization, unique timestamp-based account numbers, deposits, withdrawals, same-currency transfers, real-time foreign exchange conversions via European Central Bank (Frankfurter) rates, live market rates ticker, interactive typing number formatters, dynamic owned-currency portfolio balance estimation, and complete double-entry ledger bookkeeping with automated audit log.

---

## Table of Contents

- [1. Key Features](#1-key-features)
- [2. System Architecture](#2-system-architecture)
  - [Backend Architecture](#backend-architecture-go--echo--sqlite)
  - [Frontend Architecture](#frontend-architecture-react-19--typescript--vite)
- [3. Database Schema](#3-database-schema)
  - [`wallets` Table](#wallets-table)
  - [`transactions` Table](#transactions-table)
  - [`ledger_entries` Table](#ledger_entries-table)
  - [Design Note: Why Money is Stored as `TEXT`](#design-note-why-money-is-stored-as-text)
- [4. Prerequisites](#4-prerequisites)
- [5. Getting Started](#5-getting-started)
  - [1. Start the Backend Server](#1-start-the-backend-server)
  - [2. Start the Frontend Application](#2-start-the-frontend-application)
- [6. API Reference](#6-api-reference)
  - [Health & Market Rates](#health--market-rates)
  - [Wallets](#wallets)
  - [Transactions & Foreign Exchange](#transactions--foreign-exchange)
- [7. Running Automated Tests](#7-running-automated-tests)
  - [Backend Test Suite](#backend-test-suite)
  - [Frontend Typecheck & Build](#frontend-typecheck--build)

---

## 1. Key Features

- **Multi-Currency Named Accounts & Categories**: Create distinct accounts per currency with semantic categorization (`Savings`, `Investment`, `Operational`, `Travel`, `Emergency`, `Entertainment`, `General`, `Other`) and edit account metadata at any time.
- **Timestamp-Based Unique Account Numbers**: Every account receives an 18-digit unique account number (`YYYYMMDDHHMMSS` + subsecond counter) alongside an internal UUID primary key, complete with one-click clipboard copying.
- **Double-Entry Ledger Bookkeeping**: Every balance-altering event records immutable debit (`DEBIT`) and credit (`CREDIT`) journal entries in `ledger_entries` along with running `balance_after` snapshots.
- **Strict Decimal Precision**: Built with `github.com/shopspring/decimal` and SQLite string storage to prevent floating-point rounding errors.
- **Live Market Rates Ticker & Real-Time FX**: 
  - Dynamic ticker running live European Central Bank (ECB) mid-market exchange rates powered by the Frankfurter API (`https://api.frankfurter.dev/`) with smooth marquee animation, hover pause, and accessibility controls.
  - Cross-currency conversion with zero spread markup, live rate quotes, and inverse rate calculations.
- **Dynamic Owned-Currency Portfolio Estimation**: The reference currency dropdown for estimated total balance dynamically reflects only the user's currently owned wallet currencies (e.g. `USD Total`, `EUR Total`, `SGD Total`).
- **Interactive Number Formatting As You Type**: Clean thousands separators and decimal formatting applied smoothly in real-time as users type amounts into Deposit, Withdraw, Transfer, and Convert inputs without cursor jumping.
- **Audited Failure Compliance**: Overdraft attempts and invalid operations are recorded as immutable `FAILED` transactions in the `transactions` table with detailed `failure_reason` strings, leaving ledger balances intact.
- **Category Filtering & Account Actions**: Filter accounts by category pill tabs, inspect detailed double-entry postings, and execute quick actions directly from the refined wallet detail modal.
- **Modern Responsive Interface**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, responsive drawer modals (bottom sheet on mobile, dialog on desktop), balance privacy mode, and TanStack React Query with fine-grained cache invalidations.

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
│       └── 00001_init_schema.sql # Consolidated Goose schema migration (UUID keys, account_number, category)
├── internal/
│   ├── app/
│   │   ├── currency/            # Supported currencies, market ticker rates, and live exchange previews
│   │   │   ├── dtos/
│   │   │   ├── usecase/
│   │   │   └── delivery/v1/
│   │   ├── wallet/              # Wallet lifecycle, categories, account numbers, deposits, and withdrawals
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
    ├── constants/               # Standard transaction types, statuses, categories, and messages
    ├── echo/                    # Echo factory, CORS, recover middleware, and error handling
    └── response/                # Standardized response envelopes ({ code, message, data })
```

### Frontend Architecture (React 19 + TypeScript + Vite)
```
frontend/
├── src/
│   ├── api/                     # Type-safe API clients (client.ts, wallets.ts, transactions.ts, currencies.ts)
│   ├── components/              # Reusable UI primitives:
│   │   ├── sidebar.tsx          # Persistent left navigation on desktop & tablet
│   │   ├── mobile-header.tsx    # Compact sticky top header on mobile
│   │   ├── bottom-nav.tsx       # Bottom navigation bar with accessible touch targets
│   │   ├── button.tsx, field.tsx, select.tsx
│   │   ├── amount-field.tsx     # Dynamic input formatter with live commas as you type
│   │   ├── live-rates-ticker.tsx # Smooth animated market rates ticker
│   │   ├── wallet-card.tsx      # Account card with category badges, account number, and balance privacy toggle
│   │   ├── wallet-category.tsx  # Category icons, normalization helpers, and badge styling
│   │   ├── modal.tsx            # Adaptive modal (bottom sheet on mobile, centered on desktop, balanced padding)
│   │   ├── toast/               # Context-based notification system (toast-context.tsx)
│   │   └── modals/              # Consolidated action dialogs:
│   │       ├── create-wallet-modal.tsx      # Create named wallet with currency & category picker
│   │       ├── edit-wallet-modal.tsx        # Rename wallet and change category
│   │       ├── wallet-detail-modal.tsx      # Account details, account number, quick actions, and ledger table
│   │       ├── deposit-modal.tsx            # Simulated fund deposits
│   │       ├── withdraw-modal.tsx           # Cash withdrawals with overdraft protection
│   │       ├── transfer-modal.tsx           # Same-currency transfers between accounts
│   │       ├── convert-modal.tsx            # Cross-currency exchange with live ECB rate review
│   │       └── transaction-detail-modal.tsx # Detailed audit inspection of journal postings
│   ├── hooks/                   # React Query domain hooks:
│   │   ├── use-wallets.ts
│   │   ├── use-transactions.ts
│   │   ├── use-currencies.ts
│   │   └── use-portfolio.ts     # Dynamic owned-currency estimation and balance privacy toggle
│   ├── pages/                   # Application views:
│   │   ├── wallets-page.tsx     # Dashboard (Live Rates Ticker, Portfolio Summary, Category Tabs, Wallets, Activity)
│   │   ├── transactions-page.tsx# Filterable ledger history (desktop table, mobile card stack, date presets)
│   │   └── not-found-page.tsx   # 404 handler
│   ├── styles/                  # Design tokens (tokens.css) and Tailwind v4 setup
│   ├── app.tsx                  # Responsive layout shell (Sidebar + Header + Canvas + BottomNav)
│   ├── routes.tsx               # Route definitions
│   ├── query.ts                 # React Query client & query key factory
│   └── main.tsx                 # Application entry point
```

---

## 3. Database Schema

All database structures are provisioned through a single consolidated Goose migration (`00001_init_schema.sql`) using `UUID` primary and foreign keys:

### `wallets` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Globally unique wallet identifier |
| `account_number` | `TEXT` | `NOT NULL UNIQUE` | 18-digit unique timestamp account number |
| `name` | `TEXT` | `NOT NULL` | User-defined wallet display name |
| `currency` | `TEXT` | `NOT NULL` | 3-letter ISO-4217 currency code (e.g. `USD`, `EUR`, `SGD`) |
| `category` | `TEXT` | `NOT NULL DEFAULT 'Savings' CHECK (...)` | Valid category (`Savings`, `Travel`, `Business`, `Investment`, `Daily Expense`, `Others`) |
| `balance` | `TEXT` | `NOT NULL DEFAULT '0.00'` | High-precision decimal string balance |
| `version` | `INTEGER` | `NOT NULL DEFAULT 0` | Monotonically incrementing optimistic lock version |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Last updated timestamp |

### `transactions` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Unique transaction audit record ID |
| `type` | `TEXT` | `CHECK(type IN ('DEPOSIT','WITHDRAWAL','TRANSFER','CONVERT'))` | Transaction classification |
| `status` | `TEXT` | `CHECK(status IN ('COMPLETED','FAILED'))` | Transaction lifecycle status |
| `failure_reason` | `TEXT` | `CHECK aligned with status` | Human-readable explanation if status is `FAILED`; NULL if `COMPLETED` |
| `source_wallet_id` | `UUID` | `REFERENCES wallets(id)` | Originating account ID (required for WITHDRAWAL, TRANSFER, CONVERT) |
| `target_wallet_id` | `UUID` | `REFERENCES wallets(id)` | Destination account ID (required for DEPOSIT, TRANSFER, CONVERT; must differ from source) |
| `source_amount` | `TEXT` | `NULLABLE` | Amount debited from source |
| `source_currency` | `TEXT` | `NULLABLE` | Currency of source debit |
| `target_amount` | `TEXT` | `NULLABLE` | Amount credited to destination |
| `target_currency` | `TEXT` | `NULLABLE` | Currency of destination credit |
| `exchange_rate` | `TEXT` | `NULLABLE` | Mid-market exchange rate used for conversions |
| `description` | `TEXT` | `NULLABLE` | User or system operation notes |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Transaction timestamp |

*Indexes*: `idx_transactions_created_at`, `idx_transactions_source`, `idx_transactions_target`.

### `ledger_entries` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Unique journal posting ID |
| `transaction_id` | `UUID` | `NOT NULL REFERENCES transactions(id)` | Parent transaction ID |
| `wallet_id` | `UUID` | `NOT NULL REFERENCES wallets(id)` | Target account for the posting |
| `entry_type` | `TEXT` | `CHECK(entry_type IN ('DEBIT','CREDIT'))` | Double-entry journal posting type |
| `amount` | `TEXT` | `NOT NULL` | High-precision decimal string amount |
| `currency` | `TEXT` | `NOT NULL` | Currency of the entry |
| `balance_after` | `TEXT` | `NOT NULL` | Account balance snapshot immediately after entry |
| `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Posting timestamp |

*Indexes*: `idx_ledger_wallet_time ON (wallet_id, created_at DESC)`, `idx_ledger_tx ON (transaction_id)`.

### Design Note: Why Money is Stored as `TEXT`

- **Avoids SQLite Float Drift**: SQLite has no native arbitrary-precision decimal type (`DECIMAL` and `REAL` are coerced to IEEE 754 floats, causing rounding errors like `0.1 + 0.2 = 0.30000000000000004`).
- **Multi-Currency Compatibility**: Unlike integer cents, world currencies use different decimal scales (0 for `JPY`, 2 for `USD`/`EUR`, 3 for `BHD`) and foreign exchange rates need fractional precision.
- **Exact Precision with `shopspring/decimal`**: `TEXT` stores values verbatim on disk, while all calculations in Go use `shopspring/decimal` for lossless big-integer math.

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

The server will initialize the SQLite database `./wallet.db`, execute migrations from `00001_init_schema.sql`, and start listening on port `8080`:
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

### Health & Market Rates
- **`GET /api/v1/ping`**: Health check.
- **`GET /api/v1/currencies`**: Returns all world currencies supported by the European Central Bank via Frankfurter.
- **`GET /api/v1/rates/market?base=USD`**: Live market exchange rates relative to a base currency.
- **`GET /api/v1/rates/preview?from=USD&to=EUR&amount=100`**: Live rate conversion preview without executing a transaction.

### Wallets
- **`POST /api/v1/wallets`**: Create a named wallet with currency and category.
  ```json
  {
    "name": "Tokyo Trip Fund",
    "currency": "JPY",
    "category": "Travel"
  }
  ```
- **`GET /api/v1/wallets?category=Travel`**: List user wallets, with optional filtering by category.
- **`GET /api/v1/wallets/:id`**: Inspect specific wallet details and recent ledger entries.
- **`PATCH /api/v1/wallets/:id`**: Update account name and/or category.
  ```json
  {
    "name": "Japan & Korea Fund",
    "category": "Travel"
  }
  ```
- **`POST /api/v1/wallets/:id/deposit`**: Deposit simulated funds.
  ```json
  {
    "amount": "500.00",
    "description": "Payroll deposit"
  }
  ```
- **`POST /api/v1/wallets/:id/withdraw`**: Withdraw funds (returns `422 Unprocessable Entity` if balance is insufficient and records a `FAILED` transaction).
  ```json
  {
    "amount": "100.00",
    "description": "ATM cash withdrawal"
  }
  ```

### Transactions & Foreign Exchange
- **`POST /api/v1/transfers`**: Transfer between two wallets with the **same** currency.
  ```json
  {
    "source_wallet_id": "902d1ec8-1111-42cb-b1b6-979fdb78e1b1",
    "target_wallet_id": "41ba59df-2222-4a0b-932b-34a9b5f49fa8",
    "amount": "150.00",
    "description": "Savings allocation"
  }
  ```
- **`POST /api/v1/conversions`**: Convert funds between two wallets with **different** currencies at live European Central Bank (Frankfurter) rates.
  ```json
  {
    "source_wallet_id": "902d1ec8-1111-42cb-b1b6-979fdb78e1b1",
    "target_wallet_id": "18cf7819-3333-41bb-9273-03bbfd9f0f90",
    "amount": "250.00",
    "description": "Travel currency exchange"
  }
  ```
- **`GET /api/v1/transactions?wallet_id=...&type=...&status=...`**: Filterable transaction history with pagination and search.
- **`GET /api/v1/transactions/:id`**: Inspect transaction metadata and its double-entry `ledger_entries` breakdown.

---

## 7. Running Automated Tests

### Backend Test Suite
The Go test suite covers repository operations, business usecases, Frankfurter mock client, HTTP delivery handlers, and strict failure audits (insufficient balance audit logs, currency mismatch rejections, zero/negative amounts, account number generation uniqueness):

```bash
cd backend
go test -v -count=1 ./...
```

### Frontend Typecheck & Build
Validates all TypeScript types and compiles optimized production assets into `frontend/dist/`:

```bash
cd frontend
npm run build
```
