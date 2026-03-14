# IR-O4O-NETURE-SUPPLIER-DASHBOARD-AUDIT

> **Investigation Request**: Neture Supplier HUB Dashboard 구조 조사
> **Status**: COMPLETE
> **Date**: 2026-03-14
> **Scope**: Supplier Layouts · Dashboard · Products · Offers · Orders · Settlements · Library · Backend API

---

## 1. Executive Summary

Neture Supplier HUB를 전수 조사한 결과, **운영에 필요한 모든 기능이 구현**되어 있다.

| 영역 | 판정 | 비고 |
|------|------|------|
| Supplier Layout (3종) | **ACTIVE** | SpaceLayout + AccountLayout + OpsLayout |
| Supplier Dashboard (2종) | **ACTIVE** | AI Copilot 8-Block + Operations KPI |
| Product 관리 | **ACTIVE** | 등록/수정/목록/CSV Import/바코드 기반 |
| Offer/Inventory 관리 | **ACTIVE** | Inventory 페이지에서 Offer 재고 관리 |
| Order 관리 | **ACTIVE** | 목록/상세/상태 전이/배송 등록 |
| Settlement 관리 | **ACTIVE** | KPI/목록/상세/상태 필터 |
| Library | **ACTIVE** | 문서 업로드/편집/삭제/카테고리 |
| Partner Commission 관리 | **ACTIVE** | 정책 CRUD + 날짜 중복 검증 |
| Backend API | **ACTIVE** | 6개 컨트롤러, 30+ 엔드포인트 |

**종합 판정: FULLY OPERATIONAL** — Supplier는 Product 등록부터 Settlement 확인까지 전체 운영 워크플로를 수행할 수 있다.

---

## 2. Supplier Layout 구조 (3종)

### 2.1 SupplierSpaceLayout

**파일**: `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx`
**경로**: `/supplier/*`
**인증**: supplier 또는 admin role

| Nav 항목 | 경로 |
|----------|------|
| Dashboard | `/supplier/dashboard` |
| Products | `/supplier/products` |
| Offers | `/supplier/offers` |
| Orders | `/supplier/orders` |
| Partner Commissions | `/supplier/partner-commissions` |
| Library | `/supplier/library` |
| Forum | `/supplier/forum` |

구조: Header (메인 네비) + Sub-nav (7개 항목) + Outlet + Footer

### 2.2 SupplierAccountLayout

**파일**: `services/web-neture/src/components/layouts/SupplierAccountLayout.tsx`
**경로**: `/account/supplier/*`
**인증**: supplier 또는 admin role

| Sidebar 항목 | 아이콘 | 경로 |
|-------------|--------|------|
| Dashboard | LayoutDashboard | `/account/supplier` |
| Products | Package | `/account/supplier/products` |
| Offers | FileCheck | `/supplier/offers` |
| Orders | ShoppingCart | `/account/supplier/orders` |

구조: Header (Logo + AccountMenu) + Sidebar (w-56) + Outlet
모바일: 수평 스크롤 nav

### 2.3 SupplierOpsLayout

**파일**: `services/web-neture/src/components/layouts/SupplierOpsLayout.tsx`
**경로**: `/workspace/*`

| Nav 항목 | 경로 |
|----------|------|
| 홈 | `/workspace` |
| 상품 | `/workspace/supplier/products` |
| 콘텐츠 | `/workspace/content` |
| 정산 | `/workspace/partner/settlements` |
| 허브 | `/workspace/hub` (admin/supplier/partner만) |

---

## 3. Supplier Route 전체 지도

### 3.1 `/supplier/*` (SupplierSpaceLayout)

