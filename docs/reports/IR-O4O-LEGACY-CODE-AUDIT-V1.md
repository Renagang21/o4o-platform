# IR-O4O-LEGACY-CODE-AUDIT-V1

> **Investigation Report — Legacy Code & Structural Debt Audit**
> Date: 2026-03-09
> Status: Complete
> Scope: 전체 코드베이스 (API Server + Frontend + Packages)

---

## Executive Summary

O4O 플랫폼 전체 코드베이스의 기술부채를 전수 조사한 결과:

| 카테고리 | 발견 수 | SAFE_REMOVE | REFACTOR | INVESTIGATE | KEEP |
|----------|:-------:|:-----------:|:--------:|:-----------:|:----:|
| Dead Code | 17 | 17 | 0 | 0 | 0 |
| Dead Routes | 7 | 3 | 0 | 4 | 0 |
| Deprecated Architecture | 23 | 10 | 5 | 3 | 5 |
| Duplicate Logic | 10 | 0 | 6 | 0 | 4 |
| Temporary Code | 12 | 4 | 2 | 6 | 0 |
| Hardcoded Values | 18 | 0 | 14 | 4 | 0 |
| Unused Entities/Tables | 6 | 3 | 0 | 3 | 0 |
| Frontend Dead Code | 4 | 3 | 0 | 1 | 0 |
| **합계** | **97** | **40** | **27** | **21** | **9** |

### 핵심 판정

1. **즉시 삭제 가능 (SAFE_REMOVE)**: 40개 항목 — 코드 영향 없음
2. **리팩토링 필요 (REFACTOR)**: 27개 항목 — 주로 중복 로직 + 하드코딩
3. **추가 조사 필요 (INVESTIGATE)**: 21개 항목 — Phase N-1 제약, 미완성 기능
4. **유지 (KEEP)**: 9개 항목 — 정당한 구조 또는 이미 잘 설계됨

---

## 1. Dead Code (사용되지 않는 코드)

### 1.1 Unused Utility Files (10 files)

| # | File | 내용 | 분류 |
|---|------|------|------|
| D1 | `utils/videoHelper.ts` | YouTube/Vimeo 비디오 메타데이터 추출 | SAFE_REMOVE |
| D2 | `utils/zone-adapter.ts` | Legacy → Zone 기반 콘텐츠 변환 | SAFE_REMOVE |
| D3 | `utils/apiResponse.ts` | sendSuccess/sendError 응답 헬퍼 | SAFE_REMOVE |
| D4 | `utils/errorBoundary.ts` | asyncHandler, 에러 로깅 유틸 | SAFE_REMOVE |
| D5 | `utils/formula.ts` | 폼 필드 계산식 처리 | SAFE_REMOVE |
| D6 | `utils/route-helper.ts` | API 경로 관리 클래스 | SAFE_REMOVE |
| D7 | `utils/cache-invalidation.ts` | 판매자/공급자 캐시 무효화 | SAFE_REMOVE |
| D8 | `utils/errorUtils.ts` | 커스텀 에러 클래스 (api-error.ts와 중복) | SAFE_REMOVE |
| D9 | `utils/operator-policy.utils.ts` | 운영자 정책 조회 함수 | SAFE_REMOVE |
| D10 | `utils/customizer/css-generator.ts` | 테마 CSS 생성 유틸 | SAFE_REMOVE |

**판별 근거**: 전체 코드베이스에서 import 0건.

### 1.2 Unused Middleware (4 files)

| # | File | 내용 | 분류 |
|---|------|------|------|
| D11 | `middleware/analyticsMiddleware.ts` | 분석 추적 미들웨어 | SAFE_REMOVE |
| D12 | `middleware/responseTimeMonitor.ts` | 응답 시간 모니터링 | SAFE_REMOVE |
| D13 | `middleware/sessionActivity.ts` | 세션 활동 추적 | SAFE_REMOVE |
| D14 | `middleware/sso.ts` | SSO 미들웨어 | SAFE_REMOVE |

**판별 근거**: 전체 코드베이스에서 import 0건.

### 1.3 Unused Controllers (2 files)

