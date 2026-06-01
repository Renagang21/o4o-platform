# IR-O4O-KCOSMETICS-STORE-ORDER-BILLING-PLACEHOLDER-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `a1f99d8aa` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB/menu 수정 없음  
**선행 컨텍스트**: CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V2 Drift D4/D5 조사

---

## 1. 전체 판정

| 영역 | 판정 | 즉시 WO 가능 |
|------|------|------------|
| **주문 관리 (orders)** | **NEEDS WORK — Frontend만 미구현** | ✅ 가능 |
| **정산/인보이스 (billing)** | **BLOCKED — Backend 미존재** | ❌ 별도 설계 필요 |

**핵심 결론:**
- K-Cosmetics 주문 backend API는 **완전 구현 완료** (819줄). frontend만 없는 상태.
- K-Cosmetics 정산 backend는 **존재하지 않음**. GlycoPharm 전용 구조만 있음.
- **주문과 정산은 반드시 분리**해야 한다.

---

## 2. 사전 git 상태

```
?? 이미지 파일들 (smoke 스크린샷)
?? docs/investigations/IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1.md ← 다른 세션 WIP
staged 없음. 소스 파일 수정 없음.
```

---

## 3. K-Cosmetics 현재 상태 (Frontend)

### 3.1 Route 등록

| 경로 | 현황 | 컴포넌트 |
|------|------|---------|
| `/store/commerce/orders` | ✅ 등록됨 | `StorePlaceholderPage title="주문 관리"` |
| `/store/commerce/billing` | ✅ 등록됨 | `StorePlaceholderPage title="정산/인보이스"` |
| Legacy `/store/orders` | Navigate 리다이렉트 | → `/store/commerce/orders` |
| Legacy `/store/billing` | Navigate 리다이렉트 | → `/store/commerce/billing` |

**파일:** `services/web-k-cosmetics/src/App.tsx:670-711`

### 3.2 StorePlaceholderPage 내용

```
이 기능은 준비 중입니다
```
— `packages/store-ui-core/src/components/StorePlaceholderPage.tsx:11`

- title prop만 받아서 제목 + "준비 중" 메시지 표시
- API 호출 없음, 데이터 없음

### 3.3 사이드바 메뉴 노출 상태

`COSMETICS_STORE_CONFIG` menuSections 전체를 확인한 결과:

```
홈 섹션:    홈 / 채널 관리
상품 섹션:  내 매장 상품 / 자체 상품
사이니지:   플레이리스트 / 동영상 / 스케줄
매장 실행:  태블릿 / 블로그 / POP / QR 코드
내 자료함:  콘텐츠 / 자료 / 매장 제작 자료
설정:       매장/사업자 정보 / 매장 설정
```

**주문/정산 메뉴 항목 완전 미존재.** 사이드바에서는 접근 불가 — route는 있으나 진입 불가.

### 3.4 Frontend API Client

`services/web-k-cosmetics/src/api/` 전체 탐색 결과:

- 주문 관련 API client 파일: **없음**
- 정산 관련 API client 파일: **없음**

---

## 4. K-Cosmetics Backend API 현황

### 4.1 주문 Backend — 완전 구현

**파일:** `apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts`

| 엔드포인트 | 설명 | 상태 |
|-----------|------|------|
| `POST /cosmetics/orders` | 주문 생성 | ✅ 구현 |
| `GET /cosmetics/orders` | 주문 목록 (판매자/구매자) | ✅ 구현 |
| `GET /cosmetics/orders/:id` | 주문 상세 | ✅ 구현 |

- 819줄 완전 구현
- `EcommerceOrder` 기반, `metadata.serviceKey = 'cosmetics'` 필터
- `local` / `travel` 채널 구분 지원
- 세금환급(TaxRefund) travel 채널 전용 지원
- cosmetics_store_listings + cosmetics_products 연계 검증

**마운트:** `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts:110`
```typescript
router.use('/orders', orderController); // H2-0: 주문 엔드포인트
```

### 4.2 결제 Backend — 완전 구현

**파일:** `apps/api-server/src/routes/cosmetics/controllers/cosmetics-payment.controller.ts`

| 엔드포인트 | 설명 | 상태 |
|-----------|------|------|
| `POST /cosmetics/payments/prepare` | 결제 준비 (PaymentCoreService) | ✅ 구현 |
| `POST /cosmetics/payments/confirm` | 결제 확정 (Toss 어댑터) | ✅ 구현 |
| `GET /cosmetics/payments/order/:orderId` | 주문별 결제 조회 | ✅ 구현 |

- 333줄 구현
- **마운트:** `cosmetics.routes.ts:111`

### 4.3 정산/인보이스 Backend — 미존재

`apps/api-server/src/routes/cosmetics/` 전체 탐색:

