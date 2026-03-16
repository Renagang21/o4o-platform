# IR-GLYCOPHARM-OPERATOR-SYSTEM-AUDIT-V1

> **GlycoPharm / GlucoseView 운영자 시스템 전수 조사**
>
> Date: 2026-03-16
> Status: Complete
> Scope: GlycoPharm + GlucoseView Operator 구조, 데이터 격리, Dead Code
> 선행 IR: IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1

---

## 1. 조사 요약

| 항목 | GlycoPharm | GlucoseView |
|------|-----------|-------------|
| Backend 컨트롤러 | 3개 | 3개 |
| API 엔드포인트 | 6개 (+ Extension Layer 공유) | 6개 (+ Extension Layer 공유) |
| Frontend 페이지 | 37개 (5개 deprecated) | 10개 |
| Dashboard 패턴 | 5-Block 표준 | 5-Block 표준 |
| 서비스 격리 | SQL 레벨 ✅ (Users 제외) | SQL 레벨 ✅ |
| Dead Code | 5개 deprecated 페이지 | AI Report mock 데이터만 |
| **핵심 문제** | **Users 엔드포인트 격리 미비** | 없음 |

---

## 2. GlycoPharm Operator 구조

### 2-1. Backend Route 구조

**마운트:** `app.use('/api/v1/glycopharm', glycopharmRoutes)` (main.ts)

| Method | Endpoint | Guard | 상태 |
|--------|----------|-------|------|
| GET | `/api/v1/glycopharm/operator/dashboard` | requireGlycopharmScope('glycopharm:operator') | ✅ ACTIVE |
| GET | `/api/v1/glycopharm/operator/recent-orders` | requireGlycopharmScope('glycopharm:operator') | ⚠️ STUB (Phase 4-A) |
| GET | `/api/v1/glycopharm/operator/pending-applications` | requireGlycopharmScope('glycopharm:operator') | ✅ ACTIVE |
| GET | `/api/v1/glycopharm/admin/dashboard` | requireGlycopharmScope('glycopharm:admin') | ✅ ACTIVE |
| GET | `/api/v1/glycopharm/applications/admin/all` | isOperatorOrAdmin() | ✅ ACTIVE |
| PATCH | `/api/v1/glycopharm/applications/:id/review` | isOperatorOrAdmin() | ✅ ACTIVE |

### 2-2. 컨트롤러 구조

| Controller | 파일 | 엔드포인트 수 | 역할 |
|-----------|------|:----------:|------|
| operator.controller.ts | routes/glycopharm/controllers/ | 3 | 5-Block Dashboard + 주문 + 신청 |
| admin-dashboard.controller.ts | routes/glycopharm/controllers/ | 1 | Admin 전용 4-Block Dashboard |
| admin.controller.ts | routes/glycopharm/controllers/ | 2 | 신청 조회 + 승인/거부 |

### 2-3. Dashboard 데이터 소스

**Operator Dashboard** (`/operator/dashboard`) — 5-Block:

| Block | 데이터 소스 | 격리 |
|:-----:|-----------|:----:|
| KPI | organizations + organization_service_enrollments | ✅ `service_code='glycopharm'` |
| AI Summary | glycopharm_applications + glycopharm_products | ✅ glycopharm 전용 테이블 |
| Action Queue | glycopharm_applications (submitted) | ✅ glycopharm 전용 테이블 |
| Activity Log | glycopharm_applications (recent) | ✅ glycopharm 전용 테이블 |
| Quick Actions | 정적 링크 | — |

**Admin Dashboard** (`/admin/dashboard`) — 확장 블록:

| 블록 | 데이터 소스 | 격리 |
|------|-----------|:----:|
| Service Status | organization_service_enrollments | ✅ `service_code='glycopharm'` |
| Store Status | stores (pending approvals) | ✅ |
| Channel Status | store_channels | ✅ |
| Content Status | cms_contents | ✅ `serviceKey='glycopharm'` |
| Forum Status | forum categories | ✅ `service_code='glycopharm'` |
| Product Stats | glycopharm_products | ✅ glycopharm 전용 테이블 |

### 2-4. Frontend 페이지 목록

