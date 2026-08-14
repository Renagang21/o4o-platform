# CHECK — WO-O4O-STORE-HUB-PRODUCTION-E2E-DATA-ENROLLMENT-AND-CLOSURE-V1

- **상태**: `PASS` (4개 서비스 전 흐름 desktop·mobile 실브라우저 검증 완료)
- **작성일**: 2026-08-14
- **대상 서비스**: KPA-Society · K-Cosmetics · GlycoPharm · Pharmacy-Hub (4개)
- **검증 방식**: 프로덕션 실브라우저(Playwright chromium) 실로그인 · desktop(1440×900) + mobile(390×844, iPhone UA, isMobile/hasTouch)
- **검증 계정**: `docs/local/TEST-ACCOUNTS.local.md` (SSOT) — 매장 경영자 · 운영자 · 공급자
- **선행 문서**: [CHECK-O4O-STORE-HUB-ALL-SERVICES-PRODUCTION-ADOPTION-AND-E2E-V1](CHECK-O4O-STORE-HUB-ALL-SERVICES-PRODUCTION-ADOPTION-AND-E2E-V1.md)

> **결론 먼저**: 선행 WO 의 blocker B1(GlycoPharm 조직 미연결) · B2(공급 카탈로그 0건)를
> **canonical 경로로만** 해소했고, 4개 서비스 모두 `탐색 → 상세 → 신청/가져오기 → 장바구니 → 주문 진입`
> 을 desktop·mobile 양쪽에서 통과했다. 검증 중 프로덕션 결함 2건을 발견해 수정·배포·재검증했다.

---

## §1 B1 — GlycoPharm 조직 canonical enrollment

`LIMIT 1` 방식(KPA 조직 우연 선택)은 **복구하지 않았다.** DB 직접 write 도 하지 않았다.
정규 매장 가입 → 승인 경로만 사용했다.

| 항목 | 값 |
|---|---|
| member | `b35e63d1-16e0-455a-bfc3-18aa064b45a9` |
| organization | `13c08a86-a4b7-4b82-834e-6a01b3c2f4c1` (`gp-pharm-6967ebe02f87`, type `pharmacy`, role `owner`) |
| enrollment | `organization_service_enrollments(service_code='glycopharm', status='active')` |

결과: [resolveStoreOrganization](../../apps/api-server/src/utils/store-organization.resolver.ts) 의
`glycopharm` linkage(enrollment `glycopharm`) 를 통해 `status='resolved'` 로 확정된다.
선행 WO 에서 403 이던 5개 route (`/store-hub/b2b` · `/store-hub/blog` · `/store-hub/pop` · `/store-hub/qr` · `/store`) 전부 정상화.

## §2 B2 — E2E 전용 공급 offer + service approval

**기존 실상품의 승인 상태는 하나도 변경하지 않았다.** `[E2E_TEST]` 전용 상품만 신규 생성했다.

| 항목 | 값 |
|---|---|
| product master | `7469448d-d5e1-4a13-8b73-cdd35bc99726` — `[E2E_TEST] 매장 허브 검증 상품` |
| offer | `61db213b-547d-4473-9f28-a0586eb2524d` (SERVICE, 공급가 9,900원 / 권장 12,000원, 재고 999) |
| service approvals | `kpa-society` · `glycopharm` · `k-cosmetics` 3건 모두 `approved` |

이후 서비스별 매장 취급 신청 → 운영자 승인을 **정규 API 경로**로 수행했다
(`POST /{svc}/pharmacy/products/apply` → `PATCH /{base}/operator/product-applications/:id/approve`).

| 서비스 | product_approvals | organization | 결과 |
|---|---|---|---|
| KPA-Society | `aedd7c5a-…` | `9c87f46b-…` | `listingActivated: true` |
| GlycoPharm | `2be5963c-…` | `13c08a86-…` (§1 신규) | `listingActivated: true` |
| K-Cosmetics | `12437bcc-…` | `83ff96c7-…` | `listingActivated: true` |

장바구니 동선 검증용 이벤트·특가 listing 도 같은 offer 기준으로 구성했다.

