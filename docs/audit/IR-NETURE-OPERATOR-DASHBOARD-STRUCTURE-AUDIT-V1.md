# IR-NETURE-OPERATOR-DASHBOARD-STRUCTURE-AUDIT-V1

> Neture 서비스 운영자(admin / operator) 대시보드 구조 조사
>
> Date: 2026-03-16
> Status: Complete
> 목적: Platform Standard + Neture Domain → Neture Operator Dashboard 구조 도출

---

## 1. Platform Standard Operator Dashboard 구조

### 1-1. 5-Block Architecture

모든 서비스 Operator Dashboard는 동일한 5-Block 구조를 따른다.

```
GET /api/v1/{service}/operator/dashboard
→ { success: true, data: OperatorDashboardConfig }
```

| Block | Type | Purpose | Rendering |
|-------|------|---------|-----------|
| **1. KPI Grid** | `KpiItem[]` | 서비스 건강 상태 — "지금 정상인가?" | grid-cols-2/4, 색상: neutral=slate, warning=amber, critical=red |
| **2. AI Summary** | `AiSummaryItem[]` | 운영자 우선순위 — "지금 무엇을 해야 하는가?" | 최대 3개, severity-color coded, 빈 상태: 녹색 "특이사항 없음" |
| **3. Action Queue** | `ActionItem[]` | 즉시 처리 항목 — "오늘 처리할 것은?" | count 뱃지(amber), 빈 상태: 녹색 "모든 항목 처리 완료" |
| **4. Activity Log** | `ActivityItem[]` | 최근 변경 — "무엇이 변했는가?" | 최대 10개, 상대 시간 표시 ("방금 전", "3분 전") |
| **5. Quick Actions** | `QuickActionItem[]` | 빠른 진입점 — "자주 가는 곳" | grid-cols-2/4, 아이콘 선택적 |

### 1-2. Type 정의 (SSOT)

- Backend: `apps/api-server/src/types/operator-dashboard.types.ts`
- Frontend: `packages/operator-ux-core/src/types.ts`

```typescript
interface OperatorDashboardConfig {
  kpis: KpiItem[];              // { key, label, value, delta?, status?, link? }
  aiSummary?: AiSummaryItem[];  // { id, message, level, link? }
  actionQueue: ActionItem[];    // { id, label, count, link }
  activityLog: ActivityItem[];  // { id, message, timestamp }
  quickActions: QuickActionItem[]; // { id, label, link, icon? }
}
```

### 1-3. Frontend 컴포넌트 계층

```
@o4o/operator-ux-core
├── OperatorDashboardLayout.tsx   ← 최상위 합성 컴포넌트
│   ├── <KpiGrid />
│   ├── <AiSummaryBlock />        (max 3, green empty state)
│   ├── <ActionQueueBlock />      (amber count badge, green empty state)
│   ├── <ActivityLogBlock />      (timeline, relative time, max 10)
│   └── <QuickActionBlock />      (grid, optional icon)
└── types.ts
```

### 1-4. CopilotEngine 통합 패턴

```
Dashboard Controller
  → DB 쿼리로 metrics 수집
  → copilotEngine.generateInsights(serviceId, metrics, user)
      1. Rule-based analysis (항상, 빠름) — 5개 규칙
      2. AI 호출 (API key 있으면, 3초 timeout)
      3. Fallback: rule-based 결과 사용
  → aiSummary = insights (max 3)
```

Rule-based 분석 규칙:

| Rule | Trigger | Level |
|------|---------|-------|
| Approval Backlog | pending > 0 | warning (≥10: critical) |
| Growth Trend | growth ≠ 0 | info (<-20%: warning) |
| Activity Drop | inactive/(active+inactive) > 30% | warning (>50%: critical) |
| Order Spike | growth > 50% | warning |
| Inactivity | monthly=0 또는 expiringSoon > 0 | critical / warning |

---

## 2. Neture 서비스 도메인 구조

### 2-1. Neture Domain Map

