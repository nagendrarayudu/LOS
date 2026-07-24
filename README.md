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

### Scoped out of this build

The original prototypes (particularly `staff.html`) sketch a much larger admin surface:
a 12-category Masters console, per-scheme "desks" with dedicated appraisal/valuation tools,
a Kanban pipeline view, and a multi-tab Reports & MIS section. Those were left out to keep
this build to a working, real core lifecycle (apply → KYC → docs → credit assessment →
sanction → disbursal) rather than a wide surface of screens with nothing behind them. The
data model (Prisma schema) is intentionally structured so those could be added later without
rework.

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