- billing/invoice/settlement 관련 controller: **없음**
- GlycoPharm만 `apps/api-server/src/routes/glycopharm/entities/billing-invoice.entity.ts` 존재

---

## 5. KPA / GlycoPharm Reference

### 5.1 KPA-Society 주문

| 항목 | 내용 |
|------|------|
| Frontend page | `StoreOrdersPage.tsx` — 완전 구현 |
| API client | `src/api/checkout.ts` |
| Backend endpoint | `GET /checkout/store-orders` (Core 공통 API) |
| 메뉴 | `orders: '주문 내역'` → `/commerce/orders` |
| 정산 | 메뉴 미노출, 미구현 |

**KPA API 패턴:**
```typescript
// services/web-kpa-society/src/api/checkout.ts
getStoreOrders()   → GET /checkout/store-orders
getStoreOrderKpi() → GET /checkout/store-orders/kpi
getStoreOrder(id)  → GET /checkout/store-orders/:id
```

> KPA는 Core 공통 `/checkout/store-orders` 사용.  
> K-Cosmetics는 service-specific `/cosmetics/orders` 사용.  
> **K-Cosmetics는 KPA API를 그대로 재사용할 수 없고, 전용 API client가 필요하다.**

### 5.2 GlycoPharm 주문

| 항목 | 내용 |
|------|------|
| Frontend page | `PharmacyOrders.tsx` — 완전 구현 |
| API client | `src/api/pharmacy.ts` |
| Backend endpoint | `GET /glycopharm/pharmacy/orders` (GlycoPharm 전용) |
| 메뉴 | `orders: '주문 내역'` → `/commerce/orders` |

### 5.3 GlycoPharm 정산

| 항목 | 내용 |
|------|------|
| Frontend page | `StoreBillingPage.tsx` — 부분 구현 (Mock 데이터 사용) |
| Backend entity | `billing-invoice.entity.ts` (GlycoPharm 전용) |
| 수수료 | COMMISSION_RATE = 5% 하드코딩 |
| 상태 | 완전 구현 아님 — Mock 수준 |

---

## 6. 데이터 모델 확인

### 6.1 EcommerceOrder (공통)

| 필드 | 내용 |
|------|------|
| `metadata.serviceKey` | `'cosmetics'` (JSONB) — K-Cosmetics 주문 필터 기준 |
| `channel` | `'local'` / `'travel'` |
| `storeId` | nullable (metadata 내부 권장) |
| `orderType` | `COSMETICS` (WO-O4O-ECOMMERCE 계약에서 GLYCOPHARM은 BLOCKED) |

→ **K-Cosmetics 주문은 이미 checkout_orders에 들어가는 구조.** sellerOrganizationId 매핑도 backend에서 처리됨.

### 6.2 정산/Invoice 테이블

| 서비스 | Invoice Entity |
|--------|---------------|
| KPA-Society | ❌ 없음 |
| GlycoPharm | ✅ `billing-invoice.entity.ts` |
| K-Cosmetics | ❌ 없음 |

→ **K-Cosmetics 정산 구현 시 별도 entity 설계 또는 GlycoPharm 패턴 검토 필요.**

### 6.3 Migration 필요 여부

- **주문**: 불필요 (기존 checkout_orders + cosmetics-order.controller 사용)
- **정산**: 필요 (새 entity 또는 기존 확장)

---

## 7. 정책 판단

| 질문 | 판단 |
|------|------|
| 주문 관리 지금 구현해야 하는가? | **YES** — backend 완전 구현, frontend만 없음. 즉시 WO 가능 |
| 정산/인보이스 지금 구현해야 하는가? | **NO** — backend 미존재. 별도 설계 IR 필요 |
| 주문 먼저, 정산 후순위로 둘 수 있는가? | **YES** — 독립적인 기능, 분리 가능 |
| placeholder "준비 중" 표시 개선? | **선택적** — 현재 `StorePlaceholderPage`가 이미 "준비 중" 표시함 |
| K-Cosmetics 문구 기준 | "내 매장", "매장 주문", "매장 정산" — KPA/GlycoPharm 약국 문구 사용 금지 |

---

## 8. 위험도 평가

### 주문 관리 (orders)

```
위험도: LOW~MEDIUM

이유:
- Backend API 완전 구현됨 (cosmetics-order.controller.ts 819줄)
- EcommerceOrder 데이터 이미 쌓이는 구조
- KPA/GlycoPharm 구현 패턴 참조 가능
- Frontend API client + page + menu 항목 추가만 필요

주의:
- K-Cosmetics API endpoint는 /cosmetics/orders (KPA Core API와 다름)
- orderType=COSMETICS 확인 필요 (GLYCOPHARM은 BLOCKED 상태)
- local/travel 채널 구분 UI 반영 필요 여부 검토
```