| # | File | 내용 | 분류 |
|---|------|------|------|
| D15 | `controllers/apps.controller.ts` | AppsController (GET /api/v1/apps) | SAFE_REMOVE |
| D16 | `controllers/MigrationController.ts` | Dropshipping CPT/ACF 초기화 | SAFE_REMOVE |

**판별 근거**: route 파일에서 참조 0건.

### 1.4 Unused Services (1 file)

| # | File | 내용 | 분류 |
|---|------|------|------|
| D17 | `services/AuthServiceV2.ts` | Legacy Auth 서비스 v2 | SAFE_REMOVE |

**판별 근거**: import 0건. `AuthenticationService` (신규)가 대체.

---

## 2. Dead Routes (미사용 API 엔드포인트)

### 2.1 Frontend 호출 없는 API

| # | Endpoint | File | 분류 |
|---|----------|------|------|
| R1 | `POST/GET /api/trial-shipping/*` | `extensions/trial-shipping/index.js` | INVESTIGATE |
| R2 | `POST/GET /api/trial-fulfillment/*` | `extensions/trial-fulfillment/index.js` | INVESTIGATE |
| R3 | `GET/PUT /api/operator/settings/notifications` | `routes/operator-notification.routes.ts` | INVESTIGATE |
| R4 | `GET/POST /api/market-trial/*` | `routes/market-trial.routes.ts` | INVESTIGATE |

**판별 근거**: 전체 프론트엔드 앱에서 호출 참조 0건. 실험적 기능 또는 미완성.

### 2.2 이미 Deprecated된 API (410 Gone 반환)

| # | Endpoint | File | 분류 |
|---|----------|------|------|
| R5 | `POST /suppliers/requests/:id/approve` | `neture.routes.ts:1048` | SAFE_REMOVE |
| R6 | `PATCH /suppliers/requests/:id` | `neture.routes.ts:1059` | SAFE_REMOVE |
| R7 | `POST /suppliers/requests` + 5개 추가 | `neture.routes.ts:1070-3386` | SAFE_REMOVE |

**판별 근거**: 이미 410 Gone 반환. v2 승인 시스템으로 완전 대체됨.

---

## 3. Deprecated Architecture (이전 구조 잔재)

### 3.1 Old Approval System (KPA)

| # | Entity/File | 상태 | 분류 |
|---|-------------|------|------|
| A1 | `kpa-organization-join-request.entity.ts` | @deprecated — KpaApprovalRequest로 대체 | REFACTOR |
| A2 | `kpa-instructor-qualification.entity.ts` | @deprecated — KpaApprovalRequest로 대체 | REFACTOR |
| A3 | `kpa-course-request.entity.ts` | @deprecated — KpaApprovalRequest로 대체 | REFACTOR |
| A4 | `organization-join-request.controller.ts` | dual-query 패턴 (신구 테이블 동시 조회) | REFACTOR |

**현재 상태**: 새 요청은 `KpaApprovalRequest` 통합 테이블에 기록되나, 기존 데이터 읽기를 위해 레거시 테이블도 조회하는 dual-query 패턴 활성.

### 3.2 Old RBAC Remnants

| # | File | 상태 | 분류 |
|---|------|------|------|
| A5 | `services/AuthService.ts` | @deprecated — AuthenticationService로 대체 | SAFE_REMOVE |
| A6 | `modules/auth/dto/register.dto.ts:82,87` | pharmacistRole, businessRoles @deprecated | REFACTOR |
| A7 | `common/middleware/auth.middleware.ts:85,315` | dbRoles 참조 deprecated 주석 | KEEP |

**현재 상태**: RBAC Full Stabilization 완료. `users.role`, `users.roles`, `user_roles` 모두 DB에서 드롭됨. `role_assignments` 단일 소스.

### 3.3 Old Product Structures

| # | File | 상태 | 분류 |
|---|------|------|------|
| A8 | `entities/Product.ts` | @deprecated stub — ecommerce-core로 이동 | KEEP |
| A9 | `entities/Supplier.ts` | Legacy stub — AdminSupplierController에서 사용 | KEEP |

### 3.4 Deprecated Forum/Content

