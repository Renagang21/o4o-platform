# IR-O4O-OPERATOR-DASHBOARD-API-AUDIT-V1

> **Investigation Report: Operator Dashboard API 구조 전수 조사**
>
> Date: 2026-03-16
> Status: Complete
> Scope: api-server, web-neture, web-glycopharm, web-kpa-society, web-k-cosmetics, admin-dashboard

---

## 1. 조사 배경

Operator Dashboard에서 다음 4개 HTTP 오류가 관측됨:

| 오류 | 엔드포인트 패턴 | HTTP Status |
|------|----------------|:-----------:|
| store-applications | `/api/v1/glycopharm/store-applications` | 404 |
| invoices | `/api/v1/glycopharm/invoices` | 500 |
| signage | `/api/signage/:serviceKey/*` | 401 |
| admin/statistics | `/api/v1/admin/dashboard/*` | 403 |

---

## 2. 프론트엔드 API 호출 전수 목록

### 2-1. Neture (`services/web-neture/`)

**Operator Dashboard**: `NetureOperatorDashboard.tsx`
**API 파일**: `src/lib/api/operator.ts`, `src/lib/api/dashboard.ts`

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/api/v1/operator/copilot/kpi` | GET | Platform KPI (stores, suppliers, products, orders) |
| `/api/v1/operator/copilot/stores` | GET | 최근 생성 매장 |
| `/api/v1/operator/copilot/suppliers` | GET | 공급자 활동 |
| `/api/v1/operator/copilot/products` | GET | 승인 대기 상품 |
| `/api/v1/operator/copilot/trends` | GET | 주문/공급자 트렌드 |
| `/api/v1/operator/copilot/alerts` | GET | 운영 알림 |
| `/api/v1/operator/copilot/ai-summary` | GET | AI 인사이트 |
| `/api/v1/neture/operator/supply-products` | GET | 공급 상품 목록 |
| `/api/v1/neture/supplier/requests` | POST | 공급 요청 생성 |
| `/api/v1/neture/admin/dashboard/summary` | GET | Admin 대시보드 |
| `/api/v1/neture/admin/dashboard/partner-kpi` | GET | 파트너 KPI |
| `/api/v1/neture/supplier/dashboard/summary` | GET | 공급자 대시보드 |
| `/api/v1/neture/partner/dashboard/summary` | GET | 파트너 대시보드 |
| `/api/v1/dashboard/assets/seller-signal` | GET | 셀러 시그널 |

**인증 방식**: `Bearer ${getAccessToken()}`

### 2-2. GlycoPharm (`services/web-glycopharm/`)

**Operator Dashboard**: `GlycoPharmOperatorDashboard.tsx`
**API 파일**: `src/api/glycopharm.ts`, `src/api/store.ts`

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/api/v1/glycopharm/operator/dashboard` | GET | 운영자 대시보드 통합 |
| `/api/v1/glycopharm/store-applications` | GET | 매장 신청 목록 |
| `/api/v1/glycopharm/store-applications/mine` | GET | 내 신청 조회 |
| `/api/v1/glycopharm/store-applications/draft` | POST | 초안 저장 |
| `/api/v1/glycopharm/store-applications` | POST | 신청 제출 |
| `/api/v1/glycopharm/store-applications/:id` | GET | 상세 조회 |
| `/api/v1/glycopharm/store-applications/:id/approve` | POST | 승인 |
| `/api/v1/glycopharm/store-applications/:id/reject` | POST | 반려 |
| `/api/v1/glycopharm/store-applications/:id/supplement` | POST | 보완 요청 |
| `/api/v1/glycopharm/invoices` | GET | 인보이스 목록 |
| `/api/v1/glycopharm/invoices` | POST | 인보이스 생성 |
| `/api/v1/glycopharm/invoices/:id` | GET | 인보이스 상세 |
| `/api/v1/glycopharm/invoices/:id/confirm` | POST | 확정 |
| `/api/v1/glycopharm/invoices/:id/send` | POST | 발송 |
| `/api/v1/glycopharm/invoices/:id/received` | POST | 수령 확인 |
| `/api/v1/glycopharm/invoices/:id/dispatch-log` | GET | 발송 이력 |
| `/api/v1/glycopharm/reports/pharmacies` | GET | 약국 목록 |

