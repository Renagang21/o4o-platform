# WO-O4O-API-DEBUG-SEED-ROUTE-OPERATIONAL-BOUNDARY-CLEANUP-V1 — CHECK

**일자:** 2026-08-08
**선행:** `9bf1ed23f` (긴급 차단 — `/__debug__/**` 프로덕션 미등록) → `32f97773f` (debug route 8건 판정·정비)
**이번 범위:** `32f97773f` 가 FOLLOW-UP 으로 남긴 `/api/v1/ops/seed-*` 2건 + 문서 정합성

---

## 1. 전수 조사 판정표

### A. `/__debug__/**` — `32f97773f` 에서 처리 완료 (이번 커밋 변경 없음)

| 경로 | 인증 | DB | 판정 | 처리 |
|------|------|-----|:---:|------|
| `/__debug__/rbac-db-audit` | authenticate+requireAdmin | read-only | A | 제거됨 |
| `/__debug__/service-users` | authenticate+requireAdmin | read-only (PII) | A | 제거됨 |
| `/__debug__/rbac-backfill-user-role` | authenticate+requireAdmin+X-Admin-Secret | INSERT role_assignments | A | 제거됨 (1회성 완료) |
| `/__debug__/approval-test` | **없음** | UPDATE users / INSERT role_assignments | A | 제거됨 |
| `/__debug__/order-canonical-table` | authenticate+requireAdmin | read-only | A | 제거됨 |
| `/__debug__/forum-post-cleanup` | **없음** | DELETE forum_post 외 3테이블 | A | 제거됨 (1회성 완료) |
| `/__debug__/user` | **없음** | (쓰기 제거됨) | D | 비운영 한정 + 읽기 전용화 |
| `/__debug__/pharmacy` | **없음** | POST `/deactivate` → UPDATE organizations | ~~보류~~ → **A 제거** | `WO-O4O-PHARMACY-DEBUG-ROUTE-FINAL-LIFECYCLE-CLEANUP-V1` 에서 router 째 제거 완료 |

### B. `/api/v1/ops/seed-*` — **이번 커밋에서 처리**

| 경로 | 인증 | DB | 판정 | 근거 |
|------|------|-----|:---:|------|
| `/api/v1/ops/seed-store-hub` (POST/DELETE) | `X-Admin-Secret === JWT_SECRET` | users/organizations/organization_members/platform_store_slugs/organization_channels/organization_product_listings/organization_product_channels **INSERT**, `DELETE … LIKE 'e0000000%'` | **A 제거** | `33bccc567`(2026-03-11) 생성, `VERIFICATION-STORE-HUB-STAGE-1` 일회성. 기능 변경 최종 `b28dacb94`(2026-03-22) 이후 휴면. 호출처 0 |
| `/api/v1/ops/seed-neture-offers` (GET/POST/DELETE) | 동일 | `DELETE offer_service_approvals / organization_product_listings / supplier_product_offers / product_masters`, `INSERT product_masters / supplier_product_offers` | **A 제거** | `582dd5285`(2026-04-10) 생성. 전 커밋이 2026-04-10 단일 일자에 집중, 이후 휴면. 호출처 0 |

**공통 위험 (제거 사유):**
1. **`JWT_SECRET` 을 API 키로 재사용** — 이 헤더가 유출되면 토큰 서명키 전체가 노출되는 구조.
2. **프로덕션 등록 상태 (환경 게이트 없음)** — `/__debug__/**` 와 달리 차단된 적이 없다.
3. `seed-store-hub` 는 프로덕션 DB 에 고정 비밀번호 테스트 계정 3건(`store.owner1@test.com` 외)을 생성.
4. 삭제가 UUID prefix `LIKE` 매칭 기반 대량 DELETE.

### C. 인접 경로 — 조사 후 **유지** (이번 커밋 변경 없음)

| 경로 | 인증 | 판정 | 근거 |
|------|------|:---:|------|
| `/api/v1/neture/__test__/tier1/*` (5개) | requireAuth+adminGuard | **E 한시 유지** | 실사용 소비처 존재 — `apps/admin-dashboard/src/pages/neture/Tier1TestPage.tsx:274~433` |
| `/api/v1/neture/operator/product-cleanup/*` | requireAuth+requireNetureScope(`neture:operator`) | **C 정식 운영 기능** | 운영자 메뉴 노출 + 소비처 5곳 (`web-neture` App.tsx:1059 / operatorMenuGroups.ts:63,168 / operatorProductCleanup.ts:25 / serviceApproval.ts:165). 휴지통·복원 포함 |
| `/api/internal/v2/product-policy/*` (9개) | `X-Admin-Secret` = `ADMIN_INTERNAL_SECRET` **또는 `JWT_SECRET` fallback** | **D 유지 (보류 4로 이월)** | `register-routes.ts:1095` 에서 `ENABLE_INTERNAL_V2 === 'true'` 일 때만 등록되어 기본 미노출. 다만 `JWT_SECRET` fallback 은 seed route 와 동일한 안티패턴 |

