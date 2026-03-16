# IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1

> **Investigation Report: Operator Dashboard Architecture 전수 조사**
>
> Date: 2026-03-16
> Status: Complete
> Scope: O4O 전체 서비스의 Operator Dashboard 구조
> 선행 IR: IR-O4O-OPERATOR-DASHBOARD-API-AUDIT-V1

---

## 1. Dashboard 화면 구조

### 1-1. 서비스별 Dashboard 컴포넌트

| Service | Dashboard Component | Route Path | Layout |
|---------|-------------------|------------|--------|
| Neture | `NetureOperatorDashboard.tsx` | `/workspace/operator` | `OperatorLayout` |
| GlycoPharm | `GlycoPharmOperatorDashboard.tsx` | `/operator` | `DashboardLayout` |
| KPA Society | `KpaOperatorDashboard.tsx` | `/operator` | Route module 방식 |
| K-Cosmetics | `KCosmeticsOperatorDashboard.tsx` | `/operator` | `DashboardLayout` |
| GlucoseView | `DashboardPage.tsx` | `/operator` | `OperatorLayout` |
| Admin | `AdminDashboard.tsx` | `/dashboard` | `AdminLayout` |

### 1-2. Dashboard 유형

| Service | Block 수 | 패턴 | WO 근거 |
|---------|:-------:|------|---------|
| Neture | 9-Block | Copilot Dashboard (구형) | WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1 |
| GlycoPharm | 5-Block | 통합 Dashboard (신형) | WO-O4O-OPERATOR-UX-GLYCOPHARM-PILOT-V1 |
| KPA Society | 5-Block | Role 분기 (Admin/Operator) | WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1 |
| K-Cosmetics | 5-Block | 통합 Dashboard (신형) | WO-O4O-OPERATOR-UX-K-COSMETICS-PILOT-V1 |
| GlucoseView | 5-Block | 기본 Dashboard | — |
| Admin | Multi-section | Platform 관리자 전용 | — |

### 1-3. 공유 인프라: `@o4o/operator-ux-core`

**위치**: `packages/operator-ux-core/`

5-Block 표준 컴포넌트:

| Block | Component | 용도 |
|:-----:|-----------|------|
| 1 | `KpiGrid` | 핵심 KPI 수치 |
| 2 | `AiSummaryBlock` | AI 인사이트 (info/warning/critical) |
| 3 | `ActionQueueBlock` | 승인 대기/처리 필요 항목 |
| 4 | `ActivityLogBlock` | 최근 활동 로그 |
| 5 | `QuickActionBlock` | 빠른 실행 바로가기 |

**사용 패턴**:
```
서비스 API 호출 → 데이터 변환 (buildServiceConfig) → OperatorDashboardLayout 렌더
```

**적용 현황**:
- GlycoPharm, K-Cosmetics, KPA Society, GlucoseView → 5-Block 표준
- Neture → 9-Block (구형 Copilot 패턴, 미전환)

---

## 2. Operator Sub-Page 구조

### 2-1. Neture (`/workspace/operator/*`)

| 경로 | Page | 기능 |
|------|------|------|
| `/workspace/operator` | Dashboard | 9-Block Copilot |
| `/workspace/operator/registrations` | RegistrationRequestsPage | 매장 등록 승인 |
| `/workspace/operator/supply` | SupplyDashboardPage | 공급 관리 |
| `/workspace/operator/forum-management` | ForumManagementPage | 포럼 관리 |
| `/workspace/operator/signage/hq-media` | SignageHqMediaPage | 사이니지 미디어 |
| `/workspace/operator/signage/hq-playlists` | SignageHqPlaylistsPage | 사이니지 재생목록 |
| `/workspace/operator/signage/templates` | SignageTemplatesPage | 사이니지 템플릿 |
| `/workspace/operator/homepage-cms` | HomepageCmsPage | 홈페이지 CMS |
| `/workspace/operator/ai-report` | OperatorAiReportPage | AI 리포트 |
| `/workspace/operator/ai-card-report` | AiCardReportPage | AI 카드 리포트 |
| `/workspace/operator/ai-operations` | AiOperationsPage | AI 운영 |
| `/workspace/operator/ai/asset-quality` | AssetQualityPage | 에셋 품질 |
| `/workspace/operator/settings/notifications` | EmailNotificationSettingsPage | 알림 설정 |