**인증 방식**: `Bearer ${getAccessToken()}`

### 2-3. KPA Society (`services/web-kpa-society/`)

**Operator Dashboard**: `KpaOperatorDashboard.tsx`
**API 파일**: `src/api/operator.ts`, `src/lib/api/signageV2.ts`

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/operator/summary` | GET | 운영자 요약 (CMS, Signage, Forum) |
| `/operator/forum-analytics` | GET | 포럼 분석 |
| `/operator/district-summary` | GET | 지구 운영자 요약 |
| `/members` | GET | 대기 회원 목록 |
| `/pharmacy-requests/pending` | GET | 약국 인증 대기 |
| `/api/v1/operator/stores` | GET | 매장 통계 |
| `/organization-join-requests/pending` | GET | 조직 가입 대기 |
| `/api/signage/kpa-society/public/media` | GET | 사이니지 미디어 (공개) |
| `/api/signage/kpa-society/public/playlists` | GET | 사이니지 재생목록 (공개) |

**인증 방식**: `Bearer ${getAccessToken()}` (signage public은 인증 없음)

### 2-4. K-Cosmetics (`services/web-k-cosmetics/`)

**Operator Dashboard**: `KCosmeticsOperatorDashboard.tsx`
**API 파일**: `src/services/operatorApi.ts`

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/cosmetics/admin/dashboard/summary` | GET | 대시보드 요약 |
| `/cosmetics/stores/admin/members` | GET | 매장 회원 목록 |
| `/cosmetics/stores/admin/members/:id/deactivate` | PATCH | 회원 비활성화 |
| `/cosmetics/stores/admin/members/:id/reactivate` | PATCH | 회원 재활성화 |

**인증 방식**: `Bearer ${localStorage.getItem('token')}`

### 2-5. Admin Dashboard (`apps/admin-dashboard/`)

**API 파일**: `src/api/dashboard.ts`

| Endpoint | Method | Purpose |
|----------|:------:|---------|
| `/api/v1/dashboard/assets` | GET | 대시보드 에셋 목록 |
| `/api/v1/dashboard/assets/kpi` | GET | KPI 요약 |
| `/api/v1/dashboard/assets/copy` | POST | 콘텐츠 복사 |
| `/api/v1/dashboard/assets/copied-source-ids` | GET | 복사 완료 ID |
| `/api/v1/dashboard/assets/:id` | PATCH | 에셋 수정 |
| `/api/v1/dashboard/assets/:id/publish` | POST | 게시 |
| `/api/v1/dashboard/assets/:id/archive` | POST | 보관 |
| `/api/v1/dashboard/assets/:id` | DELETE | 삭제 |
| `/api/v1/dashboard/assets/supplier-signal` | GET | 공급자 시그널 |
| `/api/v1/admin/dashboard/system` | GET | 시스템 상태 |
| `/api/v1/admin/dashboard/partners/:id` | GET | 파트너 상세 |
| `/api/v1/admin/dashboard/operations` | GET | 운영 현황 |
| `/users/stats` | GET | 사용자 통계 |

**인증 방식**: `authClient.api.get()` (자동 Bearer 토큰)

---

## 3. API 서버 라우트 등록 현황

### 3-1. main.ts 라우트 마운트

| Base Path | Route Module | 비고 |
|-----------|-------------|------|
| `/api/v1/glycopharm` | `createGlycopharmRoutes()` | invoices, store-applications 포함 |
| `/api/v1/operator` | `createOperatorCopilotRouter()` | Copilot 7개 엔드포인트 |
| `/api/v1/operator/stores` | `operatorStoreRoutes` | Console 매장 관리 |
| `/api/v1/operator/members` | `operatorMemberRoutes` | Console 회원 관리 |
| `/api/v1/operator/products` | `operatorProductRoutes` | Console 상품 관리 |
| `/api/signage/:serviceKey` | `createSignageRoutes()` | 인증 필수 |
| `/api/signage/:serviceKey/public` | `createSignagePublicRoutes()` | 인증 불필요 |
| `/api/v1/admin` | `adminDashboardRoutes` | platform admin 전용 |
| `/api/v1/kpa` | `createKpaRoutes()` | operator/ 하위 포함 |
| `/api/v1/cosmetics` | `createCosmeticsRoutes()` | admin/dashboard 포함 |
| `/api/v1/neture` | `createNetureRoutes()` | admin/dashboard 포함 |

