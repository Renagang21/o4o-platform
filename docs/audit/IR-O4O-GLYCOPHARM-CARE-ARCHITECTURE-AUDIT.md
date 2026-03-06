# IR-O4O-GLYCOPHARM-CARE-ARCHITECTURE-AUDIT

> **Status**: Complete
> **Date**: 2026-03-06
> **Scope**: GlycoPharm Care 아키텍처 전수 조사 (READ-ONLY)
> **Purpose**: WO-O4O-GLYCOPHARM-CARE-ENGINE-REFORM 수립을 위한 현황 파악

---

## 1. 조사 범위

| 영역 | 조사 대상 |
|------|----------|
| Entity Map | `glycopharm_*` 테이블 전수 |
| Care Domain | care 엔티티, 환자 모델, CGM 데이터 흐름, 분석 엔진 |
| Legacy Commerce | glycopharm_orders 이관 상태, E-commerce Core 전환 현황 |
| Core Dependency | Auth → Organization → PharmacyContext → Care 파이프라인 |
| Architecture Map | API 엔드포인트, Web Frontend 페이지 맵 |

---

## 2. 핵심 발견

1. **GlycoPharm Care는 완성된 활성 서브시스템** — skeleton이 아닌 운영 가능한 상태
2. **CGM 데이터는 DB 저장 없음** — MockCgmProvider가 매 요청마다 합성 데이터 생성, KPI만 저장
3. **Legacy Orders 완전 제거** — Phase 4-A에서 엔티티 삭제됨, E-commerce Core 전환 완료
4. **Pharmacy 모델 이중 존재** — 구 `glycopharm_pharmacies` + 신 `OrganizationStore` + `GlycopharmPharmacyExtension`
5. **Care 모듈은 독립 마운트** — `/api/v1/care/`로 glycopharm 경로와 분리

---

## 3. Entity Map

### 3.1 glycopharm_* 테이블 전수

| # | Entity | Table | 상태 | 비고 |
|---|--------|-------|:----:|------|
| 1 | `GlycopharmPharmacy` | `glycopharm_pharmacies` | ACTIVE | PK = kpa_organization.id, OrganizationStore로 정규화 진행 중 |
| 2 | `GlycopharmPharmacyExtension` | `glycopharm_pharmacy_extensions` | ACTIVE | OrganizationStore 1:1 확장 테이블 |
| 3 | `GlycopharmProduct` | `glycopharm_products` | ACTIVE | FK → OrganizationStore(pharmacy_id) |
| 4 | `GlycopharmProductLog` | `glycopharm_product_logs` | ACTIVE | 상품 변경 감사 로그 |
| 5 | `GlycopharmApplication` | `glycopharm_applications` | ACTIVE | 약국 온보딩 신청 |
| 6 | `GlycopharmFeaturedProduct` | `glycopharm_featured_products` | ACTIVE | 추천 상품 |
| 7 | `GlycopharmCustomerRequest` | `glycopharm_customer_requests` | ACTIVE | QR/태블릿/웹 고객 요청 |
| 8 | `GlycopharmEvent` | `glycopharm_events` | ACTIVE | impression/click/qr_scan 이벤트 |
| 9 | `GlycopharmRequestActionLog` | `glycopharm_request_action_logs` | ACTIVE | 요청 후속 조치 로그 |
| 10 | `GlycopharmBillingInvoice` | `glycopharm_billing_invoices` | ACTIVE | Phase 3-D/E 정산 인보이스 |
| 11 | `DisplayPlaylist` | `glycopharm_display_playlists` | ACTIVE | 스마트 디스플레이 |
| 12 | `DisplayMedia` | `glycopharm_display_media` | ACTIVE | 미디어 소스 |
| 13 | `DisplayPlaylistItem` | `glycopharm_display_playlist_items` | ACTIVE | 재생목록 아이템 |
| 14 | `DisplaySchedule` | `glycopharm_display_schedules` | ACTIVE | 재생 스케줄 |
| 15 | `GlycopharmForumCategoryRequest` | `glycopharm_forum_category_requests` | ACTIVE | 포럼 카테고리 신청 (LEGACY 라벨) |
| 16 | `TabletServiceRequest` | `tablet_service_requests` | ACTIVE | 태블릿 서비스 요청 (비-glycopharm prefix) |
| 17 | `StoreBlogPost` | `store_blog_posts` | ACTIVE | 스토어 블로그 (비-glycopharm prefix) |
| — | `GlycopharmOrder` | `glycopharm_orders` | **REMOVED** | Phase 4-A에서 엔티티 삭제, E-commerce Core 전환 |
| — | `GlycopharmOrderItem` | `glycopharm_order_items` | **REMOVED** | 동일 |