**Active (32개):**

| 카테고리 | 페이지 | API |
|----------|--------|-----|
| **Dashboard** | GlycoPharmOperatorDashboard | /glycopharm/operator/dashboard |
| **Application** | ApplicationsPage | /glycopharm/applications/admin/all |
| | ApplicationDetailPage | /glycopharm/applications/:id/review |
| **약국 관리** | PharmaciesPage | /glycopharm/operator/pharmacies |
| **상품 관리** | ProductsPage | /glycopharm/operator/products |
| | ProductDetailPage | /glycopharm/operator/products/:id |
| **주문 관리** | OrdersPage | /glycopharm/operator/recent-orders (STUB) |
| **사용자 관리** | UsersPage | /operator/members (Platform) |
| | UserDetailPage | /operator/members/:userId |
| **정산/금융** | ReportsPage | — |
| | BillingPreviewPage | (WO-GLYCOPHARM-BILLING-PREVIEW-API-V1) |
| | InvoicesPage | — |
| | SettlementsPage | — |
| **매장 관리** | StoresPage | /operator/stores |
| | StoreDetailPage | /operator/stores/:storeId |
| | StoreApprovalsPage | Store approval workflow |
| | StoreApprovalDetailPage | — |
| | StoreTemplateManagerPage | Hero/Featured/EventNotice 관리 |
| **커뮤니티** | CommunityManagementPage | — |
| | ForumRequestsPage | — |
| | OperatorForumManagementPage | — |
| **사이니지** | HqMediaPage, HqPlaylistsPage, TemplatesPage | Signage Console API |
| **AI** | AiReportPage | AI Report API |
| **설정** | SettingsPage | — |

**Deprecated (5개 — 삭제 대상):**

| 페이지 | 상태 | 비고 |
|--------|------|------|
| AnalyticsPage | ❌ Sample data only | Route 미등록 가능 |
| InventoryPage | ❌ Sample data only | Route 미등록 |
| MarketingPage | ❌ Sample data only | Route 미등록 |
| SupportPage | ❌ Sample data only | Route 미등록 |
| OperatorTrialSelectorPage | ❌ Removed from routes | WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 |

---

## 3. GlucoseView Operator 구조

### 3-1. Backend Route 구조

**마운트:** `app.use('/api/v1/glucoseview', glucoseviewRoutes)` (main.ts)

| Method | Endpoint | Guard | 상태 |
|--------|----------|-------|------|
| GET | `/api/v1/glucoseview/operator/dashboard` | requireGlucoseViewScope('glucoseview:operator') | ✅ ACTIVE |
| GET | `/api/v1/glucoseview/applications/admin/all` | requireAuth + role check | ✅ ACTIVE |
| GET | `/api/v1/glucoseview/applications/:id/admin` | requireAuth + role check | ✅ ACTIVE |
| PATCH | `/api/v1/glucoseview/applications/:id/review` | requireAuth + role check | ✅ ACTIVE |
| GET | `/api/v1/glucoseview/pharmacists` | requireAuth + requireAdmin | ✅ ACTIVE |
| POST | `/api/v1/glucoseview/pharmacists/:id/approve` | requireAuth + requireAdmin | ✅ ACTIVE |

### 3-2. 컨트롤러 구조

| Controller | 엔드포인트 수 | 역할 |
|-----------|:----------:|------|
| operator-dashboard.controller.ts | 1 | 5-Block Dashboard |
| application.controller.ts | 3 | 신청 조회 + 상세 + 승인/거부 |
| pharmacist.controller.ts | 2 | 약사 목록 + 승인/거부 |

### 3-3. Dashboard 데이터 소스

**Operator Dashboard** (`/operator/dashboard`) — 5-Block:

| Block | 데이터 소스 | 격리 |
|:-----:|-----------|:----:|
| KPI | glucoseview_pharmacies, glucoseview_pharmacists, glucoseview_customers, glucoseview_vendors | ✅ glucoseview 전용 테이블 |
| AI Summary | CopilotEngineService (glucoseview_applications) | ✅ |
| Action Queue | glucoseview_applications (submitted) | ✅ |
| Activity Log | glucoseview_applications (recent) | ✅ |
| Quick Actions | 정적 링크 | — |

