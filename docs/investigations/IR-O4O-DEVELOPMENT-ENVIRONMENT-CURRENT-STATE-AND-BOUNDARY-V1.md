# IR-O4O-DEVELOPMENT-ENVIRONMENT-CURRENT-STATE-AND-BOUNDARY-V1

> **유형**: 읽기 전용 조사 (read-only) — 코드/문서/설정/DB **무변경**. 본 IR 문서 1건만 생성.
> **목적**: 현재 저장소에 남아 있는 개발환경·AI 작업환경 과제를 좁히고, **지금 정비할 것**과 **전반 리팩터링 이후로 미룰 것**을 분리한다.
> **범위 조정**: 직전 커밋 `efcd54f8a`에서 이미 해결된 환경문서 문제는 **재조사하지 않는다**. AI 작업환경 경계 · build/검증 기준 · 잔존 문서 · 자동화 스크립트에 집중한다.
> **기준 커밋**: `efcd54f8a` · **조사일**: 2026-08-06
> **결론(요약)**: **실행 차단 3건 + 정면 충돌 1건**이 남아 있고 모두 저위험 정비 가능. AI 도구 경계는 `CLAUDE.md` 축소 없이는 해결 불가 → 리팩터링 이후.
>
> **후속 상태 (2026-08-06 추가)**: 본 IR §5의 `LOW-RISK-FIX` 항목은 `WO-O4O-DEV-ENV-RESIDUAL-LOW-RISK-CLEANUP-V1` (커밋 `062e48e5e`) 으로 **전부 실행 완료**되었다. 현재 남은 것은 §6 `POST-REFACTOR` 항목뿐이며, 이는 **리팩터링 종료 후 착수 대상**이지 현재 실행 대상이 아니다. 본 문서는 그 시점의 조사 기록이며 현행 정책 문서가 아니다.

---

## 1. 진입 조건

| 항목 | 결과 |
|---|---|
| `git status --short` | 출력 없음 (**clean**) |
| `git branch --show-current` | `main` |
| `git rev-parse HEAD` | `efcd54f8a01d5556d4c9db25f510f4108d0f25c4` |
| `git status -sb` | `## main...origin/main` (ahead/behind 없음) |
| `git pull --ff-only origin main` | `Already up to date.` |
| `pnpm install --frozen-lockfile` | `Done in 15.3s using pnpm v10.25.0` — **exit 0** |
| build | 문서 조사 작업이므로 **미실행** (지시대로) |

다른 세션의 미커밋 변경 **없음**. 중지 조건 §9-7 미해당.

---

## 2. `efcd54f8a`에서 이미 해결된 항목 — `RESOLVED`

본 IR의 신규 조사 대상에서 제외한다. 이력으로만 기록한다.

| 항목 | 조치 | 판정 |
|---|---|---|
| `QUICK-START.md` | 삭제 (SETUP.md로 통합) | `RESOLVED` |
| `README-LOCAL-DEV.md` | 삭제 (SETUP.md로 통합) | `RESOLVED` |
| `GCP-SETUP-GUIDE.md` | 삭제 (SETUP.md로 통합) | `RESOLVED` |
| 공통 개발환경 안내 산재 | `SETUP.md` 단일 문서로 통합 | `RESOLVED` |
| `.env.example` DB 블록 (MySQL/3306/`DATABASE_*`) | PostgreSQL/5432/`DB_*` 로 정정 | `RESOLVED` |
| `gcloud.cmd` 하드코딩 (`C:\Users\sohae\...`) | PATH 우선 + `%LOCALAPPDATA%` fallback | `RESOLVED` |
| `authenticate-gcp.cmd` 하드코딩 | `%~dp0gcloud.cmd` 위임 | `RESOLVED` |

> 참고: 그 직전 커밋 `0015f8d2b`에서 `scripts/update-claude-md.cjs`, `.cursor/.cursorrules`, 루트 일회성 산출물이 이미 제거됐다. 본 IR에서 재평가하지 않는다.

---

## 3. 현재 환경 지도 (실측)