### 3-2. 조사 대상 엔드포인트 존재 여부

| Endpoint Pattern | Controller File | 존재 |
|-----------------|----------------|:----:|
| `/api/v1/glycopharm/store-applications/*` | `store-applications.controller.ts` | YES |
| `/api/v1/glycopharm/invoices/*` | `invoice.controller.ts` | YES |
| `/api/signage/:serviceKey/*` | `signage.routes.ts` | YES |
| `/api/v1/admin/dashboard/*` | `dashboard.routes.ts` | YES |

**결론: 4개 엔드포인트 모두 백엔드에 존재함. 404/500/401/403은 라우트 미등록이 아닌 런타임 조건에서 발생.**

---

## 4. Auth Middleware 체인 분석

### 4-1. 공통 인증 미들웨어

**파일**: `apps/api-server/src/common/middleware/auth.middleware.ts`

```
requireAuth (= authenticate)
├─ Token 추출: Authorization header → httpOnly cookie fallback
├─ Token 없음 → 401 AUTH_REQUIRED
├─ verifyAccessToken() 실패 → 401 INVALID_TOKEN
├─ DB 사용자 조회 실패 → 401 INVALID_USER
└─ 비활성 사용자 → 401 USER_INACTIVE
```

### 4-2. 엔드포인트별 미들웨어 체인

| Endpoint | Auth Chain | 비고 |
|----------|-----------|------|
| `glycopharm/store-applications` | `requireAuth` | 역할 검사 없음 (컨트롤러 내부에서 조건부 체크) |
| `glycopharm/invoices` | `requireAuth` → `isOperatorOrAdmin()` 내부 체크 | glycopharm:admin/operator 또는 platform:admin/super_admin |
| `signage/:serviceKey` | `requireAuth` → `validateServiceKey` → `requireSignageStore`/`requireSignageOperator` | 인증 필수 |
| `signage/:serviceKey/public` | `validateServiceKey` only | **인증 불필요** |
| `admin/dashboard` | `authenticate` → `requireAdmin` | platform:admin/super_admin + legacy admin/super_admin/operator |
| `operator/copilot` | `authenticate` → `requireAdmin` → `injectServiceScope` | platform admin + service scope |

### 4-3. requireAdmin 허용 역할

```typescript
roleAssignmentService.hasAnyRole(userId, [
  'admin',           // legacy
  'super_admin',     // legacy
  'operator',        // legacy
  'platform:admin',
  'platform:super_admin',
])
```

**서비스 운영자 역할 (`neture:operator`, `glycopharm:operator` 등)은 requireAdmin을 통과하지 못함.**

---

## 5. 오류 근본 원인 분석

### 5-1. store-applications: 404

| 항목 | 내용 |
|------|------|
| **라우트 존재** | YES — `glycopharm.routes.ts` line 122: `router.use('/store-applications', ...)` |
| **마운트 경로** | `/api/v1/glycopharm/store-applications` |
| **프론트엔드 호출** | `store.ts` line 311+: `/api/v1/glycopharm/store-applications/mine` 등 |

**분석**: 라우트와 프론트엔드 URL이 일치함. 404가 발생하는 경우:

1. **개별 리소스 조회 시 미발견**: `GET /:id`에서 UUID에 해당하는 application이 DB에 없으면 404 반환
2. **Nginx/Cloud Run 프록시 미설정**: Cloud Run 배포 후 `/api/v1/glycopharm/*` 경로가 프록시에서 누락
3. **CORS preflight 실패**: OPTIONS 요청이 404를 반환하는 경우

