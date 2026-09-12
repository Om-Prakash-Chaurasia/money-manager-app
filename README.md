# 💰 Money Manager — Production-Grade Personal Finance Application

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6+-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-131%2F131%20Passing-success.svg)](backend/tests/)

**Money Manager** is an enterprise-grade full-stack personal finance application inspired by apps like *Money Manager – Expense & Budget*. Built on strict **double-entry ledger principles**, it provides total financial clarity with atomic balance synchronization, multi-account portfolio tracking, credit card statement lifecycles, dynamic category rollups, automated recurring schedules, and export engines.

---

## 🏛️ Core Architectural & Accounting Principles

### 1. Integer Minor Units Monetary Precision
- **Zero Floating-Point Drift**: Binary floating-point representation (`0.1 + 0.2 === 0.30000000000000004`) is strictly eliminated from all business logic and persistence.
- All monetary amounts are stored as **64-bit integer minor units** (paise for INR, cents for USD/EUR).
  - ₹1,250.50 is stored on the ledger as `125050`.
  - Frontend renders formatted values via `toMajorUnits(amount).toLocaleString(...)`.

### 2. Double-Entry Atomic Ledger
- Multi-document balance adjustments (fund transfers, credit card bill settlements, and transaction reversals) are executed using MongoDB ACID transactions with automatic single-node fallback.
- **Two-Phase Balance Reversals**: Modifying or deleting a past transaction automatically reverses its original debit/credit before applying the new state, guaranteeing that account balances are mathematically consistent.

### 3. Non-Inflating Fund Transfers
- Moving money between accounts (e.g., Bank → Cash Wallet) credits the destination account and debits the source account simultaneously.
- Transfers **never** inflate Income or Expense totals in financial reports or dashboard KPIs.

### 4. Credit Card Liability Model
- Purchases made on a credit card are classified as Expenses on the card account, increasing outstanding debt and reducing available credit (`availableCredit = creditLimit - debt`).
- Paying a credit card bill is executed as a **Transfer** (Bank → Credit Card) and **never** duplicated as an expense.

---

## 🚀 Tech Stack

| Layer | Technologies & Tools |
|---|---|
| **Backend Runtime** | Node.js 22 (Pure ECMAScript Modules), Express 4 |
| **Database & ORM** | MongoDB 7, Mongoose 8 (Indexes, Validation hooks, Aggregation pipelines) |
| **Authentication** | Argon2 / Bcrypt password hashing, JWT Access/Refresh tokens with cryptographic nonces |
| **Security & Auditing**| Helmet, CORS, Express Rate Limiter, Zod schema validation, Winston logger |
| **Documentation** | OpenAPI 3.0, Swagger UI (`/api/docs`) |
| **Frontend Framework** | React 19 (Pure JavaScript `.jsx`, zero TypeScript), Vite 6 |
| **Styling & Theme** | Custom Vanilla CSS Design System with Obsidian Dark & Porcelain Light tokens |
| **Icons & Visuals** | Lucide React, SVG dynamic charts |
| **Containerization** | Docker, Docker Compose, Nginx Alpine |

---

## 📁 Project Architecture

```text
money-manager-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & database configuration
│   │   ├── constants/       # Account, transaction, and statement enums
│   │   ├── controllers/     # HTTP controllers handling requests/responses
│   │   ├── docs/            # OpenAPI 3.0 specification (swagger.js)
│   │   ├── jobs/            # Background cron processor for recurring transactions
│   │   ├── middleware/      # Auth, rate-limiting, uploads, error handling
│   │   ├── models/          # 13 Mongoose database schemas & indexes
│   │   ├── repositories/    # Data access layer isolating DB queries
│   │   ├── routes/          # Express route declarations
│   │   ├── services/        # Double-entry ledger business logic & calculations
│   │   ├── utils/           # Currency conversions, CSV formatting, transaction runner
│   │   └── validators/      # Zod validation schemas
│   ├── tests/               # 13 automated integration test suites (131 tests)
│   ├── Dockerfile           # Production container for backend
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with JWT refresh queue & endpoint maps
│   │   ├── components/
│   │   │   ├── layout/      # AppShell, Sidebar, Navbar
│   │   │   ├── transactions/# Quick NewTransactionModal
│   │   │   └── ui/          # UI Component Library (Button, Input, Modal, Card, StatCard, Badge)
│   │   ├── context/         # AuthContext, ToastContext, ThemeContext
│   │   ├── views/           # Full interactive feature views:
│   │   │   ├── auth/        # Login & Registration with auto-seeding
│   │   │   ├── dashboard/   # Live KPIs, 6-mo cash flow trends, budgets, recent activity
│   │   │   ├── transactions/# Full ledger, filters, inline receipts, edit/delete modals
│   │   │   ├── accounts/    # Multi-account management, net worth, transfer modal
│   │   │   ├── creditCards/ # Metallic cards, credit limit meters, bill payment modal
│   │   │   ├── categories/  # Hierarchical 2-level category tree & subcategories
│   │   │   ├── budgets/     # Monthly category limits, dynamic rollup meters
│   │   │   ├── recurring/   # Schedules, pause/resume toggles, template creator
│   │   │   └── reports/     # Trend bars, ranked distributions, cash flows, CSV exports
│   │   ├── App.jsx          # Root application component with tab routing
│   │   └── index.css        # Obsidian & Porcelain theme design system tokens
│   ├── nginx.conf           # Production Nginx reverse proxy configuration
│   ├── Dockerfile           # Multi-stage production container for frontend
│   └── package.json
│
├── docker-compose.yml       # Production orchestration for Mongo, Backend, and Frontend
└── README.md
```