```text
[Git 시작·종료]
  git status --short → git branch --show-current → git fetch/pull --ff-only origin main
  main 직접 작업 (CLAUDE.md §1) · path-specific stage (AGENTS.md §4)
  기준 문서: CLAUDE.md §1 / AGENTS.md §4 / SETUP.md §5
       ↑ 3곳에 분산. 단일 "작업 시작 절차" 블록은 어디에도 없음.

[패키지 설치]
  pnpm install --frozen-lockfile
  Volta pin: node 22.18.0 / pnpm 10.25.0   ← 실측 일치 (node v22.18.0, pnpm 10.25.0)
  engines : node >=22.18.0 / pnpm >=9.0.0
  .nvmrc  : 22.18.0
  packageManager 필드: 없음

[build 기준]
  root package.json : build / build:packages / build:apps / build:api / build:admin ... (약 25종)
  CI(ci-pipeline)   : lint + type-check:frontend + typecheck:app-store-packages + build
  AGENTS.md §3      : "typecheck/build/test" (범위 미지정)
  AGENTS.md §12     : pnpm --filter @o4o/web-neture build / pnpm test / pnpm run type-check
  SETUP.md §5       : type-check / lint / test / verify
  CLAUDE.md         : build·type-check·pnpm 언급 0건  ← 기준 부재

[로컬 DB]
  SETUP.md          : 로컬 PostgreSQL 설치하지 않음. Cloud SQL Proxy 경유.
  apps/api-server/README-LOCAL-SETUP.md : 네이티브 PostgreSQL 설치 + 로컬 DB/유저 생성
       ↑ 정면 충돌

[운영 DB · Proxy · ADC]
  bin/cloud-sql-proxy.exe ← setup-cloud-sql-proxy.cmd 로 설치
  start-cloud-sql-proxy.cmd → netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1:5432
  authenticate-gcp.cmd → gcloud auth application-default login
  CLAUDE.md §0 : read-only SELECT 허용 / write 는 사용자 승인

[환경변수]
  .env.example (루트, 추적)      : 공통 예제
  apps/api-server/env.example    : API 서버 예제 (PostgreSQL, DB_*)
  .env / .env.local / ... : .gitignore 85-90 로 전부 미추적
  docs/local/*.local.md   : .gitignore 139 로 미추적 (TEST-ACCOUNTS.local.md, mfds-api-key.local.md)

[Claude Code]
  CLAUDE.md (추적, 470L) — 헌법
  .claude/settings.json, .claude/settings.local.json — .gitignore 118 로 **미추적**
       → 저장소 레벨 Claude Code 설정은 존재하지 않음. 전부 머신 로컬.

[Codex]
  AGENTS.md (추적, 119L) — Codex 실행 지침
  .codex/ — 이 checkout 에 **없음**. .gitignore 에도 **미등록**.
  docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md — Codex 도입 기록 (일부 STALE)

[MCP]
  .mcp.json — 로컬에 존재하나 .gitignore 136 으로 **미추적** (playwright 1개)
  docs/platform/development/PLAYWRIGHT-MCP.md — repo root .mcp.json 을 "적용된 설정"으로 기술
       ↑ 신규 clone 에는 파일이 없어 문서와 실제가 불일치

[문서 자동화]
  package.json: update:shortcode-docs / update:ai-page-docs / update:docs
       → 대상 스크립트 2개 **모두 부재** (실행 불가)
  CI 에서 문서를 commit/push 하는 워크플로: **0건** (git commit/push 매치 0)
```

---

## 4. 문서·설정별 판정표

### 4-1. AI 작업환경