| Domain | 핵심 엔티티 | 주요 API | 운영자 액션 | Admin 전용? |
|--------|-----------|---------|------------|:----------:|
| **공급자 등록** | `neture_suppliers`, `service_memberships` | `POST /supplier/register`, `GET/POST /operator/registrations/*` | 가입 승인/거부 | Operator |
| **공급자 관리** | `neture_suppliers` | `GET /admin/suppliers`, `POST /{id}/approve\|reject\|deactivate` | 승인/거부/비활성화 | Admin |
| **상품 마스터** | `product_masters`, `product_categories`, `brands` | `GET/POST/PATCH /admin/masters/*`, `GET/POST /admin/categories/*`, `GET/POST /admin/brands/*` | 바코드 마스터 관리, MFDS 검증 | Admin |
| **상품 (Offer)** | `supplier_product_offers`, `product_approvals` | `GET /admin/products`, `POST /{id}/approve\|reject`, `POST /admin/offers/bulk-approve` | 상품 승인/거부/일괄승인 | Admin |
| **서비스 승인** | `product_approvals` (type=SERVICE) | `GET/POST /admin/service-approvals/*` | SERVICE 리스팅 승인/거부/취소 | Admin |
| **주문** | `neture.neture_orders`, `neture_shipments` | `GET /supplier/orders/*`, `PATCH /{id}/status`, `POST /{orderId}/shipment` | 주문 상태 변경, 배송 생성 | Supplier |
| **정산 (공급자)** | `neture_settlements` | `POST /admin/settlements/calculate`, `GET /admin/settlements/*`, `PATCH /{id}/approve\|pay\|status` | 정산 계산/승인/지급/취소 | Admin |
| **수수료 (파트너)** | `partner_commissions` | `POST /admin/commissions/calculate`, `GET /admin/commissions/*`, `PATCH /{id}/approve\|pay\|status` | 수수료 계산/승인/지급/취소 | Admin |
| **파트너** | `neture_partner_*`, `partner_referrals` | `GET /partner/*`, `GET /admin/partners/*`, `GET /admin/partner-settlements/*` | 파트너 모니터링, 정산 배치 | Admin |
| **셀러** | `neture_seller_partner_contracts` | `GET /seller/*`, `POST /seller/orders` | B2B 주문 생성, 계약 관리 | Seller |
| **홈페이지 CMS** | `cms_contents` | `GET/POST/PUT/DELETE /admin/homepage-contents/*` | Hero/광고/로고 CRUD | Admin |
| **사이니지** | `signage_media`, `signage_playlists` | `GET/POST /signage/neture/*` | HQ 미디어/플레이리스트 관리 | Operator |
| **포럼** | `forum_categories`, `forum_posts` | `GET /forum/category-requests`, `PATCH /{id}/approve\|reject` | 카테고리 요청 승인 | Operator |
| **문의** | `neture_contact_messages` | `GET/PATCH /admin/contact-messages/*` | 문의 메시지 확인/처리 | Admin |
| **Hub Triggers** | Various | `POST /hub/trigger/*` | QuickAction 실행 | Mixed |

### 2-2. Controller 파일 목록 (18개)

```
apps/api-server/src/modules/neture/controllers/
├── admin.controller.ts              — Admin 공급자/상품/마스터/카테고리/브랜드/CMS
├── admin-settlement.controller.ts   — Admin 정산/수수료
├── contact.controller.ts            — 문의 메시지
├── hub-trigger.controller.ts        — Hub QuickAction 트리거
├── inventory.controller.ts          — 공급자 재고
├── neture-asset-snapshot.controller.ts — 에셋 스냅샷
├── neture-tier1-test.controller.ts  — Tier1 테스트 엔드포인트
├── operator-dashboard.controller.ts — Operator 5-Block 대시보드
├── operator-registration.controller.ts — 가입 승인
├── partner.controller.ts            — 파트너 전체 라이프사이클
├── product-library.controller.ts    — 상품 라이브러리
├── seller.controller.ts             — 셀러 상품/주문/계약
├── shipment.controller.ts           — 배송 상태 업데이트
├── supplier-copilot.controller.ts   — 공급자 Copilot KPI
├── supplier-management.controller.ts — 공급자 등록/대시보드
├── supplier-order.controller.ts     — 공급자 주문 관리
├── supplier-product.controller.ts   — 공급자 상품 CRUD
└── supplier-settlement.controller.ts — 공급자 정산/수수료정책
```

---

## 3. Neture 현재 운영자 화면

### 3-1. Operator Pages (`/workspace/operator/*`) — admin OR operator

