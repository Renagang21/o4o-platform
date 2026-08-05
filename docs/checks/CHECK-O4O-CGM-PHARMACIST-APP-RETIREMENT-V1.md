# CHECK-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1

> **WO**: `WO-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1`
> **목표**: 과거 혈당측정 기반 앱의 잔재인 `cgm-pharmacist-app` 을 코드·라우트·카탈로그·프런트에서 완전히 제거
> **선행**: [`CHECK-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1`](CHECK-O4O-DROPSHIPPING-AND-HEALTH-LEGACY-RETIREMENT-AUDIT-V1.md) §5-2 R5 · [`CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1`](CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1.md) §후속
> **일자**: 2026-08-05
> **판정**: **PASS**

---

## 1. 사전 조사 — 제거 대상의 실제 도달 가능성

| 항목 | 조사 결과 |
|------|-----------|
| admin 라우트 5건 | `apps/admin-dashboard/src/routes/apps.routes.tsx` 에 `/cgm-pharmacist`, `/cgm-pharmacist/patients`, `/cgm-pharmacist/patients/:patientId`, `/cgm-pharmacist/patients/:patientId/coaching`, `/cgm-pharmacist/alerts` 5건 존재. 모두 `<AppRouteGuard appId="cgm-pharmacist-app">` 로 감싸짐 |
| **도달 가능성** | `AppRouteGuard` → `useAppStatus()` → `GET /api/v1/apps/availability` → `AppManager.listInstalled()` → **`app_registry` DB 테이블** 조회. `appsCatalog.ts` 가 아님. `app_registry` 실측 6행 = `annualfee-yaksa` / `digital-signage` / `digital-signage-core` / `membership-yaksa` / `partnerops` / `reporting-yaksa` → **`cgm-pharmacist-app` 미등록** → 모든 접근이 항상 `/error/app-disabled?app=cgm-pharmacist-app` 로 리다이렉트. **도달 불가 dead route 확정** |
| 백엔드 | `packages/cgm-pharmacist-app/src/backend/**` 은 `mock/mockPatients.ts` 기반. api-server 에 **mount 0건** (`src/**` 실참조 0) |
| DB | `cgm_*` 테이블은 마이그레이션 `20260600000000-DropGlucoseviewAndCgmTables` 로 **이미 DROP**. 이관·아카이브 대상 없음 |
| appsCatalog / manifest 등록 | `src/app-manifests/appsCatalog.ts` 항목 **없음**, app-manifest 파일 **없음**, seed 등록 **없음** → 카탈로그 측 변경 불필요 |
| workspace 스텁 | `apps/api-server/packages/cgm-pharmacist-app/package.json` 존재하나 pnpm workspace glob(`apps/*`,`packages/*`,`packages/@o4o-apps/*`,`services/*`) 밖 → inert |

→ **중지 조건 미해당**: 운영 화면·API 소비 0 / `cgm_*` 외 보존 데이터 0 / glucoseview 공유 enum 변경 불요.

---

## 2. 삭제한 대상

### 2-1. 패키지 (39 files, `git rm -r`)

| 경로 | 파일 수 | 내용 |
|------|:---:|------|
| `packages/cgm-pharmacist-app/` | 38 | `manifest.ts`, `adapters/CGMAdapter.ts`, `backend/{controllers,dto,mock,services}`, `frontend/{components,hooks,pages}`, `lifecycle/{install,activate,deactivate,uninstall}`, `tsconfig.json`, `tsup.config.ts` |
| `apps/api-server/packages/cgm-pharmacist-app/package.json` | 1 | workspace 밖 스텁 |

### 2-2. 라우트·화면

| 파일 | 변경 |
|------|------|
| [apps/admin-dashboard/src/routes/apps.routes.tsx](../../apps/admin-dashboard/src/routes/apps.routes.tsx) | lazy import 4건(`CGMPatientListPage` / `CGMPatientDetailPage` / `CGMCoachingPage` / `CGMAlertsPage`) 제거 · `<Route>` 5건 제거 · JSDoc 갱신. 제거 지점에 사유 주석 삽입 |

제거된 화면: 환자 목록 / 환자 상세 / 코칭 / 알림 (전부 mock 데이터 기반).

### 2-3. 빌드·의존성·CI