### 2-2. GlycoPharm (`/operator/*`)

| 경로 | Page | 기능 |
|------|------|------|
| `/operator` | Dashboard | 5-Block 통합 |
| `/operator/applications` | ApplicationsPage | 약국 신청 |
| `/operator/products` | ProductsPage | 상품 관리 |
| `/operator/stores` | OperatorStoresPage | 매장 관리 |
| `/operator/orders` | OrdersPage | 주문 관리 |
| `/operator/settlements` | SettlementsPage | 정산 |
| `/operator/reports` | ReportsPage | 리포트 |
| `/operator/billing-preview` | BillingPreviewPage | 청구 미리보기 |
| `/operator/invoices` | InvoicesPage | 인보이스 |
| `/operator/forum-requests` | ForumRequestsPage | 포럼 요청 |
| `/operator/forum-management` | OperatorForumManagementPage | 포럼 관리 |
| `/operator/community` | CommunityManagementPage | 커뮤니티 관리 |
| `/operator/store-approvals` | StoreApprovalsPage | 매장 승인 |
| `/operator/store-template` | StoreTemplateManagerPage | 매장 템플릿 |
| `/operator/users` | UsersPage | 사용자 관리 |
| `/operator/ai-report` | AiReportPage | AI 리포트 |
| `/operator/signage/*` | Signage 모듈 | 사이니지 |

별도 Admin 경로: `/admin` → `GlycoPharmAdminDashboard`

### 2-3. KPA Society (`/operator/*`)

| 경로 | Page | 기능 |
|------|------|------|
| `/operator` | Dashboard | 5-Block (Role 분기) |
| `/operator/content` | ContentManagementPage | 콘텐츠 관리 |
| `/operator/forum` | ForumManagementPage | 포럼 관리 |
| `/operator/members` | MemberManagementPage | 회원 관리 |
| `/operator/pharmacy-requests` | PharmacyRequestManagementPage | 약국 인증 |
| `/operator/product-applications` | ProductApplicationManagementPage | 상품 신청 |
| `/operator/operators` | OperatorManagementPage | 운영자 관리 |
| `/operator/stores` | OperatorStoresPage | 매장 관리 |
| `/operator/community` | CommunityManagementPage | 커뮤니티 관리 |
| `/operator/legal` | LegalManagementPage | 법률 관리 |
| `/operator/analytics` | ForumAnalyticsDashboard | 포럼 분석 |
| `/operator/audit` | AuditLogPage | 감사 로그 |
| `/operator/ai-report` | OperatorAiReportPage | AI 리포트 |

별도 분회 경로: `/branch-admin/*`, `/branch-operator/*`

### 2-4. K-Cosmetics (`/operator/*`)

| 경로 | Page | 기능 |
|------|------|------|
| `/operator` | Dashboard | 5-Block 통합 |
| `/operator/applications` | OperatorApplicationsPage | 매장 신청 |
| `/operator/products` | OperatorProductsPage | 상품 관리 |
| `/operator/stores` | OperatorStoresPage | 매장 관리 |
| `/operator/orders` | OperatorOrdersPage | 주문 관리 |
| `/operator/signage/*` | Signage 모듈 | 사이니지 |
| `/operator/users` | OperatorUsersPage | 사용자 관리 |
| `/operator/ai-report` | OperatorAiReportPage | AI 리포트 |
| `/operator/store-cockpit` | StoreCockpitPage | 매장 콕핏 |
| `/operator/community` | CommunityManagementPage | 커뮤니티 관리 |

별도 Admin 경로: `/admin` → 동일 Dashboard 컴포넌트 재사용

### 2-5. GlucoseView (`/operator/*`)