| 경로 | 컴포넌트 | 기능 |
|------|----------|------|
| `/supplier/dashboard` | SupplierDashboardPage | AI Copilot 대시보드 (8-Block) |
| `/supplier/products` | SupplierProductsPage | 상품 관리 (분배/재고) |
| `/supplier/products/new` | SupplierProductCreatePage | 상품 등록 (바코드) |
| `/supplier/offers` | SupplyRequestsPage | 공급 요청 관리 |
| `/supplier/orders` | SupplierOrdersPage | 주문 관리 |
| `/supplier/requests` | SellerRequestsPage | 판매자 신청 목록 |
| `/supplier/requests/:id` | SellerRequestDetailPage | 판매자 신청 상세 |
| `/supplier/library` | SupplierLibraryPage | 콘텐츠 라이브러리 |
| `/supplier/library/new` | SupplierLibraryFormPage | 라이브러리 등록 |
| `/supplier/library/:id/edit` | SupplierLibraryFormPage | 라이브러리 수정 |
| `/supplier/partner-commissions` | SupplierPartnerCommissionsPage | 커미션 정책 관리 |
| `/supplier/profile` | SupplierProfilePage | 프로필 관리 |
| `/supplier/signage/content` | SignageContentHubPage | 사이니지 콘텐츠 |
| `/supplier/forum` | ForumPage | 공급자 포럼 |

### 3.2 `/account/supplier/*` (SupplierAccountLayout)

| 경로 | 컴포넌트 | 기능 |
|------|----------|------|
| `/account/supplier` | SupplierAccountDashboardPage | 운영 대시보드 (KPI + 최근주문) |
| `/account/supplier/products` | SupplierProductsListPage | 상품 목록 (가격 인라인 수정) |
| `/account/supplier/orders` | SupplierOrdersListPage | 주문 목록 (상태 필터) |
| `/account/supplier/orders/:id` | SupplierOrderDetailPage | 주문 상세 + 배송 관리 |
| `/account/supplier/inventory` | SupplierInventoryPage | 재고 관리 |
| `/account/supplier/settlements` | SupplierSettlementsPage | 정산 내역 |

---

## 4. Supplier Dashboard (2종)

### 4.1 AI Copilot Dashboard

**파일**: `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx`
**경로**: `/supplier/dashboard`

**8-Block 구조:**

| Block | 이름 | 색상 | 내용 |
|-------|------|------|------|
| 1 | 공급자 KPI | Slate | 등록 상품 · 판매 중 · 매장 진열 · 최근 7일 주문 |
| 2 | AI 공급자 요약 | Indigo | AI 생성 요약 텍스트 + Risk 레벨 뱃지 |
| 3 | 상품 성과 | Slate | TOP 5 상품 (매출 기준) |
| 4 | 매장 확산 | Slate | 상품별 매장 수 + 신규 매장 |
| 5 | AI 상품 분석 | Indigo | AI 추천 액션 3개 |
| 6 | 인기 상품 | Slate | TOP 5 상품 (주문 수 기준) |
| 7 | 성장 상품 | Emerald | 주간 비교 성장률 |
| 8 | 추천 전략 | Violet | 전체 AI 추천 + 바로가기 링크 |

**API:**
- `supplierCopilotApi.getKpi()`
- `supplierCopilotApi.getAiInsight()`
- `supplierCopilotApi.getProductPerformance()`
- `supplierCopilotApi.getDistribution()`
- `supplierCopilotApi.getTrendingProducts()`

### 4.2 Operations Dashboard

**파일**: `services/web-neture/src/pages/account/SupplierAccountDashboardPage.tsx`
**경로**: `/account/supplier`

**구성:**

| 섹션 | 내용 |
|------|------|
| KPI 카드 (4장) | 오늘 주문 · 처리 대기 · 배송 대기 · 등록 상품 (또는 재고 부족 경고) |
| Quick Actions (5개) | 상품 등록 · 상품 관리 · 주문 관리 · 재고 관리 · 정산 관리 |
| 재고 경고 | 재고 부족/소진 상품 최대 5건 표시 |
| 정산 요약 | 미정산 금액 (amber) + 지급 완료 금액 (green) |
| 최근 주문 | 최근 5건 테이블 (주문번호/매장/금액/일자/상태) |
| 상품 요약 | 등록 상품 · 활성 상품 · 승인 대기 |

**API:**
- `supplierApi.getOrderKpi()`
- `supplierApi.getOrders({ limit: 5 })`
- `dashboardApi.getSupplierDashboardSummary()`
- `supplierApi.getInventory()`
- `supplierApi.getSettlementKpi()`

---

## 5. Product 관리

### 5.1 상품 등록

**파일**: `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx`
**경로**: `/supplier/products/new`

