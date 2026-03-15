# IR-O4O-TABLET-SALES-FLOW-AUDIT-V1

> O4O Tablet Display 시스템 — 매장 판매 흐름 연결 구조 조사
> 조사일: 2026-03-15
> 상태: **조사 완료**

---

## Executive Summary

| 질문 | 답변 | 판정 |
|------|------|------|
| Tablet이 상품 진열 도구로 동작하는가? | YES — supplier + local 혼합 진열 | **구현됨** |
| 고객이 관심 요청을 생성할 수 있는가? | YES — Interest Request + Service Request | **구현됨** |
| 직원이 요청을 관리할 수 있는가? | YES — Acknowledge → Complete/Cancel | **구현됨** |
| Tablet에서 직접 B2C Checkout이 가능한가? | **NO** — Request-only, 결제 없음 | **의도적 설계** |
| 매출 전환 추적이 있는가? | **NO** — Request 완료 = 흐름 종료 | **미구현** |

**최종 판정: CASE 2 — Tablet Display + Interest Queue**

Tablet은 **매장 판매 보조 도구**로 설계되어 있다. 진열 + 고객 관심 요청 + 직원 워크플로까지 구현되어 있으나, B2C 결제 연결 및 매출 전환 추적은 의도적으로 배제되어 있다.

---

## 1. Tablet Display Architecture

### 1.1 데이터 소스

```
store_tablet_displays (진열 구성)
    ├ product_type = 'supplier' → organization_product_listings → supplier_product_offers → product_masters
    └ product_type = 'local'    → store_local_products
```

### 1.2 공개 API — 상품 목록

| 항목 | 내용 |
|------|------|
| Endpoint | `GET /api/v1/stores/:slug/tablet/products` |
| 인증 | 없음 (공개) |
| 캐시 | `sf:tablet:{pharmacyId}` + SHA1 해시 |
| 페이징 | page, limit (기본 20) |
| 정렬 | sort_order ASC (기본), name, price, created_at |
| 검색 | q (상품명), category (카테고리) |

### 1.3 Supplier Product Visibility Gate (4중)

```sql
WHERE spo.is_active = true           -- 1. 공급 상품 활성
  AND opl.is_active = true           -- 2. 조직 리스팅 활성
  AND opc.is_active = true           -- 3. 채널 매핑 활성
  AND oc.status = 'APPROVED'         -- 4. 채널 승인됨
  AND oc.channel_type = 'TABLET'     -- TABLET 채널 전용
  AND s.status = 'ACTIVE'            -- 공급자 활성
```

**판정: 4중 Visibility Gate 적용 확인됨.**

### 1.4 Local Product 필터

```sql
SELECT id, name, description, summary, thumbnail_url, images, gallery_images,
       category, price_display, badge_type, highlight_flag, sort_order
FROM store_local_products
WHERE organization_id = $1 AND is_active = true
ORDER BY sort_order ASC, name ASC
```

**판정: is_active 단일 필터만 적용 (Display Domain — Visibility Gate 불필요).**

### 1.5 Hardening Guard

| 규칙 | 적용 여부 |
|------|:--------:|
| DB UNION 금지 (Application-level merge) | **YES** |
| Local Product → Checkout 연결 금지 | **YES** |
| Supplier/Local 별도 쿼리 | **YES** |

### 1.6 응답 구조

```json
{
  "success": true,
  "data": [...supplierProducts],
  "meta": { "page": 1, "limit": 20, "total": 100 },
  "localProducts": [...localProducts]
}
```

Supplier와 Local이 별도 필드로 분리 반환됨.

---

## 2. Product Detail Architecture

### 2.1 Tablet 상품 상세 화면

| 항목 | 결과 |
|------|------|
| 별도 Product Detail 페이지 존재 여부 | **NO** |
| 상품 클릭 시 동작 | 카트에 직접 추가 (1-click add) |
| 상세 설명 표시 | **NO** — 이름 + 가격만 표시 |
| 이미지 갤러리 | **NO** — 썸네일만 표시 |
| HTML 상세 (detail_html) | **NO** — 목록에서 제외 |

**설계 의도**: Tablet은 터치 키오스크로, 최소한의 정보로 빠른 선택을 유도한다. 상세 정보는 직원 상담으로 대체.

### 2.2 Storefront Product Detail (B2C — 비교 참조)

| 항목 | Tablet | Storefront (B2C) |
|------|--------|------------------|
| 상세 페이지 | 없음 | `/store/:slug/products/:id` |
| 이미지 | 썸네일만 | 풀 이미지 |
| 설명 | 없음 | 설명 + 카테고리 + 제조사 |
| 가격 | 단일 가격 | 정가 + 할인가 |
| 장바구니 | 서비스 요청 카트 | 결제 카트 |
| 결제 | **불가** | Toss 결제 |

