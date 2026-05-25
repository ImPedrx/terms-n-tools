# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the **Aerrnova IT Tools** application — an internal IT equipment inventory and responsibility term management system — plus its full CI/CD pipeline to AWS.

The stack is:
- **Frontend:** React 18 + TypeScript + Vite, in `terms-n-tools/`
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Container:** Multi-stage Docker build (Node 18 → Nginx Alpine), serving on port 80 inside the container
- **Hosting:** AWS EC2, images stored in AWS ECR (`us-east-2`)
- **CI/CD:** GitHub Actions (`.github/workflows/main.yml`), triggered on pushes to `dev`, `staging`, and `main`

## Development Commands

All commands run from `terms-n-tools/`:

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 8080
npm run build        # Production build → dist/
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Vitest (unit tests, jsdom)
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build locally
```

Docker (from repo root):
```bash
docker build -t aerrnova ./terms-n-tools
docker run -d -p 9090:80 --name aerrnova aerrnova
```

## Environment Variables

Create `terms-n-tools/.env` with:

```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase anon key>
VITE_SUPABASE_PROJECT_ID=<supabase project id>
```

The CI/CD pipeline requires these GitHub repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_HOST`, `EC2_SSH_KEY`.

## CI/CD Pipeline Architecture

`.github/workflows/main.yml` has two jobs:

1. **build-and-push** — authenticates to ECR, builds the Docker image, tags it with the branch name (`dev`/`staging`/`latest`), and pushes to `559487953529.dkr.ecr.us-east-2.amazonaws.com/pedrx12356`.
2. **deploy** — SSHes into the EC2 instance, stops and removes the existing container (to free port 9090), then starts the new one with `docker run -d -p 9090:80`.

Each Git branch maps to an environment:
- `dev` → development
- `staging` → staging
- `main` → production (tag: `latest`)

## Application Architecture

### Frontend (`terms-n-tools/src/`)

- `pages/` — Route-level components (Login, Dashboard, Inventory, Terms, Settings, etc.)
- `components/` — Reusable UI components built on **shadcn/ui** (Radix UI + Tailwind)
- `contexts/` — React contexts: `AuthContext` (Supabase session) and `TenantContext` (multi-tenant data isolation)
- `hooks/` — Custom hooks wrapping Supabase queries (via TanStack React Query)
- `integrations/supabase/` — Supabase client singleton and generated TypeScript types
- `lib/` — Utilities: i18n (pt/en/es), Excel export (ExcelJS), audit logging, shared constants

### Routing

React Router 6 SPA. Key routes: `/login`, `/` (dashboard), `/inventario`, `/termos/novo`, `/termos`, `/configuracoes`, `/analistas`, `/historico`, `/admin`, `/admin/clientes`. Public route (no auth): `/termos/assinar/:token`.

### Data Layer

All data access goes through Supabase JS SDK. Main tables: `equipment`, `responsibility_terms`, `analysts`, `system_settings`. Row Level Security is enabled — queries are automatically scoped to the authenticated user's tenant.

### Testing

- **Unit:** Vitest + Testing Library (`src/test/setup.ts` configures jsdom)
- **E2E:** Playwright (`playwright.config.ts`)

Run a single test file: `npm run test -- src/path/to/file.test.ts`