| Page | Route | API | Purpose |
|------|-------|-----|---------|
| `NetureOperatorDashboard` | `/workspace/operator` | `GET /operator/dashboard` | 5-Block 대시보드 |
| `RegistrationRequestsPage` | `/workspace/operator/registrations` | `GET/POST /operator/registrations/*` | 가입 승인/거부 |
| `SupplyDashboardPage` | `/workspace/operator/supply` | `GET /operator/supply-products` | 공급 현황 |
| `HomepageCmsPage` | `/workspace/operator/homepage-cms` | CMS API | 홈페이지 CMS |
| `SignageHqMediaPage` | `/workspace/operator/signage/hq-media` | Signage API | 사이니지 미디어 |
| `SignageHqPlaylistsPage` | `/workspace/operator/signage/hq-playlists` | Signage API | 사이니지 플레이리스트 |
| `SignageTemplatesPage` | `/workspace/operator/signage/templates` | Signage API | 사이니지 템플릿 |
| `ForumManagementPage` | `/workspace/operator/forum-management` | Forum API | 포럼 카테고리 관리 |
| `OperatorAiReportPage` | `/workspace/operator/ai-report` | — | AI 리포트 (empty state) |
| `AiCardReportPage` | `/workspace/operator/ai-card-report` | — | AI 카드 리포트 |
| `AiOperationsPage` | `/workspace/operator/ai-operations` | — | AI 운영 |
| `AssetQualityPage` | `/workspace/operator/ai/asset-quality` | — | Asset Quality |
| `EmailNotificationSettingsPage` | `/workspace/operator/settings/notifications` | Notification API | 알림 설정 |

### 3-2. Admin Pages (`/workspace/admin/*`) — admin only

| Page | Route | API | Purpose |
|------|-------|-----|---------|
| `AdminDashboardPage` | `/workspace/admin` | `GET /operator/dashboard` (5→4 변환) | 4-Block 관리자 대시보드 |
| `OperatorsPage` | `/workspace/admin/operators` | Admin API | 운영자 관리 |
| `AdminContactMessagesPage` | `/workspace/admin/contact-messages` | Contact API | 문의 메시지 |
| `AdminServiceApprovalPage` | `/workspace/admin/service-approvals` | Service Approval API | 서비스 승인 |
| `AdminSupplierApprovalPage` | `/workspace/admin/suppliers` | Admin Supplier API | 공급자 승인 |
| `AdminProductApprovalPage` | `/workspace/admin/products` | Admin Product API | 상품 승인 |
| `AdminMasterManagementPage` | `/workspace/admin/masters` | Admin Master API | Product Master |
| `CatalogImportDashboardPage` | `/workspace/admin/catalog-import` | Import API | 카탈로그 Import |
| `AdminPartnerMonitoringPage` | `/workspace/admin/partners` | Admin Partner API | 파트너 모니터링 |
| `AdminPartnerSettlementsPage` | `/workspace/admin/partner-settlements` | Partner Settlement API | 파트너 정산 |
| `AdminSettlementsPage` | `/workspace/admin/settlements` | Settlement API | 정산 관리 |
| `AdminCommissionsPage` | `/workspace/admin/commissions` | Commission API | 수수료 관리 |
| `CommunityManagementPage` | `/workspace/admin/community` | Community API | 광고/스폰서 |
| `AiAdminDashboardPage` | `/workspace/admin/ai` | AI Admin API | AI 제어판 |
| `EmailSettingsPage` | `/workspace/admin/settings/email` | Email API | 이메일 설정 |

### 3-3. Operator Sidebar (8 그룹)

```
1. Dashboard    — 대시보드
2. Approvals    — 가입 승인
3. Products     — 공급 현황
4. Content      — 홈페이지 CMS
5. Signage      — 사이니지
6. Forum        — 포럼 관리
7. Analytics    — AI 리포트, AI 카드 리포트, AI 운영, Asset Quality
8. System       — 알림 설정
```

### 3-4. Admin Sidebar (8 그룹)

```
1. Overview     — 대시보드
2. Users        — 운영자, 문의 메시지
3. Approvals    — 공급자 승인, 공급자 목록
4. Products     — 상품 승인, Product Masters, 카탈로그 Import
5. Finance      — 파트너 목록, 파트너 정산, 정산 관리, 수수료 관리
6. Content      — 광고·스폰서
7. Analytics    — AI 대시보드, AI 카드 규칙, AI 비즈니스 팩
8. System       — 이메일 설정
```