### D. 별개 축 (혼동 주의)

`apps/admin-dashboard` 의 `/__debug__/auth-bootstrap` · `/__debug__/login` · `/__debug__/neture-tier1` 은 **프런트 React 라우트**로 backend `/__debug__/**` 와 무관하다. CLAUDE.md §8 진단 Entry Point 도 이쪽을 가리킨다.

---

## 2. 호출처 검색 (전 저장소)

| 대상 | 결과 |
|------|------|
| `/api/v1/ops/seed-*` | 프런트·스크립트·테스트·CI·워크플로 **0건**. 문서 참조 1건(`docs/archive/audits/IR-O4O-API-CLEANUP-AUDIT-V1.md:176`) |
| backend `/__debug__/**` | **0건** (프런트 히트는 전부 admin-dashboard 자체 라우트) |
| `dist/**` 히트 | 로컬 빌드 산출물(git 미추적). 소비처 아님 |

---

## 3. 선행 감사 정정

`docs/archive/audits/IR-O4O-API-CLEANUP-AUDIT-V1.md` §6 은 해당 경로들을 **"운영 도구로 모두 유지(KEEP)"** 로 판정했고 `/__debug__/rbac-db-audit` 의 Auth 를 `NONE (read-only)` 로 기재했다. 실제 코드는 `authenticate + requireAdmin` 이었고, 반대로 **인증이 실제로 없던 4건(approval-test / user / pharmacy / forum-post-cleanup)은 그 표에 없다.** 해당 표는 부정확하므로 근거로 재사용하지 않는다. (archive 문서이므로 원문은 수정하지 않는다.)

---

## 4. 변경 내역

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/admin/seed-store-hub.controller.ts` | **삭제** (255줄) |
| `apps/api-server/src/modules/admin/seed-neture-offers.controller.ts` | **삭제** (303줄) |
| `apps/api-server/src/bootstrap/register-routes.ts` | 등록 블록 2개 제거 (−23/+12, 사유·복구 커밋 주석 대체) |
| `docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md` | §7 체크리스트 2항 갱신(게이트 안 등록 강제 + 읽기 전용 원칙 신설), §8 표 현행화 |

`src/modules/admin/` 은 두 파일이 전부여서 디렉터리째 사라졌다. 다른 참조 0건 확인.

**API·권한·DB 영향:** 정식 운영 API 계약 변경 없음 / 권한 모델 변경 없음 / DB schema·migration·데이터 변경 없음. 제거된 것은 운영 계약에 포함되지 않는 일회성 seed HTTP 표면뿐이다.

**복구 경로:** 재실행이 필요하면 `33bccc567`(store-hub) · `582dd5285`(neture-offers) 의 SQL 을 일회성 스크립트로 복원한다. 공개 HTTP route 로 되살리지 않는다.

---

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0, lockfile 변경 없음 |
| `npx tsc --noEmit` (api-server) | ✅ exit 0, 오류 0 |
| `pnpm run type-check` (전 서비스 · 프런트 포함) | ✅ `type-check: OK`, exit 0 |
| `git diff --check` | ✅ exit 0 |
| 제거 route 등록 잔존 | ✅ 0건 (`ops/seed` 잔존 히트는 설명 주석 1줄뿐) |
| dead import / 참조 | ✅ `modules/admin` 참조 0건 |
| 신규 인증 우회·공개 쓰기 route | ✅ 없음 (이번 변경은 제거 전용, 추가된 route 0) |
| 빈 catch·console 임시 코드 | ✅ 없음 |

---

## 6. 보류 항목 (후속 조건)

| # | 항목 | 조건 |
|---|------|------|
| 1 | ~~`/__debug__/pharmacy` POST `/deactivate`~~ | **종결** — `WO-O4O-PHARMACY-DEBUG-ROUTE-FINAL-LIFECYCLE-CLEANUP-V1` 에서 router 전체 제거. 정식 admin API 는 신설하지 않았다 |
| 2 | `/api/v1/neture/__test__/tier1/*` | `Tier1TestPage` 존치/폐기 방침 확정 시 재판정. 현재는 소비처가 있어 제거 불가 |
| 3 | 프로덕션 잔존 데이터 | 두 seed 가 과거 프로덕션에 생성한 픽스처(`e0000000%` / `f0000000%` prefix)의 잔존 여부·정리는 **이번 범위 밖**. DB 변경이므로 별도 승인 필요 |
| 4 | `X-Admin-Secret` + `JWT_SECRET` 패턴 | **잔존 1건** — `modules/product-policy-v2/product-policy-v2.internal.routes.ts:32` 가 `ADMIN_INTERNAL_SECRET \|\| JWT_SECRET` fallback 사용. `ENABLE_INTERNAL_V2` 플래그로 기본 미등록이라 이번엔 손대지 않았다. fallback 제거(= `ADMIN_INTERNAL_SECRET` 필수화)는 환경변수 운영 절차 변경을 수반하므로 별도 WO |