| 경로 | Page | 기능 |
|------|------|------|
| `/operator` | OperatorLayout | Dashboard |
| `/operator/applications` | OperatorApplicationsPage | 신청 관리 |
| `/operator/users` | OperatorUsersPage | 사용자 관리 |
| `/operator/products` | OperatorProductsPage | 상품 관리 |
| `/operator/stores` | OperatorStoresPage | 매장 관리 |
| `/operator/ai-report` | OperatorAiReportPage | AI 리포트 |

---

## 3. Dashboard API 구조

### 3-1. API Base Path 비교

| Service | Operator API Base | Admin API Base |
|---------|------------------|----------------|
| Neture | `/api/v1/operator/copilot/*` | `/api/v1/neture/admin/*` |
| GlycoPharm | `/api/v1/glycopharm/operator/*` | `/api/v1/glycopharm/operator/*` (동일) |
| KPA Society | `/api/v1/kpa/operator/*` | — |
| K-Cosmetics | `/api/v1/cosmetics/admin/dashboard/*` | `/api/v1/cosmetics/admin/*` (동일) |
| GlucoseView | — (별도 API 없음) | — |
| Platform | — | `/api/v1/admin/dashboard/*` |

**구조 불일치 1**: Neture는 `/operator/copilot/*` (platform 레벨), 나머지는 `/{service}/operator/*` (서비스 레벨)
**구조 불일치 2**: K-Cosmetics는 `admin/dashboard`를 사용 (operator가 아님)

### 3-2. API 기능 그룹 분류

#### KPI / 통합 요약

| API Endpoint | Service | 비고 |
|-------------|---------|------|
| `/api/v1/operator/copilot/kpi` | Platform (Neture 사용) | Cross-service |
| `/api/v1/glycopharm/operator/dashboard` | GlycoPharm | Service-scoped |
| `/api/v1/kpa/operator/summary` | KPA | Service-scoped |
| `/api/v1/cosmetics/admin/dashboard/summary` | K-Cosmetics | Service-scoped |
| `/api/v1/admin/dashboard/sales-summary` | Platform Admin | Cross-service |

#### AI / 분석

| API Endpoint | Service | 비고 |
|-------------|---------|------|
| `/api/v1/operator/copilot/ai-summary` | Platform (Neture 사용) | AI 인사이트 |
| `/api/v1/operator/copilot/trends` | Platform (Neture 사용) | 트렌드 |
| `/api/v1/operator/copilot/alerts` | Platform (Neture 사용) | 알림 |
| `/api/v1/kpa/operator/forum-analytics` | KPA | 포럼 분석 |

#### 승인 / 운영

| API Endpoint | Service | 비고 |
|-------------|---------|------|
| `/api/v1/operator/copilot/products` | Platform (Neture 사용) | 승인 대기 상품 |
| `/api/v1/operator/copilot/stores` | Platform (Neture 사용) | 최근 매장 |
| `/api/v1/operator/copilot/suppliers` | Platform (Neture 사용) | 공급자 활동 |
| `/api/v1/kpa/operator/district-summary` | KPA | 지구 요약 |

---

## 4. Dashboard 데이터 소스

### 4-1. 서비스별 데이터 소스

| Service | Primary Tables | Data Domain |
|---------|---------------|-------------|
| **Operator Copilot** | `organizations`, `organization_service_enrollments`, `neture_suppliers`, `supplier_product_offers`, `neture_orders` | Cross-service + Neture |
| **GlycoPharm** | `organizations`, `organization_service_enrollments`, `glycopharm_applications`, `glycopharm_products`, `cms_contents` | GlycoPharm only |
| **KPA** | `cms_contents`, `signage_media`, `signage_playlists`, `forum_post`, `kpa_approval_requests`, `kpa_members`, `kpa_applications`, `kpa_organization_join_requests`, `kpa_store_asset_controls` | KPA only |
| **K-Cosmetics** | `cosmetics_stores`, `ecommerce_orders`, `ecommerce_order_items`, `cosmetics_brands` | K-Cosmetics only |
| **Admin Dashboard** | `neture_orders`, `users`, `neture_partners`, `cosmetics_products`, `cosmetics_brands` | Cross-service |

### 4-2. 데이터 격리 분류