---

## 3. Customer Interaction Flow

### 3.1 Interest Request (관심 요청)

| 항목 | 내용 |
|------|------|
| Endpoint | `POST /api/v1/stores/:slug/tablet/interest` |
| 인증 | 없음 |
| Rate Limit | 10건/10분/IP |
| 필수 필드 | `masterId` (ProductMaster UUID) |
| 선택 필드 | `customerName`, `customerNote` |

```json
// Request
{ "masterId": "uuid", "customerName": "홍길동", "customerNote": "오전 상담 희망" }

// Response (201)
{ "success": true, "data": { "requestId": "uuid", "status": "REQUESTED", "productName": "상품명" } }
```

**Interest Request는 주문이 아닌 관심 표시 큐이다.**
- E-commerce Core와 완전 분리
- `tablet_interest_requests` 테이블 (별도)
- 상태 모델: REQUESTED → ACKNOWLEDGED → COMPLETED | CANCELLED

### 3.2 Service Request (서비스 요청 — 카트 기반)

| 항목 | 내용 |
|------|------|
| Endpoint | `POST /api/v1/stores/:slug/tablet/requests` |
| 인증 | 없음 |
| Rate Limit | 10건/10분/IP |
| 최대 항목 | 20개 상품 |
| 최대 수량 | 99개/상품 |

```json
// Request
{
  "items": [{ "productId": "uuid", "quantity": 2 }],
  "note": "포장해 주세요",
  "customerName": "홍길동"
}

// Response (201)
{ "success": true, "data": { "requestId": "uuid", "status": "requested" } }
```

**Service Request도 주문이 아닌 요청 큐이다.**
- 결제 없음
- 직원 확인 후 오프라인 판매로 전환

### 3.3 Request Status 조회

| 항목 | 내용 |
|------|------|
| Endpoint | `GET /api/v1/stores/:slug/tablet/requests/:id` |
| Boundary Guard | UUID + pharmacyId 복합 조건 (단독 UUID 조회 금지) |

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "requested|acknowledged|served|cancelled",
    "items": [...],
    "acknowledgedAt": null,
    "servedAt": null
  }
}
```

---

## 4. Staff Workflow

### 4.1 직원 요청 관리 화면

| 서비스 | 화면 | 경로 |
|--------|------|------|
| KPA | TabletRequestsPage | `/store/channels/tablet` |
| GlycoPharm | CustomerRequestsPage | `/store/requests` |

### 4.2 KPA 직원 워크플로

```
Customer → Tablet 요청 생성
              ↓
Staff sees request (5초 폴링)
              ↓
Staff: "확인" → status = acknowledged
              ↓
Staff: "완료" → status = served
              ↓
Tablet 화면: 자동 리셋 (2분 후)
```

### 4.3 Interest Request 관리 API

| Endpoint | 설명 |
|----------|------|
| `GET /interest/pending-count` | 대기 건수 (COUNT 쿼리, 3초 폴링용) |
| `GET /interest/recent` | 최근 50건 (REQUESTED + ACKNOWLEDGED) |
| `GET /interest/stats` | 대시보드 통계 (대기/오늘/완료/인기 상품) |
| `PATCH /interest/:id/acknowledge` | 확인 처리 |
| `PATCH /interest/:id/complete` | 완료 처리 |
| `PATCH /interest/:id/cancel` | 취소 처리 |

### 4.4 상태 전이 규칙

```
REQUESTED → ACKNOWLEDGED, COMPLETED, CANCELLED
ACKNOWLEDGED → COMPLETED, CANCELLED
COMPLETED → (종료)
CANCELLED → (종료)
```

각 전이 시 타임스탬프 기록: `acknowledgedAt`, `completedAt`, `cancelledAt`

### 4.5 대시보드 통계

```json
{
  "pendingCount": 3,
  "todayCount": 15,
  "completedTodayCount": 12,
  "topProducts": [
    { "masterId": "uuid", "productName": "인기 상품", "count": 5 }
  ]
}
```

### 4.6 알림 시스템

| 항목 | 현재 상태 |
|------|----------|
| WebSocket | **없음** |
| Push 알림 | **없음** |
| 폴링 | **5초 간격** (TabletRequestsPage) |
| 대시보드 배지 | **없음** — 메인 대시보드에 요청 건수 미표시 |

**판정: 폴링 기반 실시간 처리. WebSocket/Push 미구현.**

---

## 5. Sales Conversion Structure

### 5.1 가능한 매출 전환 경로

#### 경로 A: Tablet → 오프라인 판매 (현재 구현)

```
Tablet 진열
  ↓