| 경로 | 현재 역할 | 실제 참조처 | 최신성 | 충돌 | 판정 | 근거 |
|---|---|---|---|---|---|---|
| `CLAUDE.md` | 최상위 헌법 (사업철학·아키텍처·DB·Git·운영·Freeze F1–F12) | `AGENTS.md`(3곳), `README.md`, `SETUP.md`, docs 다수 | Updated 2026-05-07 / v8.10 | build 기준 부재 | `POST-REFACTOR` | 470L. §6 서비스표에 pharmacy-hub 부재(실제 `deploy-web-services.yml`에 배포 대상으로 존재). 축소·분할은 리팩터링 결과 반영 필요 |
| `AGENTS.md` | Codex 실행 지침 | 없음(진입점) | 2026-07-25 시점 기술 | `CLAUDE.md` 하드 종속 3곳 | `POST-REFACTOR` | L4 "CLAUDE.md를 반드시 읽는다", L60 "CLAUDE.md 환경 섹션 참조", L92 "CLAUDE.md 테스트 계정 섹션 확인". 독립화는 공통 기준 문서 신설 전제 |
| `AGENTS.md` L19 | "Node 22.18.0, pnpm **9.x** 사용을 권장" | — | STALE | Volta pin = pnpm **10.25.0** | `LOW-RISK-FIX` | 실측 pnpm 10.25.0. 9.x 권장을 따르면 Volta pin과 어긋남 |
| `AGENTS.md` | SETUP.md 미언급 | — | 공백 | — | `POST-REFACTOR` | Codex는 실행환경 정본 진입점을 모름 |
| `.claude/settings.json` | Claude Code 권한(allow 143) + additionalDirectories 2 | Claude Code 런타임 | 현행 | — | `LOCAL-UNVERIFIED` | `.gitignore:118`로 미추적. **저장소 밖 로컬 파일** |
| `.claude/settings.local.json` | 권한 allow 393 + MCP 활성화 | Claude Code 런타임 | 현행 | — | `LOCAL-UNVERIFIED` | 동일. 미추적 |
| `.codex/` | 없음 | — | — | `.gitignore` 미등록 | `LOW-RISK-FIX` | 아래 §5-2 참조 |
| `.mcp.json` | playwright MCP 1개 | Claude Code | 현행(로컬) | 문서와 불일치 | `LOW-RISK-FIX` | `.gitignore:136` "Per-machine MCP server config (paths/commands differ by host)" — 그러나 실제 내용은 `npx` + 절대경로 0으로 **완전 이식 가능** |
| `docs/platform/development/PLAYWRIGHT-MCP.md` | MCP 설정 가이드 | — | 부분 STALE | `.mcp.json` 미추적 사실 미기재 | `LOW-RISK-FIX` | §1이 "`.mcp.json` (repo root)"를 **적용된 설정**으로 기술. 신규 clone·Codex 세션에는 파일이 없음 |
| `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md` | Codex 도입 기록 | — | 부분 STALE | — | `LOW-RISK-FIX` | L13 "루트 `.mcp.json`: 없음", L150 동일 — 현재는 존재(미추적). L264 "Node 24.18.0, pnpm 10.27.0" — 현재 22.18.0/10.25.0. §16 내용은 §5-2 참조 |

### 4-2. build·검증 기준

| 출처 | 기술 내용 | 판정 | 근거 |
|---|---|---|---|
| `CLAUDE.md` | build·type-check·pnpm 명령 **언급 0건** | 공백 → `POST-REFACTOR` | grep 결과 0. 최상위 문서에 검증 기준 없음 |
| `AGENTS.md` §3 | "4. typecheck/build/test" — 범위·대상 미지정 | 공백 → `POST-REFACTOR` | 전체 build 인지 filter build 인지 판단 불가 |
| `AGENTS.md` §12 | `pnpm --filter @o4o/web-neture build` / `pnpm test` / `pnpm run type-check` | `STALE` 성격 | web-neture 단일 예시가 대표 명령처럼 제시됨 |
| `SETUP.md` §5 | `type-check` / `lint` / `test` / `verify` + "커밋 전 최소 type-check + lint" | `CURRENT` | 직전 커밋에서 작성 |
| `.github/workflows/ci-pipeline.yml` | `lint` + `type-check:frontend` + `typecheck:app-store-packages` + `build` | `CURRENT` | CI 실측 |
| root `package.json` | build 계열 약 25종 (`build:packages`가 15개 패키지 순차 build) | `CURRENT` | — |

**충돌·공백 요약** (신규 정책은 만들지 않음):
1. CI 게이트는 `type-check:frontend`(프론트 한정)인데 문서들은 `type-check`(전체)를 안내 → 로컬과 CI 검증 범위가 다름.
2. `pnpm test`가 CI 어느 워크플로에도 없음. 그러나 `AGENTS.md` §3·§12와 `SETUP.md` §5는 test를 요구.
3. "문서 작업 / 데이터 생산·번역 작업 시 build 생략" 기준을 명문화한 문서가 **어디에도 없음**. 실무상 생략하지만 근거 문서 0건.
4. "공용 패키지 변경 시 어디까지 build" 기준 부재. `build:packages`가 15개를 순차 build하므로 실제로는 전량 재빌드가 유일한 안전 경로.

### 4-3. 잔존 개발환경 문서