- 바코드 기반 Product Master 조회/생성
- 분배 유형: PUBLIC / SERVICE / PRIVATE
- 가격 설정: 공급가 / 소비자 참조가
- API: `POST /supplier/products`

### 5.2 상품 목록

**파일**: `services/web-neture/src/pages/account/SupplierProductsListPage.tsx`
**경로**: `/account/supplier/products`

- 반응형 테이블/카드 레이아웃
- 인라인 가격 수정
- 카테고리/승인 상태 필터
- 이름/바코드/브랜드 검색
- 활성/비활성 토글 (승인된 상품만)
- API: `GET/PATCH /supplier/products`

### 5.3 상품 관리 (Space)

**파일**: `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx`
**경로**: `/supplier/products`

- 서비스 분배 관리
- 분배 유형 변경 (PUBLIC ↔ PRIVATE)
- 허용 판매자 ID 설정 (PRIVATE)
- 재고 상태 표시
- API: `GET/PATCH /supplier/products`, `GET /supplier/inventory`

---

## 6. Offer/Inventory 관리

**파일**: `services/web-neture/src/pages/account/SupplierInventoryPage.tsx`
**경로**: `/account/supplier/inventory`

| 기능 | 상태 |
|------|------|
| Offer별 재고 조회 | ✅ |
| 재고 추적 ON/OFF | ✅ |
| 수량 수정 | ✅ |
| 부족 임계값 설정 | ✅ |
| 예약/가용 수량 표시 | ✅ |

**상태**: in_stock · low_stock · out_of_stock · untracked

**API:**
- `GET /supplier/inventory`
- `PATCH /supplier/inventory/:offerId`

> **참고**: 별도 "Offer 관리 페이지"는 존재하지 않음. Offer는 Product 등록 시 자동 생성되며, Inventory 페이지에서 재고 관리.

---

## 7. Order 관리

### 7.1 주문 목록

**파일**: `services/web-neture/src/pages/account/SupplierOrdersListPage.tsx`
**경로**: `/account/supplier/orders`

- 페이지네이션 (20건/페이지)
- 상태 필터
- 매장명 검색
- 상태 전이 버튼
- API: `GET /supplier/orders`, `PATCH /supplier/orders/:id/status`

### 7.2 주문 상세

**파일**: `services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx`
**경로**: `/account/supplier/orders/:id`

| 섹션 | 내용 |
|------|------|
| 주문 요약 | 주문번호, 일자, 상태, 총액 |
| 매장 정보 | 매장명, 지역, 연락처, 주소 |
| 주문 상품 | 상품명, 수량, 단가, 금액 |
| 가격 요약 | 상품 합계, 배송비, 최종 금액 |
| 주문 상태 | 현재 상태 + 다음 액션 버튼 |
| 배송 관리 | 택배사 선택 + 운송장 등록 + 배송 상태 |
| 배송지 정보 | 수취인, 연락처, 우편번호, 주소 |

**상태 전이:**
```
created → preparing → shipped → delivered
paid → preparing → shipped → delivered
```

**배송 택배사:**
CJ · 한진 · 롯데 · 로젠 · 우체국 · 기타

**API:**
- `GET /supplier/orders/:id`
- `PATCH /supplier/orders/:id/status`
- `POST /supplier/orders/:id/shipment` (운송장 등록 → 자동 shipped 전환)
- `GET /supplier/orders/:id/shipment`
- `PATCH /supplier/shipments/:shipmentId`

---

## 8. Settlement 관리

**파일**: `services/web-neture/src/pages/account/SupplierSettlementsPage.tsx`
**경로**: `/account/supplier/settlements`

| 기능 | 상태 |
|------|------|
| KPI 카드 (미정산/지급완료) | ✅ |
| 정산 목록 | ✅ |
| 상태 필터 (전체/계산완료/승인/지급/취소) | ✅ |
| 확장 상세 (연결 주문) | ✅ |
| 정산 기간/매출/수수료/정산액 표시 | ✅ |
| 페이지네이션 | ✅ |

**상태**: pending → calculated → approved → paid (또는 cancelled)

