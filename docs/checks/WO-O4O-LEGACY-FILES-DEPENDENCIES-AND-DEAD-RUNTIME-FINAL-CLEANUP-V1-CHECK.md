# WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1 — CHECK

- **상태**: IN_PROGRESS (실행 세션 중단 시점 기록 · 작업공간 이동)
- **작성일**: 2026-09-03
- **branch**: `work/o4o-legacy-final-cleanup-v1`
- **범위**: 남은 legacy 파일 · dependency · dead runtime 최종 정리

이 문서는 **중단 시점의 사실 기록**이다. WO §30 필수 항목 중 미확정 항목은 `UNJUDGED` 로 명시한다.

---

## 1. 전체 census 수

| 축 | 모집단 | 비고 |
|---|---:|---|
| api-server `src/**` (ts/tsx) | 2,509 | main.ts · `src/scripts/**` · `src/database/migrations/**` 기준 도달성 |
| frontend `src/**` (7개 앱) | 2,534 | admin 1,152 / kpa 461 / neture 354 / glyco 298 / kcos 230 / signage 21 / page-generator 18 |
| workspace package manifest | 전수 | zero-consumer dependency 스캔 |
| 루트 임시·mirror 잔재 | 26 | `apps/api-server/packages/**` 21 + 5 |

도달성 판정은 **정적 import graph** 기준이다. 저장소에 `import.meta.glob` · `require.context` 가 0건이므로 정적 분석이 권위를 가진다.

### 분석기 결함과 재산출 (중요)

1차 분석기의 import regex 가 `import(/* webpackChunkName: "x" */ '@/...')` 형태 — 여는 괄호와 문자열 사이의 block comment — 를 매칭하지 못해 **frontend 2건을 오탐(DEAD)** 했다.

- 오탐: `apps/admin-dashboard/src/pages/appearance/TemplatePartEditor.tsx`, `apps/admin-dashboard/src/components/editor/EditorRuntimeWrapper.tsx`
- 발견 경로: 삭제 후 admin-dashboard `tsc --noEmit` 이 TS2307 로 실패
- 조치: 삭제한 frontend 434건을 **전량 복원**한 뒤, `import`/`require` 괄호 뒤 block comment 를 허용하도록 분석기를 고쳐 재산출하고 **432건만 재삭제**
- api-server: 동일 패턴이 **0건**이라 227건 삭제는 영향 없음 (재검증 완료)

---

## 2. 판정 (5 verdict)

### ACTIVE (유지)

- api-server 잔여 미도달 **13건 전부** — 독립 entrypoint 이므로 도달성 미검출이 정상
  - Dockerfile 등록 job 7: `drug-representative-grouping-job` · `drug-seed-candidate-import-job` · `drug-seed-promotion-apply-job` · `drug-shared-description-bulk-canonical-job` · `easy-drug-image-copy-job` · `easy-drug-seed-candidate-import-job` · `easy-drug-shared-description-derive-job`
  - CI 참조: `migrate.ts` (`ci-pipeline.yml` · `deploy-api.yml`)
  - 기타 entrypoint: `server.ts` · `main-minimal.ts` · `jobs/cleanupLoginAttempts.ts` · drug-import service 2
- `apps/api-server/src/types/express.d.ts` — ambient augmentation (import graph 미노출이지만 필수)

### COMPATIBILITY_REQUIRED (유지)

- `/account/supplier/*` legacy redirect 13곳 (`services/web-neture`) — 선행 WO 가 의도적으로 남긴 redirect 전용 트리
- csv-import 계열 10파일 — 선행 WO 가 **외부 소비 확인으로 backend HOLD** 판정. 이번 WO 에서 손대지 않는다 (§32 중지 조건: 외부 consumer 있는 API)

### HISTORY_ONLY

- `apps/api-server/src/migrations/**` 25건 — TypeORM 러너는 `dist/database/migrations/*.js`(prod) 또는 `__dirname + '/migrations/*.ts'` 만 스캔한다. 이 디렉터리는 **러너 미스캔 = 실행 이력 0**. 기록으로만 유지하고 이번에 삭제하지 않는다.
- `docs/checks/**` · `docs/work-orders/**` — CLAUDE.md §16-1 에 따라 정비 대상 아님

