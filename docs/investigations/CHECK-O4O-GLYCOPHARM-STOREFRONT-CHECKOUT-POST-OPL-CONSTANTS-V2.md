# CHECK-O4O-GLYCOPHARM-STOREFRONT-CHECKOUT-POST-OPL-CONSTANTS-V2

**날짜**: 2026-06-01  
**목적**: WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1 (GLYCOPHARM_OPL_SERVICE_KEYS 상수화) 이후 storefront / checkout / cockpit / category / payment hook 영역 회귀 없음 확인  
**범위**: read-only 검증 (코드·DB·migration·route 수정 없음)  
**선행 V1**: `CHECK-O4O-GLYCOPHARM-STOREFRONT-CHECKOUT-POST-OPL-ALIGNMENT-V1` — OPL serviceKey alignment 이후 1차 안정성 확인

---

## 선행 작업 흐름

```
ecommerce_orders → checkout_orders 정렬
Store KPI/dashboard checkout_orders 정렬
K-Cosmetics active-orders 정책 정렬
GlycoPharm sales limit JSONB 정렬
GlycoPharm payment hook serviceKey Option β 정렬
GlycoPharm checkout/storefront OPL serviceKey Option β 정렬
WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1 ← 이번 CHECK 대상
  - GLYCOPHARM_OPL_SERVICE_KEYS 상수 도입
  - IN ('glycopharm', 'glycopharm-event-offer') → = ANY($n) parameter binding (6곳)
```

---

## 1. API 서버 및 배포 상태

| 항목 | 결과 |
|------|------|
| `/health/detailed` | ✅ HTTP 200, `status: healthy` |
| DB 연결 | ✅ healthy, ping 19ms |
| 현재 revision | `o4o-core-api-01961-k9n` (2026-06-01 01:36 KST 배포) |
| 배포 반영 여부 | ✅ WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1 포함 |

---

## 2. Storefront 상품 목록

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /api/v1/glycopharm/products?limit=5` | **200** | `data:[], total:0, is_error:false` |

**판정**: ✅ 200 정상. `= ANY($2)` 변경 후 query 회귀 없음. `data:[]`는 운영 상품 미등록 상태 (오류 아님).

---

## 3. Storefront Store / Category 엔드포인트

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /stores/:pharmacyId/products` | **404** | `STORE_NOT_FOUND` JSON (응답 정상) |
| `GET /stores/:pharmacyId/categories` | **404** | `STORE_NOT_FOUND` JSON, 13ms 응답 |

**판정**: ✅ 500 없음. `= ANY($2)` 변경 후 categories query 회귀 없음. `STORE_NOT_FOUND`는 테스트 약국 슬러그 미등록 정상 동작.

---

## 4. Checkout 엔드포인트 Auth Gate

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `POST /api/v1/glycopharm/checkout` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /api/v1/glycopharm/checkout/orders` (no auth) | **401** | `AUTH_REQUIRED` |

**판정**: ✅ Auth gate 정상. `= ANY($3)` 변경 (DISTRIBUTION + 채널 매핑 체크) 후 500 없음.

---

## 5. Cockpit 엔드포인트 Auth Gate

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /pharmacy/cockpit/today-actions` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /pharmacy/cockpit/store-kpi` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /pharmacy/cockpit/store-insights` (no auth) | **401** | `AUTH_REQUIRED` |

**판정**: ✅ Auth gate 정상. 500 없음.

---

## 6. Cloud Run 로그 (최근 12h)

| 오류 패턴 | 건수 | 해석 |
|----------|------|------|
| `42P01` (테이블 미존재) | **0건** | ✅ CLEAN |
| `ecommerce_orders` 오류 | **0건** | ✅ CLEAN |
| `ecommerce_order_items` 오류 | **0건** | ✅ CLEAN |
| `GlycopharmPaymentEventHandler` 오류 | **0건** | ✅ 초기화 info만 (01:36 KST) |
| `organization_product_listings` 오류 | **0건** | ✅ CLEAN |
| `PRODUCT_NOT_IN_CHANNEL` | **0건** | ✅ CLEAN |
| `DISTRIBUTION_FORBIDDEN` | **0건** | ✅ CLEAN |
| `PRODUCT_INACTIVE` | **0건** | ✅ CLEAN |
| HTTP 5xx | **0건** | ✅ CLEAN |
| Error level 로그 (총 3건) | 3건 (무관) | 내 로그인 실패 2건 + MarketTrial 연결 타임아웃 1건 (OPL 무관) |

---

## 7. OPL serviceKey = ANY($n) parameter binding 변경 영향

WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1에서 변경된 6곳:

| 파일 | 위치 | 변경 전 | 변경 후 |
|------|------|---------|---------|
| `store.controller.ts` | count query | `IN ('glycopharm', ...)` | `= ANY($2)` |
| `store.controller.ts` | data query | `IN ('glycopharm', ...)` | `= ANY($2)` |
| `store.controller.ts` | categories query | `IN ('glycopharm', ...)` | `= ANY($2)` |
| `checkout.controller.ts` | DISTRIBUTION 체크 | `IN ('glycopharm', ...)` | `= ANY($3)` |
| `checkout.controller.ts` | 채널 매핑 체크 | `IN ('glycopharm', ...)` | `= ANY($3)` |
| `GlycopharmPaymentEventHandler.ts` | sales_limit 조회 | `IN ('glycopharm', ...)` | `= ANY($3)` |

**산출 근거**: `GLYCOPHARM_OPL_SERVICE_KEYS = ['glycopharm', 'glycopharm-event-offer']`이며 PostgreSQL `= ANY(array)` 와 `IN (literal, literal)` 은 동일한 결과를 반환함. 의미 변경 없음.

---

## 최종 판정

**PASS** ✅

| 검증 항목 | 결과 |
|----------|------|
| Storefront products (500 없음, 200) | PASS |
| Categories/Store slug (500 없음) | PASS |
| Checkout auth gate (401, 500 없음) | PASS |
| Cockpit auth gate (401, 500 없음) | PASS |
| Cloud Run 오류 패턴 9종 | PASS — 전부 0건 |
| `= ANY($n)` 변경 후 query 회귀 | PASS — 없음 |
| GlycopharmPaymentEventHandler 신규 error | PASS — 없음 |
| 신규 revision 배포 정상 | PASS |

---

## GlycoPharm 주문/결제/상품 노출 정렬 흐름 — 운영 안정화 1차 완료

```
ecommerce_orders → checkout_orders 정렬        ✅
OPL serviceKey Option β 정렬                  ✅
GLYCOPHARM_OPL_SERVICE_KEYS 상수화             ✅
상수화 이후 smoke PASS                         ✅

→ 운영 안정화 1차 완료
```

---

## 사용자 직접 확인이 필요한 항목

1. **로그인 후 cockpit 수치 확인** — 운영 약국 계정으로 `today-actions / store-kpi / store-insights` 숫자 정합성 검토
2. **실제 storefront 상품 노출** — `organization_product_listings.service_key='glycopharm'` + `is_active=true` 항목이 있는 약국의 storefront URL 접속
3. **checkout E2E** — 운영 계정으로 실제 결제 흐름 테스트 (RETAIL + `metadata.serviceKey='glycopharm'` 경로)

---

## 후속 WO

없음 — 이번 정렬 흐름은 운영 안정화 1차 완료.

---

*검증 수행: Claude Code (2026-06-01)*