**API:**
- `GET /supplier/settlements?page=&status=`
- `GET /supplier/settlements/kpi`
- `GET /supplier/settlements/:id`

---

## 9. Library 관리

**파일**: `services/web-neture/src/pages/supplier/SupplierLibraryPage.tsx`
**경로**: `/supplier/library`

| 기능 | 상태 |
|------|------|
| 문서 목록 (제목/카테고리/파일명/공개여부/날짜) | ✅ |
| 문서 등록 (URL 기반) | ✅ |
| 문서 수정 | ✅ |
| 문서 삭제 | ✅ |
| 공개/비공개 설정 | ✅ |
| 카테고리 분류 | ✅ |

**API:**
- `GET /neture/library?category=&page=&limit=`
- `POST /neture/library`
- `PATCH /neture/library/:id`
- `DELETE /neture/library/:id`

---

## 10. Partner Commission 관리

**파일**: `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx`
**경로**: `/supplier/partner-commissions`

| 기능 | 상태 |
|------|------|
| 커미션 정책 목록 | ✅ |
| 커미션 정책 생성 (상품 선택 + 단가 + 기간) | ✅ |
| 커미션 정책 수정 | ✅ |
| 커미션 정책 삭제 (미사용 시) | ✅ |
| 날짜 중복 검증 | ✅ |

**API:**
- `GET /supplier/partner-commissions`
- `POST /supplier/partner-commissions`
- `PUT /supplier/partner-commissions/:id`
- `DELETE /supplier/partner-commissions/:id`

---

## 11. Backend API 전체 지도

### 11.1 컨트롤러 구조 (6개)

| 컨트롤러 | 파일 | 역할 |
|----------|------|------|
| supplier-management | `supplier-management.controller.ts` | 등록/프로필/대시보드 |
| supplier-product | `supplier-product.controller.ts` | 상품 CRUD + CSV Import |
| supplier-order | `supplier-order.controller.ts` | 주문 조회/상태 변경 |
| shipment | `shipment.controller.ts` | 배송 등록/조회/상태 |
| inventory | `inventory.controller.ts` | 재고 관리 |
| supplier-settlement | `supplier-settlement.controller.ts` | 정산 + 커미션 정책 |

### 11.2 Guard 체계

| Guard | 용도 | 허용 상태 |
|-------|------|----------|
| `requireAuth` | 인증 | 모든 인증 사용자 |
| `requireLinkedSupplier` | 읽기 | PENDING, ACTIVE, REJECTED, INACTIVE |
| `requireActiveSupplier` | 쓰기 | ACTIVE만 |

### 11.3 API 엔드포인트 총 목록

**Registration & Profile (5)**
| Method | Path | Guard |
|--------|------|-------|
| POST | `/supplier/register` | auth |
| GET | `/supplier/dashboard/summary` | auth + linked |
| GET | `/supplier/profile` | auth + linked |
| GET | `/supplier/profile/completeness` | auth + linked |
| PATCH | `/supplier/profile` | auth + active |

**Products (7)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/products` | auth + linked |
| POST | `/supplier/products` | auth + active |
| PATCH | `/supplier/products/:id` | auth + active |
| GET | `/supplier/requests` | auth + linked |
| GET | `/supplier/requests/:id` | auth + linked |
| POST | `/supplier/csv-import/upload` | auth + active |
| GET | `/supplier/csv-import/batches` | auth + linked |
| GET | `/supplier/csv-import/batches/:id` | auth + linked |
| POST | `/supplier/csv-import/batches/:id/apply` | auth + active |

**Orders (5)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/orders/kpi` | auth + linked |
| GET | `/supplier/orders` | auth + linked |
| GET | `/supplier/orders/:id` | auth + linked |
| PATCH | `/supplier/orders/:id/status` | auth + active |
| POST | `/supplier/orders/:orderId/shipment` | auth + active |
| GET | `/supplier/orders/:orderId/shipment` | auth + linked |

**Inventory (2)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/inventory` | auth + linked |
| PATCH | `/supplier/inventory/:offerId` | auth + active |

**Settlements (3)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/settlements` | auth + linked |
| GET | `/supplier/settlements/kpi` | auth + linked |
| GET | `/supplier/settlements/:id` | auth + linked |

