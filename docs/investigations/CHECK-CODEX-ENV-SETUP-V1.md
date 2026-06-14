# CHECK-CODEX-ENV-SETUP-V1

> Codex CLI / VS Code / Codex App 병행 도입을 위한 초기 환경 점검 기록.
> 본 문서는 read-only 조사 결과를 정리한 CHECK 문서이며, 코드 변경을 포함하지 않는다.

## 1. 현재 저장소 상태

- 저장소 루트: `C:\Users\sohae\coding\o4o-platform`
- 실행 기준: Codex CLI가 O4O 저장소 루트에서 실행됨.
- 루트 `CLAUDE.md`: 존재.
- 루트 `AGENTS.md`: 존재.
- 루트 `CODEX.md`: 없음.
- 루트 `.mcp.json`: 없음.
- pnpm workspace 기반 monorepo.
- `package.json` workspace: `apps/*`, `packages/*`.
- `pnpm-workspace.yaml` workspace: `apps/*`, `packages/*`, `packages/@o4o-apps/*`, `services/*`.
- Node 요구사항: `>=22.18.0`.
- Volta 기준: Node `22.18.0`, pnpm `9.15.0`.

조사 시점의 working tree는 이미 dirty 상태였다. 기존 변경 파일에는 `packages/operator-core-ui`, `services/web-glycopharm`, `services/web-k-cosmetics`, `services/web-kpa-society`, `pnpm-lock.yaml` 등이 포함되어 있었다. Codex 초기 도입 단계에서는 이 기존 변경과 섞이지 않도록 새 문서 작성 또는 read-only 조사로 범위를 제한해야 한다.

## 2. CLAUDE.md에서 확인한 핵심 규칙

- `CLAUDE.md`는 O4O Platform의 최상위 개발 규칙이며, 충돌 시 항상 우선한다.
- 기본 환경은 production으로 간주한다.
- DB read-only 검증은 가능하지만, `UPDATE`, `DELETE`, `DROP`, `ALTER` 등 데이터 변경 작업은 사용자 승인 없이는 금지한다.
- 작업 흐름은 `조사 -> 문제확정 -> 최소 수정 -> 검증 -> 종료`를 따른다.
- 계층 의존성은 `Core -> Extension -> Feature -> Service` 방향만 허용하고 역방향 의존을 금지한다.
- API 호출은 `authClient.api.get()` / `authClient.api.post()`를 사용하며, 하드코딩 URL과 환경변수 직접 사용을 피한다.
- 공통 모듈, 공통 config, sidebar/menu, layout, capability/permission map, core+extension contract 수정 시 단일 서비스 기준으로 완료 판단하지 않는다.
- 공통 변경 전 KPA-Society, GlycoPharm, K-Cosmetics, Neture 및 관련 admin/operator/store/forum/store-hub/mypage 소비처를 식별한다.
- TypeORM entity relation은 runtime import가 아니라 `import type`과 문자열 relation을 사용한다.
- `cms-core`, `auth-core`, `platform-core`, `organization-core`는 동결 Core로, 구조/테이블 변경에는 명시적 WO 승인이 필요하다.
- Boundary Policy:
  - Broadcast: `serviceKey`
  - Community: `organizationId`
  - Store Ops: `organizationId`
  - Commerce: `storeId`
- UUID 단독 조회, raw SQL string interpolation, domain primary boundary 누락, `serviceKey` spoofing, cross-domain JOIN은 금지 또는 명시 WO 예외 대상이다.
- 브라우저 검증 전 테스트 계정 SSOT는 `docs/local/TEST-ACCOUNTS.local.md`이다.

## 3. 기존 AGENTS.md의 보강 필요 지점

현재 `AGENTS.md`는 일반 monorepo 개발 규칙, 빌드/테스트 명령, TypeScript/ESLint/Prettier 규칙, PR 규칙을 담고 있다. Codex용으로는 다음 보강이 필요하다.

- `CLAUDE.md` 우선 원칙 명시.
- production 환경 및 DB 변경 금지 규칙 명시.
- dirty working tree에서 기존 변경 파일을 건드리지 않는 규칙 명시.
- path-specific staging 원칙 명시.
- `git add .`, `git commit -am`, 자동 push 금지 명시.
- O4O 서비스 경계와 boundary key 요약.
- 공통 패키지와 frozen core 수정 전 소비처 조사 의무 명시.
- Playwright MCP 사용 시 read-only 검증 원칙 명시.
- Codex 초기 허용/금지 작업 범위 명시.