고객: 관심 요청 / 서비스 요청
  ↓
직원: 확인 (ACKNOWLEDGED)
  ↓
직원: 대면 상담
  ↓
매장 오프라인 판매 (POS)
  ↓
직원: 완료 (COMPLETED)
```

**이 경로는 완전히 구현되어 있다.** 단, 매출 전환 추적(Request → 실제 매출)은 존재하지 않는다.

#### 경로 B: Tablet → B2C Checkout (미구현)

```
Tablet 진열
  ↓
상품 상세 보기 ← 없음
  ↓
장바구니 → Checkout ← 연결 없음
  ↓
결제 (Toss) ← 연결 없음
```

**이 경로는 구현되어 있지 않으며, 의도적으로 배제되어 있다.**

- Tablet은 `POST /:slug/tablet/requests` (요청)만 지원
- Storefront은 `POST /api/v1/kpa/checkout` (결제)만 지원
- 두 시스템 간 연결 없음

#### 경로 C: QR → Storefront (간접 경로)

```
Tablet 진열 (매장)
  ↓
고객: QR 코드 스캔
  ↓
Storefront 상품 상세 (/store/:slug/products/:id)
  ↓
장바구니 → Checkout → 결제 (Toss)
```

**이 경로는 QR 코드가 구현되어 있어 기술적으로 가능하다.** 단, Tablet ↔ QR ↔ Storefront 간 자동 연결은 없으며, 별도의 QR 코드 배포가 필요하다.

### 5.2 매출 전환 추적

| 항목 | 현재 상태 |
|------|----------|
| Interest Request → Order 자동 연결 | **없음** |
| Service Request → Order 자동 연결 | **없음** |
| Referral Attribution (QR) | **구현됨** — `?ref=` 파라미터 |
| 매출 전환율 대시보드 | **없음** |
| Request 완료 후 매출 기록 | **없음** |

---

## 6. Domain Boundary Validation

### 6.1 Commerce Domain (결제 가능)

```
product_masters
  └ supplier_product_offers
      └ organization_product_listings
          └ organization_product_channels (channel_type = 'B2C')
              └ Checkout → Order → Payment (Toss)