### DEAD (제거 완료)

| 대상 | 건수 |
|---|---:|
| api-server 도달불가 소스 | 222 |
| api-server dead test | 5 |
| `apps/api-server/packages/**` mirror stub package.json | 21 |
| `apps/api-server/package-apiserver.json` | 1 |
| 루트 임시 파일 (`tmpcols.cjs` · `tmpdiff.cjs` · `test_import.csv` · `webpack.blocks.config.js`) | 4 |
| frontend 도달불가 소스 | 432 |
| **합계** | **685** |

frontend 내역: admin-dashboard 341 / web-kpa-society 45 / web-neture 23 / web-glycopharm 11 / web-k-cosmetics 6 / signage-player-web 4 / page-generator 2

### DEFERRED_MAJOR

- `store_events` · `organization_product_applications` **테이블 DROP** — entity 정의는 코드에서 제거했으나 물리 테이블은 그대로다. schema migration 은 WO §20 · CLAUDE.md 중지 조건. **별도 승인 필요**
- `packages/cosmetics-seller-extension` 의 `@o4o/ui` **미선언 dependency** — 소스 3곳에서 import 하지만 package.json 에 없다. CI 는 `build:packages` 가 `@o4o/ui` 를 먼저 빌드해서 가려져 있다. dependency 추가는 CLAUDE.md 중지 조건 → **별도 WO**

---

## 3. 삭제 파일 / 수정 파일 / retained legacy

- 삭제: **685**
- 수정: **18** (아래 + 본 CHECK)
  - `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` — mirror stub 부재 단언으로 승격
  - `package.json` · `scripts/install.sh` · `scripts/development/dev.sh` — 존재하지 않는 `packages/blocks/*` · `packages/block-core` 참조 제거 (`build:blocks` · `install:blocks` · `install_blocks()`)
  - dependency 제거 11 manifest + `pnpm-lock.yaml`
  - `scripts/check-typeorm-entities.mjs` · `scripts/lint-ratchet.mjs`
- retained legacy: 위 ACTIVE · COMPATIBILITY_REQUIRED · HISTORY_ONLY 전부

## 4. dependency 제거 / package 제거

zero-consumer dependency **11건** 제거:

| 패키지 | 제거된 dependency |
|---|---|
| cosmetics-seller-extension · education-extension · financial-core · interactive-content-core · lms-core · market-trial · organization-core | `@o4o/types` |
| organization-forum | `@o4o/organization-core` · `@o4o/forum-core` |
| apps/forum-web | `@o4o/types` |
| apps/page-generator | `@o4o/auth-client` |

- `pnpm-lock.yaml` diff = **삭제 34줄 정확히 일치**, 추가 0
- **package 자체 제거는 0건** — 이번 WO 에서 workspace package 은퇴는 하지 않았다 (§32: architecture 확대 금지)

## 5. dead route / controller

- **0건**. 삭제 대상 222건은 전부 `main.ts` 도달성 밖이었고, 마운트된 route·controller 는 포함되지 않았다.
- 따라서 **410/retirement 계약 변경 0건**, API contract 변경 0건.

## 6. dead frontend

432건 (§2 DEAD 표 참조). 라우팅 트리에서 도달 가능한 화면은 제거하지 않았다.

## 7. README / setup 정리

`packages/blocks/*` · `packages/block-core` 는 저장소에 존재하지 않는데 3개 실행 경로가 참조하고 있었다 → 제거.

## 8. silent swallow 판정

- census: api-server **62** · frontend **96** (`catch` 직후 `return null|[]|{}`), 빈 `catch {}` 는 **0건**
- 판정: **선행 트랙 종료됨** — 조회 실패 삼킴 계약화 시리즈가 "실패 → 고정코드 throw · 정상 0건만 통과" 계약으로 이미 닫았다. 남은 사이트는 dead file 이 아니라 살아 있는 경로이므로 **이번 WO(파일 청소) 범위에서 코드 변경 0건**.

## 9. Admin/Operator 중복 판정 — `UNJUDGED`

선행 IR(`ir-neture-supplier-approval-quality-console-canonicalization-audit`)이 **operator 승인 = canonical / admin = DUPLICATE** 로 판정했으나, 본 세션에서 잔재 재확인을 완료하지 못했다. supplier 승인 endpoint 8건 census 만 확보.

