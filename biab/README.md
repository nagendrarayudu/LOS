# BIAB — Bank In A Box

A standalone core-banking-system (CBS) reference project, separate from the Sahyog LOS loan
origination system in this repo. Currently implements one piece: the bank-wide **Chart of
Accounts**, ported from the BIAB CBS navigation prototype's chart-of-accounts generator (a
3-level IFRS-aligned GL tree — main group → sub group → posting-group leaf).

## Stack

- **Backend** — Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (`backend/`)
- **Frontend** — React 19, Vite, TypeScript (`frontend/`)

Unlike LOS, BIAB is single-tenant (one core-banking instance), so its data model has no
`Tenant` model.

## Getting started

```bash
# from the repo root
npm install

cp biab/backend/.env.example biab/backend/.env
# edit biab/backend/.env if your Postgres isn't at postgresql://los:los@localhost:5432/biab

createdb biab
npm run prisma:migrate:biab
npm run prisma:seed:biab

npm run dev:biab-backend    # http://localhost:4001
npm run dev:biab-frontend   # http://localhost:5174 (proxies /api to the backend)
```

## Project layout

```
backend/
  prisma/schema.prisma   GLAccount model (main group / sub group / posting-group leaf)
  prisma/data/gl-accounts.json   seed data, ported from the BIAB CBS prototype
  src/routes/glAccounts.ts       GET /api/gl-accounts
frontend/
  src/App.tsx             Chart of Accounts page (filter by main group, search)
```
