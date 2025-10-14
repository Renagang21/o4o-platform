# Repository Guidelines

## Project Structure & Module Organization
This pnpm workspace keeps deployable apps in `apps/`—focus on `admin-dashboard`, `main-site`, and `api-server`. Feature code stays in `src/`, with static assets under `public/`. Shared logic, types, UI primitives, and auth helpers sit in `packages/`, while block plugins live in `packages/blocks`. `scripts/` holds build, deploy, and tooling entrypoints, and reference docs plus environment templates live in `docs/` and `config/`.

## Build, Test, and Development Commands
- `pnpm run dev` starts main-site and admin dashboard with Vite hot reload.
- `pnpm run dev:api` runs the Express API watcher from `apps/api-server`.
- `pnpm run build` builds shared packages first, then bundles the core apps.
- `pnpm run type-check` dispatches `tsc --noEmit` across workspaces via `scripts/development/dev.sh`.
- `pnpm run lint` / `pnpm run lint:fix` apply ESLint + Prettier formatting.
- `pnpm test` walks workspaces and executes each local test runner.

## Coding Style & Naming Conventions
TypeScript + ES modules are standard; prefer path aliases (`@o4o/*`) over deep relatives. Prettier and ESLint enforce two-space indentation, single quotes, and trailing commas—run lint tasks before commits. Use PascalCase for React components and classes, camelCase (prefixed with `use`) for hooks, and feature-first filenames such as `orders/CreateOrderForm.tsx`. Store reusable types in `packages/types` and import rather than duplicating DTOs.

## Testing Guidelines
Frontend workspaces rely on Vitest with Testing Library; API services default to Jest. Match test files to their subjects using `.spec.ts` or `.test.ts` suffixes beside implementation code. Execute `pnpm test` before a pull request, and narrow focus with `pnpm --filter=<workspace> test` during iteration. Update integration suites under `apps/api-server/test` whenever endpoints or TypeORM entities change.

## Commit & Pull Request Guidelines
Adopt the `type(scope): summary` format already in history (`feat(admin-dashboard): add stock widget`). Keep commits atomic and avoid mixing client, server, and ops chores. Pull requests should reference the tracking issue, summarize impact, flag breaking changes, and include screenshots or API samples when UI or contract payloads shift.

## Environment & Configuration Tips
Copy `.env.example` to `.env.local` for development and follow `config/env-templates` for new environments. Node 22.18.0 and pnpm 9.x are required; use Volta or `.nvmrc` to lock versions. PM2 deployments read secrets from server-managed `.env` files, so never commit credentials—document rotations inside `docs/` or `config/systemd` instead.