| 파일 | 변경 |
|------|------|
| [apps/admin-dashboard/package.json](../../apps/admin-dashboard/package.json) | `"@o4o/cgm-pharmacist-app": "workspace:*"` 제거 |
| [apps/admin-dashboard/vite.config.ts](../../apps/admin-dashboard/vite.config.ts) | `resolve.alias` 1건 + `optimizeDeps.include` 1건 제거 |
| [package.json](../../package.json) (root) | `build:cgm-pharmacist-app` 스크립트 삭제 · `build:packages` 체인 말단에서 제거 |
| [.github/workflows/ci-pipeline.yml](../../.github/workflows/ci-pipeline.yml):119 | dist 검증 루프 목록에서 제거 (root `build:packages` 와 동기 — `WO-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1` §6-A 선례) |
| `pnpm-lock.yaml` | 재생성 — `cgm` 문자열 **0건** |

### 2-4. 문서

| 파일 | 변경 |
|------|------|
| [docs/investigations/IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1.md](../investigations/IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1.md) | HOLD/P2 2행 취소선 + **해소(라우트 삭제)** 표기, SERVICE_ONLY 요약행 주석 |

---

## 3. 남긴 항목과 이유 (동명이인 — CGM / health)

| 항목 | 판정 | 이유 |
|------|:---:|------|
| GlycoPharm 도메인의 "CGM"(연속혈당측정기) — `services/web-glycopharm/**`, glycopharm 컨트롤러·엔티티 | **RETAIN** | **제품 카테고리 용어**이며 현행 운영 기능. 패키지 식별자 `cgm-pharmacist-app` 과 무관 |
| `service-groups/index.ts` 의 `forbiddenKeys: ['pharmacy','cgm','lms','membership']` | **RETAIN** | 네비게이션 **메뉴 키 blocklist** 문자열. 패키지 참조 아님 |
| `CGM_PROVIDER` 환경변수 — `.env.apiserver.example:75`, `deploy-cloudrun.sh:136`, `.github/workflows/deploy-api.yml:325` | **RETAIN (범위 외)** | 코드 소비처 **0건**. 배포 env 잔재이나 본 WO 범위(패키지·라우트·카탈로그·프런트) 밖 → 후속 정리 대상으로 기록 |
| `packages/pharmacy-ai-insight` 및 그 `src/backend/utils/glucoseUtils.ts` | **RETAIN** | admin `/pharmacy-ai-insight` 라우트 **LIVE**. 의존 방향은 `cgm-pharmacist-app → pharmacy-ai-insight` (optional) 이며 **역방향 아님** → 삭제 영향 없음 |
| `20260600000000-DropGlucoseviewAndCgmTables` 등 glucoseview 마이그레이션 | **RETAIN** | 실행 이력. 삭제 금지 |
| `glucoseview` service key | **범위 외** | 사용자 지정 후속 WO `WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1` |
| 일반 health check (`/health`, `/health/detailed`, `/health/database`) | **미접촉** | 본 WO 무관 |
| HFF · GlycoPharm 현행 기능 | **미접촉** | 원칙 준수 |
| 병렬 세션 WIP (`apps/api-server/src/scripts/hff-zh-*`, `src/scripts/data/hff-zh-b04-*`) | **미접촉** | 커밋 pathspec 명시로 제외 |

---

## 4. 전역 잔존 참조

식별자 `cgm-pharmacist` / `cgm_pharmacist` / `CGMPharmacist` / `cgmPharmacist` 전역 검색 결과:

| 분류 | 건수 | 판정 |
|------|:---:|------|
| 실행 코드(`.ts`/`.tsx`) 실참조 | **0** | ✅ |
| `apps.routes.tsx` 내 본 WO 사유 주석 | 3 | 의도적 잔존(주석) |
| `pnpm-lock.yaml` | **0** | ✅ 재생성 완료 |
| 과거 감사/CHECK 문서 (`docs/archive/**`, `docs/checks/**`, `docs/investigations/**`) | 다수 | **기록 문서** — 이력이므로 보존 |
| `apps/admin-dashboard/dist-node/**` | 2 | git 미추적 빌드 산출물(재빌드 시 소멸) |

→ **실참조 0 달성**.

---