---

## 4. Admin / Operator 역할 구분

### 4-1. Scope 설정

```typescript
// packages/security-core/src/service-configs.ts
NETURE_SCOPE_CONFIG = {
  serviceKey: 'neture',
  allowedRoles: ['neture:admin', 'neture:operator', 'neture:supplier', 'neture:partner'],
  platformBypass: true,
  scopeRoleMapping: {
    'neture:admin':    ['neture:admin'],
    'neture:operator': ['neture:operator', 'neture:admin'],  // ← admin도 operator 접근 가능
    'neture:supplier': ['neture:supplier', 'neture:admin'],
    'neture:partner':  ['neture:partner',  'neture:admin'],
  },
};
```

### 4-2. Guard 사용 패턴

| Route Group | Guard | Admin | Operator | super_admin |
|-------------|-------|:-----:|:--------:|:-----------:|
| Operator Dashboard | `requireNetureScope('neture:operator')` | ✅ | ✅ | ✅ |
| Registration Approval | `requireRole([neture:admin, neture:operator, ...])` | ✅ | ✅ | ⚠️ (legacy) |
| Admin Supplier CRUD | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Admin Product Approval | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Admin Settlement/Commission | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Admin Partner Monitoring | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Admin Homepage CMS | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Hub Triggers (admin) | `requireNetureScope('neture:admin')` | ✅ | ❌ | ✅ |
| Hub Triggers (supplier) | `requireActiveSupplier` | Supplier | Supplier | ❌ |

### 4-3. Frontend Role Guard

```tsx
// Operator: admin OR operator
<ProtectedRoute allowedRoles={['admin', 'operator']}> <OperatorLayout /> </ProtectedRoute>

// Admin: admin only
<ProtectedRoute allowedRoles={['admin']}> <AdminLayout /> </ProtectedRoute>
```

### 4-4. 이상 사항

- `operator-registration.controller.ts`는 `requireNetureScope` 대신 `requireRole`을 사용 (DB 기반 실시간 체크, legacy unprefixed roles 허용)
- 플랫폼 표준 위반이나 의도적 선택 (JWT 새로고침 없이 역할 변경 즉시 반영)

---

## 5. 서비스간 대시보드 비교

### 5-1. KPI 비교

| KPI | Neture | GlycoPharm | K-Cosmetics | GlucoseView | KPA |
|-----|:------:|:----------:|:-----------:|:-----------:|:---:|
| 활성 약국/매장 | ✅ | ✅ | ✅ | ✅ | — |
| 활성 공급사/벤더 | ✅ | — | — | ✅ | — |
| 판매 상품 | ✅ | ✅ | ✅ | — | — |
| 월간 주문 | ✅ | ✅ (stub) | ✅ | — | — |
| 월간 매출 | ✅ | — | ✅ | — | — |
| 게시 콘텐츠 | ✅ | — | ✅ | — | ✅ |
| 등록/고위험 환자 | — | ✅ | — | ✅ | — |
| 승인 약사 | — | — | — | ✅ | — |
| 사이니지 | — | — | — | — | ✅ |
| 포럼 | — | — | — | — | ✅ |
| **합계** | **6** | **6** | **5** | **6** | **4** |

### 5-2. ActionQueue 비교

| Action | Neture | GlycoPharm | K-Cosmetics | GlucoseView | KPA |
|--------|:------:|:----------:|:-----------:|:-----------:|:---:|
| 가입/신청 승인 | ✅ | ✅ | — | ✅ (2개) | ✅ |
| 공급사/상품 승인 | ✅ (2개) | ✅ | ✅ (2개) | — | — |
| 주문 처리 | — | — | ✅ | — | — |
| 케어 알림 | — | ✅ | — | ✅ | — |
| 콘텐츠 초안/승인 | — | — | — | — | ✅ (2개) |
| 사이니지 승인 | — | — | — | — | ✅ |
| 포럼 요청 | — | — | — | — | ✅ |
| 강사/과정 승인 | — | — | — | — | ✅ (2개) |
| **합계** | **3** | **3** | **3** | **3** | **7** |

### 5-3. QuickActions 비교

