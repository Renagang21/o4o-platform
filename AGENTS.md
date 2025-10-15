# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by pnpm workspaces. Deployable apps in `apps/`: `admin-dashboard`, `main-site`, `api-server`.
- Feature code lives in `src/`; static assets in `public/`. Co-locate tests beside implementation.
- Shared logic, types, UI primitives, and auth helpers in `packages/`; block plugins in `packages/blocks`.
- Tooling and automation in `scripts/`; reference docs in `docs/`; environment templates and ops configs in `config/`.

## Build, Test, and Development Commands
- `pnpm run dev` — start `main-site` and `admin-dashboard` with Vite HMR.
- `pnpm run dev:api` — run Express API watcher from `apps/api-server`.
- `pnpm run build` — build shared packages first, then bundle core apps.
- `pnpm run type-check` — `tsc --noEmit` across workspaces.
- `pnpm run lint` / `pnpm run lint:fix` — apply ESLint + Prettier.
- `pnpm test` — execute each workspace’s local test runner. Focus with `pnpm --filter=<workspace> test`.

## Coding Style & Naming Conventions
- Language: TypeScript + ES modules; prefer path aliases like `@o4o/*` over deep relatives.
- Formatting: ESLint + Prettier enforce 2-space indent, single quotes, trailing commas. Run lint before commits.
- Naming: PascalCase for React components/classes; camelCase for functions; hooks prefixed with `use`.
- Files: feature-first (e.g., `orders/CreateOrderForm.tsx`). Reuse DTOs/types from `packages/types`.

## Testing Guidelines
- Frontend: Vitest + Testing Library. API: Jest.
- Name tests `*.spec.ts` or `*.test.ts` beside the code under test.
- Update integration suites under `apps/api-server/test` whenever endpoints or TypeORM entities change.
- Run `pnpm test` before opening a PR; narrow with workspace filters during iteration.

## Commit & Pull Request Guidelines
- Commits: `type(scope): summary` (e.g., `feat(admin-dashboard): add stock widget`). Keep changes atomic; don’t mix client/server/ops.
- PRs: link the tracking issue, summarize impact, flag breaking changes, and include screenshots or API samples for UI or contract changes.

## Environment & Configuration Tips
- Use Node `22.18.0` and pnpm `9.x` (Volta or `.nvmrc` recommended).
- Copy `.env.example` to `.env.local` for development; follow `config/env-templates` for new envs.
- Never commit secrets. PM2 reads server-managed `.env`; document rotations in `docs/` or `config/systemd`.

