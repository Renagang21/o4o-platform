# WO-DB-MIGRATION-P1 설계 문서

> **Work Order ID**: WO-DB-MIGRATION-P1
> **작성일**: 2026-01-09
> **상태**: Design Only (구현 대기)
> **선행 작업**: WO-ADMIN-API-IMPLEMENT-P0 (완료)

---

## 1. 개요

본 문서는 WO-DB-STATE-AUDIT-P0 조사 결과를 바탕으로 P1 단계 DB 연동 작업의 설계를 정의한다.

### 1.1 설계 원칙 (CLAUDE.md 준수)

| 원칙 | 내용 |
|------|------|
| No Core 변경 | Core DB 스키마/Entity 수정 금지 |
| No Migration | 신규 Migration 생성 금지 |
| 기존 Entity 활용 | 이미 등록된 Entity만 사용 |
| Mock → Empty 전환 | Mock 데이터 제거 후 Empty/Error UI |

### 1.2 P0 완료 현황

| 작업 | 상태 |
|------|------|
| WO-ADMIN-API-IMPLEMENT-P0 | ✅ 완료 |
| admin-dashboard 대시보드 API 연동 | ✅ 완료 |
| 운영 Mock 제거 (admin-dashboard) | ✅ 완료 |

---

## 2. P1 대상 서비스 분석

### 2.1 우선순위별 분류

#### P1-A: 기존 Entity 활용 가능 (즉시 가능)

| 서비스 | 대상 | 사용 Entity | 예상 API |
|--------|------|-------------|----------|
| glycopharm | OperatorDashboard | GlycopharmPharmacy, GlycopharmOrder | /admin/glycopharm/stats |
| glycopharm | SmartDisplayPage | GlycopharmPharmacy | /glycopharm/display/stats |
| web-neture | 조달 페이지 | NetureProduct, NeturePartner | /neture/products |
| admin-dashboard | VendorsReports | User (vendor role) | /admin/vendors/stats |

#### P1-B: 부분 Entity 존재 (API 설계 필요)

| 서비스 | 대상 | 기존 Entity | 누락 데이터 |
|--------|------|-------------|-------------|
| glycopharm | EducationPage | 없음 | 교육 컨텐츠 |
| kpa-society | DashboardPage | KpaOrganization, KpaMember | 활동 로그, 뉴스 |
| admin-dashboard | LMS-Yaksa | Course, Enrollment | 정책 데이터 |

#### P1-C: Entity 없음 (P2 이후 검토)

| 서비스 | 대상 | 필요 Entity | 비고 |
|--------|------|-------------|------|
| ecommerce | GroupbuyListPage | Groupbuy* | 공동구매 스키마 필요 |
| admin-dashboard | Partner 상세 통계 | PartnerClick, PartnerConversion | 파트너 트래킹 스키마 필요 |

---

## 3. P1-A 구현 설계

### 3.1 glycopharm 운영자 대시보드 API

**엔드포인트**: `GET /api/v1/admin/glycopharm/dashboard`

**사용 Entity**:
- `GlycopharmPharmacy` (glycopharm_pharmacies)
- `GlycopharmOrder` (glycopharm_orders)
- `GlycopharmProduct` (glycopharm_products)

**응답 구조**:
```typescript
interface GlycopharmDashboardResponse {
  pharmacyStats: {
    total: number;
    active: number;
    pending: number;
    approved: number;
  };
  orderStats: {
    totalOrders: number;
    paidOrders: number;
    totalRevenue: number;
  };
  productStats: {
    totalProducts: number;
    activeProducts: number;
  };
}
```

**구현 위치**:
- Controller: `apps/api-server/src/controllers/admin/glycopharmDashboardController.ts`
- Routes: `apps/api-server/src/routes/admin/glycopharm.routes.ts`

### 3.2 web-neture 조달 API

**엔드포인트**: `GET /api/v1/neture/products`

**사용 Entity**:
- `NetureProduct` (neture.neture_products)
- `NeturePartner` (neture.neture_partners)