| QuickAction | Neture | GlycoPharm | K-Cosmetics | GlucoseView | KPA |
|-------------|:------:|:----------:|:-----------:|:-----------:|:---:|
| 공급사/약국 관리 | ✅ | ✅ | ✅ | ✅ | — |
| 상품 관리 | ✅ | ✅ | ✅ | ✅ | — |
| 주문 관리 | ✅ | — | ✅ | — | — |
| 콘텐츠 관리 | ✅ | ✅ | ✅ | — | ✅ |
| 입점 심사 | — | ✅ | — | ✅ | — |
| 케어 관리 | — | ✅ | — | ✅ | — |
| 사이니지 | — | — | — | — | ✅ (2개) |
| 포럼 | — | — | — | — | ✅ |
| AI 리포트 | — | — | — | ✅ | — |
| 설정 | — | — | — | — | ✅ |
| **합계** | **4** | **5** | **4** | **6** | **6** |

### 5-4. Sidebar Capability Group 비교

| Group | Neture | GlycoPharm | K-Cosmetics | GlucoseView | KPA |
|-------|:------:|:----------:|:-----------:|:-----------:|:---:|
| 1. Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2. Users | ❌ | ✅ | ✅ | ✅ | ✅ |
| 3. Approvals | ✅ (1개) | ✅ | ✅ | ✅ | ✅ |
| 4. Products | ✅ | ✅ | ✅ | ✅ | ❌ |
| 5. Stores | ❌ | ✅ | ✅ | ✅ | ✅ |
| 6. Orders | ❌ | ✅ | ✅ | ❌ | ❌ |
| 7. Content | ✅ | ❌ | ❌ | ❌ | ✅ |
| 8. Signage | ✅ | ✅ | ✅ | ❌ | ✅ |
| 9. Forum | ✅ | ✅ | ✅ | ❌ | ✅ |
| 10. Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11. System | ✅ | ✅ | ❌ | ❌ | ✅ |
| **합계** | **8/11** | **10/11** | **8/11** | **6/11** | **9/11** |

---

## 6. Neture Operator Dashboard 설계 제안

### 6-1. 현재 Gap 분석

Neture는 플랫폼 기준 서비스임에도 11-Capability Group 중 **3개 그룹이 누락**:

| 누락 그룹 | 해당 기능 존재 여부 | 비고 |
|----------|:------------------:|------|
| **Users** | Backend API 없음 | GlycoPharm/KPA에는 회원 관리 페이지 존재 |
| **Stores** | Store HUB 활성 (F3 frozen) | 매장 관리 페이지 미구현 |
| **Orders** | `neture.neture_orders` 테이블 활성 | 공급자만 주문 관리, 운영자 주문 조회 없음 |

### 6-2. Dashboard Block 개선 제안

#### Block 1: KPI Grid (현재 6개 → 제안 8개)

| key | label | 현재 | 추가 제안 | 이유 |
|-----|-------|:----:|:---------:|------|
| `active-orgs` | 활성 약국 | ✅ | — | — |
| `active-suppliers` | 활성 공급사 | ✅ | — | — |
| `active-products` | 판매 상품 | ✅ | — | — |
| `monthly-orders` | 월간 주문 | ✅ | — | — |
| `monthly-revenue` | 월간 매출 | ✅ | — | — |
| `cms-published` | 게시 콘텐츠 | ✅ | — | — |
| `active-partners` | 활성 파트너 | ❌ | ✅ | Neture 파트너 시스템이 핵심 (F7 frozen), 현재 대시보드에 미표시 |
| `pending-settlements` | 대기 정산 | ❌ | ✅ | 정산 관리가 Admin 핵심 기능 |

#### Block 3: Action Queue (현재 3개 → 제안 5개)

| id | label | 현재 | 추가 제안 | 이유 |
|----|-------|:----:|:---------:|------|
| `pending-regs` | 가입 승인 대기 | ✅ | — | — |
| `pending-suppliers` | 공급사 승인 대기 | ✅ | — | — |
| `pending-products` | 상품 승인 대기 | ✅ | — | — |
| `pending-partnerships` | 파트너십 요청 | ❌ | ✅ | 파트너 신청 대기 카운트 |
| `pending-contacts` | 문의 미처리 | ❌ | ✅ | 고객 문의 응답 필요 |

#### Block 4: Activity Log (현재: 주문만 → 제안: 복합)