**가능성 순위**: ② Proxy 미설정 (70%) > ① 개별 리소스 미발견 (20%) > ③ CORS (10%)

### 5-2. invoices: 500

| 항목 | 내용 |
|------|------|
| **라우트 존재** | YES — `glycopharm.routes.ts`에서 invoice.controller.ts 마운트 |
| **Entity** | `GlycopharmBillingInvoice` — 테이블명: `glycopharm_billing_invoices` |
| **Migration** | `1739180400000-CreateGlycopharmBillingInvoices.ts` (테이블 생성) |
| **Migration** | `1739266800000-AddInvoiceDispatchFields.ts` (dispatch 필드 추가) |
| **Entity 등록** | `connection.ts` line 156: TypeORM DataSource에 등록됨 |

**분석**: Entity와 Migration이 모두 존재하고 등록됨. 500이 발생하는 경우:

1. **Migration 미실행**: 테이블이 DB에 실제로 생성되지 않았을 가능성 (CI/CD로 migration 실행 필요)
2. **Raw SQL 컬럼명 불일치**: `invoice.service.ts`에서 Raw SQL 사용 (`glycopharm_billing_invoices` 직접 참조)
3. **관련 테이블 미존재**: `glycopharm_reports` 등 참조 테이블이 없는 경우
4. **NULL 참조 오류**: `pharmacy_id`나 `supplier_id`가 NULL인 상태에서 JOIN 실패

**가능성 순위**: ① Migration 미실행 (60%) > ② Raw SQL 오류 (25%) > ③④ 기타 (15%)

