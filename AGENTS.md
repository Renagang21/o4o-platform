# Repository Guidelines

This guide helps agents and contributors navigate the o4o monorepo quickly while staying aligned with team conventions.

## Project Structure & Module Organization
- `apps/` hosts deployable surfaces: `main-site` (Vite storefront), `admin-dashboard` (React control panel), `api-server` (Express + TypeORM), plus auxiliary portals such as `storefront/`.
- `packages/` publishes shared libraries (`types`, `ui`, `utils`, `auth-*`, `blocks/*`), with specs co-located beside source files.
- `scripts/` contains automation (see `scripts/development/dev.sh`), `config/` stores env templates and PM2 profiles, and `docs/` captures architecture notes.

## Build, Test, and Development Commands
- `pnpm install` — bootstrap all workspace dependencies (Node 22.18.0 via Volta).
- `pnpm run dev` (+ `pnpm run dev:api`) — start storefront, dashboard, and optionally the API locally.
- `pnpm run build` — run the release build; scope with `build:api` or `build:main-site` when needed.
- `pnpm run lint` / `pnpm run type-check` / `pnpm test` — execute linting, TypeScript, and test suites through `dev.sh`.
- `pnpm --filter=@o4o/api-server run test:cov` — enforce Jest coverage before merging backend changes.

## Coding Style & Naming Conventions
All product code is TypeScript. Use two-space indentation, single quotes in TSX, and PascalCase React component filenames (e.g. `OrderSummary.tsx`). Keep feature code in domain-scoped folders like `apps/main-site/src/features/cart/`. Format before committing via `pnpm exec prettier --check "apps/**/src/**/*.{ts,tsx}"` and rely on the shared ESLint config for consistency.

## Testing Guidelines
Use Vitest for Vite apps and Jest for the API. Co-locate unit tests as `*.test.ts` and integration suites as `*.integration.test.ts`. Run service-specific suites after changes and capture coverage with the API command above. Add snapshot or contract tests to shared packages when behavior changes.

## Commit & Pull Request Guidelines
Follow Conventional Commits (e.g. `feat(main-site): add hero carousel`, `fix(api-server): guard null menu items`). PRs must link their tracking issue, describe impact, attach UI screenshots or logs when relevant, list manual verification commands, and note a rollback plan (`git revert <sha>`). Ensure CI is green before requesting review.

## Security & Configuration Tips
Never commit credentials. Base secrets on `config/env-templates/` and confirm `.env.local` settings before migrations. Use the provided PM2 ecosystem configs (`pnpm pm2:start:local` / `pnpm pm2:stop:local`) and document any new runtime needs in `docs/`.
