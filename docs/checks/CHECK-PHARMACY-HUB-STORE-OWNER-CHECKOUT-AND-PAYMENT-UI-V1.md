# CHECK-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1

> WO: `WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1`
> 작업일: 2026-08-01 · 브랜치 `main` · 작업 전 HEAD `05356ee72`
> **결과: 장바구니 → 주문 → 결제 준비·승인 · 주문 내역 · 결제 전 취소 UI 연결 완료**

---

## 1. 만든 화면

| 경로 | 화면 | 역할 |
|---|---|---|
| `/store-owner/cart` | `CartPage` | 공급자별 묶음·배송비·합계, 수량 변경·삭제, 주문 생성 |
| `/store-owner/payment` | `PaymentPage` | `prepare` → Toss 결제창 |
| `/store-owner/payment/success` | `PaymentSuccessPage` | `confirm` (서버 승인) |
| `/store-owner/payment/fail` | `PaymentFailPage` | 실패 사유 + 재결제·취소 안내 |
| `/store-owner/orders` | `OrdersPage` | 내 주문 목록 |
| `/store-owner/orders/:orderId` | `OrderDetailPage` | 상세 · 이어서 결제 · 결제 전 취소 |

공통 클라이언트: `src/lib/api/pharmacyHubOrders.ts` (장바구니·주문·결제 + Toss SDK 로더)

`ProductDetailPage` 에 **장바구니 담기**(수량 지정)를 붙였고, 역할 진입점에 장바구니·주문 내역 링크를 추가했다.

## 2. 금액 규칙 — 프론트 계산값을 쓰지 않는다

WO 핵심 원칙에 맞춰 화면의 모든 금액은 **서버 응답 그대로**다.

| 화면 | 표시 출처 |
|---|---|
| 장바구니 공급자별 소계·배송비·합계 | `GET /cart` 의 `groups[].displaySubtotal / shipping.shippingFee / displayTotal` |
| 장바구니 전체 합계 | `GET /cart` 의 `displaySubtotal / displayShippingFee / displayTotal` (**§3 에서 서버에 추가**) |
| 결제 금액 | `POST /payments/prepare` 의 `amount` — 주문 원장 합계 |
| Toss 에 넘기는 금액 | 위 `prepare.amount` **그대로** |

프론트에서 `reduce` 로 총액을 만들지 않는다. 결제 승인 경로에도 화면 값이 개입하지 않는다
(서버 `prepare` 가 원장에서 다시 합산하고, 결제 가능 상태가 아니면 세션 자체를 만들지 않는다).

## 3. 백엔드 최소 보강 1건

`PharmacyHubCartController.list` 응답에 두 가지를 추가했다. **금액 산식은 건드리지 않았다.**

| 추가 | 이유 |
|---|---|
| `groups[].supplierName` | 없으면 화면이 공급자 UUID 를 그대로 노출한다 |
| `displaySubtotal` · `displayShippingFee` · `displayTotal` | 전체 합계를 프론트가 재계산하지 않게 하기 위함 |

### 3-1. ⚠️ 공급자명 컬럼 오판 → 프로덕션 실측으로 정정

처음 `COALESCE(org.name, ns.company_name)` 로 작성했다. 다른 파일에 같은 표현이 있어 따랐다.
그런데 프로덕션에서 실행하니 **`ns.company_name` 은 존재하지 않는 컬럼**이었다.

```
ERROR: column ns.company_name does not exist
```

`neture_suppliers` 의 실제 이름 계열 컬럼은 `manager_name` · `representative_name` ·
`settlement_bank_name` · `settlement_contact_name` 뿐이고, **상호는 `organizations.name` 이 유일한 출처**다.
주문 상세 쿼리가 쓰던 조인 축과 같게 정정했고, 재실행해 실제 공급자명을 확인했다.

```
251adaaf-… | (주)쓰라이프존
```

## 4. 중복 결제 방지

WO 원칙 "중복 클릭·새로고침으로 중복 결제되지 않게" 를 4겹으로 처리했다.

| 지점 | 처리 |
|---|---|
| 주문 생성 | `orderingRef` 로 in-flight 재진입 차단 + 버튼 disable |
| `prepare` | `preparedRef` 로 **마운트당 1회** — React StrictMode 이중 실행·재렌더 방지 |
| 결제 요청 | `payingRef` + 버튼 disable. `USER_CANCEL` 은 오류가 아니므로 잠금 해제 |
| `confirm` | `confirmedRef` 로 마운트당 1회 |
| 서버 | 이미 결제된 그룹은 `PAYMENT_GROUP_NOT_PAYABLE` 로 거부 (이중 방어) |

결제 확인 실패 화면에는 **"결제를 다시 시도하지 마세요"** 안내와 주문 내역 유도만 둔다 —
재결제 버튼을 두지 않는다.

## 5. 상태 표현 — 공급자 접수로 오해하지 않게

| 원장 상태 | 화면 문구 |
|---|---|
| `paymentStatus=pending` | **결제 대기** · "결제를 완료해야 공급자에게 전달됩니다" |
| `paymentStatus=paid` + `supplierNotified=false` | **결제 완료** · "공급자 전달을 처리 중입니다" |
| `paymentStatus=paid` + `supplierNotified=true` | **공급자 전달 완료** |
| `status=cancelled` | 취소됨 |
| 결제 실패 | "결제가 완료되지 않았습니다 — **주문은 미결제 상태로 남아 있습니다**" |

`supplierNotified` 는 프론트가 결제 여부로 추정하지 않는다 — 서버가 공급자 원장(`neture_orders`)
존재로 판정한 값을 그대로 쓴다. 결제 실패를 주문 실패로 표현하지 않는다.

