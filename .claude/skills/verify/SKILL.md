---
name: verify
description: 변경 범위 검증 - 바뀐 경로에 맞는 타입 검사 · 테스트 · 빌드 · 정적 가드를 CI 와 같은 방식으로 실행하고 결과를 숨김 없이 보고한다.
---
변경 범위에 맞는 검증을 실행한다. 명령의 정본은 `SETUP.md` §5 와 `.github/workflows/ci-pipeline.yml` 이다. 실행하지 않은 검증을 PASS 로 보고하지 않는다(`AGENTS.md` §6).

1. 범위 파악: `git diff --name-only origin/main...HEAD` (+ 미커밋 변경). 경로별로 아래 묶음을 고른다.
2. 준비(새 worktree · 새 클라우드 세션)
   - `pnpm install --frozen-lockfile` → `pnpm run build:packages`. pnpm 버전은 `package.json` `packageManager` 를 따른다.
3. 경로별 검증

   | 바뀐 경로 | 실행 |
   |---|---|
   | `apps/api-server/**` | `cd apps/api-server && npx tsc --noEmit` · 관련 spec 먼저 `npx jest <경로>` |
   | API 전체 회귀 | CI 와 같게 — `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1 --shard=<i>/3` (i=1..3, 셋 다). 한 번에 전체를 돌리면 메모리 부족으로 중단된다 |
   | `services/web-*/**` · `packages/**` | 해당 패키지 `type-check` · `test` · `build` (`pnpm --filter <pkg> ...`) |
   | route · 미들웨어 | `node scripts/check-unsafe-routes.mjs` |
   | entity · migration · SQL | `node scripts/check-forbidden-tables.mjs` · ESM 규칙(`CLAUDE.md` §2) 확인 |
   | 공통 모듈 · config · sidebar | `node scripts/quality/check-literal-consumers.mjs --source <파일>` (소비처 전수 — `AGENTS.md` §3) |
   | `docs/**` · 루트 md | `node scripts/check-doc-sensitive.mjs` |
   | UI | 빌드 성공만으로 종결하지 않는다 — PC · 모바일 화면 확인(테스트 계정은 `docs/TEST-ACCOUNTS.md` — 로그인 화면 테스트 로그인 버튼) |

4. 보고: 명령 · 통과/실패 건수 · 실패 원인을 그대로 적는다. 현재 변경과 무관한 실패는 고치지 않고 base(`origin/main`)에서도 실패하는지 확인해 보고한다. 건너뛴 검증은 이유와 함께 적는다.