| 경로 | 현재 역할 | 참조처 | 판정 | 근거 |
|---|---|---|---|---|
| `SETUP.md` | 로컬 실행환경 정본 | `README.md` | `CURRENT` | `efcd54f8a` |
| `README.md` | 저장소 개요 | — | `CURRENT` | `0015f8d2b` |
| `apps/api-server/README-LOCAL-SETUP.md` | 네이티브 PostgreSQL 로컬 개발 안내 (161L) | **참조 0건** | `LOW-RISK-FIX` | §5-1 참조 — SETUP.md와 정면 충돌 |
| `scripts/README.md` | 스크립트·배포 안내 | `README.md` | `LOW-RISK-FIX` | Cloud Run 서비스명 `o4o-admin-web` 기재 → 실제 `o4o-admin-dashboard`(`deploy-admin.yml:46`). 워크플로 3개만 열거 → 실제 11개, `deploy-web-services.yml`(5서비스) 누락 |
| `docs/guides/common/WORKFLOW.md` | **콘텐츠** 저작 워크플로 | `DOCUMENT-INDEX.md` | `CURRENT` | 개발환경 문서 아님. 이름만 유사, 중복 아님 |
| `docs/README.md` | 문서 폴더 구조 | `README.md` | `POST-REFACTOR` | 27개 디렉터리 중 14개만 선언 (선행 IR §4 기록) |
| `_generated/README.md` + `.gitkeep` | 생성물 디렉터리 | — | `UNVERIFIED` | 추적 파일 2개뿐. 생성 주체 미확인 |

### 4-4. 문서·설정 자동화

| 대상 | 상태 | 호출처 | 판정 | 근거 |
|---|---|---|---|---|
| `package.json` `update:shortcode-docs` | **실행 불가** | `update:docs` | `REMOVE-CANDIDATE` | 대상 `apps/admin-dashboard/src/scripts/update-shortcode-reference.ts` **부재** |
| `package.json` `update:ai-page-docs` | **실행 불가** | `update:docs` | `REMOVE-CANDIDATE` | 대상 `apps/admin-dashboard/src/scripts/update-ai-page-docs.ts` **부재** |
| `package.json` `update:docs` | **실행 불가** | 없음 (CI·문서 참조 0) | `REMOVE-CANDIDATE` | 위 2개 합성. 호출처 0 |
| `package.json` `clean:sh` | **실행 불가** | 없음 | `REMOVE-CANDIDATE` | `scripts/deploy.sh` **부재** |
| `scripts/verify-{shortcodes,blocks,cpts}.ts` | 존재 | `verify:registry` ← `verify` | `CURRENT` | 파일 실재 확인 |
| `scripts/dev.mjs`, `development/dev.sh`, `install.sh`, `check-typeorm-entities.mjs`, `appstore-guard.ts` | 존재 | package scripts / CI | `CURRENT` | 파일 실재 확인 |
| `scripts/generators/*.ts` (openapi-types / web-admin / web-extension) | 코드 생성기 | package script 등록 **없음** | `UNVERIFIED` | 수동 실행 추정. 문서를 덮어쓰지는 않음 |
| CI 문서 자동 커밋 | **없음** | — | `CURRENT` | `.github/workflows/*.yml`에 `git commit`/`git push` 매치 **0건** |

> **결론**: 향후 문서 정비를 되돌릴 수 있는 자동화는 **없다**. 문서 자동화는 전부 실행 불가 상태이며, CI가 문서를 덮어쓰는 경로도 없다.

### 4-5. 3개 PC 작업경로

| 항목 | 내용 | 판정 |
|---|---|---|
| 집 PC `C:\Users\sohae\o4o-platform` | 사용자 제공 | `USER-PROVIDED` |
| 사무실 PC `C:\Users\home\coding\o4o-platform` | 사용자 제공 · 본 조사 실행 위치 | `USER-PROVIDED` |
| 노트북 `C:\Users\sohae\coding\o4o-platform` | 사용자 제공 | `USER-PROVIDED` |
| 각 PC의 `.env` 존재·내용 | — | `LOCAL-UNVERIFIED` |
| 각 PC의 ADC 인증 상태 | — | `LOCAL-UNVERIFIED` |
| 각 PC의 Cloud SQL Proxy 실행 상태 | — | `LOCAL-UNVERIFIED` |
| 각 PC의 `.claude/`, `.codex/`, `.mcp.json` | — | `LOCAL-UNVERIFIED` |
| 저장소 **추적 파일**이 특정 PC 경로를 고정하는가 | 루트 실행 래퍼(`gcloud.cmd`, `authenticate-gcp.cmd`)는 `efcd54f8a`에서 해소 | `RESOLVED` |
| 저장소 **코드**가 특정 PC 경로를 고정하는가 | `apps/api-server/src/scripts/hff-*.ts` 등 다수가 `C:/Users/sohae/...` 절대경로 하드코딩 | `POST-REFACTOR` (§6-3) |
| PC별 별도 설정 필요성 | 근거 없음 | 기록하지 않음 |