| 서비스 | listing | 생성 경로 | 상태 |
|---|---|---|---|
| KPA-Society | `02003281-…` | `POST /kpa/groupbuy-admin/products` (운영자 직접 등록) | `approved` |
| GlycoPharm | `e627c1eb-…` | `POST /neture/supplier/event-offer-proposals` → 운영자 승인 | `approved` |
| K-Cosmetics | `ec4f4b1a-…` | 동상 | `approved` |

3개 서비스 `GET {base}/enriched?status=active` → 각 `n=1` 확인.

## §3 발견·수정한 프로덕션 결함 2건

### D1. GlycoPharm 주문 조회 500 (`c6dcc16ec`)

`GET /api/v1/glycopharm/checkout/orders` 가 500 `ORDER_LIST_ERROR`.
Cloud Run 로그 근거: `syntax error at or near "order"`.
원인은 TypeORM alias `'order'` — SQL 예약어다. KPA·Cosmetics 는 `'co'` 를 써서 정상이었다.

**조치**: [checkout.controller.ts](../../apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) 의 목록·상세 두 쿼리 alias 를 `'co'` 로 정렬. 배포 후 재검증 **200**.

### D2. KPA 주문 작업대 금액 0원 표시 (`d51342e83`)

`/store/commerce/order-worktable` 의 "B2B 주문 확인" 모달 금액이 전부 0원.
원인은 `basePrice` 를 진열 판매가에서만 도출한 것 — 신규 취급 상품은 진열 판매가가 아직 없다.
작업대는 B2B 발주 화면이므로 공급가가 올바른 기준이다.

**조치**: [StoreOrderWorktablePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreOrderWorktablePage.tsx) 에서 공급가 fallback (`?? priceGold ?? priceGeneral`). 배포 후 재검증 정상.

## §4 서비스별 완료 매트릭스

범례: `PASS` / `N/A — 계약상 미구현`

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm | Pharmacy-Hub |
|---|:---:|:---:|:---:|:---:|
| 실로그인 | PASS | PASS | PASS | PASS |
| Store Hub 진입 | PASS | PASS | PASS | PASS |
| 상품 탐색 (B2B 카탈로그) | PASS 1건 | PASS 1건 | PASS 1건 | PASS 1건 |
| 상품 상세 | N/A ※1 | N/A ※1 | N/A ※1 | PASS |
| 신청 / 가져오기 | PASS | PASS | PASS | PASS ※2 |
| 이벤트·특가 탐색 | PASS 1건 | PASS 1건 | PASS 1건 | N/A ※3 |
| 장바구니 담기 | PASS 201 | PASS 201 | PASS 201 | PASS 201 |
| 주문 진입 | PASS ※4 | PASS | PASS | PASS ※5 |
| 결제 화면 진입 | N/A ※6 | N/A ※6 | N/A ※6 | PASS |
| dead link | 0 | 0 | 0 | 0 |
| "준비 중" | 0 | 0 | 0 | 0 |
| white screen | 0 | 0 | 0 | 0 |
| JS exception | 0 | 0 | 0 | 0 |
| 핵심 API 4xx/5xx | 0 | 0 | 0 | 0 ※7 |
| Desktop | PASS | PASS | PASS | PASS |
| Mobile (390×844) | PASS | PASS | PASS | PASS |

- **※1 상품 상세 `N/A — 계약상 미구현`**: KPA·K-Cos·GP 의 공통 `SupplyCatalogHub` 는 상세 페이지를 갖지 않는다
  (행 클릭 핸들러 미배선). 상품명·공급자·공급가·권장 소비자가가 **카탈로그 행에 인라인 표시**되며,
  매장 경영자의 취급 판단에 필요한 정보가 목록에서 모두 제공된다. 신청 액션도 행에서 직접 수행하므로
  상세 부재가 사용자 흐름을 끊지 않는다(클릭해도 아무 일이 없을 뿐 dead link 가 아니다).
  상세 페이지는 Pharmacy-Hub 계약에만 존재한다.
- **※2** Pharmacy-Hub 는 취급 신청 대신 **상세 → 장바구니 담기 → 주문** 이 계약상 동선이다.
- **※3 이벤트·특가 `N/A`**: Pharmacy-Hub 에는 이벤트 오퍼 매장 화면 계약이 없다
  (`CART_TO_EVENT_OFFER_SERVICE_KEY` 매핑 부재). B2B 직접 주문 동선이 그 자리를 대신하며 장바구니·주문은 정상 동작한다.
