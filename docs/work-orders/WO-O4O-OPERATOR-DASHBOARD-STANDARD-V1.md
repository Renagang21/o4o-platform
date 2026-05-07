# WO-O4O-OPERATOR-DASHBOARD-STANDARD-V1

> O4O Operator HUB 표준 정의 및 적용
> 작성일: 2026-03-14
> 기반: IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1

---

## 1. 작업 목적

O4O 플랫폼의 **서비스 운영자 대시보드(Operator HUB)** 구조를 표준화한다.

현재 조사 결과:

| 서비스 | Route | 페이지 수 |
|--------|-------|:---------:|
| KPA Society | `/operator` | 18 |
| GlycoPharm | `/admin` | 37 |
| K-Cosmetics | `/operator` | 23 |

3개 서비스 모두 `@o4o/operator-ux-core` 기반 **5-Block Dashboard** 구조를 사용 중.

목적:
- Operator HUB Standard 정의
- 서비스별 구현 정비

---

## 2. 적용 대상 서비스

**1차 적용:**
- KPA-a
- GlycoPharm
- K-Cosmetics

**2차 적용 (표준 기반):**
- KPA-b
- KPA-c

---

## 3. Operator HUB 표준 구조

### 3.1 Route 표준

모든 서비스 Operator Console은 `/operator` prefix 사용:

```
/operator                  → Dashboard (5-Block)
/operator/members          → 회원 관리
/operator/stores           → 매장 관리
/operator/products         → 상품 관리
/operator/orders           → 주문 관리
/operator/analytics        → 서비스 분석
/operator/ai-report        → AI 분석 리포트
/operator/signage/*        → 디지털 사이니지
/operator/settings         → 서비스 설정
```

**변경 필요:**
- GlycoPharm: `/admin` → `/operator` (legacy redirect 유지)

### 3.2 Operator Layout 표준

모든 Operator 페이지는 `@o4o/operator-ux-core`의 `OperatorLayout` 사용:

```
OperatorLayout
 ├─ Sidebar (operatorConfig 기반 메뉴)
 ├─ Header
 └─ MainContent
```

### 3.3 Dashboard 구조 표준 (5-Block)

| Block | 역할 | 설명 |
|-------|------|------|
| 1. KPI Grid | 핵심 지표 | Action-required 우선 표시 |
| 2. AI Summary | 상태 요약 | Status-based AI insights |
| 3. Action Queue | 긴급 항목 | 즉시 처리 필요 항목 |
| 4. Activity Log | 활동 이력 | 최근 운영 활동 |
| 5. Quick Actions | 바로가기 | 주요 페이지 빠른 이동 |

### 3.4 Operator Guard 표준

현재 분산된 Guard 패턴:
- KPA: `RoleGuard`, `BranchOperatorAuthGuard`
- GlycoPharm: `ProtectedRoute`
- K-Cosmetics: `ProtectedRoute`

**통일 대상:**

```typescript
// @o4o/security-core
OperatorGuard
→ requireAnyRole(ADMIN, SUPER_ADMIN, OPERATOR, MANAGER)
```

### 3.5 Operator Config 표준

각 서비스는 `operatorConfig.ts` 파일을 가진다:

```typescript
// services/*/web/src/pages/operator/operatorConfig.ts
export const operatorConfig = {
  basePath: '/operator',

  kpis: ['members', 'stores', 'products', 'orders', 'activity'],

  enabledMenus: [
    'members', 'stores', 'products', 'orders',
    'analytics', 'ai-report', 'signage', 'settings'
  ]
};
```

---

## 4. Operator Core 기능 (필수)

모든 서비스가 기본 제공해야 하는 기능:

| 기능 | Route | 설명 |
|------|-------|------|
| Members | `/operator/members` | 회원 관리 |
| Stores | `/operator/stores` | 매장 관리 |
| Products | `/operator/products` | 상품 관리 |
| Orders | `/operator/orders` | 주문 관리 |
| Analytics | `/operator/analytics` | 서비스 분석 |
| AI Report | `/operator/ai-report` | AI 분석 |
| Signage | `/operator/signage/*` | 디지털 사이니지 |
| Settings | `/operator/settings` | 서비스 설정 |

---

## 5. Service Extension 기능 (선택)

서비스 특화 기능은 Operator Core 위에 확장:

### KPA Society Extensions

| 기능 | Route |
|------|-------|
| Forum | `/operator/forums` |
| Forum Analytics | `/operator/forum-analytics` |
| LMS | `/operator/lms` |
| News/Content | `/operator/content` |
| Events | `/operator/events` |
| Pharmacy Requests | `/operator/pharmacy-requests` |
| Product Applications | `/operator/product-applications` |
| Audit Log | `/operator/audit-log` |
| Legal | `/operator/legal` |
| Operator Management | `/operator/operators` (Admin only) |

### GlycoPharm Extensions