> 경로별 분기 설정이 필요하다는 저장소 근거는 발견되지 않았다. 현재 구조(Volta pin + `.env` 미추적 + PATH 기반 gcloud)는 경로 비의존적이다.

---

## 5. 지금 정비할 후보 — `LOW-RISK-FIX`

§7 7개 조건(현재 작업 혼선 / 불일치 명백 / 기능·아키텍처 무관 / CLAUDE.md·AGENTS.md 구조변경 불요 / CI·배포·DB 불요 / 세션 충돌 낮음 / 되돌릴 가능성 낮음)을 모두 만족하는 항목만 기재한다.

### 5-1. `apps/api-server/README-LOCAL-SETUP.md` — SETUP.md와 정면 충돌 ★최우선

| 항목 | 내용 |
|---|---|
| **문제** | 로컬에 네이티브 PostgreSQL을 설치하고 로컬 DB·전용 유저를 만들라고 안내. `SETUP.md`(Cloud SQL Proxy 경유, 로컬 PostgreSQL 설치 불필요) 및 `CLAUDE.md §0`(기본 환경은 프로덕션)과 **정반대** |
| **추가 근거** | ① 예시 경로가 `/home/sohae21/o4o-platform`(Linux) — 3개 PC 모두 Windows ② 대상 스크립트 `scripts/setup-local-db.sh`는 `sudo apt install postgresql` 기반 Ubuntu 전용 → **Windows에서 실행 불가** ③ 저장소 내 참조 **0건** |
| **영향** | 사람·AI 모두 "로컬 DB를 만들어야 한다"고 오판할 수 있음. 실제로 이 안내가 만드는 로컬 계정명은 과거 루트에 방치됐던 디버그 스크립트의 자격증명과 동일 계열 |
| **변경 예상 범위** | 문서 1건 (삭제 또는 "폐기 — SETUP.md 참조" 헤더 추가). `scripts/setup-local-db.sh`·`scripts/dev-start.sh`·`api-server`의 `setup:local`·`dev:quick` 스크립트는 **별도 판단** (실재하므로 즉시 삭제 대상 아님) |
| **위험** | 낮음. 참조 0건 |
| **별도 WO** | 필요 (후속 WO 1에 포함) |

### 5-2. `.codex/` 가 `.gitignore`에 없음 — 실수 커밋 위험

| 항목 | 내용 |
|---|---|
| **문제** | `.codex/`는 현재 checkout에 없고 `.gitignore`에도 등록돼 있지 않다. `.claude/`(L118)·`.mcp.json`(L136)은 등록돼 있어 **AI 도구 설정 중 Codex만 무방비** |
| **추가 근거** | `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md §16`은 저장소 로컬 `.codex/config.toml`에 `approval_policy = "never"`, `sandbox_mode = "danger-full-access"`를 넣었다고 기록한다. 다른 PC에서 같은 절차를 따르면 해당 파일이 **추적 대상이 되어 커밋될 수 있다** |
| **영향** | 승인 없이 전체 파일시스템 접근을 허용하는 설정이 공유 저장소에 올라갈 수 있음 |
| **변경 예상 범위** | `.gitignore` 1줄 (`.codex/`) |
| **위험** | 낮음. 파일 신설 아님(§4 제외 범위의 "`.codex` 신설"에 해당하지 않음) |
| **별도 WO** | 필요 (후속 WO 1) |

### 5-3. 실행 불가 package script 4종

| 항목 | 내용 |
|---|---|
| **문제** | `update:shortcode-docs`, `update:ai-page-docs`, `update:docs`, `clean:sh` — 대상 파일이 모두 부재하여 호출 즉시 실패 |
| **근거** | `apps/admin-dashboard/src/scripts/update-shortcode-reference.ts` 부재 · `update-ai-page-docs.ts` 부재 · `scripts/deploy.sh` 부재. 호출처(CI·문서·다른 script) **0건** |
| **영향** | AI·사람이 "문서 갱신 명령이 있다"고 판단해 실행 → 실패. `update:docs`는 문서 정비 후 자동 덮어쓰기 우려를 낳지만 실제로는 동작하지 않음 |
| **변경 예상 범위** | `package.json` scripts 4줄 제거 |
| **위험** | 낮음. 다만 `package.json` 변경이므로 **`AGENTS.md` §7 중지 조건("package.json 변경 필요")에 해당** → 반드시 명시 WO로 수행 |
| **별도 WO** | 필요 (후속 WO 1) |

