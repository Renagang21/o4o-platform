# CHECK-O4O-DIGITAL-SIGNAGE-CORE-EXPRESS-DEPENDENCY-RESIDUAL-CLOSURE-V1

> **WO**: WO-O4O-DIGITAL-SIGNAGE-CORE-EXPRESS-DEPENDENCY-RESIDUAL-CLOSURE-V1
> **작성일**: 2026-09-04
> **상태**: 실행 완료

---

## 1. 기준 SHA

| 항목 | 값 |
|---|---|
| base SHA | `a18130143` (`origin/main`) |
| 작업 branch | `work/digital-signage-core-express-dependency-residual-v1` |
| 작업 위치 | 격리 worktree `C:/tmp/o4o-dsc-express` |

주 저장소 작업트리에 다른 세션 WIP(11 modified · 5 untracked)가 있어
**해당 파일을 수정·삭제·stash 하지 않고** 격리 worktree 에서 진행했다.

### 1-1. 선행 상태 확인 (WO §3)

| 항목 | 최신 main 실측 |
|---|---|
| `apps/digital-signage-agent` | **부재** — retired (`57df27e5e`) |
| `digital-signage-core` backend runtime | **부재** — `src/backend/entities/**` 만 잔존 |
| `SignageCoreEntities` | ACTIVE / 유지 |
| Phase-6 entity 7종 | 유지 |
| Tablet ScreenSet canonical · forced-content 계약 | 유지 |

선행 retirement 가 모두 main 에 반영돼 있어 중지 조건에 해당하지 않는다.

---

## 2. `digital-signage-core` package 현재 상태

소스는 **entity 16 파일 + `index.ts`** 뿐이며 backend runtime(route/controller/service/manifest)은 존재하지 않는다.

```text
packages/digital-signage-core/
  package.json
  tsconfig.json
  src/backend/entities/*.entity.ts   (16 entity)
  src/backend/entities/index.ts
```

package export 는 `.` 과 `./entities` 두 개이며 **둘 다 `dist/backend/entities/index.js`** 를 가리킨다.
저장소 내 실제 소비는 전부 `@o4o-apps/digital-signage-core/entities` 형태다
(api-server entities 등록 · signage repository 7종 · dashboard-assets copy-handler · formatter · test 4종 · deploy-api.yml build).

---

## 3. express consumer census (WO §5 · 미조사 0)

`packages/digital-signage-core/src/**` · `tsconfig.json` 전수 검색.

| 검색어 | 건수 | 분류 |
|---|---:|---|
| `from 'express'` / `from "express"` | 0 | NONE |
| `require('express')` / `require("express")` | 0 | NONE |
| `express.Router` | 0 | NONE |
| `Router` | 0 | NONE |
| `Application` | 0 | NONE |
| `NextFunction` | 0 | NONE |
| `Response` | 0 | NONE |
| `Request` | 1 | **DOC_ONLY** — `SignageAiGenerationLog.entity.ts:46` 의 `// ========== Request ==========` 주석 |
| `express` (문자열) | 1 | **DOC_ONLY** — `Schedule.entity.ts:46` 의 `// cron expression or similar` 주석 |

`src/**` 의 외부 import 는 **`typeorm` 단 하나**다(나머지는 전부 상대경로 entity).

```text
ACTIVE_RUNTIME: 0
TYPE_ONLY: 0
TEST_ONLY: 0
DOC_ONLY: 2 (주석 문자열, consumer 아님)
미조사: 0
```

---

## 4. `@types/express` consumer census (WO §6 · 미조사 0)

`Request` · `Response` · `NextFunction` · `Express` · `Application` · `Router` 타입을
`digital-signage-core` 에서 import 하거나 참조하는 지점 **0건**.

`tsconfig.json` 에 `types` 배열이 없어 **암묵적 전역 type 주입도 없다**
(`extends ../../tsconfig.base.json` · `include: ["src/**/*"]` 만 존재).

WO §6 요구대로 **runtime import 0 만으로 판단하지 않고 type-only consumer 도 0 임을 확인**한 뒤 제거했다.

---

## 5. package.json 판정 (WO §7)

| dependency | 위치 | 판정 |
|---|---|---|
| `express@^4.18.2` | `dependencies` | **REMOVE_RESIDUAL** |
| `@types/express@^4.17.21` | `devDependencies` | **REMOVE_RESIDUAL** |
| `typeorm@^0.3.20` | `dependencies` | KEEP_REQUIRED — entity decorator 사용 |
| `reflect-metadata@^0.2.0` | `peerDependencies` | KEEP_REQUIRED |
| `@types/node` · `typescript` | `devDependencies` | KEEP_REQUIRED |

backend runtime 은퇴 시 함께 제거됐어야 할 잔여이며, 이번에 정리했다.

---

## 6. lockfile 영향 (WO §8)

`pnpm install --lockfile-only` 로 정상 갱신했다(수동 편집 없음).

```text
pnpm-lock.yaml | 6 deletions(-)
  packages/digital-signage-core importer 에서
    express (specifier/version 3줄)
    '@types/express' (specifier/version 3줄)
  만 제거
```

`express@4.21.2` · `@types/express@4.17.23` **snapshot 자체는 lockfile 에 그대로 남는다** —
api-server · forum-api · security-core 등 12개 workspace 가 계속 소비하기 때문이며 정상이다(EXPECTED_OTHER_PACKAGE).
이번 판단 기준은 **importer residue 제거**이고, importer 는 정확히 수렴했다.

`pnpm install --frozen-lockfile` **PASS** — lockfile ↔ workspace 동기화 검증 완료.

---

## 7. root / workspace 영향 (WO §9)

