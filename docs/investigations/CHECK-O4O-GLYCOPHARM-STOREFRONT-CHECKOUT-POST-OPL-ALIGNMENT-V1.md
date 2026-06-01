# CHECK-O4O-GLYCOPHARM-STOREFRONT-CHECKOUT-POST-OPL-ALIGNMENT-V1

**날짜**: 2026-06-01  
**목적**: WO-O4O-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 이후 storefront / category / checkout / cockpit / payment hook 영역 회귀 없음 확인  
**범위**: read-only 검증 (코드·DB·migration·route 수정 없음)

---

## 1. API 서버 상태

| 항목 | 결과 |
|------|------|
| `/health/detailed` | ✅ HTTP 200, `status: healthy` |
| DB 연결 | ✅ healthy, ping 7ms, activeConnections=10, longRunningQueries=0 |
| DB 버전 | PostgreSQL 15.17 |
| 현재 revision | `o4o-core-api-01960-5qt` |
| 메모리 | heapUsed 137 MB / heapTotal 152 MB (정상) |

---

## 2. Storefront 상품 목록

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /api/v1/glycopharm/products` | **200** | `{"data":[],"meta":{"total":0}}` |

**판정**: ✅ 응답 정상. `data: []`는 GlycoPharm 운영 상품 미등록 상태 반영 (오류 아님).

---

## 3. Storefront Store / Category 엔드포인트

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /api/v1/glycopharm/stores/:pharmacyId` | 404 | `{"code":"STORE_NOT_FOUND"}` |
| `GET /api/v1/glycopharm/stores/:pharmacyId/products` | 404 | `{"code":"STORE_NOT_FOUND"}` |
| `GET /api/v1/glycopharm/stores/:pharmacyId/categories` | 404 | `{"code":"STORE_NOT_FOUND"}` |

**판정**: ✅ 테스트 약국(`kpa-pharm-1009999999`)에 `organization_store` 슬러그 미등록 — `STORE_NOT_FOUND` JSON 응답(500 없음)은 정상 동작.  
실제 운영 약국(슬러그 등록 완료)에서는 해당 없는 차단.

---

## 4. Checkout 엔드포인트 Auth Gate

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `POST /api/v1/glycopharm/checkout` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /api/v1/glycopharm/checkout/orders` (no auth) | **401** | `AUTH_REQUIRED` |

**판정**: ✅ Auth gate 정상 작동. 500 없음.

---

## 5. Cockpit 엔드포인트 Auth Gate

| 엔드포인트 | HTTP | 결과 |
|------------|------|------|
| `GET /pharmacy/cockpit/today-actions` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /pharmacy/cockpit/store-kpi` (no auth) | **401** | `AUTH_REQUIRED` |
| `GET /pharmacy/cockpit/store-insights` (no auth) | **401** | `AUTH_REQUIRED` |

**판정**: ✅ Auth gate 정상 작동. 500 없음.

---

## 6. Cloud Run 로그 (최근 24h)

| 오류 패턴 | 결과 |
|----------|------|
| `42P01` (테이블 미존재) | ✅ **없음** |
| `ecommerce_orders` 관련 오류 | ✅ **없음** |
| `ecommerce_order_items` 관련 오류 | ✅ **없음** |
| `GlycopharmPaymentEventHandler` 오류 | ✅ **없음** — 초기화 성공 로그만 존재 |
| `PRODUCT_NOT_IN_CHANNEL` | ✅ **없음** |
| `DISTRIBUTION_FORBIDDEN` | ✅ **없음** |
| `organization_product_listings` 오류 | ✅ **없음** |
| checkout 관련 500 | ✅ **없음** |
| 최근 3h ERROR level 로그 | 검증용 로그인 오류만 (본 CHECK 중 발생, 무관) |

---

## 7. OPL serviceKey 코드 정합성 확인

`store.controller.ts` 가시성 게이트 SQL:

```sql
AND opl.service_key IN ('glycopharm', 'glycopharm-event-offer')
```

- 3군데 쿼리 모두 동일하게 적용됨 (L120, L157, L275)
- WO-O4O-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 Option β 기준 정렬 완료

---

## 8. GlycopharmPaymentEventHandler 상태

24시간 로그에서 오직 `[info] ✅ initialized` / `[info] Initialized and subscribed to payment events` 만 확인됨.  
오류 이벤트, 결제 실패 로그 없음.

---

## 최종 판정

**PASS** ✅

| 검증 항목 | 결과 |
|----------|------|
| Storefront 상품 목록 (500 없음) | PASS |
| Category/Store slug (500 없음) | PASS |
| Checkout auth gate (401, 500 없음) | PASS |
| Cockpit auth gate (401, 500 없음) | PASS |
| Cloud Run 오류 패턴 6종 | PASS — 0건 |
| OPL serviceKey 코드 정합 | PASS |
| Payment handler 안정성 | PASS |

---

## 사용자 직접 확인이 필요한 항목

1. **실제 로그인 후 cockpit today-actions / store-kpi / store-insights 응답 내용** — 운영 약국 계정으로 접속하여 숫자·데이터 정합성 확인
2. **실제 storefront 상품 노출** — organization_product_listings에 `service_key='glycopharm'` + `is_active=true` 항목이 있는 약국의 storefront URL 접속
3. **checkout 실제 flow** — 운영 계정으로 결제 흐름 E2E 테스트 (GLYCOPHARM OrderType 경로)

---

## 다음 WO 권고

**WO 필요 없음** — 운영 안정 상태 확인.

다음 예정 작업: `WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1` (serviceKey literal 상수화)

---

*검증 수행: Claude Code (2026-06-01)*