```

### 6.2 Display Domain (진열 전용)

```
store_local_products (Checkout 연결 금지)
store_tablet_displays (진열 구성)
tablet_interest_requests (관심 큐 — 주문 아님)
tablet_service_requests (서비스 큐 — 주문 아님)
```

### 6.3 Boundary 검증

| 항목 | 준수 여부 |
|------|:--------:|
| Local Product → Checkout 금지 | **YES** — API에 Checkout 경로 없음 |
| Interest Request ≠ Order | **YES** — 별도 테이블, E-commerce Core 분리 |
| Cross-domain JOIN 금지 | **YES** — Application-level merge 사용 |
| UUID 단독 조회 금지 | **YES** — pharmacyId 복합 조건 적용 |
| organization_id 기반 격리 | **YES** — 모든 쿼리에 적용 |

**판정: Domain Boundary Policy 완전 준수.**

---

## 7. Tablet UX 구조

### 7.1 KPA Tablet 키오스크

| 항목 | 내용 |
|------|------|
| 경로 | `/tablet/:slug` |
| 레이아웃 | 풀스크린 고정 (position: fixed) |
| 인증 | 없음 (공개 키오스크) |
| 상품 그리드 | auto-fill 반응형 (min 180px 카드) |
| 상품 카드 | 썸네일 + 이름 + 가격 + 수량 뱃지 |
| 카트 사이드바 | 고정 320px, 수량 조절 + 고객명 + 메모 |
| 상품 상세 | **없음** — 1-click 카트 추가 |
| 결제 | **없음** — 요청 전송만 |
| 자동 리셋 | 완료/취소 후 2분 뒤 |

### 7.2 GlycoPharm Tablet (직원 보조)

| 항목 | 내용 |
|------|------|
| 레이아웃 | TabletLayout (직원 보조 주문 모드) |
| 검색 | 대형 터치 검색창 |
| 카테고리 | Sticky 카테고리 네비게이션 |
| 직원 요청 | 모달 (상담/샘플/주문) |
| 이벤트 추적 | `POST /api/v1/glycopharm/events` |

### 7.3 QR 코드 지원

| 항목 | 내용 |
|------|------|
| QR 생성 | Store QR 관리 (`/store/marketing/qr`) |
| QR 랜딩 | `/qr/:slug` → 스토어홈/상품 연결 |
| Referral | `?ref=` 파라미터 → Checkout에 전달 |

---

## 8. Architecture Verdict

### CASE 2: Tablet Display + Interest Queue

Tablet 시스템은 다음과 같이 동작한다:

```
┌─────────────────────────────────────────────────────┐
│                  Tablet 키오스크                       │
│                                                      │
│  상품 그리드 (Supplier + Local 혼합)                   │
│       ↓                                              │
│  1-click 카트 추가                                    │
│       ↓                                              │
│  요청 전송 (결제 없음)                                 │
│       ↓                                              │
│  상태 추적 (requested → acknowledged → served)        │
│       ↓                                              │
│  자동 리셋 (2분)                                      │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│                직원 대시보드                            │
│                                                      │
│  요청 목록 (5초 폴링)                                  │
│       ↓                                              │
│  확인 → 상담 → 완료/취소                               │
│       ↓                                              │
│  통계 (대기/오늘/완료/인기상품)                          │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│              매출 전환 (수동)                           │
│                                                      │
│  오프라인 POS 판매 (추적 불가)                          │
│  또는                                                 │
│  QR → Storefront → Checkout (별도 경로)               │
└─────────────────────────────────────────────────────┘
```

### 구현된 것

| 기능 | 상태 | 비고 |
|------|:----:|------|
| 상품 진열 (Supplier + Local 혼합) | **완성** | 4중 Visibility Gate + 별도 Local 필터 |
| 고객 관심 요청 (Interest Request) | **완성** | Rate Limit, 상태 머신 |
| 고객 서비스 요청 (Service Request) | **완성** | 카트 기반, 수량 관리 |
| 직원 요청 관리 | **완성** | 5초 폴링, 상태 전이 |
| 대시보드 통계 | **완성** | 대기/오늘/완료/인기상품 |
| 바코드 상품 등록 | **완성** | GTIN → ProductMaster |
| Domain Boundary 준수 | **완성** | Cross-domain 금지 |
| Tablet 디바이스 CRUD | **완성** | 생성/수정/비활성화 |
| 진열 구성 편집 | **완성** | Dual-panel editor (WO-O4O-STORE-LOCAL-PRODUCT-UI-V1) |

### 구현되지 않은 것

| 기능 | 상태 | 필요성 |
|------|:----:|:------:|
| Tablet → B2C Checkout 연결 | 미구현 | 선택적 |
| 매출 전환 추적 (Request → Sale) | 미구현 | 중 |
| WebSocket 실시간 알림 | 미구현 | 낮 |
| 메인 대시보드 요청 배지 | 미구현 | 중 |
| 상품 상세 페이지 (Tablet) | 미구현 | 낮 |
| 환불/교환 연동 | 미구현 | 해당 없음 |

### 의도적 설계 결정

1. **Tablet ≠ Checkout**: Tablet은 매장 내 진열/안내 도구로 설계됨. 결제는 오프라인 POS 또는 별도 B2C 경로로 수행.
2. **Interest Request ≠ Order**: E-commerce Core와 의도적으로 분리. 독립적 관심 큐.
3. **Local Product ≠ Commerce Object**: Display Domain 전용. Checkout 연결 구조적으로 불가.
4. **1-click UX**: 키오스크 특성상 상세 페이지 없이 즉시 요청 가능하도록 설계.

---

## 관련 파일 참조

### Backend

```
apps/api-server/src/routes/platform/unified-store-public.routes.ts    — 공개 Tablet API
apps/api-server/src/routes/platform/store-tablet.routes.ts            — 관리자 Tablet API
apps/api-server/src/routes/platform/entities/store-tablet.entity.ts   — Tablet 엔티티
apps/api-server/src/routes/platform/entities/store-tablet-display.entity.ts  — Display 엔티티
apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts — Interest 엔티티
apps/api-server/src/routes/platform/entities/store-local-product.entity.ts    — Local Product
```

### Frontend — Tablet 키오스크

```
services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx         — KPA Tablet 키오스크
services/web-glycopharm/src/components/layouts/TabletLayout.tsx       — GlycoPharm Tablet 레이아웃
```

### Frontend — 직원 관리

```
services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx    — KPA 요청 관리
services/web-glycopharm/src/pages/pharmacy/CustomerRequestsPage.tsx   — GlycoPharm 요청 관리
```

### Frontend — 진열 구성 (WO-O4O-STORE-LOCAL-PRODUCT-UI-V1)

```
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
services/web-glycopharm/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
services/web-k-cosmetics/src/pages/store/StoreTabletDisplaysPage.tsx
```

### Frontend — B2C Storefront (비교 참조)

```
services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx
services/web-kpa-society/src/pages/storefront/CheckoutPage.tsx
services/web-kpa-society/src/pages/storefront/PaymentSuccessPage.tsx
```

---

*IR-O4O-TABLET-SALES-FLOW-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
*Verdict: CASE 2 — Tablet Display + Interest Queue*