- **※4** KPA 는 장바구니 외에 **주문 작업대**(`/store/commerce/order-worktable`) 동선도 별도 검증했다 —
  주문하기 → "B2B 주문 확인" 모달 진입 PASS (결제 미완료).
- **※5** `/store-owner/payment?paymentGroupId=…` 결제 화면 진입까지 PASS. **결제는 완료하지 않았다.**
- **※6 결제 화면 `N/A`**: 세 서비스 Store Hub 는 매장 경영자 직접 PG 결제 동선이 없다.
  `주문 확정` 이 곧 공급자별 주문 생성이며, PG 결제 화면은 Pharmacy-Hub 계약에만 존재한다.
- **※7** 비핵심 API 404 1건 — 아래 §6 R1.

## §5 실행 기록 (프로덕션 실브라우저)

### 이벤트·특가 → 장바구니 → 주문 확정 (KPA · GP · KCos, desktop + mobile 각 1회)

```
/store-hub/event-offers  → [E2E_TEST] 상품 노출 · "담기" 클릭
POST /api/v1/store/cart/{serviceKey}/items            → 201
/store-hub/cart          → 1건 · 수량 조정 · "주문 확정"
POST /api/v1/store/cart/{serviceKey}/checkout-confirm → 200
```

6회(3서비스 × 2뷰포트) 모두 console error 0 · uncaught exception 0 · 4xx/5xx 0.
API 레벨 재현으로 확정 응답을 확인했다 —
`createdOrders: [{ orderNumber: "ORD-20260814-4428", subtotal 9900, shippingFee 3000, totalAmount 12900 }]`, `failedItems: []`.

### Pharmacy-Hub 상세 → 결제 진입 (desktop + mobile)

```
/store-owner/products            → 1건 노출
/store-owner/products/3bb54519-… → 상세 (공급가 9,900원 / 기본 12,000원)
"장바구니에 담기"  POST /store-owner/cart/items       → 201
/store-owner/cart  "주문하고 결제하기"
                   POST /store-owner/orders           → 201
                   POST /store-owner/payments/prepare → 201
/store-owner/payment?paymentGroupId=… → "9,900원 결제하기" 화면 진입 (결제 미완료)
```

### B2B 카탈로그 신청 상태 재확인 (3서비스 × 2뷰포트)

`/store-hub/b2b` 에서 `[E2E_TEST]` 상품 1건 노출 + 액션이 **"내 약국/내 매장에서 제외"** 로 표시 —
취급 신청이 반영된 상태다. API error 0 · JS error 0.

### 테스트 주문 정리

Pharmacy-Hub 결제 대기 주문 3건을 **정상 취소 API**(`POST /pharmacy-hub/store-owner/orders/:orderId/cancel`)로 취소했다.
DB 직접 삭제는 하지 않았다.

| 주문번호 | 결과 |
|---|---|
| `ORD-20260814-1817` (선행 WO 생성분) | `cancelled` |
| `ORD-20260814-6153` | `cancelled` |
| `ORD-20260814-1873` | `cancelled` |

## §6 잔여 관측 — 본 WO 범위 밖 (별도 WO 제안)

### R1. Pharmacy-Hub 푸터 법정정보 404 (비핵심)

`GET /api/v1/public/services/pharmacy-hub/footer-legal` → 404 `UNKNOWN_SERVICE`.
[service-legal-scope.ts](../../apps/api-server/src/modules/service-legal/service-legal-scope.ts) 의
`SUPPORTED_LEGAL_SERVICE_KEYS` 는 `neture · glycopharm · kpa-society · k-cosmetics` 4개이며 `pharmacy-hub` 가 없다.

공통 로더 [footerLegalLoader.ts](../../packages/shared-space-ui/src/legal/footerLegalLoader.ts) 는 실패를 `null` 로
처리해 **푸터 법정정보 영역을 렌더하지 않는다** — 사용자 흐름 영향 0. 브라우저가 404 를 console 에
자동 기록하는 것이 유일한 흔적이다. **§9 기준 잔여 예외 1건으로 정직하게 남긴다.**