### 3.2 Care 엔티티

| Entity | Table | 주요 컬럼 | 비고 |
|--------|-------|----------|------|
| `CareCoachingSession` | `care_coaching_sessions` | `id`, `pharmacyId`, `patientId`, `pharmacistId`, `snapshotId`, `summary`, `actionPlan` | FK 없음 (raw UUID), pharmacistId는 controller에서 req.user.id 강제 |
| `CareKpiSnapshot` | `care_kpi_snapshots` | `id`, `pharmacyId`, `patientId`, `tir`(%), `cv`(%), `riskLevel` | 분석 결과 영속화, 약국별 환자별 다수 |

**환자 모델**: `glucoseview_customers` 테이블 사용 (`glycopharm_patients` 테이블 없음)

| 필드 | 설명 |
|------|------|
| `organization_id` | 약국 소속 (WO-CARE-ORG-SCOPE-MIGRATION-V1 이후 primary scoping) |
| `pharmacist_id` | 등록 약사 참조 |
| `name`, `phone`, `email` | 기본 인적 정보 |
| `data_sharing_consent` | 데이터 공유 동의 여부 |

---

## 4. Care Domain 상세

### 4.1 CGM 데이터 흐름

```
CgmProvider.getReadings(patientId, from, to)
  └── MockCgmProvider (현재 유일한 구현체)
        └── patientId hash + sine wave 알고리즘으로 15분 간격 합성 데이터 생성
        └── DB 저장 없음 (매 요청마다 계산)
  └── VendorCgmProvider (주석 처리된 플레이스홀더)
        └── process.env.CGM_PROVIDER === 'vendor' 조건
```

### 4.2 분석 엔진

**파일**: `apps/api-server/src/modules/care/analysis.engine.ts`

| 지표 | 계산 로직 |
|------|----------|
| **TIR** (Time In Range) | 70–180 mg/dL 범위 내 비율 (%) |
| **CV** (Coefficient of Variation) | `(stddev / mean) × 100`, 정수 |
| **Risk Level** | TIR ≥ 70 → `low`, 50–69 → `moderate`, < 50 → `high` |

두 가지 Provider:
- `DefaultAnalysisProvider` — 규칙 기반 (기본값)
- `AiInsightProvider` — `CARE_ANALYSIS_PROVIDER=ai` 환경변수 opt-in

**Auto-snapshot**: `GET /api/v1/care/analysis/:patientId` 호출 시 `kpiService.recordSnapshot()` fire-and-forget 실행

### 4.3 Care 모듈 파일 구조

```
apps/api-server/src/modules/care/
├── entities/
│   ├── care-coaching-session.entity.ts
│   └── care-kpi-snapshot.entity.ts
├── analysis.engine.ts          # TIR/CV/Risk 순수 함수
├── care-analysis.controller.ts # GET /analysis/:patientId, GET /kpi/:patientId
├── care-coaching.controller.ts # POST/GET /coaching
├── care-coaching-session.service.ts
├── care-dashboard.controller.ts # GET /dashboard
├── care-kpi-snapshot.service.ts
├── care-pharmacy-context.middleware.ts  # PharmacyContext 해석 (공유)
├── cgm.provider.ts             # CgmProvider 인터페이스
└── mock-cgm.provider.ts        # MockCgmProvider 구현
```

---

## 5. Legacy Commerce 상태

### 5.1 제거된 엔티티

`apps/api-server/src/routes/glycopharm/entities/index.ts`:
```
// Orders - REMOVED (Phase 4-A: Legacy Order System Deprecation)
// GlycopharmOrder, GlycopharmOrderItem entities removed
// New orders will use E-commerce Core with OrderType.GLYCOPHARM
```