### 5-4. `scripts/README.md` 사실 오류

| 항목 | 내용 |
|---|---|
| **문제** | Cloud Run 서비스명을 `o4o-admin-web`으로 기재. 실제는 `o4o-admin-dashboard` (`deploy-admin.yml:46`). 워크플로를 3개만 열거하나 실제 11개이며 `deploy-web-services.yml`(neture/k-cosmetics/kpa-society/glycopharm/**pharmacy-hub**) 누락 |
| **영향** | 배포 대상 오인. pharmacy-hub 배포 경로가 문서에서 보이지 않음 |
| **변경 예상 범위** | 문서 1건 표 2개 |
| **위험** | 낮음 |
| **별도 WO** | 필요 (후속 WO 1) |

### 5-5. MCP 설정 문서와 실제 불일치

| 항목 | 내용 |
|---|---|
| **문제** | `PLAYWRIGHT-MCP.md §1`이 `.mcp.json`(repo root)을 "적용된 설정"으로 기술하나, 해당 파일은 `.gitignore:136`으로 **미추적**. 신규 clone·다른 PC·Codex 세션에는 존재하지 않음 |
| **부수 논점** | `.gitignore:136` 주석은 "paths/commands differ by host"라 하지만 실제 `.mcp.json` 내용은 `npx` + `--isolated`로 **절대경로 0** — 문서 §1이 명시적으로 "어떤 머신에서도 동일하게 동작"이라고 서술. 즉 미추적 사유와 파일 내용이 서로 어긋남 |
| **영향** | 새 머신에서 Playwright MCP 부재 원인을 문서로 추적할 수 없음 |
| **변경 예상 범위** | 문서에 "이 파일은 미추적이므로 머신마다 직접 생성" 1개 절 추가. **`.gitignore` 정책 변경은 하지 않는다**(추적 전환 여부는 판단 근거 부족 → `UNVERIFIED`) |
| **위험** | 낮음 |
| **별도 WO** | 필요 (후속 WO 1) |

### 5-6. `AGENTS.md` L19 pnpm 버전 표기 — **조건부 제외**

`"Node 22.18.0, pnpm 9.x 사용을 권장"`은 Volta pin `pnpm 10.25.0` 및 실측(10.25.0)과 어긋난다. 사실 오류이나 **`AGENTS.md` 수정은 본 IR 및 후속 WO 1의 제외 범위**(§4)다. 후속 WO 2로 이월한다.

### 5-7. `CHECK-CODEX-ENV-SETUP-V1.md` STALE 기재 — **제외 판단**

`.mcp.json 없음`·`Node 24.18.0` 등이 현행과 다르나, **CHECK 문서는 특정 시점의 기록**이므로 정정 대상이 아니다. `RESOLVED`/`STALE`로 기록만 하고 수정하지 않는다.

---

## 6. 리팩터링 이후 정비 후보 — `POST-REFACTOR`

### 6-1. AI 지침 3분할 (`CLAUDE.md` 축소 · `AGENTS.md` 독립화 · 공통 기준 신설)

| 항목 | 내용 |
|---|---|
| **선행 조건** | 관리자·매장 HUB·공통화 리팩터링 완료. 어떤 규칙이 "공통 사업·아키텍처·안전 기준"으로 남고 어떤 것이 도구별 실행 지침인지 확정 |
| **리팩터링과의 관계** | `CLAUDE.md` §5 Store · §7 Boundary · §11 Operator · §14 Freeze F1–F12 는 전부 리팩터링 대상 영역의 규칙이다. 지금 분할하면 리팩터링 결과를 반영해 **다시 분할해야 한다** |
| **지금 하면 안 되는 이유** | `AGENTS.md`가 `CLAUDE.md`를 하드 참조하는 3곳(L4·L60·L92)을 끊으려면 공통 기준 문서가 먼저 있어야 하고, 그 문서의 목차는 리팩터링 결과에 종속 |
| **통합 가능 작업군** | `AGENTS.md` pnpm 버전 정정(§5-6), Codex의 SETUP.md 진입점 부재, Codex 독립 실행 시 빠지는 규칙(아래) |

**Codex 독립 실행 시 빠지는 규칙 (실측)** — `AGENTS.md`만 읽고는 도달할 수 없는 항목:

| 규칙 | `CLAUDE.md` 위치 | `AGENTS.md` 커버 |
|---|---|---|
| 프로덕션 DB 접속 채널·검증 명령 | §0 | 부분 (§6이 "CLAUDE.md 참조"로 위임) |
| 사업 철학 SSOT 우선순위 체인 | 우선순위 표 | 미커버 (§1이 "상위 baseline"으로만 언급) |
| E-commerce OrderType 계약 / 금지 테이블 | §4 | 미커버 |
| Frozen Baselines F1–F12 목록 | §14 | 미커버 ("동결 Core" 일반 언급만) |
| 디버그 SSR JSON 테스트 페이지 절차 | §8 | 미커버 |
| 콘텐츠 작성 불변 원칙 (의약품 grounding) | 하단 블록 | 미커버 |
| 로컬 실행환경 진입점 (`SETUP.md`) | — | 미커버 (양쪽 모두 없음) |
| 테스트 계정 SSOT 경로 | §15 | 위임 (§9) |

### 6-2. build·검증 기준 재정의

§4-2의 충돌 4건은 **새 정책 수립**이 필요하며, 대상은 리팩터링 후의 패키지 구성이다. 지금 확정하면 `build:packages`의 15개 순차 build 목록이 리팩터링으로 바뀔 때 다시 써야 한다.

### 6-3. 코드 내 머신 경로 하드코딩

`apps/api-server/src/scripts/hff-*.ts` 등 다수가 `C:/Users/sohae/...`를 하드코딩. build tsconfig 제외 대상이라 빌드·CI 영향 0이나, 해당 데이터 트랙 재실행 시 차단된다. 정리는 스크립트 정책(일회성 산출물의 저장소 보존 여부) 확정 후.

### 6-4. 문서 SSOT·INDEX·archive 체계

`docs/README.md` 27개 중 14개만 선언, 유입 90일 ~2,400건 vs 아카이브 ~11건. 선행 IR(`IR-O4O-DOCUMENTATION-AND-AI-ENVIRONMENT-AUDIT-V1`)의 기록을 그대로 승계한다.

### 6-5. `.claude/settings.json` 로컬 정리

두 파일 모두 `.gitignore:118`로 **미추적**임을 확인했다. 다만 `PGPASSWORD=` 형태 할당 4건(`settings.json`), `password=`·`token=` 형태 할당 4건(`settings.local.json`)이 존재한다. **값은 본 문서에 기록하지 않는다.** 저장소 밖 로컬 파일이므로 저장소 작업으로 해결할 수 없다 → §9 중지 조건 4 해당, 사용자 로컬 작업으로 분리.

---

## 7. 중지·미판정 항목

| # | 항목 | 사유 | 조치 |
|---|---|---|---|
| 1 | 각 PC의 `.env`·ADC·Proxy·`.codex` 실제 상태 | 저장소만으로 검증 불가 | `LOCAL-UNVERIFIED` 기록 |
| 2 | `.claude/settings*.json` 자격증명 정리 | 저장소 밖 로컬 파일 (§9-4) | 사용자 로컬 작업으로 분리 |
| 3 | `.mcp.json` 추적 전환 여부 | 미추적 사유(주석)와 파일 내용이 어긋나나 결정 근거 부족 (§9-3) | `UNVERIFIED` — 문서 보완만 제안 |
| 4 | `scripts/setup-local-db.sh` · `dev-start.sh` · `setup:local` · `dev:quick` 존폐 | 파일이 실재하고 Ubuntu 환경에서는 동작 가능. 현행 여부 판단 근거 없음 (§9-3) | `UNVERIFIED` — 문서만 먼저 정리 |
| 5 | `scripts/generators/*.ts` 3종 | package script 미등록, 호출처 불명 | `UNVERIFIED` |
| 6 | `_generated/` 생성 주체 | 추적 파일 2개뿐 | `UNVERIFIED` |
| 7 | `CLAUDE.md` §6 서비스 표의 pharmacy-hub 누락 | `CLAUDE.md` 수정 없이는 결론 불가 (§9-5) | 기록만, 후속 WO 2 |

---

## 8. 후속 WO 제안 (최대 2개)

### 후속 WO 1 — `WO-O4O-DEV-ENV-RESIDUAL-LOW-RISK-CLEANUP-V1` (지금 가능)

리팩터링과 무관한 저위험 정비만 포함한다. `CLAUDE.md`·`AGENTS.md` 구조변경 **없음**.

| # | 대상 | 조치 | 근거 |
|---|---|---|---|
| 1 | `apps/api-server/README-LOCAL-SETUP.md` | 폐기 또는 "SETUP.md 참조" 헤더로 대체 | §5-1 — SETUP.md·CLAUDE.md §0과 정면 충돌, 참조 0건, Windows 실행 불가 |
| 2 | `.gitignore` | `.codex/` 1줄 추가 | §5-2 — 승인 없는 full-access 설정의 실수 커밋 방지 |
| 3 | `package.json` | `update:shortcode-docs` · `update:ai-page-docs` · `update:docs` · `clean:sh` 제거 | §5-3 — 대상 파일 전부 부재, 호출처 0 |
| 4 | `scripts/README.md` | 서비스명 `o4o-admin-web`→`o4o-admin-dashboard`, 워크플로 표 현행화(11개·pharmacy-hub 포함) | §5-4 |
| 5 | `docs/platform/development/PLAYWRIGHT-MCP.md` | "`.mcp.json`은 미추적이므로 머신마다 생성" 절 추가 | §5-5 — `.gitignore` 정책은 변경하지 않음 |

**주의**: 항목 3은 `package.json` 변경이므로 `AGENTS.md` §7의 중지 조건에 해당한다. 반드시 WO에 명시 승인을 포함해야 하며, dependency·lockfile은 건드리지 않는다. `pnpm install --frozen-lockfile` 재확인 필요.

**제외 확인**: `CLAUDE.md`·`AGENTS.md`·`.claude/settings*.json` 무변경. CI·배포·DB·기능 코드 무변경. `.codex` 신설 아님(gitignore 등록만).

### 후속 WO 2 — `WO-O4O-AI-GUIDELINE-AND-BUILD-STANDARD-REALIGNMENT-V1` (리팩터링 종료 후)

| # | 범위 | 선행 조건 |
|---|---|---|
| 1 | 도구 무관 공통 기준 문서 추출 (사업·아키텍처·안전) | 관리자·매장 HUB·공통화 리팩터링 완료 |
| 2 | `CLAUDE.md` 축소 — 공통 기준 이관 후 Claude Code 실행 지침만 잔류 | 1 완료 |
| 3 | `AGENTS.md` 독립화 — L4·L60·L92의 `CLAUDE.md` 하드 참조 제거, §6-1 표의 8개 공백 보완, pnpm 버전 표기 정정(9.x→Volta pin) | 1 완료 |
| 4 | build·검증 기준 단일화 — 전체/부분 build 기준, 문서·데이터 작업 생략 기준, CI 게이트와 로컬 검증 정렬 | 리팩터링 후 패키지 구성 확정 |
| 5 | `CLAUDE.md` §6 서비스 표에 pharmacy-hub 반영 | 2 |
| 6 | `docs/README.md` 개편 + archive 파이프라인 | — |
| 7 | 코드 내 머신 경로 하드코딩 정리 | 일회성 스크립트 보존 정책 확정 |

---

## 9. 검증

| 항목 | 결과 |
|---|---|
| `git diff --check` | 출력 없음 |
| `git status --short` | 신규 파일 1건(`?? docs/investigations/IR-O4O-DEVELOPMENT-ENVIRONMENT-CURRENT-STATE-AND-BOUNDARY-V1.md`) 외 없음 |
| `git diff --name-only` | 출력 없음 (기존 추적 파일 무변경) |
| 변경 파일이 IR 1건인지 | ✅ |
| 실제 자격증명·토큰·비밀번호 기록 | ❌ 없음 — §6-5는 **유형과 건수만** 기록 |
| 기존 문서 수정 | ❌ 없음 |
| 기능 코드·설정 변경 | ❌ 없음 |
| 조사 근거의 실파일 기반성 | 전 항목 파일 존재/부재·grep·package.json·workflow 실측 |
| 추정과 확인 사실 구분 | `UNVERIFIED`·`LOCAL-UNVERIFIED`·`USER-PROVIDED`로 명시 분리 |
| commit·push | ❌ 수행하지 않음 |

---

*Date: 2026-08-06 · read-only IR · 기준 커밋 `efcd54f8a` · 코드/문서/설정/DB/Git 무변경 · 산출물 본 문서 1건 · commit·push 없음.*