---

## 🛠️ Quick Start & Installation

### Option 1: Run with Docker Compose (Recommended)

To orchestrate the complete stack (MongoDB, Backend, and Frontend) in production mode:

```bash
# Clone the repository
git clone https://github.com/your-username/money-manager-app.git
cd money-manager-app

# Launch all services via Docker Compose
docker-compose up --build -d
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001/api](http://localhost:5001/api)
- **Swagger Documentation**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
- **MongoDB**: `localhost:27017`

To shut down services:
```bash
docker-compose down
```

---

### Option 2: Local Development Setup

#### Prerequisites
- Node.js v20+ or v22+
- MongoDB 7+ running locally on port 27017 (or MongoDB Atlas URI)

#### 1. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start development server with hot reload
npm run dev
```
Backend will start on [http://localhost:5001](http://localhost:5001).

#### 2. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be available on [http://localhost:5173](http://localhost:5173).

---

## 🧪 Automated Testing Suite

The application includes 13 end-to-end integration test suites verifying all financial accounting rules, balance reversals, transfer integrity, receipt uploads, and exports:

```bash
cd backend
npm test
```

### Verification Results:
```text
Test Suites: 13 passed, 13 total
Tests:       131 passed, 131 total
Snapshots:   0 total
Time:        91.938 s
```

| Test Suite | Coverage Area | Tests |
|---|---|---|
| `models.test.js` | Mongoose schema validation & integer constraints | 13/13 |
| `auth.test.js` | User registration, auto-seeding, JWT refresh rotation | 13/13 |
| `account.test.js` | Balance calculations, net worth, soft-delete archiving | 14/14 |
| `category.test.js` | 2-level category tree, flow type matching, cascading deactivation | 13/13 |
| `transaction.test.js` | Income, expense, two-phase balance reversals | 10/10 |
| `transfer.test.js` | Double-entry balance adjustment, zero inflation | 7/7 |
| `creditCard.test.js` | Available credit, statement generation, debt settlement | 5/5 |
| `budget.test.js` | Dynamic rollups, status pills (`HEALTHY`, `WARNING`, `EXCEEDED`) | 10/10 |
| `recurring.test.js` | Schedule frequency calculators, background cron execution | 13/13 |
| `dashboard.test.js` | Month-over-month comparisons, net worth aggregation | 3/3 |
| `report.test.js` | Income-expense trends, cash flows, net worth timeline | 9/9 |
| `attachment.test.js` | Multer MIME validation, transaction linking, file unlinking | 13/13 |
| `export.test.js` | RFC 4180 CSV with UTF-8 BOM, JSON full backup sanitization | 8/8 |

---

## 📖 API Documentation (Swagger / OpenAPI)

Interactive documentation is served directly from the backend via Swagger UI:
- **URL**: `http://localhost:5001/api/docs`
- **Specification**: Complete OpenAPI 3.0 coverage across all 14 modules:
  - `POST /api/auth/register` & `POST /api/auth/login`
  - `GET /api/accounts` & `POST /api/transfers`
  - `GET /api/transactions` (with filtering and pagination)
  - `POST /api/credit-cards/{id}/payment` (debt settlement)
  - `GET /api/budgets/summary?month=YYYY-MM`
  - `GET /api/reports/net-worth?months=12`
  - `POST /api/attachments/upload` (5MB multipart)
  - `GET /api/export/full-backup` (complete financial snapshot)

---

## 🔐 Security & Data Protection

- **Argon2 / Bcrypt Password Hashing**: Passwords hashed with high iteration salt rounds; never stored in plaintext.
- **Tenant Isolation**: Every database query explicitly filters by authenticated `userId`, preventing cross-account access.
- **Sanitized Exports**: Full financial backup JSON strictly removes password hashes and internal cryptographic tokens.
- **Multer Upload Sandbox**: File uploads validate magic numbers and MIME types, enforce 5MB limits, and delete unlinked files from disk upon deletion.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.