| 기능 | Route |
|------|-------|
| Store Approvals | `/operator/store-approvals` |
| Store Template | `/operator/store-template` |
| Forum Requests | `/operator/forum-requests` |
| Forum Management | `/operator/forum-management` |
| Inventory | `/operator/inventory` |
| Settlements | `/operator/settlements` |
| Invoices | `/operator/invoices` |
| Billing Preview | `/operator/billing-preview` |
| Applications | `/operator/applications` |
| Marketing | `/operator/marketing` |
| Reports | `/operator/reports` |
| Support | `/operator/support` |
| Market Trial | `/operator/market-trial` |

### K-Cosmetics Extensions

| 기능 | Route |
|------|-------|
| Store Cockpit | `/operator/store-cockpit` |
| Inventory | `/operator/inventory` |
| Settlements | `/operator/settlements` |
| Applications | `/operator/applications` |
| Marketing | `/operator/marketing` |
| Support | `/operator/support` |

---

## 6. Store Config 표준

### 현재 상태

| 서비스 | 방식 |
|--------|------|
| KPA | `menuSections` (커스텀) |
| GlycoPharm | `enabledMenus` |
| K-Cosmetics | `enabledMenus` |
| GlucoseView | `enabledMenus` |

### 통일 표준: `enabledMenus`

```typescript
export const storeConfig = {
  basePath: '/store',
  enabledMenus: [
    'dashboard', 'products', 'channels', 'orders',
    'content', 'signage', 'billing', 'settings'
  ]
};
```

**Standard 8-Menu:**

| Key | Path | 설명 |
|-----|------|------|
| dashboard | `/store` | 대시보드 |
| products | `/store/products` | 상품 관리 |
| channels | `/store/channels` | 채널 관리 |
| orders | `/store/orders` | 주문 관리 |
| content | `/store/content` | 콘텐츠 관리 |
| signage | `/store/signage` | 사이니지 |
| billing | `/store/billing` | 청구/정산 |
| settings | `/store/settings` | 설정 |

---

## 7. Capability 연동

Operator Dashboard는 Store Capability 시스템과 연동:

| Capability Key | 설명 | Channel |
|---------------|------|---------|
| `B2C_COMMERCE` | E-commerce 스토어 | B2C |
| `TABLET` | 태블릿 디스플레이 | TABLET |
| `KIOSK` | POS 키오스크 | KIOSK |
| `QR_MARKETING` | QR 코드 마케팅 | - |
| `POP_PRINT` | POP 인쇄물 | - |
| `SIGNAGE` | 디지털 사이니지 | SIGNAGE |
| `BLOG` | 블로그/콘텐츠 | - |
| `LIBRARY` | 자산 라이브러리 | - |
| `AI_CONTENT` | AI 콘텐츠 | - |
| `LOCAL_PRODUCTS` | 지역 상품 | - |

Operator API:
```
GET /api/v1/operator/stores/:id/capabilities
PUT /api/v1/operator/stores/:id/capabilities
```

---

## 8. Backend API 표준

### Operator Console API

```
GET    /api/v1/operator/stores          → 매장 목록
GET    /api/v1/operator/stores/:id      → 매장 상세
GET    /api/v1/operator/stores/:id/channels    → 채널 상태
GET    /api/v1/operator/stores/:id/products    → 매장 상품
GET    /api/v1/operator/stores/:id/capabilities → 기능 조회
PUT    /api/v1/operator/stores/:id/capabilities → 기능 업데이트

GET    /api/v1/operator/products        → 상품 목록
GET    /api/v1/operator/products/:id    → 상품 상세

GET    /api/v1/operator/members         → 회원 목록
GET    /api/v1/operator/members/:id     → 회원 상세
PATCH  /api/v1/operator/members/:id/approve → 승인
PATCH  /api/v1/operator/members/:id/reject  → 거절
```

인증: `authenticate` + `requireAnyRole(ADMIN, SUPER_ADMIN, OPERATOR, MANAGER)`

---

## 9. 적용 순서

```
Phase 1: Standard 문서 작성 (이 문서)
Phase 2: KPA-a 적용 (가장 작은 범위)
Phase 3: GlycoPharm 적용 (가장 큰 범위, /admin → /operator 마이그레이션)
Phase 4: K-Cosmetics 적용
Phase 5: KPA-b, KPA-c 적용
```

---

## 10. 예상 결과

```
O4O Operator OS 구조:

Supplier / Partner
        ↓
Service Operator (Operator HUB Standard)
        ↓
Store (Common Store Core)
        ↓
Customer
```

---

## 11. 관련 아키텍처

| Layer | Package |
|-------|---------|
| Operator UX | `@o4o/operator-ux-core` |
| Store Backend | `@o4o/store-core` |
| Store Frontend | `@o4o/store-ui-core` |
| Store Assets | `@o4o/store-asset-policy-core` |
| Security | `@o4o/security-core` |

---

## 12. Frozen Baseline 준수

| Baseline | 영향 |
|----------|------|
| F1 Operator OS | operator-ux-core 구조 유지, 확장만 허용 |
| F3 Store Layer | store-ui-core, store-core 의존 방향 고정 |
| F9 RBAC SSOT | role_assignments 단일 소스 유지 |

---

*WO-O4O-OPERATOR-DASHBOARD-STANDARD-V1*
*작성일: 2026-03-14*
*기반: IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1*
*Status: Phase 1 Complete*