해소하려면 `pharmacy-hub` 를 지원 목록에 추가해야 하는데, admin write guard 가
`@o4o/security-core` 의 서비스별 `ScopeConfig` 를 요구한다. `PHARMACY_HUB_SCOPE_CONFIG` 는 **존재하지 않는다.**
security-core 신규 config 추가는 공통 계약 변경(CLAUDE.md 중지 조건)이므로 본 WO 에서 수행하지 않았다.
로더 쪽 serviceKey 분기 추가도 금지된다 — 해당 factory 는 "serviceKey 조건문 없음" 을 명문 계약으로 갖는다.

→ 별도 WO 제안: `WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SCOPE-ONBOARDING-V1`

### R2. Store Hub 장바구니 주문의 매장측 조회·취소 경로 부재

`checkout-confirm` 이 생성하는 주문은 `metadata.serviceKey` 가 이벤트 오퍼 키
(`kpa-groupbuy` · `glycopharm-event-offer` · `k-cosmetics-event-offer`)다.

- 구매자 주문 목록(`GET /{svc}/checkout/orders`)은 `metadata.serviceKey IN ('kpa-society','kpa')` 등
  **retail 축**만 조회한다 → 이 주문들이 잡히지 않는다.
- `GET /{svc}/checkout/store-orders` 는 **매장이 판매자**인 축이라 `sellerOrganizationId` 로 필터된다 → 역시 잡히지 않는다.
- 공급자측(`/neture/supplier/orders`)에도 취소 route 가 없다.

실측: `ORD-20260814-4428` 조회 시 양쪽 모두 404 `ORDER_NOT_FOUND`.
**주문 진입(본 WO 완료 기준)까지는 정상**이며, 그 이후 주문 이력 가시성 문제다.
KPA·GP·KCos 3서비스 공통 계약 변경이 필요해 별도 WO 로 분리한다.
검증 중 생성된 주문 7건은 정상 취소 경로가 없어 **DB 직접 삭제 없이 그대로 두었다** (대상은 모두 `[E2E_TEST]` 상품).

→ 별도 WO 제안: `WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-BUYER-VISIBILITY-V1`

### R3. `neture_bridge` 중복 `product_approvals` row

offer 생성 시점에 `product_approvals` `6c2c6ed2-f9aa-4e1b-8439-64833e9452f9`
(org `a0000000-0a00-4000-a000-000000000001`, `product_metadata.source='neture_bridge'`)가 자동 생성됐다.
매장 취급 신청과 무관한 **기존 Neture→서비스 브릿지 동작**이며 본 WO 가 만든 결함이 아니다. 승인 처리에서 제외했다. 관측 기록만 남긴다.

### R4. GlycoPharm `/store/b2b-order` 프랜차이즈 카탈로그 0건

KPA 의 주문 작업대와 달리 GP 는 별도 프랜차이즈 발주 화면을 갖는데 데이터가 0건이다.
빈 상태 안내가 정직하게 렌더되며 dead link·JS 오류는 없다. Store Hub 동선(이벤트·특가 → 장바구니)과는 별개 축이다.

### R5. Pharmacy-Hub `/store-owner/tablets` 409

선행 WO B3. 사용자 판단대로 Store Hub blocker 로 잡지 않는다 — 내 매장/실행 자산(Agent C) 트랙 소관이다.

## §7 Git

| commit | 내용 |
|---|---|
| `c6dcc16ec` | fix(glycopharm): checkout 주문 조회 500 해소 — SQL 예약어 alias `order` 제거 |
| `d51342e83` | fix(kpa): 주문 작업대 금액 0원 표시 해소 — 진열 판매가 없으면 공급가 fallback |

두 커밋 모두 `Deploy API Server` / `Deploy Web Services` success 확인 후 프로덕션에서 재검증했다.

## §8 완료 판정

`PASS`. 4개 서비스 모두 desktop·mobile 에서 `탐색 → 상세(또는 계약상 대체) → 신청/가져오기 → 장바구니 → 주문 진입`
을 통과했고, dead link 0 · "준비 중" 0 · white screen 0 · JS exception 0 · 핵심 API 4xx/5xx 0 이다.

잔여 관측 R1~R5 는 모두 **Store Hub 사용자 흐름을 끊지 않는** 범위 밖 항목이며 별도 WO 로 분리한다.