### 3-4. Frontend 페이지 목록

**All Active (10개):**

| 페이지 | API | 상태 |
|--------|-----|------|
| GlucoseViewOperatorDashboard | /glucoseview/operator/dashboard | ✅ |
| OperatorApplicationsPage | /glucoseview/applications/admin/all | ✅ |
| OperatorApplicationDetailPage | /glucoseview/applications/:id/admin + review | ✅ |
| OperatorUsersPage | /operator/members (Extension Layer) | ✅ |
| OperatorUserDetailPage | /operator/members/:userId | ✅ |
| OperatorProductsPage | /operator/products (Extension Layer) | ✅ |
| OperatorProductDetailPage | /operator/products/:productId | ✅ |
| OperatorStoresPage | /operator/stores (Extension Layer) | ✅ |
| OperatorStoreDetailPage | /operator/stores/:storeId | ✅ |
| OperatorAiReportPage | Mock data only | ⚠️ Backend 미연결 |

---

## 4. Extension Layer 공유 API

두 서비스 모두 플랫폼 공통 Extension Layer API를 사용:

| API | Mount | Guard | Service Isolation |
|-----|-------|-------|:--:|
| `/api/v1/operator/members` | membership.routes.ts | authenticate + requireRole + injectServiceScope | ⚠️ |
| `/api/v1/operator/products` | products.routes.ts | authenticate + requireRole + injectServiceScope | ✅ |
| `/api/v1/operator/stores` | stores.routes.ts | authenticate + requireRole + injectServiceScope | ✅ |

---

## 5. 서비스 격리 (Service Isolation) 분석

### 5-1. 격리 상태 매트릭스

| 영역 | GlycoPharm | GlucoseView | 격리 방식 |
|------|:----------:|:-----------:|----------|
| Dashboard KPI | ✅ | ✅ | 서비스 전용 테이블 |
| Dashboard AI | ✅ | ✅ | 서비스 전용 테이블 |
| Applications | ✅ | ✅ | 서비스 전용 테이블 |
| Products | ✅ | ✅ | Extension Layer + injectServiceScope |
| Stores | ✅ | ✅ | Extension Layer + injectServiceScope |
| **Users** | **⚠️ HIGH RISK** | **⚠️ MEDIUM RISK** | Extension Layer `/operator/members` |
| CMS Content | ✅ | ✅ | `serviceKey` 필터 |

### 5-2. Users 엔드포인트 격리 문제 (핵심 발견)

**문제 경로:** `GET /api/v1/operator/members`

**GlycoPharm 문제 (HIGH):**
- API는 **전체 플랫폼 사용자**를 반환
- 프론트엔드(UsersPage.tsx)에서 JavaScript로 `serviceKey='glycopharm'` 필터링
- **서버 사이드 격리 없음** — 프론트엔드 우회 시 전체 사용자 노출 가능

**GlucoseView 문제 (MEDIUM):**
- 동일한 `/api/v1/operator/members` 사용
- Extension Layer의 `injectServiceScope`가 적용되어 있으나 실제 쿼리에서 필터링 수준 확인 필요

**정상 기준:**
```sql
-- 기대하는 쿼리
SELECT u.* FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = 'glycopharm'  -- 서비스 격리
```

### 5-3. Role/Permission Guard 비교

| 서비스 | Scope Guard | 구현 방식 |
|--------|-----------|----------|
| GlycoPharm | `requireGlycopharmScope` | @o4o/security-core `createMembershipScopeGuard` |
| GlucoseView | `requireGlucoseViewScope` | @o4o/security-core `createMembershipScopeGuard` |

**허용 역할:**

| 역할 | GlycoPharm | GlucoseView |
|------|:----------:|:-----------:|
| `{service}:admin` | ✅ | ✅ |
| `{service}:operator` | ✅ | ✅ |
| `platform:admin` | ✅ bypass | ✅ bypass |
| `platform:super_admin` | ✅ bypass | ✅ bypass |

**Guard 패턴 불일치:**

