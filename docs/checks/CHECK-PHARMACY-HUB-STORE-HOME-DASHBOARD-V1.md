# CHECK — WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1

> 매장 경영 홈(`/store-owner`)을 실제 사용 가능한 매장 대시보드로 보완한다.
> W3 공통 셸·기존 B2B 기능은 그대로 두고, 이미 존재하는 매장·장바구니·주문 데이터를 요약한다.

| 항목 | 값 |
|------|------|
| WO | `WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1` (W4) |
| 선행 | `WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1` (W3, `f39b34f4b` / CHECK `ed066f840`) |
| 작성일 | 2026-08-05 |
| 대상 | `pharmacy-hub` — `services/web-pharmacy-hub` + `apps/api-server` (Pharmacy-Hub 라우터 전용) |
| DB 변경 | **없음** (schema/migration/신규 테이블 0 — SELECT 전용) |

---

## 1. 매장 조직 식별 원칙 (본 WO 의 확정 정책 — 임시 편법 아님)

> **Pharmacy-Hub 의 매장 조직은 `organization_service_enrollments(service_code='pharmacy-hub', status='active')` 로 식별한다.
> 일반 조직 멤버십만으로 다른 서비스 조직을 Pharmacy-Hub 매장으로 추정하지 않는다.**

해석 규칙 (`PharmacyHubStoreDashboardController.resolveStore`):

```
로그인 사용자
→ organization_members 활성 매장 역할(owner/admin/manager, left_at IS NULL) 후보
→ organization_service_enrollments.service_code='pharmacy-hub' AND status='active' 조직으로 한정
→ 정확히 1개  : organizations.name 사용        (store.status='connected')
→ 0개         : "매장 정보 미연결"              (store.status='not_connected')
→ 2개 이상    : 임의 선택 없이 명시적 오류      (store.status='ambiguous',
                                                errorCode='AMBIGUOUS_STORE_CONNECTION')
```

**폴백 금지 (하나도 매장명 대체로 쓰지 않았다):**
K-Cosmetics 조직 / KPA 약국 조직 / Neture 공급자 조직 / `users.businessInfo` / 일반 `organization_members LIMIT 1`.

### 축 분리

```
장바구니 = buyer_id + service_key            (조직 축 아님 — 기존 저장 계약 그대로)
주문     = "buyerId" + metadata.serviceKey   (조직 축 아님 — 기존 저장 계약 그대로)
매장명   = Pharmacy-Hub active enrollment 조직
```

### 공통 해석기를 왜 쓰지 않았는가

`apps/api-server/src/utils/store-owner.utils.ts` 의 `isStoreOwner()` 는
`organization_members` 를 **ORDER BY 없이 `LIMIT 1`** 로 읽고 서비스 스코프도 걸지 않는다.
다중 조직 계정에서 비결정적이며, 실제 프로덕션에 그런 계정이 존재한다(§4 실측).
공통 해석기 정비는 KPA·GlycoPharm·K-Cosmetics 까지 영향이 가므로 **별도 작업으로 남기고**,
본 WO 는 `resolveStoreAccess()` 를 **변경하지 않은 채** Pharmacy-Hub 읽기 경로에서만
enrollment 스코프를 적용했다.

---

## 2. 변경 목록

| # | 파일 | 성격 | 내용 |
|:-:|------|------|------|
| 1 | `apps/api-server/src/controllers/pharmacy-hub/PharmacyHubStoreDashboardController.ts` | 신규 | 홈 전용 read-only 요약. SELECT 4종(매장 조직 / membership / cart / orders)만 수행 |
| 2 | `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` | 수정 | `GET /store-owner/dashboard` 마운트 (기존 `storeOwnerGuards` 재사용) |
| 3 | `services/web-pharmacy-hub/src/lib/api/pharmacyHubOrders.ts` | 수정 | `fetchStoreDashboard()` + 타입 추가 (기존 함수 무변경) |
| 4 | `services/web-pharmacy-hub/src/lib/orderStatus.ts` | 신규 | 주문 상태 배지·금액 표기 **단일 정의** (OrdersPage 에서 추출) |
| 5 | `services/web-pharmacy-hub/src/pages/store-owner/OrdersPage.tsx` | 수정 | 위 단일 정의를 import (표시 규칙 동일, 동작 변화 없음) |
| 6 | `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` | 재구현 | 최소 셸 홈 → 매장 대시보드 |

