# Repository Guidelines

## Project Structure & Module Organization
- `apps/` hosts deployable surfaces:
  - `main-site/` (Vite storefront)
  - `admin-dashboard/` (React control panel)
  - `api-server/` (Express + TypeORM)
  - auxiliary portals such as `storefront/`
- `packages/` contains shared libraries (e.g., `types`, `ui`, `utils`, `auth-*`, `blocks/*`); specs live beside source files.
- `scripts/` for automation (see `scripts/development/dev.sh`), `config/` for env templates and PM2 profiles, `docs/` for architecture notes.
- Place feature code in domain-scoped folders (e.g., `apps/main-site/src/features/cart/`).

## Build, Test, and Development Commands
- `pnpm install` — bootstrap workspace dependencies (Node 22.18.0 via Volta).
- `pnpm run dev` (+ `pnpm run dev:api`) — start storefront, dashboard, and optionally API locally.
- `pnpm run build` — release build; scope with `build:api` or `build:main-site` as needed.
- `pnpm run lint` / `pnpm run type-check` / `pnpm test` — lint, TypeScript checks, and test suites (routed via `dev.sh`).
- `pnpm --filter=@o4o/api-server run test:cov` — run Jest with coverage for backend (required before merge).

## Coding Style & Naming Conventions
- All code is TypeScript; use two-space indentation and single quotes in TSX.
- React component files use PascalCase (e.g., `OrderSummary.tsx`).
- Keep imports and module boundaries within domain folders; rely on shared ESLint config.
- Format before committing: `pnpm exec prettier --check "apps/**/src/**/*.{ts,tsx}"`.

## Testing Guidelines
- Vite apps use Vitest; API uses Jest.
- Co-locate tests: `*.test.ts` (unit) and `*.integration.test.ts` (integration).
- Run service-specific suites after changes; enforce API coverage with the command above.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat(main-site): add hero carousel`, `fix(api-server): guard null menu items`).
- PRs must link an issue, describe impact, include screenshots/logs when relevant, list manual verification commands, and note a rollback plan (`git revert <sha>`). Ensure CI passes.

## Security & Configuration Tips
- Never commit credentials. Base secrets on `config/env-templates/` and verify `.env.local` before migrations.
- Use PM2 profiles: `pnpm pm2:start:local` / `pnpm pm2:stop:local`.
- Document new runtime needs in `docs/`.