| 패턴 | GlycoPharm | GlucoseView |
|------|-----------|-------------|
| Scope Guard (미들웨어) | operator.controller ✅ | operator-dashboard.controller ✅ |
| isOperatorOrAdmin (인라인) | admin.controller ⚠️ | application.controller ⚠️ |
| requireAdmin (레거시) | — | pharmacist.controller ⚠️ |

두 서비스 모두 **혼합 guard 패턴**을 사용. 표준화 필요.

---

## 6. Dead Code 분석

### 6-1. GlycoPharm Dead Code

| 항목 | 유형 | 파일 | 조치 |
|------|------|------|------|
| AnalyticsPage | Frontend 페이지 | pages/operator/AnalyticsPage.tsx | **삭제 가능** |
| InventoryPage | Frontend 페이지 | pages/operator/InventoryPage.tsx | **삭제 가능** |
| MarketingPage | Frontend 페이지 | pages/operator/MarketingPage.tsx | **삭제 가능** |
| SupportPage | Frontend 페이지 | pages/operator/SupportPage.tsx | **삭제 가능** |
| OperatorTrialSelectorPage | Frontend 페이지 | pages/operator/OperatorTrialSelectorPage.tsx | **삭제 가능** |
| getOperatorOrders() | API 스텁 | api/glycopharm.ts | Phase 4-A 완료 시 교체 |

### 6-2. GlucoseView Dead Code

| 항목 | 유형 | 파일 | 조치 |
|------|------|------|------|
| AiReportPage mock data | Frontend placeholder | pages/operator/AiReportPage.tsx | Backend 연결 시 제거 |

### 6-3. Dead Controller/Route

- GlycoPharm: **없음** — 모든 컨트롤러 route 연결됨
- GlucoseView: **없음** — 모든 컨트롤러 route 연결됨

---

## 7. 서비스별 운영 기능 정리

### 7-1. GlycoPharm 운영 기능

