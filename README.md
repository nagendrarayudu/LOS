# Sahyog LOS — Loan Origination System

A full-stack loan origination system for a cooperative bank, built from three visual
prototypes (`design/index.html`, `design/customer.html`, `design/staff.html`) into a
real, database-backed application.

## Stack

- **Backend** — Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT auth (`backend/`)
- **Frontend** — React 19, Vite, TypeScript, React Router (`frontend/`)
- **Design reference** — the original single-file prototypes, kept in `design/` for reference

## What's implemented

- **Landing page** — scheme rates, workspace picker, multi-currency display
- **Customer portal** (`/apply`) — mobile OTP login, scheme selection with a live EMI/APR
  calculator, KYC capture (with a demo-data eKYC shortcut), per-scheme required-document
  upload, a Key Fact Statement (RBI Digital Lending Guidelines style) with cooling-off and
  grievance disclosures, and a real-time status timeline
- **Staff portal** (`/staff`) — role-based login, pipeline dashboard with KPIs, application
  detail with a weighted 9-factor composite credit score, automated policy checks (age, DBR,
  LTV, KYC, default history), document verification, a maker-checker/credit-committee sanction
  workflow that routes by loan amount (single approver < ₹5L, maker-checker ₹5L–25L, 3-of-5
  committee ≥ ₹25L), and disbursal (CBS or NEFT-file-generation, with penny-drop verification
  and UTR generation)

All of this runs against real Postgres tables — there is no mock/localStorage data in the
running app. Six loan schemes (Gold, Personal, MSME, Housing, LAP, Vehicle) are seeded with
real rates, tenure limits and document requirements.

### Masters console

Staff → **Masters** (any signed-in staff can view; only `ADMIN` can edit) covers:

- **Products & schemes** — full CRUD on the six loan products (rate, amount/tenure range,
  LTV, category, repayment type). Soft-deleted (deactivated), never hard-deleted, since past
  applications reference them.
- **Loan parameters** — processing fee %, GST %, penal interest, foreclosure charge, bounce/late
  fees, cooling-off period, moratorium. Feeds directly into `repaymentSummary()` in
  `backend/src/lib/loanMath.ts`, so editing the fee here changes the EMI/APR/processing-fee
  shown to customers on their very next application.
- **Bank parameters** — bank identity (name, CBS code, IFSC prefix), base rate, and the sanction
  routing ceilings (single-approver / maker-checker / committee thresholds, committee quorum
  & size). Drives `sanctionTierFor()` in `backend/src/services/sanctionRouting.ts`.
- **Loan policy** — eligibility thresholds (age range, max DBR, default max LTV, min CIBIL,
  min composite score for auto-approve, KYC/default-history requirements). Drives
  `runPolicyChecks()` in `backend/src/services/creditScore.ts`.

Each is a per-tenant singleton config row (`LoanParameter`, `BankParameter`, `LoanPolicy` in
the Prisma schema), seeded with the same defaults the app used before these were configurable,
so nothing changes until someone edits them.

### Scoped out of this build

The original prototypes (particularly `staff.html`) sketch a larger Masters surface than what's
implemented above — CIBIL cutoff/rate-concession tables, a deviation-routing matrix, bureau
scoring-weight config, vendor panel, branch/geography master, users & roles admin, and comms
templates — plus, elsewhere in the prototype, per-scheme "desks" with dedicated
appraisal/valuation tools, a Kanban pipeline view, and a multi-tab Reports & MIS section. Those
were left out to keep this build to a working, real core lifecycle (apply → KYC → docs → credit
assessment → sanction → disbursal) rather than a wide surface of screens with nothing behind
them. The data model is intentionally structured so those could be added later without rework.

## Getting started

Requires Node 20+ and PostgreSQL.

```bash
# 1. install dependencies (workspace root)
npm install

# 2. configure the backend
cp backend/.env.example backend/.env
# edit backend/.env if your Postgres isn't at postgresql://los:los@localhost:5432/sahyog_los

# 3. create the database, run migrations, seed demo data
createdb sahyog_los   # or: psql -c "CREATE DATABASE sahyog_los"
npm run prisma:migrate --workspace backend
npm run prisma:seed --workspace backend

# 4. run both apps (in separate terminals)
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (proxies /api to the backend)
```

### Demo logins

- **Customer**: any 10-digit mobile number; OTP is always `123456` in development
  (no SMS gateway is wired up).
- **Staff**: password `Passw0rd!` for every seeded account —
  `admin@sahyog.coop`, `officer@sahyog.coop` / `officer2@` (Loan Officer / maker),
  `manager@sahyog.coop` / `manager2@` (Manager / checker),
  `committee1@sahyog.coop` … `committee5@sahyog.coop` (Credit Committee),
  `disbursal@sahyog.coop` (Disbursal Officer).

## Project layout

```
backend/
  prisma/schema.prisma   domain model (tenants, customers, schemes, applications,
                          documents, credit scoring, sanction decisions, disbursals)
  prisma/seed.ts          demo tenant, 6 schemes, 11 staff users
  src/routes/             REST API (auth, schemes, customer applications, staff pipeline)
  src/services/           credit scoring, sanction routing/workflow, disbursal simulation
frontend/
  src/pages/landing/       marketing/landing page
  src/pages/customer/      OTP auth, application wizard (KYC → documents → KFS), status
  src/pages/staff/         staff auth, pipeline, application detail, sanction, disbursal
design/                    original HTML prototypes (visual/UX reference only)
```

## BIAB — Bank In A Box

`biab/` is a separate, standalone project in this repo (own backend, frontend and database) —
a core-banking-system reference, currently just the Chart of Accounts, ported from the BIAB CBS
navigation prototype. It doesn't share data or code with Sahyog LOS above. See `biab/README.md`.