현재 `neture.neture_orders`만 표시. 다른 서비스처럼 복합 이벤트 추가 제안:
- 공급자 등록 이벤트
- 상품 승인 이벤트
- 파트너 계약 이벤트
- + 기존 주문 이벤트

#### Block 5: Quick Actions (현재 4개 → 제안 7개)

| id | label | 현재 | 추가 제안 | 이유 |
|----|-------|:----:|:---------:|------|
| `manage-suppliers` | 공급사 관리 | ✅ | — | — |
| `manage-products` | 상품 관리 | ✅ | — | — |
| `manage-orders` | 주문 관리 | ✅ | — | — |
| `manage-content` | 콘텐츠 관리 | ✅ | — | — |
| `manage-signage` | 사이니지 | ❌ | ✅ | 페이지 존재하나 QuickAction에 미등록 |
| `manage-forum` | 포럼 관리 | ❌ | ✅ | 페이지 존재하나 QuickAction에 미등록 |
| `manage-registrations` | 가입 승인 | ❌ | ✅ | 페이지 존재하나 QuickAction에 미등록 |

### 6-3. CopilotEngine Metrics 개선 제안

현재 Neture metrics (12 data points) + 추가 제안:

| Metric | 현재 | 추가 제안 | Source |
|--------|:----:|:---------:|--------|
| `stores.active/inactive` | ✅ | — | — |
| `suppliers.active/pending/total` | ✅ | — | — |
| `products.active/pending/total` | ✅ | — | — |
| `orders.monthly/revenue` | ✅ | — | — |
| `registrations.pending` | ✅ | — | — |
| `cms.published/total` | ✅ | — | — |
| `partners.active` | ❌ | ✅ | `neture_partners WHERE status='active'` |
| `settlements.pending` | ❌ | ✅ | `neture_settlements WHERE status='pending'` |
| `contacts.unresolved` | ❌ | ✅ | `neture_contact_messages WHERE status!='resolved'` |

### 6-4. Sidebar Group 개선 제안 (8 → 11)

```
 1. Dashboard      — 대시보드                              (현재 있음)
 2. Users          — 회원 관리                              (추가 필요)
 3. Approvals      — 가입 승인                              (현재 있음)
 4. Products       — 공급 현황                              (현재 있음)
 5. Stores         — 매장 관리                              (추가 필요)
 6. Orders         — 주문 관리                              (추가 필요)
 7. Content        — 홈페이지 CMS                           (현재 있음)
 8. Signage        — 사이니지                               (현재 있음)
 9. Forum          — 포럼 관리                              (현재 있음)
10. Analytics      — AI 리포트, AI 카드 리포트, AI 운영      (현재 있음)
11. System         — 알림 설정                              (현재 있음)
```

---

## 조사 결론

### Neture 운영자 대시보드 현재 상태

Neture는 플랫폼 5-Block 표준을 준수하며 기본 구조는 완성되어 있다. 그러나:

1. **Dashboard KPI/ActionQueue가 서비스 도메인 전체를 커버하지 못함**
   - 파트너 시스템 (F7 frozen)이 대시보드에 미반영
   - 정산/수수료가 대시보드에 미반영
   - 문의 메시지가 대시보드에 미반영

2. **Sidebar가 11-Capability Group 중 3개 누락**
   - Users, Stores, Orders 그룹 미구현
   - 해당 도메인의 데이터/API는 존재하나 운영자 전용 페이지 부재

3. **ActivityLog가 단일 소스 (주문만)**
   - 다른 서비스는 복합 이벤트를 표시 (신청+승인+알림 등)

4. **QuickActions가 최소 수준**
   - 존재하는 페이지 (사이니지, 포럼, 가입승인) 대한 바로가기 미등록

### 이후 단계

이 조사 결과를 기반으로 `WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1`에서:
- Dashboard Block 개선 (KPI 확장, ActionQueue 확장, ActivityLog 복합화, QuickActions 추가)
- CopilotEngine metrics 확장 (파트너, 정산, 문의)
- Sidebar 11-Group 완성 (Users, Stores, Orders 추가)

---

> 근거: `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`
> 참조: `docs/baseline/BASELINE-OPERATOR-OS-V1.md`
> 참조: `docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md` (F7)
> 참조: `docs/baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` (F8)

*Version: 1.0*
*Status: Complete*