| 기능 | 구현 상태 | API |
|------|:--------:|-----|
| Dashboard (5-Block) | ✅ | /glycopharm/operator/dashboard |
| Admin Dashboard (확장) | ✅ | /glycopharm/admin/dashboard |
| 약국 신청 관리 | ✅ | /glycopharm/applications/* |
| 약국 승인/거부 | ✅ | /glycopharm/applications/:id/review |
| 상품 관리 | ✅ | Extension Layer /operator/products |
| 매장 관리 | ✅ | Extension Layer /operator/stores |
| 사용자 관리 | ⚠️ 격리 미비 | Extension Layer /operator/members |
| 주문 관리 | ⚠️ STUB | Phase 4-A 전환 대기 |
| 정산 관리 | ✅ | BillingPreview + Invoices |
| 사이니지 | ✅ | Signage Console |
| 포럼 관리 | ✅ | Forum Management |
| AI 리포트 | ✅ | AI Report API |
| 매장 템플릿 | ✅ | StoreTemplateManager |

### 7-2. GlucoseView 운영 기능

| 기능 | 구현 상태 | API |
|------|:--------:|-----|
| Dashboard (5-Block) | ✅ | /glucoseview/operator/dashboard |
| 약국 신청 관리 | ✅ | /glucoseview/applications/* |
| 약사 승인/거부 | ✅ | /glucoseview/pharmacists/:id/approve |
| 상품 관리 | ✅ | Extension Layer /operator/products |
| 매장 관리 | ✅ | Extension Layer /operator/stores |
| 사용자 관리 | ✅ | Extension Layer /operator/members |
| AI 리포트 | ⚠️ Mock | Backend 미연결 |

---

## 8. 구조 문제 요약

### CRITICAL (즉시 수정 권고)

| # | 문제 | 서비스 | 위험도 |
|:-:|------|--------|:------:|
| C1 | **Users API 서비스 격리 없음** | GlycoPharm | **HIGH** |

GlycoPharm UsersPage가 `/api/v1/operator/members`를 호출하면 **전체 플랫폼 사용자**가 반환됨. 프론트엔드 JavaScript 필터링만 존재.

### HIGH (정비 WO 필요)

| # | 문제 | 서비스 | 설명 |
|:-:|------|--------|------|
| H1 | Guard 패턴 혼재 | 양쪽 | Scope Guard + isOperatorOrAdmin + requireAdmin 3종 혼용 |
| H2 | 주문 API STUB | GlycoPharm | Phase 4-A E-commerce Core 전환 미완료 |

### MEDIUM (정리 WO 가능)

| # | 문제 | 서비스 | 설명 |
|:-:|------|--------|------|
| M1 | Deprecated 페이지 5개 | GlycoPharm | 삭제 가능 (Route 미등록 확인 후) |
| M2 | AI Report mock data | GlucoseView | Backend API 연결 필요 |
| M3 | Admin Dashboard 4-Block 레거시 | GlycoPharm | 5-Block 표준과 별도 4-Block 병존 |

---

## 9. 정비 권고

### 9-1. 즉시 수정 (WO-GLYCOPHARM-OPERATOR-USERS-ISOLATION-V1)

```
문제: /api/v1/operator/members가 전체 사용자 반환
수정: Extension Layer의 membership.routes.ts에서
      injectServiceScope 기반 서버 사이드 필터링 강화
검증: GlycoPharm operator → glycopharm 멤버만 조회
```

### 9-2. Guard 패턴 통일 (WO-O4O-OPERATOR-GUARD-UNIFICATION-V1)

```
현재: 3가지 guard 패턴 혼재
목표: requireServiceScope('{service}:{role}') 단일 패턴
대상: GlycoPharm admin.controller, GlucoseView application.controller, pharmacist.controller
```

### 9-3. Dead Code 정리 (WO-GLYCOPHARM-DEAD-CODE-CLEANUP-V1)

```
삭제: AnalyticsPage, InventoryPage, MarketingPage, SupportPage, OperatorTrialSelectorPage
확인: App.tsx route 미등록 여부 최종 검증 후 삭제
```

### 9-4. 구조 지도

```
┌─────────────────────────────────────────────────────────────┐
│ Extension Layer (Platform 공통)                              │
│ /api/v1/operator/members   → injectServiceScope ⚠️         │
│ /api/v1/operator/products  → injectServiceScope ✅         │
│ /api/v1/operator/stores    → injectServiceScope ✅         │
├─────────────────────────────────────────────────────────────┤
│ GlycoPharm Service Layer                                     │
│ /api/v1/glycopharm/operator/dashboard  → requireGlycopharmScope ✅ │
│ /api/v1/glycopharm/admin/dashboard     → requireGlycopharmScope ✅ │
│ /api/v1/glycopharm/applications/*      → isOperatorOrAdmin ⚠️│
├─────────────────────────────────────────────────────────────┤
│ GlucoseView Service Layer                                    │
│ /api/v1/glucoseview/operator/dashboard → requireGlucoseViewScope ✅│
│ /api/v1/glucoseview/applications/*     → isOperatorOrAdmin ⚠️│
│ /api/v1/glucoseview/pharmacists/*      → requireAdmin ⚠️    │
└─────────────────────────────────────────────────────────────┘

✅ = 서비스 격리 정상
⚠️ = Guard 패턴 불일치 또는 격리 미비
```

---

## 10. 후속 WO

이 조사 결과를 기반으로 다음 WO를 권고:

| 우선순위 | WO | 내용 |
|:--------:|-----|------|
| **P0** | WO-GLYCOPHARM-OPERATOR-USERS-ISOLATION-V1 | Users API 서버 사이드 격리 |
| P1 | WO-O4O-OPERATOR-GUARD-UNIFICATION-V1 | Guard 패턴 통일 |
| P2 | WO-GLYCOPHARM-DEAD-CODE-CLEANUP-V1 | Dead 페이지 5개 삭제 |
| P2 | WO-GLUCOSEVIEW-AI-REPORT-BACKEND-V1 | AI Report Backend 연결 |
| P3 | WO-GLYCOPHARM-ADMIN-DASHBOARD-5BLOCK-V1 | Admin 4-Block → 5-Block 통일 |

---

*Generated: 2026-03-16*
*Investigation: READ-ONLY (코드 수정 없음)*