**응답 구조**:
```typescript
interface NetureProductsResponse {
  products: Array<{
    id: string;
    name: string;
    status: string;
    partnerId: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**구현 위치**:
- 기존 `apps/api-server/src/routes/neture/` 확장

### 3.3 admin-dashboard 벤더 통계 API

**엔드포인트**: `GET /api/v1/admin/vendors/stats`

**사용 Entity**:
- `User` (users) - role='vendor' 필터

**응답 구조**:
```typescript
interface VendorStatsResponse {
  totalVendors: number;
  activeVendors: number;
  pendingVendors: number;
  recentVendors: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
}
```

---

## 4. P1-B 설계 (Entity 부분 존재)

### 4.1 kpa-society 대시보드

**현재 상태**:
- `KpaOrganization`, `KpaMember`, `KpaApplication` Entity 존재
- 활동 로그, 뉴스 데이터 없음

**설계 방안**:
1. 활동 로그: Empty state 반환 (P2에서 ActivityLog Entity 추가 검토)
2. 뉴스: 외부 API 연동 또는 CMS 활용 (cms_posts 사용 검토)

**임시 API 응답**:
```typescript
interface KpaDashboardResponse {
  organization: KpaOrganization | null;
  memberCount: number;
  recentActivity: []; // Empty until ActivityLog implemented
  news: []; // Empty until CMS integration
}
```

### 4.2 glycopharm 교육 컨텐츠

**현재 상태**:
- 교육 컨텐츠 전용 Entity 없음
- LMS Core 패키지의 Course/Lesson 활용 검토

**설계 방안**:
1. `@o4o/lms-core`의 Course/Lesson Entity 활용
2. 또는 Empty state 반환 후 P2에서 별도 설계

---

## 5. Mock 제거 후 프론트엔드 전환 가이드

### 5.1 전환 패턴 (P0에서 확립)

```typescript
// Before (Mock)
const data = MOCK_DASHBOARD_DATA;

// After (API + Error State)
const { data, error, isLoading } = useQuery({
  queryKey: ['dashboard'],
  queryFn: async () => {
    const response = await authClient.api.get('/admin/dashboard');
    return response.data.data;
  }
});

if (error) return <ErrorState message="데이터를 불러올 수 없습니다" />;
if (isLoading) return <LoadingState />;
if (!data || data.length === 0) return <EmptyState />;
```

### 5.2 서비스별 전환 우선순위

| 순서 | 서비스 | 파일 수 | 난이도 |
|------|--------|---------|--------|
| 1 | glycopharm (OperatorDashboard) | 1 | 낮음 |
| 2 | web-neture (조달 페이지) | 3 | 중간 |
| 3 | admin-dashboard (Vendors) | 3 | 낮음 |
| 4 | kpa-society (Dashboard) | 2 | 중간 |
| 5 | glycopharm (Education) | 1 | 높음 (Entity 필요) |

---

## 6. 구현 단계 (실행 시)

### Phase 1: API 구현 (API Server)

```bash
# 1. glycopharm 대시보드 API
apps/api-server/src/controllers/admin/glycopharmDashboardController.ts
apps/api-server/src/routes/admin/glycopharm.routes.ts

# 2. vendor 통계 API
apps/api-server/src/controllers/admin/vendorController.ts
apps/api-server/src/routes/admin/vendor.routes.ts

# 3. neture 제품 API (기존 확장)
apps/api-server/src/routes/neture/products.routes.ts
```

### Phase 2: 프론트엔드 연동

```bash
# 1. React Query hooks 추가
apps/admin-dashboard/src/hooks/api/useGlycopharmDashboard.ts
apps/admin-dashboard/src/hooks/api/useVendorStats.ts

# 2. Mock 코드 제거 및 API 연동
services/web-glycopharm/src/pages/operator/OperatorDashboard.tsx
services/web-neture/src/pages/procurement/*.tsx
```

### Phase 3: 테스트 및 검증

```bash
# 빌드 확인
pnpm -F api-server build
pnpm -F admin-dashboard build
pnpm -F web-glycopharm build
pnpm -F web-neture build
```

---

## 7. 리스크 및 대응

### 7.1 Entity 없음 상황

| 상황 | 대응 |
|------|------|
| 교육 컨텐츠 Entity 없음 | LMS Core 연동 검토 또는 Empty state |
| 활동 로그 Entity 없음 | Empty state 반환 |
| 공동구매 Entity 없음 | P2 이후 별도 Work Order |

### 7.2 스키마 충돌 방지

- 기존 Entity만 사용 (신규 추가 금지)
- TypeORM 쿼리는 기존 테이블명/컬럼명 그대로 사용
- `SELECT` 쿼리만 사용 (데이터 변경 없음)

---

## 8. 완료 조건 (DoD)

- [ ] P1-A 모든 API 구현 완료
- [ ] 해당 프론트엔드 Mock 코드 제거
- [ ] API 실패 시 Empty/Error UI 표시
- [ ] `pnpm -F api-server build` 성공
- [ ] 대상 프론트엔드 빌드 성공
- [ ] 콘솔 에러 없음

---

## 9. 예상 일정 (참고용)

| 단계 | 작업 내용 | 예상 복잡도 |
|------|-----------|------------|
| P1-A-1 | glycopharm 대시보드 API | 낮음 |
| P1-A-2 | vendor 통계 API | 낮음 |
| P1-A-3 | neture 제품 API | 중간 |
| P1-B-1 | kpa-society 대시보드 | 중간 |
| P1-B-2 | glycopharm 교육 (검토) | 높음 |

---

**문서 상태**: Design Complete
**다음 단계**: 사용자 승인 후 WO-DB-MIGRATION-P1-IMPLEMENT 실행