### 5.2 E-commerce Core 전환

| 항목 | 상태 |
|------|------|
| 신규 주문 생성 | `OrderType.RETAIL` + `metadata.serviceKey='glycopharm'` |
| `OrderType.GLYCOPHARM` | **BLOCKED** (CLAUDE.md §4), 신규 생성 금지 |
| Legacy 조회 | GET 엔드포인트에서 UNION 쿼리로 하위 호환 유지 |
| 결제 | `@o4o/payment-core` `PaymentCoreService` 사용 |

Checkout 조회 시 하위 호환 쿼리 (checkout.controller.ts):
```typescript
qb.where('order.orderType = :glycopharm', { glycopharm: OrderType.GLYCOPHARM })
  .orWhere(
    "order.orderType = :retail AND order.metadata->>'serviceKey' = :serviceKey",
    { retail: OrderType.RETAIL, serviceKey: 'glycopharm' }
  );
```

---

## 6. Core Dependency Chain

### 6.1 Auth → GlycoPharm 파이프라인

```
Request
  → authenticate (JWT 검증 → req.user)
  → requireGlycopharmScope (security-core, GLYCOPHARM_SCOPE_CONFIG)
  → PharmacyContextMiddleware
      → organizations WHERE created_by_user_id = userId
      → organization_service_enrollments WHERE service_code='glycopharm' AND status='active'
      → req.pharmacyId 설정 (admin은 null = 전역 접근)
```

**PharmacyContextMiddleware 에러 코드**:
`UNAUTHORIZED`, `GLYCOPHARM_ORG_NOT_FOUND`, `GLYCOPHARM_ORG_INACTIVE`, `GLYCOPHARM_NOT_ENROLLED`, `PHARMACY_LOOKUP_ERROR`

### 6.2 조직 계층 구조

```
users (identity)
  └── organizations (created_by_user_id)
        ├── organization_service_enrollments (service_code='glycopharm')
        ├── OrganizationStore (정규화된 매장 모델)
        │     ├── GlycopharmPharmacyExtension (1:1 확장)
        │     ├── GlycopharmProduct (pharmacy_id FK)
        │     └── Display* 엔티티들 (playlist, media, schedule)
        ├── glucoseview_customers (organization_id) ← 환자
        ├── care_kpi_snapshots (pharmacyId)
        └── care_coaching_sessions (pharmacyId)
```

### 6.3 Core 패키지 의존성

| 패키지 | 용도 |
|--------|------|
| `@o4o/security-core` | `createServiceScopeGuard`, `GLYCOPHARM_SCOPE_CONFIG` |
| `@o4o/action-log-core` | `ActionLogService` (cockpit, hub-trigger) |
| `@o4o/ecommerce-core/entities` | `EcommerceOrder`, `OrderType`, `OrderStatus` 등 |
| `@o4o/payment-core` | `PaymentCoreService` |

---

## 7. API 엔드포인트 맵

### 7.1 Care API (`/api/v1/care/`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/analysis/:patientId` | care-analysis.controller | authenticate + PharmacyContext |
| GET | `/kpi/:patientId` | care-analysis.controller | authenticate + PharmacyContext |
| POST | `/coaching` | care-coaching.controller | authenticate + PharmacyContext |
| GET | `/coaching/:patientId` | care-coaching.controller | authenticate + PharmacyContext |
| GET | `/dashboard` | care-dashboard.controller | authenticate + PharmacyContext |
| GET | `/ops/care-diagnostic` | care-diagnostic.controller | ops/admin only |

### 7.2 GlycoPharm 주요 API (`/api/v1/glycopharm/`)

| 그룹 | 엔드포인트 수 | Auth |
|------|:-----------:|------|
| Public (pharmacies, products, stores) | ~10 | 없음/optional |
| Pharmacy (my pharmacy) | 4 | requireAuth + PharmacyContext |
| Admin (applications, pharmacies, products) | ~8 | requireAuth + glycopharm:admin |
| Checkout | 4 | requireAuth |
| Payments | 3 | requireAuth |
| Customer Requests | 5 | Public(POST) / requireAuth(나머지) |
| Events | 2 | Public(POST) / requireAuth |
| Funnel / Reports | 4 | requireAuth + operator |
| Billing / Invoices | 8 | requireAuth |
| Display (Smart Signage) | ~16 | requireAuth |
| Cockpit (Dashboard 2.0) | 9 | requireAuth + scope |
| Hub Triggers | 3 | requireAuth |
| Forum | ~16 | Mixed |
| Operator | 3 | requireAuth + operator |