## 4. Codex 병행 도입 원칙

- 1단계: Codex는 read-only 조사자로 사용한다.
- 2단계: Codex는 문서 정리자로 사용한다.
- 3단계: Codex는 작은 단일 파일 수정자로 제한한다.
- Claude Code는 당분간 주 개발 도구로 유지한다.
- Codex는 dirty working tree에서 기존 변경을 임의로 정리하거나 되돌리지 않는다.
- Codex가 코드 변경을 수행할 때는 작업 범위, 수정 파일, 검증 방법을 먼저 분명히 한다.
- 공통 패키지, core, auth, DB, migration, dependency 변경은 Codex 초기 도입 범위에서 제외한다.

## 5. Git 안전 규칙

- 기존 dirty worktree 파일은 사용자 또는 다른 세션의 작업으로 간주한다.
- 사용자가 명시하지 않은 변경은 revert하지 않는다.
- `git add .` 금지.
- `git commit -am` 금지.
- 자동 commit/push 금지.
- commit이 필요한 단계에서도 먼저 `git status --short`, `git diff --name-only`, `git diff --cached --name-only`로 범위를 확인한다.
- 작업 산출물은 요청된 파일만 포함해야 한다.

## 6. Path-Specific Staging 규칙

Codex가 나중에 commit 단계까지 맡는 경우에도 staging은 항상 path-specific으로 제한한다.

예:

```powershell
git add docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md
```

금지:

```powershell
git add .
git add -A
git commit -am "..."
```

staging 직전 확인:

```powershell
git status --short
git diff --name-only
git diff --cached --name-only
```

## 7. 서비스 경계

확인된 서비스 경계:

| 서비스 | 역할 |
|---|---|
| `o4o-core-api` | API 서버 |
| `neture-web` | Neture 메인 |
| `glycopharm-web` | GlycoPharm |
| `k-cosmetics-web` | K-Cosmetics |
| `kpa-society-web` | KPA Society |

경계 원칙:

- Neture, KPA-Society, GlycoPharm, K-Cosmetics를 임의로 혼동하지 않는다.
- KPA-only, GlycoPharm-only, K-Cosmetics-only, Neture-only 예외로 공통 정책 문제를 덮지 않는다.
- Forum/LMS/Signage는 서비스별 독립 구현이 아니라 O4O 공통 구조 위의 서비스별 데이터 노출로 판단한다.
- Store Production Material은 logical canonical 개념이며, `kpa_store_contents`는 legacy physical table name으로 취급한다.

## 8. 공통 패키지 수정 주의사항

공통 패키지나 core contract 변경은 작은 UI 수정처럼 취급하면 안 된다.

주의 대상:

- `packages/*` 공통 UI, auth, type, capability, operator, store, forum, lms 관련 패키지.
- `cms-core`, `auth-core`, `platform-core`, `organization-core`.
- 공통 sidebar/menu/layout/config.
- service membership, role, capability, visibility, feature flag 관련 코드.

수정 전 필수 확인:

- 모든 소비처 식별.
- KPA-Society / GlycoPharm / K-Cosmetics / Neture 영향 확인.
- route 존재 여부와 메뉴 노출 여부 확인.
- role/capability/visibility filter 영향 확인.
- DB backfill이나 capability 주입으로 UI 정책 문제를 임시 해결하지 않는지 확인.

## 9. Playwright MCP 현재 상태

확인 결과:

- `docs/platform/development/PLAYWRIGHT-MCP.md` 문서상 가이드 있음.
- 해당 문서는 repo root `.mcp.json`에 `@playwright/mcp@0.0.30`, `--headless`, `--isolated` 설정을 두는 방식을 설명한다.
- `.claude/settings.json`에 Playwright MCP 도구 권한 흔적 있음.
- `.playwright-mcp/` 디렉터리에 과거 page/console 로그 흔적 있음.
- `apps/admin-dashboard/playwright.config.ts` 존재.
- `e2e/auth-runtime/playwright.config.ts` 존재.
- 루트 `.mcp.json`은 현재 없음.

판단:

- Playwright MCP를 사용할 기반 문서와 사용 흔적은 있다.
- repo-level MCP 설정 파일은 없으므로 Codex/Claude에서 즉시 같은 방식으로 로드된다고 단정하면 안 된다.
- production 화면에서 Playwright를 사용할 경우 read-only 검증만 허용하고, 폼 제출/결제/메시지 발송 등 상태 변경 작업은 사전 사용자 승인이 필요하다.

## 10. Codex sandbox helper 누락 이슈

초기 조사 중 Codex의 Windows sandbox helper 실행이 실패했다.

확인된 오류:

```text
codex-windows-sandbox-setup.exe
program not found
```

영향:

- 일반 sandbox 실행이 실패했다.
- read-only 명령도 escalated 승인 흐름으로 재실행해야 했다.

판단:

- 이는 저장소 코드 문제가 아니라 로컬 Codex CLI 또는 PC 환경 문제로 보인다.
- 현재 CHECK 문서에는 기록만 남기고, sandbox 재설치나 보안 프로그램 차단 여부 확인은 별도 PC 환경 작업으로 분리한다.

후속 확인 예:

```powershell
Get-ChildItem "$env:USERPROFILE\.codex" -Recurse -Filter "codex-windows-sandbox-setup.exe" -ErrorAction SilentlyContinue
```

## 11. Codex 초기 허용 작업

- read-only 저장소 조사.
- `CLAUDE.md`, `AGENTS.md`, docs, package 설정 요약.
- 기존 문서 기반 CHECK/IR 초안 작성.
- 코드 변경 없는 개발 규칙 정리.
- 단일 새 문서 작성.
- 영향 범위가 명확한 단일 파일 수정.
- 사용자가 승인한 범위의 lint/type-check/test 실행.

## 12. Codex 초기 금지 작업

- production DB 변경.
- migration 작성/실행.
- dependency 변경.
- `pnpm-lock.yaml` 변경.
- `package.json` 변경.
- frozen core 구조 변경.
- 공통 package 대규모 수정.
- 서비스 경계를 넘는 menu/capability/role/layout 변경.
- `AGENTS.md` 직접 수정.
- `CLAUDE.md` 수정.
- `git add .`, `git add -A`, `git commit -am`, 자동 push.
- 기존 dirty worktree 파일 수정.
- Playwright로 production 상태 변경 작업 수행.

## 13. 다음 권장 작업

1. 이 CHECK 문서를 검토한다.
2. working tree의 기존 dirty 상태를 다른 세션 또는 사용자가 정리한다.
3. Codex sandbox helper 누락 문제를 별도 환경 작업으로 확인한다.
4. repo root `.mcp.json` 필요 여부를 결정한다.
5. working tree가 안정된 뒤 `WO-O4O-CODEX-AGENTS-MD-ALIGN-WITH-CLAUDE-RULES-V1` 같은 별도 작업으로 `AGENTS.md` 보강을 검토한다.

현재 단계에서는 `AGENTS.md`를 직접 수정하지 않는 것이 안전하다.

## 14. AGENTS.md 보강 초안 방향

향후 `AGENTS.md`를 보강한다면 다음 방향이 적절하다.

- `CLAUDE.md` 우선 원칙을 문서 최상단에 명시.
- Codex 작업 전 `git status --short` 확인 의무화.
- dirty worktree에서는 요청 파일 외 기존 변경 파일 수정 금지.
- path-specific staging만 허용.
- O4O 서비스 경계 표 추가.
- Boundary key 표 추가: `serviceKey`, `organizationId`, `storeId`.
- frozen core 및 공통 패키지 변경 전 소비처 조사 의무 추가.
- Playwright MCP 사용 전 테스트 계정 SSOT와 read-only 검증 원칙 추가.
- Codex 초기 허용/금지 작업 범위 추가.
- 완료 보고 형식 추가:
  - 수정 파일 목록
  - 기존 dirty 파일 접촉 여부
  - 실행한 검증
  - git add/commit/push 수행 여부
  - 남은 리스크와 다음 단계

---

작성 상태:

- 코드 파일 수정 없음.
- `AGENTS.md` 수정 없음.
- `CLAUDE.md` 수정 없음.
- `package.json` 수정 없음.
- `pnpm-lock.yaml` 수정 없음.
- dependency 변경 없음.
- git add/commit/push 없음.
- 기존 dirty worktree 파일 수정 없음.