| 유형 | Dashboard | 특징 |
|------|-----------|------|
| **Cross-Service** | Operator Copilot | organizations 전체 + Neture 전용 데이터 혼재 |
| **Cross-Service** | Admin Dashboard | Neture orders + Users + Cosmetics catalog 혼재 |
| **Service-Scoped** | GlycoPharm Operator | `service_code = 'glycopharm'` 필터 |
| **Service-Scoped** | KPA Operator | `serviceKey IN ('kpa-society', 'kpa')` 필터 |
| **Service-Scoped** | K-Cosmetics Operator | `serviceKey = 'cosmetics'` 필터 |

### 4-3. 테이블 중복 접근

| Table | Accessed By |
|-------|------------|
| `organizations` | Copilot, GlycoPharm, KPA district-summary |
| `organization_service_enrollments` | Copilot, GlycoPharm |
| `cms_contents` | GlycoPharm, KPA |
| `neture_orders` | Copilot, Admin Dashboard |
| `neture_suppliers` | Copilot, Admin Dashboard |
| `ecommerce_orders` | K-Cosmetics |

---

## 5. 인증 및 Role 구조

### 5-1. Dashboard 인증 매트릭스

| Endpoint Group | Middleware | 허용 역할 | Scope 유형 |
|----------------|-----------|----------|-----------|
| `operator/copilot/*` | `authenticate` → `requireAdmin` → `injectServiceScope` | `platform:admin`, `platform:super_admin`, legacy `admin`/`super_admin`/`operator` | Platform |
| `glycopharm/operator/*` | `requireAuth` → `isOperatorOrAdmin()` | `glycopharm:admin`, `glycopharm:operator`, `platform:admin`, `platform:super_admin` | Service |
| `kpa/operator/*` | `authenticate` → `requireKpaScope('kpa:operator')` | `kpa:operator`, `kpa:admin`, `platform:super_admin` | Service (Membership) |
| `cosmetics/admin/dashboard/*` | `requireAuth` → `requireScope('cosmetics:admin')` | `cosmetics:admin`, `platform:super_admin` | Service |
| `admin/dashboard/*` | `authenticate` → `requireAdmin` | `platform:admin`, `platform:super_admin`, legacy `admin`/`super_admin`/`operator` | Platform |

### 5-2. Operator Role 매트릭스

| Role | Service | Dashboard 접근 |
|------|---------|---------------|
| `platform:super_admin` | Platform | 모든 Dashboard |
| `platform:admin` | Platform | Copilot + Admin Dashboard |
| `neture:admin` | Neture | Neture Dashboard (via Copilot) |
| `neture:operator` | Neture | Neture Dashboard (via Copilot) |
| `glycopharm:admin` | GlycoPharm | GlycoPharm Operator Dashboard |
| `glycopharm:operator` | GlycoPharm | GlycoPharm Operator Dashboard |
| `kpa:admin` | KPA | KPA Operator Dashboard |
| `kpa:operator` | KPA | KPA Operator Dashboard |
| `cosmetics:admin` | K-Cosmetics | K-Cosmetics Dashboard |
| `cosmetics:operator` | K-Cosmetics | — (**접근 불가**) |
| `glucoseview:admin` | GlucoseView | — (별도 API 없음) |
| `glucoseview:operator` | GlucoseView | — (별도 API 없음) |

### 5-3. 인증 패턴 불일치

| 패턴 | 사용 위치 | 비고 |
|------|----------|------|
| `authenticate` + `requireAdmin` | Copilot, Admin Dashboard | Platform-level guard |
| `requireAuth` + 컨트롤러 내부 체크 | GlycoPharm | `isOperatorOrAdmin()` 함수 |
| `authenticate` + `requireKpaScope()` | KPA | Membership-based guard |
| `requireAuth` + `requireScope()` | K-Cosmetics | Service-scope guard |

**4개 서비스가 4가지 서로 다른 인증 패턴을 사용.**

---

## 6. Platform vs Service Operator 경계 분석

### 6-1. 현재 경계