| # | File | 상태 | 분류 |
|---|------|------|------|
| A10 | `routes/forum/forum.routes.ts` | 카테고리 요청 라우트 주석 처리됨 | SAFE_REMOVE |
| A11 | `controllers/forum/ForumCategoryRequestController.ts` | @deprecated — KPA Extension으로 이동 | SAFE_REMOVE |

### 3.5 Deprecated Database Utilities

| # | File | 상태 | 분류 |
|---|------|------|------|
| A12 | `database/run-migration.ts` | @deprecated — CI/CD로 대체 | SAFE_REMOVE |
| A13 | `database/run-migration-revert.ts` | @deprecated — CI/CD로 대체 | SAFE_REMOVE |
| A14 | `database/cli-config.ts` | @deprecated — migration-config.ts로 대체 | SAFE_REMOVE |

### 3.6 Deprecated DTO Fields

| # | File | 상태 | 분류 |
|---|------|------|------|
| A15 | `dto/dashboard.dto.ts:158,164,195,197` | totalOrdersOld, averageOrderValueOld 등 | SAFE_REMOVE |

### 3.7 Entity-Table Mismatch

| # | Issue | 분류 |
|---|-------|------|
| A16 | `NetureSupplierLibrary.entity.ts` — `neture_supplier_contents` 테이블 참조하나 테이블은 드롭됨 | INVESTIGATE |

**위험**: Entity가 존재하지 않는 테이블을 참조. connection.ts에 등록되어 있으면 런타임 에러 가능.

---

## 4. Duplicate Logic (중복 구현)

### 4.1 HIGH Priority

| # | 패턴 | 파일 수 | 분류 |
|---|------|:-------:|------|
| L1 | **Error Class 중복** — `api-error.ts` vs `errorUtils.ts` 동일 에러 클래스 | 2 | REFACTOR |
| L2 | **Auth Context Resolution** — `resolveOrgContext()`, `authenticateAndGetOrg()` 등 동일 패턴 8+ 파일 | 8+ | REFACTOR |

### 4.2 MEDIUM Priority

| # | 패턴 | 파일 수 | 분류 |
|---|------|:-------:|------|
| L3 | **Pagination 파싱** — `Math.min(parseInt(...) \|\| N, MAX)` 21+ 곳에서 반복 | 21+ | REFACTOR |
| L4 | **Product Listing SQL** — `organization_product_listings` JOIN 패턴 3곳 85% 동일 | 3 | REFACTOR |
| L5 | **Entity Ownership 검증** — `SELECT id FROM table WHERE id=$1 AND org_id=$2` 100% 동일 | 3+ | REFACTOR |
| L6 | **Service Key Resolution** — `resolveServiceKeyFromQuery()` vs `resolveServiceKeyFromBody()` 100% 중복 | 1 | REFACTOR |

### 4.3 KEEP (정당한 분리)

| # | 패턴 | 분류 |
|---|------|------|
| L7 | `requirePharmacyOwner` 미들웨어 인스턴스화 (컨트롤러별 독립) | KEEP |
| L8 | Cache 패턴 (`cacheAside` 추상화 완료) | KEEP |
| L9 | Role/Permission 유틸 (중앙화 완료) | KEEP |
| L10 | Response 포맷 (헬퍼 존재, 적용률 낮음) | KEEP |

---

## 5. Temporary Code (임시 코드)

### 5.1 Phase Stubs

| # | File | 내용 | 분류 |
|---|------|------|------|
| T1 | `routes/navigation.routes.ts:19` | Phase R1 stub — empty navigation 반환 | SAFE_REMOVE |
| T2 | `routes/routes.routes.ts:55` | Phase R1 stub — no cache to clear | SAFE_REMOVE |
| T3 | `services/RefreshTokenService.ts` | DEFERRED stub — empty method bodies | SAFE_REMOVE |
| T4 | `services/LoginSecurityService.ts` | DEFERRED stub — empty method bodies | SAFE_REMOVE |

### 5.2 Phase N-1/N-2 제약 (Checkout)

| # | File | 내용 | 분류 |
|---|------|------|------|
| T5 | `controllers/checkout/checkoutController.ts:18-31` | PHASE_N1_CONFIG: MAX_ITEMS=3, MAX_AMOUNT=1,000,000 | INVESTIGATE |
| T6 | `services/checkout.service.ts` | Phase N-2 운영 안정화 마커 | INVESTIGATE |