**확인 방법**: Cloud Console SQL Editor에서 실행:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'glycopharm_billing_invoices'
);
```

### 5-3. signage: 401

| 항목 | 내용 |
|------|------|
| **인증 라우트** | `/api/signage/:serviceKey/*` — `requireAuth` 필수 |
| **공개 라우트** | `/api/signage/:serviceKey/public/*` — 인증 불필요 |
| **KPA 프론트엔드** | `signageV2.ts` — **공개 라우트만 호출** (public/media, public/playlists) |

**분석**: KPA 프론트엔드의 signage 호출 패턴:

```typescript
// signageV2.ts line 58: "Use fetch instead of authClient for public endpoints"
// 인증 불필요 (공개 조회용)
const response = await fetch(`${baseUrl}/public/media?...`);
```

**401 발생 시나리오**:

1. **URL 오류로 인증 라우트 접근**: `/api/signage/kpa-society/media` (public 누락) → requireAuth 미들웨어 → 401
2. **관리자 기능 접근**: 운영자가 사이니지 관리 기능(템플릿 생성, 미디어 업로드)을 사용할 때 토큰이 만료/누락
3. **serviceKey 오류**: `:serviceKey` 파라미터가 잘못된 값이면 `validateServiceKey`에서 경고 후 후속 미들웨어 실패

**가능성 순위**: ① URL에 /public 누락 (50%) > ② 토큰 만료 (30%) > ③ serviceKey 오류 (20%)

### 5-4. admin/statistics: 403

| 항목 | 내용 |
|------|------|
| **라우트** | `/api/v1/admin/dashboard/*` |
| **미들웨어** | `authenticate` → `requireAdmin` |
| **허용 역할** | `admin`, `super_admin`, `operator`, `platform:admin`, `platform:super_admin` |

**분석**: 403 FORBIDDEN은 인증은 성공했으나 권한이 없는 경우.

**서비스 운영자가 403을 받는 이유**:

```
neture:operator     → requireAdmin 체크 → hasAnyRole(['admin','super_admin','operator','platform:admin','platform:super_admin']) → FALSE → 403
glycopharm:operator → 동일 결과 → 403
cosmetics:operator  → 동일 결과 → 403
kpa:operator        → 동일 결과 → 403
```

**서비스 운영자 역할은 `requireAdmin`의 허용 목록에 포함되지 않음.**

Admin Dashboard는 **platform-level** 전용이며, 서비스별 운영자는 자체 대시보드를 사용해야 함:
- Neture: `/api/v1/neture/admin/dashboard/summary`
- GlycoPharm: `/api/v1/glycopharm/operator/dashboard`
- K-Cosmetics: `/api/v1/cosmetics/admin/dashboard/summary`
- KPA: `/api/v1/kpa/operator/summary`

**확정**: 이것은 **의도된 동작**. `requireAdmin`에 서비스 역할을 추가하면 Boundary Policy 위반.

---

## 6. 서비스별 인증/권한 매트릭스

| Endpoint Group | Auth | Role Guard | Service Scope | 비고 |
|----------------|:----:|:----------:|:-------------:|------|
| `operator/copilot/*` | `authenticate` | `requireAdmin` | `injectServiceScope` | Platform admin 전용 |
| `operator/stores/*` | `authenticate` | `requireRole(...)` | `injectServiceScope` | WO-SERVICE-DATA-ISOLATION 적용 |
| `operator/members/*` | `authenticate` | `requireRole(...)` | `injectServiceScope` | WO-SERVICE-DATA-ISOLATION 적용 |
| `operator/products/*` | `authenticate` | `requireRole(...)` | `injectServiceScope` | WO-SERVICE-DATA-ISOLATION 적용 |
| `admin/dashboard/*` | `authenticate` | `requireAdmin` | — | Platform admin 전용 |
| `glycopharm/operator/*` | `requireAuth` | `isOperatorOrAdmin()` | — | 서비스 내부 체크 |
| `glycopharm/store-applications/*` | `requireAuth` | 부분적 (admin 엔드포인트만) | — | 서비스 scope 미적용 |
| `glycopharm/invoices/*` | `requireAuth` | `isOperatorOrAdmin()` | — | 서비스 내부 체크 |
| `signage/:serviceKey/*` | `requireAuth` | `requireSignageStore`/`Operator` | — | serviceKey 기반 |
| `signage/:serviceKey/public/*` | — | — | — | 인증 불필요 |
| `kpa/operator/*` | `authenticate` | `requireKpaScope('kpa:operator')` | — | KPA membership 기반 |
| `cosmetics/admin/dashboard/*` | `requireAuth` | `requireScope('cosmetics:admin')` | — | Cosmetics admin 전용 |
| `neture/admin/*` | `requireAuth` | `requireNetureScope('neture:admin')` | — | Neture admin 전용 |

---

## 7. DB 테이블 존재 확인 대상

오류 원인 확인을 위해 프로덕션 DB에서 검증 필요한 테이블:

```sql
-- invoices 500 확인
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'glycopharm_billing_invoices');

-- 관련 테이블
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'glycopharm_reports');
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'glycopharm_pharmacies');
```

---

## 8. 요약 및 권고

### 오류별 요약

| 오류 | 근본 원인 | 심각도 | 수정 필요 |
|------|----------|:------:|:---------:|
| **store-applications 404** | Proxy/배포 경로 미설정 또는 개별 리소스 미발견 | Medium | 배포 설정 확인 |
| **invoices 500** | Migration 미실행으로 테이블 미존재 가능성 높음 | High | DB 테이블 확인 후 migration 실행 |
| **signage 401** | /public 경로 누락 또는 토큰 만료 | Medium | 프론트엔드 URL 패턴 확인 |
| **admin/statistics 403** | 의도된 동작 — 서비스 운영자는 platform admin 아님 | Low | 수정 불필요 (설계 의도) |

### 후속 WO 후보

1. **WO-GLYCOPHARM-INVOICE-MIGRATION-VERIFY-V1**: invoices 500 해결 — DB 테이블 존재 확인 및 migration 실행
2. **WO-OPERATOR-DASHBOARD-ENDPOINT-ALIGNMENT-V1**: 프론트엔드-백엔드 URL 정합성 통일
3. **WO-SIGNAGE-AUTH-PATTERN-NORMALIZE-V1**: 사이니지 인증/비인증 경로 명확화

---

*Generated: 2026-03-16*
*Investigation: READ-ONLY (코드 수정 없음)*