**총 엔드포인트**: ~100+

---

## 8. Web Frontend Care 페이지

### 8.1 라우트 트리

```
/care                           → CareDashboardPage
/care/patients                  → PatientsPage
/care/patients/:id              → PatientDetailPage
/care/patients/:id/             → SummaryTab (index)
/care/patients/:id/analysis     → AnalysisTab
/care/patients/:id/coaching     → CoachingTab
/care/patients/:id/history      → HistoryTab
/care/analysis                  → AnalysisPage
/care/coaching                  → CoachingPage
```

Guard: `SoftGuardOutlet allowedRoles={['pharmacy']}`

### 8.2 페이지 컴포넌트

| Page | 파일 | 기능 |
|------|------|------|
| `CareDashboardPage` | `pages/care/CareDashboardPage.tsx` | 환자 KPI 요약 (risk 분포), 최근 스냅샷, 코칭 세션 |
| `PatientsPage` | `pages/care/PatientsPage.tsx` | 환자 목록, risk 필터, 검색 |
| `PatientDetailPage` | `pages/care/PatientDetailPage.tsx` | 환자 상세 (탭 네비게이션 shell) |
| `SummaryTab` | `patient-tabs/SummaryTab.tsx` | 최신 KPI 스냅샷 |
| `AnalysisTab` | `patient-tabs/AnalysisTab.tsx` | TIR, CV, Risk, AI 인사이트 |
| `CoachingTab` | `patient-tabs/CoachingTab.tsx` | 코칭 세션 목록 + 생성 |
| `HistoryTab` | `patient-tabs/HistoryTab.tsx` | KPI 스냅샷 타임라인 |
| `AnalysisPage` | `pages/care/AnalysisPage.tsx` | 전체 분석 (일괄/집계) |
| `CoachingPage` | `pages/care/CoachingPage.tsx` | 코칭 관리 |
| `CareSubNav` | `pages/care/CareSubNav.tsx` | Care 서브 네비게이션 |

---

## 9. 아키텍처 리스크 및 개선 포인트

| # | 리스크 | 심각도 | 설명 |
|---|--------|:------:|------|
| 1 | **CGM 데이터 미영속** | Medium | MockCgmProvider만 존재, 실제 CGM 기기 연동 시 데이터 저장 전략 필요 |
| 2 | **Pharmacy 모델 이중화** | Low | `glycopharm_pharmacies` ↔ `OrganizationStore` + Extension 공존, 마이그레이션 완료 시 정리 필요 |
| 3 | **Care 엔티티 FK 부재** | Low | `care_coaching_sessions`, `care_kpi_snapshots`에 ORM-level FK 없음 (raw UUID), 정합성은 애플리케이션 레벨 |
| 4 | **Legacy OrderType.GLYCOPHARM 조회** | Low | UNION 쿼리 하위 호환 유지 중, 장기적 정리 필요 |

---

## 10. 결론

GlycoPharm Care는 **완성된 활성 서브시스템**으로, 다음 요소가 모두 구현되어 있다:
- 2개 Care 전용 엔티티 + glucoseview_customers 환자 모델
- CGM Provider 패턴 (인터페이스 + Mock 구현체)
- 규칙 기반 분석 엔진 (TIR/CV/Risk)
- 6개 Care API 엔드포인트
- 9개 Care 프론트엔드 페이지 (대시보드, 환자 목록/상세, 분석, 코칭)
- PharmacyContextMiddleware 기반 약국 스코핑

향후 WO-O4O-GLYCOPHARM-CARE-ENGINE-REFORM은 기존 구현을 기반으로 **확장/개선**하는 방향이어야 하며,
기존 테이블/API 계약을 파괴하지 않는 범위에서 진행되어야 한다.

---

*Generated: 2026-03-06*
*Classification: Internal / Architecture Audit*