### 5.3 Mock/Placeholder

| # | File | 내용 | 분류 |
|---|------|------|------|
| T7 | `routes/signage/services/signage.service.ts:907-1001` | AI 콘텐츠 placeholder HTML | INVESTIGATE |
| T8 | `routes/kpa/services/supplier-stats.service.ts:158` | Supplier API `mode = 'mock'` 하드코딩 | INVESTIGATE |
| T9 | `controllers/admin/adminStatsController.ts:13` | Dashboard stats 전체 mock data | INVESTIGATE |

### 5.4 미구현 TODO (HIGH Priority)

| # | File | 내용 | 분류 |
|---|------|------|------|
| T10 | `modules/user/controllers/user-activity.controller.ts:25` | ActivityLog entity 미구현 | INVESTIGATE |
| T11 | `routes/siteguide.routes.ts:42` | API Key DB 검증 미구현 (하드코딩 stub) | INVESTIGATE |
| T12 | `services/ai-operations.service.ts:192` | AI 일일 한도 100 하드코딩 (정책에서 조회해야 함) | REFACTOR |

**참고**: 전체 코드베이스에 65+ TODO 주석 존재. 대부분은 기능 요청이며 버그 아님.

---

## 6. Hardcoded Values (하드코딩)

### 6.1 Service Key 직접 비교 (HIGH)

| # | File | 패턴 | 분류 |
|---|------|------|------|
| H1 | `glycopharm/services/glycopharm-store-data.adapter.ts:41,61,93` | `'glycopharm'` raw SQL | REFACTOR |
| H2 | `glycopharm/services/glycopharm.service.ts:143,150,157` | `'glycopharm'` 직접 문자열 | REFACTOR |
| H3 | `glycopharm/services/invoice.service.ts:116` | `'glycopharm'` SQL INSERT | REFACTOR |
| H4 | `glycopharm/services/report.service.ts:134` | `'glycopharm'` JOIN 조건 | REFACTOR |

**수정 방향**: `SERVICE_KEYS.GLYCOPHARM` 상수 사용으로 변경.

### 6.2 Role 문자열 직접 비교 (MEDIUM)

| # | File | 패턴 | 분류 |
|---|------|------|------|
| H5 | `controllers/templatesController.ts:255,330,372,418` | `.includes('admin')` | REFACTOR |
| H6 | `controllers/admin/adminOrderController.ts:22` | `['admin','operator'].includes(r)` | REFACTOR |
| H7 | `controllers/checkout/checkoutController.ts:274,389` | `['admin','operator'].includes(r)` | REFACTOR |
| H8 | `controllers/forum/ForumController.ts:332,417,955,997` | `['admin','manager'].includes(userRole)` | REFACTOR |

**수정 방향**: RBAC 상수 또는 Guard 유틸리티 사용.

### 6.3 URL 하드코딩 (CLAUDE.md 위반)

| # | File | URL | 분류 |
|---|------|-----|------|
| H9 | `server.ts:43-45` | `https://www.neture.co.kr`, `admin.neture.co.kr`, `partner.neture.co.kr` (CORS) | REFACTOR |
| H10 | `config/swagger-enhanced.ts:202,206` | `https://api-staging.neture.co.kr`, `https://api.neture.co.kr` | REFACTOR |
| H11 | `config/swagger.ts:45` | `https://api.neture.co.kr/api` | REFACTOR |
| H12 | `config/passportDynamic.ts:133` | fallback `https://api.neture.co.kr` | REFACTOR |
| H13 | `services/email.service.ts:431,528,577,623` | fallback `https://admin.neture.co.kr` | REFACTOR |

**수정 방향**: 환경변수에서 읽도록 변경. CLAUDE.md §1: "하드코딩 URL 금지".

### 6.4 Magic Numbers

| # | File | 값 | 분류 |
|---|------|------|------|
| H14 | `services/ai-operations.service.ts:192` | `dailyLimit = 100` | REFACTOR |
| H15 | `controllers/checkout/checkoutController.ts:19-22` | MAX_ITEMS=3, MAX_AMOUNT=1000000 | INVESTIGATE |

### 6.5 Fixed UUID