미변경 확인: DB schema · migration · 매장 프로비저닝 · 공통 store-owner 가드 ·
주문/결제 저장 계약 · W3 셸 구조 · `@o4o/store-ui-core` · KPA/K-Cosmetics 코드.
KPA·K-Cosmetics 대시보드 복사 **없음**.

---

## 3. API 계약 (읽기 전용)

`GET /api/v1/pharmacy-hub/store-owner/dashboard`
가드 = `requireAuth` + `requirePharmacyHubScope('pharmacy-hub:store_owner')` (기존 `storeOwnerGuards` 그대로)

```jsonc
{ "success": true, "data": {
  "store":      { "status": "connected|not_connected|ambiguous",
                  "organizationId": "…", "name": "…", "code": "…", "slug": "…",
                  "candidateCount": 1, "errorCode": "AMBIGUOUS_STORE_CONNECTION?" },
  "membership": { "status": "active", "role": "pharmacy-hub:store_owner",
                  "roleType": "store_owner", "approvedAt": "…", "appliedAt": "…" },
  "cart":       { "itemCount": 0, "totalQuantity": 0 },
  "orders":     { "total": 0, "awaitingPayment": 0, "inFulfillment": 0, "cancelled": 0,
                  "recent": [ /* orderId·orderNumber·status·paymentStatus·totalAmount·
                                 itemCount·createdAt·supplierNotified */ ],
                  "recentLimit": 5 }
} }
```

- 신규 요약 테이블·집계 저장소 **0**. 원장(`organizations` / `service_memberships` /
  `store_cart_items` / `checkout_orders`)을 그때그때 읽는다.
- `supplierNotified` 판정은 기존 목록(`GET /store-owner/orders`)과 **동일 근거**(`paymentStatus='paid'`)다 —
  같은 주문이 홈과 목록에서 다른 배지로 보이지 않게 하기 위함.
- 실패 시 `500 { success:false, code:'DASHBOARD_SUMMARY_FAILED' }` — 조회 실패를 정상 0건으로 삼키지 않는다.

---

## 4. 프로덕션 데이터 실측 (read-only 세션)

`cloud-sql-proxy` + `psql`, `PGOPTIONS='-c default_transaction_read_only=on'`. **write 0.**

`service_memberships(service_key='pharmacy-hub', role='pharmacy-hub:store_owner')` 전수:

| user | membership | PH enrollment 조직 | 조직명 | cart | orders |
|------|-----------|:---:|------|:---:|:---:|
| `6967ebe0…` (renagang21@gmail.com) | active | **0** (전체 조직 3개 보유) | — → "매장 정보 미연결" | 0 | 0 |
| `5ee37566…` | active | **1** | `[E2E_TEST] Pharmacy-Hub 검증약국 A` | 0 | 0 |
| `0d028c2e…` | rejected | 0 | — | 0 | 0 |

- renagang21 은 K-Cosmetics·KPA·Neture 조직 3개를 갖지만 **PH enrollment 는 0** →
  규칙대로 "매장 정보 미연결". 타 서비스 조직명을 끌어오지 않는다(폴백 금지 실증).
- PH `checkout_orders` 전체 2건은 store_owner 3계정 중 누구의 것도 아니다
  (buyer `55227203…`, 둘 다 cancelled/pending) → 세 계정 모두 주문 요약 0 이 **정상값**이다.