## 10. 권한 진입 중복 판정 — `UNJUDGED`

`requireAdmin` 147곳 census 만 확보. 선행 admin API guard P0 트랙이 9번(역할별 프로덕션 smoke)만 남기고 닫혀 있다.

## 11. notification fallback — `UNJUDGED`

`actionUrl` 43곳 census 확보. `fallbackUrl` 은 `types/auth.ts` 1건뿐. 판정 문구 미확정.

## 12. order / settlement residue — `UNJUDGED`

settlement 참조 39파일 census 확보. 판정 문구 미확정.

## 13. local branch / worktree / backup 판정 (census only · 삭제 0)

worktree 4:

| 경로 | branch |
|---|---|
| `C:/Users/home/coding/o4o-platform` | `work/o4o-shortcode-domain-retirement-v1` |
| `.claude/worktrees/cosmetics-ko-guide-full-production-v1` | `worktree-cosmetics-ko-guide-full-production-v1` |
| `C:/tmp/o4o-legacy-cleanup-v1` | `work/o4o-legacy-final-cleanup-v1` (본 작업) |
| `C:/tmp/o4o-signage-wo-wt` | `work/signage-residual-dead-runtime-wo-v1` |

local branch 13 (backup 1 · tmp 1 · work 8 · main · worktree 전용 1 · upstream gone 1).

**WO §20 에 따라 자동 삭제하지 않는다.** destructive Git 작업이므로 사용자 수동 판단 대상이다. `C:\tmp\wo-main-registry` 잔여 디렉터리도 수동 삭제 대상이다.

## 14. 생성물 / temp 잔재

- tracked `dist/**` **0건**
- 미추적 파일 **0건**
- 루트 temp 4건 제거 완료

---

## 15. 검증

| 항목 | 결과 |
|---|---|
| api-server `type-check` | **PASS** (CI 순서 재현: `build:packages` → `pnpm --filter '@o4o/api-server^...' build` → type-check) |
| Jest (api-server) | **PASS 217/217 suites** |
| `check:typeorm-entities` | exit 0 (UNREGISTERED_INVENTORY 31건 정리 · 5건 유지) |
| `check:unsafe-routes` | exit 0 (1,156 파일 · 위반 0) |
| lint-ratchet | exit 0 (error 62 · `ERROR_BASELINE` 64 → 62 하향) |
| api-server build | exit 0 |
| admin-dashboard type-check / build | **PASS / exit 0** |
| web-kpa-society · web-neture · web-k-cosmetics · web-glycopharm · signage-player-web · page-generator | type-check **전부 PASS** · vite build **전부 exit 0** |

### production smoke (read-only · write 0건)

| 대상 | 결과 |
|---|---|
| `GET /health` | 200 (`status: alive`) |
| `GET /health/detailed` | 200 (`status: healthy` · db 15.18 · pingMs 21) |
| `GET /api/v1/auth/status` | 200 (`authenticated: false`) |
| neture.co.kr · glycopharm.co.kr · k-cosmetics.site · kpa-society.co.kr · admin.neture.co.kr | 전부 200 |

**주문/결제 write 0건** (WO §28 준수).

### production DB census

`NO_PRODUCTION_DB_CENSUS` — 이번 정리는 코드 도달성 판정만으로 닫혔고, DB row census 가 필요한 항목(테이블 DROP)은 DEFERRED_MAJOR 로 분리했다.

### CI

push 이후 확인 필요.

---

## 16. UNKNOWN / UNJUDGED / DEFERRED

- **UNKNOWN**: 0
- **UNJUDGED**: 4 — §9 Admin/Operator 중복 · §10 권한 진입 중복 · §11 notification fallback · §12 order/settlement residue
- **DEFERRED**: 2 — 테이블 DROP 2건 · `@o4o/ui` 미선언 dependency

WO §31 의 "작은 dead file · dead dependency · stale route · stale test 는 이번에 끝낸다" 는 **충족**했다. 남은 UNJUDGED 4건은 파일 청소가 아니라 **중복 구조 판정** 축이므로 후속 세션에서 문구를 확정한다.