| # | File | 값 | 분류 |
|---|------|------|------|
| H16 | `services/cpt/dropshipping-cpts.ts:146` | DEFAULT_ORG_ID `00000000-...` | INVESTIGATE |

---

## 7. Unused Entities / Tables

### 7.1 Entity-Table 불일치

| # | Entity | Table | 상태 | 분류 |
|---|--------|-------|------|------|
| E1 | `NetureSupplierLibrary.entity.ts` | `neture_supplier_contents` | 테이블 드롭됨, Entity 잔존 | INVESTIGATE |

### 7.2 등록되었으나 사용 희소

| # | Entity | 사용 빈도 | 분류 |
|---|--------|:---------:|------|
| E2 | `CommissionPolicy` | 테스트 fixture만 | INVESTIGATE |
| E3 | `TemplatePart`, `BlockPattern`, `ReusableBlock` | 최소 사용 | INVESTIGATE |

### 7.3 이미 비활성화 (connection.ts 주석 처리)

| # | Entity Group | 분류 |
|---|-------------|------|
| E4 | Media, MediaFile, MediaFolder (Legacy CMS) | SAFE_REMOVE |
| E5 | Post, PostMeta, Page, PostAutosave (Legacy WP-like) | SAFE_REMOVE |
| E6 | Shipment, Cart, Order(old), Settlement(old) (Legacy Commerce) | SAFE_REMOVE |

---

## 8. Frontend Dead Code

### 8.1 미사용 컴포넌트

| # | File | App | 분류 |
|---|------|-----|------|
| F1 | `components/home/HomeB2BIntroSection_v2.tsx` | web-neture | SAFE_REMOVE |
| F2 | `components/home/HomeCoreValueSection_v2.tsx` | web-neture | SAFE_REMOVE |
| F3 | `components/home/HomeHeroSection_v2.tsx` | web-neture | SAFE_REMOVE |

**판별 근거**: _v2 버전은 어디에서도 import 없음. 원본 (v1)이 활성 사용.

### 8.2 Demo 서비스 (삭제 예정)

| # | File | App | 분류 |
|---|------|-----|------|
| F4 | `DemoLayout.tsx` + `/demo/*` 전체 라우트 | web-kpa-society | INVESTIGATE |

**현재 상태**: 코드에 "전체 삭제 대상" 명시. 분회 서비스 독립 도메인 전환 시 삭제 예정.

### 8.3 Shared Packages

모든 shared package export가 최소 1개 이상의 프론트엔드 앱에서 사용됨. **Dead export 없음.**

---

## 9. 정비 우선순위

### Priority 1: 즉시 삭제 (SAFE_REMOVE) — 위험도 0

영향 없이 바로 삭제 가능. 코드 청결성 확보.

```
총 40개 항목:
- Dead utility files: 10개
- Dead middleware: 4개
- Dead controllers: 2개
- Dead services: 2개 (AuthServiceV2, AuthService)
- Deprecated stubs: 4개 (RefreshTokenService, LoginSecurityService, Phase R1 stubs)
- Deprecated controllers: 1개 (ForumCategoryRequestController)
- Deprecated routes: 1개 (forum.routes.ts 주석 코드)
- Deprecated DB utils: 3개 (run-migration, run-migration-revert, cli-config)
- Deprecated DTOs: 1개 (dashboard.dto.ts deprecated fields)
- 410 Gone endpoints: 8개+ (neture.routes.ts)
- Frontend _v2 components: 3개
- 주석 처리 entities: 3개 그룹
```

**예상 효과**: ~30+ 파일 삭제, 코드베이스 약 3-5% 감소.

### Priority 2: 하드코딩 제거 (REFACTOR) — 위험도 LOW

플랫폼 확장 전 반드시 수행.

```
- Service Key 하드코딩: 4개 파일 (glycopharm)
- Role 문자열 하드코딩: 4개 파일
- URL 하드코딩: 5개 파일 (CLAUDE.md 위반)
```

**예상 공수**: 4-6시간

### Priority 3: 중복 로직 통합 (REFACTOR) — 위험도 MEDIUM

코드 유지보수성 대폭 향상.