## 5. 검증 결과 (CI 전 스텝 로컬 재현)

> WO #5(`DROPSHIPPING-LEGACY-REMOVAL`)에서 `multi-tenant Vitest` 스텝 누락으로 CI 1차 실패한 선례를 반영해, **CI 의 모든 테스트 스텝을 로컬에서 재현**했다.

| 검증 | 명령 | 결과 |
|------|------|------|
| 의존성 정합 | `pnpm install --frozen-lockfile` | **EXIT 0** |
| 패키지 빌드 | `pnpm run build:packages` | **EXIT 0** |
| CI dist 루프 미러 | 18개 패키지 dist 존재 확인 | **누락 0** |
| TS (frontend) | `pnpm run type-check:frontend` | **EXIT 0** (admin-dashboard 포함, 기존 `TS2307 @o4o/cgm-pharmacist-app` ×4 **해소**) |
| TS (app-store pkgs) | `pnpm run typecheck:app-store-packages` | **EXIT 0** (CI 상 non-blocking) |
| ESLint | `pnpm run lint` | **EXIT 0** |
| api-server Jest | `pnpm --filter @o4o/api-server test` | **73 suites / 1306 tests PASS** |
| admin-dashboard Vitest | `vitest run` | **14 files / 237 tests PASS** |
| api-gateway Vitest | `vitest run` | **1 file / 1 test PASS** |
| **multi-tenant Vitest** | `cd apps/api-server/tests/multi-tenant && npx vitest run` | **4 files / 75 tests PASS** |
| admin-dashboard 빌드 | `pnpm --filter @o4o/admin-dashboard run build` | **EXIT 0** (built in 46.81s) |
| DB write / migration | — | **0건** (`cgm_*` 는 기존 DROP 완료, 신규 마이그레이션 없음) |

> **참고** — admin Vitest 개수 239 → 237 변동은 병렬 세션 커밋 `5a9826925`(RBAC legacy role 제거)에 기인하며 본 WO 변경과 무관하다. 본 WO 는 테스트 파일을 수정하지 않았다.

### 라우트 미등록 확인

프런트에서 `<Route>` 정의 자체가 제거되어 `/cgm-pharmacist/*` 는 admin SPA 의 catch-all(NotFound)로 귀결된다. 백엔드에는 애초에 대응 API mount 가 없었으므로 서버 측 변화 없음.

---

## 6. 배포 영향

| 항목 | 영향 |
|------|------|
| `o4o-core-api` | **없음** — api-server `src/**` 무변경 (삭제된 스텁은 workspace 밖) |
| admin-dashboard | 번들에서 CGM 청크 소멸. 도달 불가 라우트만 제거되어 **사용자 노출 기능 변화 0** |
| `neture-web` / `glycopharm-web` / `k-cosmetics-web` / `kpa-society-web` | **없음** — 참조 0 |
| DB | **없음** |

---

## 7. 원칙 준수

| 원칙 | 준수 |
|------|:---:|
| 신규 대체 기능 생성 금지 | ✅ |
| DB write · migration 0 | ✅ |
| health check / HFF / GlycoPharm 현행 기능 미접촉 | ✅ |
| 병렬 세션 WIP 미접촉 | ✅ (명시 pathspec 커밋) |
| 삭제 후 package·route·menu·manifest 실참조 0 | ✅ (§4) |

---

## 8. 커밋 · CI

| 항목 | 값 |
|------|-----|
| 커밋 | (본 문서 커밋 시 기재) |
| CI | (GREEN 확인 후 기재) |

---

## 9. 후속 (본 WO 범위 밖 — 기록만)

| 항목 | 비고 |
|------|------|
| `WO-O4O-GLUCOSEVIEW-SERVICE-KEY-RETIREMENT-V1` | 사용자 지정 다음 작업 |
| DB enum · CHECK 제약 마이그레이션 WO | glucoseview 은퇴 후 필요 시 |
| `CGM_PROVIDER` 배포 env 잔재 3곳 | 코드 소비처 0 — 배포 설정 정리 시 함께 제거 |
| `ds_*` CPT 스키마 / dead shortcode / `CornerDisplayBlock` 의 깨진 `/api/v1/dropshipping/core` | WO #5 §8-1 후속 |