**Partner Commissions (4)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/partner-commissions` | auth + linked |
| POST | `/supplier/partner-commissions` | auth + active |
| PUT | `/supplier/partner-commissions/:id` | auth + active |
| DELETE | `/supplier/partner-commissions/:id` | auth + active |

**AI Copilot (4)**
| Method | Path | Guard |
|--------|------|-------|
| GET | `/supplier/copilot/kpi` | auth + supplier |
| GET | `/supplier/copilot/products/performance` | auth + supplier |
| GET | `/supplier/copilot/distribution` | auth + supplier |
| GET | `/supplier/copilot/products/trending` | auth + supplier |

---

## 12. Supplier 운영 흐름 검증

```
Supplier 등록
  POST /supplier/register (status: PENDING)
     ↓ Admin 승인 → status: ACTIVE
     ↓
Product 등록
  POST /supplier/products (barcode → Product Master → Offer 생성)
     ↓ Admin 상품 승인 → approvalStatus: APPROVED
     ↓
Store 판매
  Seller가 Product Approval 신청 → Admin/자동 승인 → Listing 생성
     ↓
Order 생성
  checkoutService.createOrder() → order status: created
     ↓
Supplier 주문 처리
  GET /supplier/orders → 주문 확인
  PATCH /supplier/orders/:id/status (preparing)
  POST /supplier/orders/:id/shipment (운송장 → 자동 shipped)
  PATCH /supplier/orders/:id/status (delivered)
     ↓
Settlement
  Admin이 정산 생성 → GET /supplier/settlements → 확인
     ↓
Commission
  Supplier가 커미션 정책 설정 → Partner 소개 판매 시 자동 커미션 생성
```

**전체 흐름 판정: COMPLETE** — 모든 단계가 API + UI로 구현됨

---

## 13. 영역별 최종 판정

| # | 영역 | 판정 | 페이지 수 | API 수 |
|---|------|------|----------|--------|
| 1 | Supplier Dashboard | **ACTIVE** | 2 (AI + Ops) | 7 |
| 2 | Product 관리 | **ACTIVE** | 3 (목록+등록+관리) | 9 |
| 3 | Offer/Inventory 관리 | **ACTIVE** | 1 (Inventory) | 2 |
| 4 | Order 관리 | **ACTIVE** | 2 (목록+상세) | 6 |
| 5 | Settlement | **ACTIVE** | 1 | 3 |
| 6 | Library | **ACTIVE** | 2 (목록+폼) | 4 |
| 7 | Partner Commission | **ACTIVE** | 1 | 4 |
| 8 | Profile | **ACTIVE** | 1 | 3 |
| **합계** | | | **13 pages** | **38 endpoints** |

---

## 14. 결론

### Supplier HUB: **FULLY OPERATIONAL**

Neture Supplier HUB는 **13개 페이지 + 38개 API 엔드포인트**로 구성된 완전한 운영 시스템이다.

- 2종 대시보드 (AI Copilot + Operations)
- Product 등록 → Order 처리 → Settlement 확인 전체 워크플로 완성
- Partner Commission 정책 CRUD 지원
- CSV 대량 등록, 재고 관리, 배송 관리 모두 구현
- Guard 체계 (linked/active) 정상 적용

### Neture 전체 구조 현황

```
Admin Dashboard     → 정비 완료 ✅
Partner Network     → 구현 완료 ✅
Supplier Dashboard  → 구현 완료 ✅  ← 이번 조사 결과
```

### 개선 가능 항목 (선택)

| # | 항목 | 현재 | 우선순위 |
|---|------|------|---------|
| 1 | Offer 전용 관리 페이지 | Inventory에서 간접 관리 | 낮음 |
| 2 | 대시보드 통합 | 2종 분리 운영 | 낮음 (의도적 분리) |
| 3 | 정산 상세 내 주문 링크 | 주문번호만 표시 | 낮음 |

현재 상태로 운영 가능한 수준이며, 즉시 수정이 필요한 항목은 없다.

---

*Generated: 2026-03-14*
*Auditor: Claude Code*
*Scope: Frontend 13 pages + Backend 6 controllers, 38 endpoints*