```
- Auth Context Resolution: 8+ 파일 → 공통 유틸
- Pagination 파싱: 21+ 곳 → pagination.utils.ts
- Product Listing SQL: 3곳 → query builder
- Entity Ownership 검증: 3+ 곳 → guard utility
- Error Classes: 2개 → 1개로 통합
- Service Key Resolution: 2개 함수 → 1개로 통합
```

**예상 공수**: 15-20시간

### Priority 4: 구조적 정비 (INVESTIGATE → REFACTOR/REMOVE)

추가 조사 후 결정.

```
- KPA Approval dual-query 패턴 정리
- Phase N-1 Checkout 제약 설정화
- Mock/Placeholder 코드 실제 구현
- 미사용 API (trial-shipping, market-trial 등) 처분
- NetureSupplierLibrary Entity-Table 불일치 해소
- KPA Demo 서비스 삭제 시점 결정
```

**예상 공수**: WO별 개별 판단

---

## 10. 전체 정비 로드맵

```
Phase 1: SAFE_REMOVE (즉시)
  → 40개 항목 삭제
  → 0 위험, 코드 청결성

Phase 2: HARDCODING FIX (1주 이내)
  → SERVICE_KEYS 상수화
  → Role 상수화
  → URL 환경변수화

Phase 3: DUPLICATE CONSOLIDATION (2주 이내)
  → 공통 유틸 생성 (pagination, auth-context, entity-guard)
  → SQL query 통합

Phase 4: STRUCTURAL CLEANUP (WO별)
  → KPA Approval 단일화
  → Phase N-1 제약 설정 테이블화
  → Demo 서비스 분리/삭제
```

---

## File Manifest

### 즉시 삭제 대상 (Priority 1)

```
apps/api-server/src/utils/videoHelper.ts
apps/api-server/src/utils/zone-adapter.ts
apps/api-server/src/utils/apiResponse.ts
apps/api-server/src/utils/errorBoundary.ts
apps/api-server/src/utils/formula.ts
apps/api-server/src/utils/route-helper.ts
apps/api-server/src/utils/cache-invalidation.ts
apps/api-server/src/utils/errorUtils.ts
apps/api-server/src/utils/operator-policy.utils.ts
apps/api-server/src/utils/customizer/css-generator.ts
apps/api-server/src/middleware/analyticsMiddleware.ts
apps/api-server/src/middleware/responseTimeMonitor.ts
apps/api-server/src/middleware/sessionActivity.ts
apps/api-server/src/middleware/sso.ts
apps/api-server/src/controllers/apps.controller.ts
apps/api-server/src/controllers/MigrationController.ts
apps/api-server/src/services/AuthServiceV2.ts
apps/api-server/src/services/AuthService.ts
apps/api-server/src/services/RefreshTokenService.ts
apps/api-server/src/services/LoginSecurityService.ts
apps/api-server/src/controllers/forum/ForumCategoryRequestController.ts
apps/api-server/src/database/run-migration.ts
apps/api-server/src/database/run-migration-revert.ts
apps/api-server/src/database/cli-config.ts
services/web-neture/src/components/home/HomeB2BIntroSection_v2.tsx
services/web-neture/src/components/home/HomeCoreValueSection_v2.tsx
services/web-neture/src/components/home/HomeHeroSection_v2.tsx
```

### 하드코딩 수정 대상 (Priority 2)

```
apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts
apps/api-server/src/routes/glycopharm/services/glycopharm.service.ts
apps/api-server/src/routes/glycopharm/services/invoice.service.ts
apps/api-server/src/routes/glycopharm/services/report.service.ts
apps/api-server/src/controllers/templatesController.ts
apps/api-server/src/controllers/admin/adminOrderController.ts
apps/api-server/src/controllers/checkout/checkoutController.ts
apps/api-server/src/controllers/forum/ForumController.ts
apps/api-server/src/server.ts
apps/api-server/src/config/swagger-enhanced.ts
apps/api-server/src/config/swagger.ts
apps/api-server/src/config/passportDynamic.ts
apps/api-server/src/services/email.service.ts
```

---

*Investigation complete. 2026-03-09*
*Total findings: 97 items across 7 categories*
*Recommended first action: WO-O4O-LEGACY-CLEANUP-V1 (Phase 1: SAFE_REMOVE)*
