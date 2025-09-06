# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by pnpm workspaces (`apps/*`, `packages/*`).
- Apps: `apps/main-site` (web), `apps/admin-dashboard` (admin), `apps/api-server` (API), plus verticals (e.g., `ecommerce`, `crowdfunding`).
- Packages: shared libs under `packages/*` (e.g., `@o4o/utils`, `@o4o/ui`, `@o4o/types`).
- Tooling: `scripts/` (dev, CI/CD, deploy), `config/`, `docs/`, build outputs in `dist/` (ignored).
- Env: copy `.env.example` where applicable (especially `apps/api-server`). Do not commit secrets.

## Build, Test, and Development Commands
- Prereqs: Node `>=22.18.0`, pnpm `>=10`. Install: `pnpm install` (or `pnpm run install:quick`).
- Run dev: `pnpm dev` (web + admin), `pnpm dev:api` (API only).
- Build: `pnpm build` (packages then apps). Per-app: `pnpm build:main-site`, `pnpm build:admin`, `pnpm build:api`.
- Lint / Format: `pnpm lint` (`pnpm lint:fix`). Type check: `pnpm type-check`.
- Tests: `pnpm test` (Vitest for frontends, Jest for API). Example: `pnpm --filter @o4o/main-site test`, `pnpm --filter @o4o/api-server test:cov`.

## Coding Style & Naming Conventions
- Languages: TypeScript (strict), React 18, Node.
- Linting: ESLint config at root (`eslint.config.js`); Prettier recommended. Indentation: 2 spaces.
- Names: packages `@o4o/<name>`; components `PascalCase.tsx`; non-component files `kebab-case.ts`; variables/functions `camelCase`; env vars `SCREAMING_SNAKE_CASE`.
- Imports: prefer workspace aliases (`@o4o/*`) and local relative paths.

## Testing Guidelines
- Frameworks: Vitest (web/admin), Jest (API server).
- Location & names: co-locate as `*.test.ts`/`*.test.tsx` (or `__tests__/**`).
- Coverage: encouraged for critical modules. Frontend: `pnpm --filter @o4o/main-site test:coverage`; API: `pnpm --filter @o4o/api-server test:cov`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` (e.g., `fix: correct post editor state reset`).
- Before PR: run `pnpm lint`, `pnpm type-check`, and relevant tests; update docs if behavior changes.
- PRs must include a clear description, linked issues, and screenshots for UI changes.

## Security & Configuration Tips
- Never commit secrets; use local `.env` files. Review `DEPLOYMENT.md` and `API_SERVER_REQUIREMENTS.md` before deployment.
- Prefer provided scripts in `scripts/development/dev.sh` and `scripts/deploy.sh` to keep tooling consistent.

## Agent-Specific Notes
- Keep changes focused and minimal; follow this guide’s conventions.
- Touch only relevant files within the scope of your task; avoid reformatting unrelated code.