## 6. 경계·예외 UX

| 상황 | 처리 |
|---|---|
| 401 | "로그인이 필요합니다" (라우트는 `MembershipGate` 하위) |
| 403 | "약국 경영자 승인이 완료된 계정만 이용할 수 있습니다" |
| 빈 장바구니 | 안내 + 상품 목록 CTA. 주문 버튼 자체가 없다 |
| 일부 상품 주문 실패 | 생성된 주문은 결제로 진행하고, 제외 사유를 결제 화면에 표시 ("장바구니에 남아 있습니다") |
| 전부 실패 | 결제로 넘어가지 않고 장바구니에서 사유 표시 |
| 결제 후 취소 시도 | 서버 409 사유를 그대로 노출 (이번 UI 는 결제 전 취소만 제공) |
| `paymentGroupId` 없는 옛 주문 | 결제 버튼 숨기고 "취소 후 다시 주문" 안내 (§8) |

라우트는 전부 `MembershipGate` 하위이며, **권한 판정 근거는 backend guard** 다(프론트는 안내).

## 7. 검증

| 항목 | 결과 |
|---|---|
| `web-pharmacy-hub` `tsc --noEmit` | ✅ 0 errors |
| `web-pharmacy-hub` `npm run build` | ✅ 178 modules · 성공 |
| `api-server` `tsc --noEmit -p tsconfig.build.json` | ✅ 0 errors |
| 공급자명 조회 쿼리 프로덕션 실행 | ✅ 정정 후 성공 (§3-1) |

신규 npm 의존성 **0** — Toss SDK 는 Neture 와 동일하게 CDN 주입이라 lockfile 이 변하지 않는다.

### 7-1. 배포 후 라이브 검증 (프로덕션 · 실제 계정)

web `30692750775` · api `30692750776` 둘 다 **success**.
`renariver21@gmail.com` 으로 로그인해 **실제 API 흐름 전 구간**을 돌렸다 (실결제 승인 제외).

| # | 검증 | 결과 |
|:-:|---|---|
| ① | 화면 라우트 3종 | ✅ `/store-owner/{cart,orders,payment}` 200 · 미인증 API 401 |
| ② | 장바구니 담기 | ✅ 3개 담김 |
| ③ | **공급자명 표시** | ✅ `(주)쓰라이프존` — UUID 아님 |
| ④ | **서버 합계 필드** | ✅ `displaySubtotal 29700 / displayShippingFee 0 / displayTotal 29700` |
| ⑤ | 주문 생성 + `paymentGroupId` | ✅ `f387fc67-…` 발급 · `shippingFee` snapshot 포함 |
| ⑥ | 미결제 상태 표현 | ✅ `requiresPayment: true` · `supplierNotified: false` · "결제를 완료해야 공급자에게 전달됩니다" |
| ⑦ | 결제 준비 | ✅ 201 · `amount: 29700` (원장 합계) · `isTestMode: true` |
| ⑧ | **금액 변조 불가** | ✅ `amount: 100` 을 함께 보내도 서버 결제금액 **29,700 유지** — 요청 금액은 아예 읽지 않는다 |
| ⑨ | 결제 전 취소 | ✅ 200 · `status: cancelled` |
| ⑩ | 취소 후 재결제 차단 | ✅ 400 `PAYMENT_GROUP_NOT_PAYABLE` — 취소된 주문이 섞인 그룹은 세션을 만들지 않는다 |

> ⑦ 의 `clientKey` 는 `test_ck_test_key` 로 **PG 테스트 키가 placeholder** 다.
> 실제 카드 승인은 후속 E2E 에서 키 설정과 함께 진행해야 한다.

## 8. 잔존 주문 `3b5eedb4…` 처리

| 항목 | 값 |
|---|---|
| 구매자 | `renariver21@gmail.com` (검증 계정) |
| 상태 | `created` / `pending` — 미결제 |
| 형상 | `paymentGroupId` 없음 · `productId=master_id` (Phase 1 결함) |

이 주문은 결제 대상이 될 수 없다. **DB 직접 수정 없이** 공식 취소 API 로 처리했다.

```
POST /api/v1/pharmacy-hub/store-owner/orders/3b5eedb4-…/cancel
→ 200 {"orderId":"3b5eedb4-…","status":"cancelled"}     ✅ 처리 완료
```

이어서 **최신 흐름으로 재생성**해 정상 형상을 확인했다 — 새 주문 `ORD-20260801-6136` 은
`paymentGroupId` 를 받고 배송비 snapshot 을 포함한다(§7-1 ⑤). 검증을 마친 뒤 이 주문도
결제 전 취소로 정리했다(§7-1 ⑨).

`OrderDetailPage` 는 `paymentGroupId` 없는 주문에 대해 결제 버튼을 숨기고 "취소 후 다시 주문"
을 안내하므로, 화면에서도 같은 결론으로 유도된다.

DB 직접 UPDATE **0건**.

## 9. 범위 밖 · 발견 사항

| 항목 | 상태 |
|---|---|
| 공급자 주문 관리 UI · 운영자 주문 관리 | WO 제외 |
| 부분 취소·부분 환불 · 정산 · 택배사 연동 | WO 제외 |
| 실결제 E2E | 후속 `E2E-PHARMACY-HUB-PAID-ORDER-TO-SUPPLIER-V1` |
| ⚠️ **`ProductConsoleController.ts:327` 의 `ns.company_name`** | §3-1 과 **동일한 존재하지 않는 컬럼**. 운영자 상품 콘솔 offers 조회가 500 이 날 잠재 결함. 이번 WO 범위(약국 결제 UI) 밖이라 **고치지 않고 보고**한다 |