```
┌──────────────────────────────────────────────────────────────┐
│ Platform Level (requireAdmin)                                │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────┐              │
│  │ Admin Dashboard   │  │ Operator Copilot    │              │
│  │ /admin/dashboard  │  │ /operator/copilot   │              │
│  │ platform:admin    │  │ platform:admin      │              │
│  │ Cross-service     │  │ Cross-service       │              │
│  └──────────────────┘  └─────────────────────┘              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Service Level (service-specific guards)                      │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐         │
│  │ Neture   │ │GlycoPharm│ │  KPA   │ │Cosmetics │         │
│  │ Copilot  │ │/glyco/op │ │/kpa/op │ │/cosm/adm │         │
│  │ reuse    │ │ internal │ │ scope  │ │ scope    │         │
│  │ ⚠️ 혼재  │ │ check    │ │ guard  │ │ guard    │         │
│  └──────────┘ └──────────┘ └────────┘ └──────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### 6-2. 경계 문제

**문제 1: Neture가 Platform Copilot을 서비스 Dashboard로 사용**

Operator Copilot(`/api/v1/operator/copilot/*`)은 `requireAdmin` 미들웨어를 사용하는 **Platform-level** 엔드포인트이지만, Neture 프론트엔드가 이를 **서비스 Dashboard**로 사용한다.

- `neture:operator` → `requireAdmin` 통과 불가 → **403**
- `neture:admin` → `requireAdmin` 통과 불가 → **403**
- 실제로는 `platform:admin` 이상의 역할만 접근 가능

**결과**: Neture 서비스 운영자는 Copilot Dashboard를 사용할 수 없으며, 별도의 Neture-scoped dashboard API가 없다.

**문제 2: K-Cosmetics `cosmetics:operator` 접근 불가**

K-Cosmetics Dashboard는 `requireScope('cosmetics:admin')`을 사용하므로 `cosmetics:operator` 역할은 접근 불가.

**문제 3: Admin Dashboard가 Neture 데이터에 의존**

Admin Dashboard의 `sales-summary`, `order-status`, `partners` 엔드포인트가 `neture_orders`, `neture_partners` 테이블을 직접 조회한다. 이는 Platform Dashboard가 Neture 서비스에 강결합되어 있음을 의미한다.

---

## 7. 구조 문제 분석

### 7-1. API 구조 불통일

| 문제 | 상세 |
|------|------|
| **Base Path 불통일** | Neture: `/operator/copilot`, GlycoPharm: `/glycopharm/operator`, KPA: `/kpa/operator`, Cosmetics: `/cosmetics/admin/dashboard` |
| **URL 네이밍 불일치** | `operator` vs `admin/dashboard` — K-Cosmetics는 `admin` 사용 |
| **API 버전 불일치** | 대부분 `/api/v1/` 사용, Signage만 `/api/signage/` 사용 |

### 7-2. 인증 패턴 불통일

| 문제 | 상세 |
|------|------|
| **4가지 서로 다른 guard 패턴** | requireAdmin, isOperatorOrAdmin, requireKpaScope, requireScope |
| **Role 체크 위치 불일치** | 미들웨어 레벨 vs 컨트롤러 내부 (GlycoPharm) |
| **Platform vs Service 경계 불명확** | Copilot이 requireAdmin을 사용하지만 service data를 반환 |

### 7-3. Dashboard 기능 중복

| 기능 | 중복 위치 |
|------|----------|
| **매장 통계** | Copilot `/kpi` + GlycoPharm `/dashboard` + KPA `/summary` + Cosmetics `/summary` |
| **승인 대기** | Copilot `/products` + KPA `/summary` (approval section) |
| **AI 리포트** | 5개 서비스 모두 `/ai-report` 페이지 존재 |
| **포럼 관리** | Neture, GlycoPharm, KPA 모두 forum-management 페이지 |
| **사이니지** | Neture, GlycoPharm, K-Cosmetics 모두 signage 모듈 |

### 7-4. Dashboard Block 표준 미전환

| 서비스 | 현재 | 표준 |
|--------|------|------|
| Neture | 9-Block Copilot (구형) | 5-Block 미전환 |
| GlycoPharm | 5-Block | 표준 ✅ |
| KPA Society | 5-Block | 표준 ✅ |
| K-Cosmetics | 5-Block | 표준 ✅ |
| GlucoseView | 5-Block | 표준 ✅ |

### 7-5. Cross-Service 데이터 접근

| 문제 | 상세 |
|------|------|
| **Copilot이 Neture 전용 데이터 반환** | `neture_suppliers`, `supplier_product_offers`, `neture_orders`를 Platform API에서 조회 |
| **Admin Dashboard가 Neture에 강결합** | `sales-summary`, `order-status`가 `neture_orders` 직접 조회 |
| **Service Scope 미적용** | Copilot에만 `injectServiceScope` 적용, Admin Dashboard에는 미적용 |

### 7-6. 프론트엔드 Route 경로 불통일

| Service | Operator Route | 비고 |
|---------|---------------|------|
| Neture | `/workspace/operator/*` | `workspace` prefix 사용 |
| GlycoPharm | `/operator/*` | 표준 |
| KPA Society | `/operator/*` | 표준 |
| K-Cosmetics | `/operator/*` | 표준 |
| GlucoseView | `/operator/*` | 표준 |

Neture만 `/workspace/operator` prefix를 사용하여 불일치.

---

## 8. 정비 권고

### 8-1. 단기 정비 (Breaking Change 없음)

| # | 항목 | 설명 |
|:-:|------|------|
| R1 | **Neture 전용 Dashboard API 생성** | `/api/v1/neture/operator/dashboard` 엔드포인트를 신설하여 Copilot 의존 제거 |
| R2 | **K-Cosmetics operator 역할 접근 허용** | `requireScope('cosmetics:admin')` → `requireScope(['cosmetics:admin', 'cosmetics:operator'])` |
| R3 | **Neture 9-Block → 5-Block 전환** | `operator-ux-core` 표준 사용 |
| R4 | **Admin Dashboard Neture 강결합 해소** | `sales-summary` 등을 E-commerce Core 기반으로 전환 |

### 8-2. 중기 정비 (구조 표준화)

| # | 항목 | 설명 |
|:-:|------|------|
| R5 | **인증 패턴 통일** | 4가지 guard → 통일된 `requireServiceScope('{service}:{role}')` 패턴 |
| R6 | **API Base Path 표준화** | 모든 서비스: `/api/v1/{service}/operator/*` |
| R7 | **K-Cosmetics URL 정규화** | `/cosmetics/admin/dashboard` → `/cosmetics/operator/dashboard` |
| R8 | **Service Scope 전면 적용** | Admin Dashboard에도 `injectServiceScope` 미들웨어 적용 |

### 8-3. 장기 정비 (아키텍처 통일)

| # | 항목 | 설명 |
|:-:|------|------|
| R9 | **Operator Dashboard API 표준 계약** | 모든 서비스가 동일한 응답 구조 (`{ kpis, actions, activity, quickActions }`) 사용 |
| R10 | **Platform Dashboard 분리** | Copilot을 Platform-only로 유지하되, 서비스별 데이터 집계로 변환 |
| R11 | **Neture 프론트엔드 Route 정규화** | `/workspace/operator` → `/operator` |

---

## 9. 요약

### 현재 상태

- **6개 Dashboard** 존재 (5개 서비스 + 1 Platform Admin)
- **4가지 인증 패턴** 혼재
- **2개 Dashboard Block 패턴** (9-Block + 5-Block)
- **2개 Cross-Service Dashboard** 가 Neture 데이터에 강결합
- **공유 인프라** (`@o4o/operator-ux-core`) 존재하나 Neture 미전환

### 핵심 구조 문제

1. Neture가 Platform Copilot을 서비스 Dashboard로 오용
2. 인증 guard 패턴 4종 혼재
3. API Base Path 불통일 (`operator/copilot` vs `{service}/operator` vs `{service}/admin/dashboard`)
4. Admin Dashboard가 Neture 전용 테이블에 강결합
5. `cosmetics:operator` 역할의 Dashboard 접근 불가

### 후속 WO

이 조사 결과는 다음 WO의 기준이 됨:
```
WO-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-REFACTOR-V1
```

---

*Generated: 2026-03-16*
*Investigation: READ-ONLY (코드 수정 없음)*
