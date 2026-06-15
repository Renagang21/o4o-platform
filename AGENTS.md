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

## Multi-Workspace Agent Operations
- This repository is operated by one user across multiple PCs and workspaces, with GitHub as the synchronization source of truth.
- Before starting work in any workspace, check `git status --short`, `git branch --show-current`, `git fetch origin`, and `git status -sb`.
- Before leaving a workspace, commit and push completed work. After moving to another workspace, run `git fetch origin`, `git pull --ff-only`, and `git status --short`.
- Codex and Claude Code may each perform independent WO tasks from separate workspaces. Each WO must define allowed files, forbidden files, validation commands, and whether commit or push is allowed.
- Keep commits path-specific to the assigned WO. Stage only the allowed files, then verify with `git diff --cached --name-only` before committing.
- Do not mix unrelated client, server, docs, dependency, or lockfile changes in one commit. Treat unexpected dirty files as existing workspace state unless the user explicitly assigns them.

## Progress Approval and Reporting Guidelines
- Agents should not ask the user after every small file edit or routine step. Within the approved Work Order scope, continue without additional confirmation for simple, local, and expected actions.
- Agents should also avoid showing full modified file contents, long diffs, or verbose patch details after each file edit. Do not paste large file contents into the conversation just to show what changed. Instead, keep implementation moving and summarize the completed work at the end.
- Proceed without asking for confirmation when the action is clearly inside the current WO scope, such as:
  - Editing files explicitly allowed by the WO
  - Applying straightforward UI text changes
  - Adjusting layout or minor styling within the target component
  - Fixing imports caused by the current edit
  - Fixing TypeScript errors directly caused by the current edit
  - Updating CHECK/IR documentation required by the WO
  - Running requested read-only or validation commands
  - Continuing sequential implementation steps already described in the WO
- Do not interrupt the user with full file dumps or long diffs for routine edits. Use concise progress notes only when useful.
- At completion, report the work through a CHECK/IR document and a concise completion summary, including:
  - What was changed
  - Which files were modified
  - Which areas were not touched
  - Validation results
  - Existing dirty/untracked files preservation
  - Staged file status
  - Known exclusions or follow-up work
  - Git status, commit, and push state when applicable
- Stop and ask the user before proceeding in any of the following cases:
  - A file outside the WO scope must be modified
  - Existing dirty or untracked files would need to be touched
  - DB schema or migration changes are required
  - `package.json`, lockfiles, dependencies, Docker, or build infrastructure must change
  - Core, frozen, or shared modules must be changed without explicit WO permission
  - Auth, role, permission, route, or API contract changes are required
  - Data deletion, seed changes, bulk updates, or destructive actions are required
  - The implementation would cross into an explicitly excluded scope
  - The validation failure appears unrelated to the current WO
  - Product, legal, compliance, settlement, or business-policy judgment is needed
  - File access or private document security is unclear
  - The agent is unsure whether the change is safe
  - Staging, commit, or push is about to be performed
- For git operations:
  - Never use `git add .`
  - Never use `git commit -am`
  - Use path-specific staging only
  - Ask before staging, committing, or pushing unless the WO explicitly grants that permission
  - Even when a WO grants commit or push permission, verify the staged file list first with `git diff --cached --name-only`
  - Do not include existing dirty or untracked files in a commit unless the user explicitly assigns them to the current WO
- Default behavior:
  - Continue through routine implementation steps without interrupting the user
  - Do not show full modified file contents after every edit
  - Stop only at meaningful decision points
  - Report what was done, what was not touched, and what remains
- O4O 운영 맥락: 사용자가 전체 조율자이며, 여러 작업공간과 여러 에이전트가 GitHub를 기준으로 동기화한다. 따라서 단순 작업마다 확인을 요구하지 말고 WO 범위 안에서는 계속 진행한다. 또한 파일을 수정할 때마다 전체 파일 내용이나 긴 diff를 사용자에게 보여주지 않으며, 작업 결과는 완료 후 CHECK/IR 문서와 완료 보고로 정리한다. 단, 경계 변경·위험 변경·기존 dirty 파일 접촉·DB/migration/package/core/API/permission 변경·정책 판단이 필요한 경우에는 반드시 중단하고 사용자에게 판단을 요청한다.

## Environment & Configuration Tips
- Use Node `22.18.0` and pnpm `9.x` (Volta or `.nvmrc` recommended).
- Copy `.env.example` to `.env.local` for development; follow `config/env-templates` for new envs.
- Never commit secrets. PM2 reads server-managed `.env`; document rotations in `docs/` or `config/systemd`.