- 컨트롤러의 집계·최근주문 SQL 을 동일 파라미터로 프로덕션에서 직접 실행해 문법·컬럼·결과를 확인:
  `total=2 / awaitingPayment=0 / inFulfillment=0 / cancelled=2` (buyer `55227203…` 기준, 원장과 일치).

---

## 5. 화면 구성

| 영역 | 내용 | 데이터 출처 |
|------|------|------|
| 상단 카드 | 약국명(또는 미연결/확인필요) · 계정 · 이용 상태 배지 · 역할 · 승인 일시 · 가입 상태 상세 링크 | `store` + `membership` |
| 요약 카드 4 | 장바구니 상품(종) / 전체 주문(건) / 결제 대기(건) / 공급자 처리·배송(건) | `cart`, `orders` |
| 처리 필요 안내 | `awaitingPayment > 0` 일 때만 노출 → **주문 내역**으로 유도 | `orders.awaitingPayment` |
| 최근 주문 | 최신 5건 — 주문번호·일시·금액·상태 배지·상세 이동 | `orders.recent` |
| 바로가기 3 | 공급 상품 / 장바구니 / 주문 내역 | 정적 |

- 계산 불가능한 지표는 카드로 만들지 않았다(하드코딩·임시 수치 0).
- **결제 화면 직접 링크 없음**: `/store-owner/payment` 은 진입과 동시에 `payments/prepare` 를
  호출하므로 홈에서 링크하지 않고 주문 내역으로 보낸다. 결제 실거래 미수행.
- 상태/빈 상태/오류 상태: 로딩=스켈레톤·"불러오는 중…", 빈 상태="아직 주문 내역이 없습니다" +
  상품 둘러보기 CTA, 오류=상단 배너(401/403 별도 문구) + 요약·최근주문 영역 비노출,
  바로가기는 계속 사용 가능(전체 홈이 깨지지 않음).
- 기존 `/store-owner/*` URL 변경 없음.

---

## 6. 검증

| # | 항목 | 결과 |
|:-:|------|:---:|
| 1 | `tsc --noEmit` — `pharmacy-hub-web` | PASS (0 error) |
| 2 | `tsc --noEmit -p tsconfig.build.json` — `@o4o/api-server` | PASS (0 error) |
| 3 | `vite build` — `pharmacy-hub-web` | PASS (1947 modules, 408.26 kB) |
| 4 | 대시보드 SQL 프로덕션 직접 실행 (read-only) | PASS — §4 |
| 5 | 조직 격리 — renagang21(타서비스 조직 3) → 미연결 | PASS (서버 측 실측) |
| 6 | 조직 격리 — 단일 PH enrollment 계정 → 해당 조직명만 | PASS (서버 측 실측) |
| 7 | 프로덕션 브라우저 smoke | §7 |
| 8 | DB write / migration | **0** |

---

## 7. 프로덕션 브라우저 smoke

*(배포 후 기록)*

---

## 8. 회귀

- `OrdersPage` 는 상태 판정 함수를 **동일 로직 그대로** 공용 모듈에서 import 하도록만 바꿨다(문구·톤 불변).
- 기존 엔드포인트(`/store-owner/products|cart|orders|payments/*`) 무변경 — 추가만 했다.
- 공통 패키지(`@o4o/store-ui-core` 등) 무변경 → 타 서비스(KPA·K-Cosmetics·Neture·GlycoPharm) 영향 없음.

---

## 9. 남긴 항목 (본 WO 범위 밖)

- 공통 `isStoreOwner()` / `resolveStoreAccess()` 의 `LIMIT 1` 비결정성 정비 (C안 — KPA·GlycoPharm·K-Cosmetics 영향 범위).
- 매장 정보 편집 · 계정 설정 · 취급 상품 · 콘텐츠 · QR · POP · 태블릿 (WO §범위 제외).
- `AMBIGUOUS_STORE_CONNECTION` 운영자 해소 UI.