### 정산/인보이스 (billing)

```
위험도: HIGH → BLOCKED

이유:
- Backend entity/controller 미존재
- GlycoPharm 정산도 Mock 수준 (완성 아님)
- 정산은 PG 정산 주기, 수수료 정책, 외부 정산 시스템과 연결 필요
- K-Cosmetics 정산 정책 미정의

결론: 구현 전 별도 IR 또는 정책 설계 필요
```

---

## 9. 후속 WO 후보

| 우선순위 | WO/IR | 범위 | 난이도 | 비고 |
|---------|-------|------|--------|------|
| **1순위** | **WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1** | 주문 frontend | 낮음~중간 | Backend 완비 — frontend+API client+메뉴 추가만 |
| **보류** | IR-O4O-KCOSMETICS-STORE-BILLING-SETTLEMENT-DESIGN-V1 | 정산 설계 IR | — | backend 설계 + 정책 확정 후 WO로 전환 |
| **선택적** | WO-O4O-KCOSMETICS-STORE-BILLING-PLACEHOLDER-CLARITY-V1 | "준비 중" UX 개선 | 매우 낮음 | 현재 StorePlaceholderPage이 이미 메시지 표시 중 |

### WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1 상세 범위

구현 필요 항목:

```
1. services/web-k-cosmetics/src/api/storeOrders.ts 신규
   - getStoreOrders()   → GET /cosmetics/orders
   - getStoreOrder(id)  → GET /cosmetics/orders/:id
   - updateOrderStatus() → PATCH /cosmetics/orders/:id/status

2. services/web-k-cosmetics/src/pages/store/StoreOrdersPage.tsx 신규
   - 주문 목록 (channel: local/travel 구분 탭 또는 필터)
   - 주문 상태 표시 (created/pending/paid/shipped 등)
   - 주문 상세 (Drawer 또는 별도 page)
   - 사용자-facing 문구: "매장 주문", "내 매장 주문"

3. App.tsx route 교체
   - StorePlaceholderPage → StoreOrdersPage

4. storeMenuConfig.ts COSMETICS_STORE_CONFIG 메뉴 추가
   - 상품 섹션 또는 별도 섹션에 '주문 내역' 추가
   - subPath: '/commerce/orders'
```

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|------|
| **매장 실행 capability 정렬** | 주문 backend 완비, frontend 미구현. 매장 운영자가 주문을 볼 수 없는 상태 | ⚠️ 불완전 |
| **공통 capability = UI+API+데이터 동시 정렬** | 주문 API 있으나 UI/클라이언트 없음 → 운영 차단 | ⚠️ 갭 존재 |
| **정산 = 운영 리스크 영역** | PG/수수료/정책 미정의. GlycoPharm 정산도 Mock 수준 | ✅ 보류 정당 |
| **placeholder는 "준비 중" 명확 표시 필요** | StorePlaceholderPage가 "이 기능은 준비 중입니다" 표시 중 | ✅ 현재도 명확 |
| **K-Cosmetics = 내 매장 문구** | 구현 시 "매장 주문", "내 매장 주문"으로 가야 함 | — (구현 전) |
| **O4O는 매장 실행 중심 플랫폼** | 주문 조회 불가는 매장 운영자 실행 capability 차단 → 우선순위 높음 | ⚠️ 구현 권장 |

**결론:**
- 주문 조회 미구현은 매장 운영자의 핵심 capability를 차단 — O4O 운영 원칙과 충돌.
- backend가 완비된 만큼 주문 frontend는 **빠른 후속 WO로 구현해야 정상**.
- 정산은 정책 미정의 상태이므로 보류가 O4O 운영 리스크 원칙에 부합.

---

## 11. 조사한 주요 파일

| 파일 | 내용 |
|------|------|
| `services/web-k-cosmetics/src/App.tsx:670-711` | 주문/정산 placeholder route 등록 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | COSMETICS_STORE_CONFIG 메뉴 구조 |
| `packages/store-ui-core/src/components/StorePlaceholderPage.tsx` | "준비 중" placeholder |
| `apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts` | 주문 backend (819줄, 완전 구현) |
| `apps/api-server/src/routes/cosmetics/controllers/cosmetics-payment.controller.ts` | 결제 backend (333줄, 완전 구현) |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts:110-111` | 주문/결제 마운트 |
| `services/web-kpa-society/src/api/checkout.ts` | KPA 주문 API client 패턴 |
| `services/web-glycopharm/src/api/pharmacy.ts` | GlycoPharm 주문 API client 패턴 |
| `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` | 공통 주문 entity |

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*  
*다른 세션 WIP 미접촉. git add/commit/push 미실행 (사용자 지시).*