| 축 | 결과 |
|---|---|
| `pnpm-workspace.yaml` | 변경 **0** |
| root `package.json` · build/filter script | 변경 **0** (`deploy-api.yml` 의 `pnpm --filter '@o4o-apps/digital-signage-core' run build` 그대로 동작) |
| tsconfig references | 변경 **0** |
| AppStore / appsCatalog | 변경 **0** |

```text
workspace 구조 변경: 0
```

---

## 8. 실제 수정

```text
packages/digital-signage-core/package.json    - express, - @types/express
pnpm-lock.yaml                                 importer residue 6줄 제거
docs/services/_core/apps/digital-signage-core/app-definition.md   stale 2줄 정합
```

### 8-1. docs 정합 (WO §12)

이전 WO 에서 보고했던 stale 문구를 최신 main 에서 재확인하고 **2줄만** 수정했다.

| 위치 | 이전 | 이후 |
|---|---|---|
| L12 | `렌더링 → digital-signage-agent` | `렌더링 소비처 없음 (digital-signage-agent 은퇴)` |
| L32 | `- digital-signage-agent와 연동` | `- digital-signage-agent 는 은퇴했다 (… · main 57df27e5e) — 연동 대상 없음` |

문서 재설계는 하지 않았다. `## API Routes` 절 등 구조 서술은 **미변경**이며 별도 판단 대상으로 남긴다.

---

## 9. residual census (WO §13)

| 검색 | 결과 | 분류 |
|---|---|---|
| `packages/digital-signage-core` 내 `express` | 1건 (`// cron expression`) | **DOC_ONLY** |
| `packages/digital-signage-core` 내 `@types/express` | **0건** | — |
| `packages/digital-signage-core` 내 `digital-signage-agent` | **0건** | — |
| 코드(`apps`/`packages`/`scripts`/`.github`) 내 `digital-signage-agent` | **0건** | — |
| 다른 workspace 의 `express` 선언 | 12 package | **EXPECTED_OTHER_PACKAGE** |
| `@o4o-apps/digital-signage-core/entities` 소비처 | 16곳 | **EXPECTED_ACTIVE** |

```text
digital-signage-core 관련 UNEXPECTED_RESIDUAL: 0
```

---

## 10. 검증 결과 (WO §14)

| # | 항목 | 결과 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | **PASS** |
| 2 | `node scripts/lint-ratchet.mjs` (build 전) | **PASS** — 59 errors / 1,420 warnings (baseline 62) |
| 3 | `digital-signage-core` build (`tsc`) | **PASS** — 오류 0 |
| 4 | `digital-signage-core` typecheck (`tsc --noEmit`) | **PASS** — 오류 0 |
| 5 | api-server `tsc --noEmit` | 40 errors — **전부 TS2307**(미빌드 workspace package). signage/express 관련 **0건** |
| 6 | AppStore Consistency Guard | **PASS** — 14 packages, Catalog 14/14, FROZEN Core 무결 |
| 7 | signage / Channel retirement / Tablet canonical / forced-content tests | 전체 Jest 에 포함 (아래) |
| 8 | api-server 전체 Jest | **PASS — 219 suites / 3,663 tests** |

### 10-1. api-server TS2307 분리 보고 (WO §14 단서)

40건 모두 **미빌드 workspace package** 참조이며 기존과 동일한 성격이다.

```text
@o4o/platform-core/store-identity 8 · @o4o/forum-core/entities 6 · @o4o/ai-core 6
@o4o/security-core 5 · @o4o/payment-core 4 · @o4o/cpt-registry 4 · @o4o/mail-core 2
@o4o/platform-core/store-policy · @o4o/organization-core · @o4o/market-trial
@o4o/asset-copy-core · @o4o/action-log-core 각 1
```

`@o4o-apps/digital-signage-core` 는 **목록에 없다** — express 제거 후에도 build 산출물이 정상 생성돼
entity type 이 해결됨을 역으로 확인해 준다.

### 10-2. lint baseline 미하향 사유

ratchet 이 `ERROR_BASELINE` 을 59 로 낮추라는 notice 를 냈으나 **하향하지 않았다**.
다른 세션 in-flight branch 가 62 기준이라 무관하게 CI 가 깨진다. 별도 WO 로 유지한다.

### 10-3. 전체 Jest

```text
Test Suites: 219 passed, 219 total
Tests:       3663 passed, 3663 total
```

갱신·삭제·skip 한 test **0건**.

---

## 11. regression 확인 (WO §15 · §17)

| 항목 | 상태 |
|---|---|
| `SignageCoreEntities` | **유지** — entity 파일 무변경 |
| Phase-6 entity 7종 | **유지** |
| Tablet ScreenSet canonical | 영향 **0** |
| forced-content 계약 | 영향 **0** |
| Channel runtime 부활 | **0** — Channel retirement guard PASS |
| `digital-signage-agent` 부활 | **0** |
| `/api/signage/*` 구조 | 변경 **0** |
| dependency 범위 확장 (§16) | **0** — 다른 package·root dependency 미접촉 |
| schema change / migration / table DROP | **0 / 0 / 0** |
| production write / DELETE | **0** — 프로덕션 접근 자체 없음 |
| test skip | **0** |

---

## 12. 문서 정합

발견 1건 / 인라인 수정 1건(WO §12 승인 범위) / SUPERSEDED 표기 0건 / 별도 WO 제안 2건

1. `app-definition.md` stale 2줄 — **이번 PR 에서 수정 완료**
2. 별도 WO — `scripts/lint-ratchet.mjs` `ERROR_BASELINE` 62 → 59 (in-flight branch 정리 후)
3. 별도 WO — Phase-6 entity 7종 + 물리 signage table 처분 판단 (schema·production 영향으로 최후순위)
