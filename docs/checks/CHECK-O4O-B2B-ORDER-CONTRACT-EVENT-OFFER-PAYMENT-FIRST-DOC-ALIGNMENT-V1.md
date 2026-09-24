# CHECK-O4O-B2B-ORDER-CONTRACT-EVENT-OFFER-PAYMENT-FIRST-DOC-ALIGNMENT-V1

> **WO:** [`WO-O4O-B2B-ORDER-CONTRACT-EVENT-OFFER-PAYMENT-FIRST-DOC-ALIGNMENT-V1`](../work-orders/WO-O4O-B2B-ORDER-CONTRACT-EVENT-OFFER-PAYMENT-FIRST-DOC-ALIGNMENT-V1.md) (접수 `fc2a2ca38`)
> **실행일:** 2026-09-24 · **착수 `origin/main`:** `fc2a2ca38` · **커밋:** `e45a57813`(문서+spec) · CHECK(본 문서)
> **판정:** **COMPLETE** — canonical baseline 이 배포된 구현과 일치한다. 런타임 동작 변경 **0**
> **중지 조건:** A~E **전부 미발동**

---

## 1. 정정한 절 — 전/후

### A. §5-1 Axis A (핵심)

**전**

> 이 축은 **결제 축이 아니다.** 주문 생성까지가 O4O 의 책임이고, 정산은 공급자–매장 간 기존 거래 관계를 따른다.

**후** — 절 제목을 `Axis A — Event-Offer 축 … — **payment-first**` 로 바꾸고 다음을 담았다.

- **Event Offer = 특가 판매.** 참여 신청 · 구매 의향 · 예약 · 약정 · 참가자 모집 · 펀딩은 이 축에 존재하지 않는다.
- flow 코드블록에 결제·bridge 단계 반영:
  `cart → checkout_orders(pending) → /{kpa,cosmetics}/b2b/payments/prepare → PaymentCore+Toss → confirm → payment.completed(store-b2b) → paid → CheckoutFulfillmentBridgeService → neture_orders → 공급자 처리 → 공급자 직접 배송 → neture_shipments → delivered → settlement`
- **불변식 A1** payment-first — 주문은 `pending` 생성, **결제 완료 event 만** `paid` 로 전이(라우트가 결제 상태를 직접 조작하지 않음 · Axis B 의 B1 과 동일).
- **불변식 A2** `paid` 이후 bridge 가 `neture_orders` 로 투영해야 공급자에게 보인다. UNPAID 는 fulfillment·배송·정산 대상이 아니다. 후불·외상·인보이스·`collectionStatus` 기반 무결제 fulfillment **없음**. 정산은 `PAID + DELIVERED`.
- **불변식 A3** 결제 진입은 **B2B 전용 namespace**. 소비자→매장 판매 결제(`/kpa/payments/*` · `/cosmetics/payments/*`)는 **410 그대로**이며 되살리지 않는다. 두 축을 혼동하지 않는다.
- 절 하단에 **정정 이력 인용문**(이전 문장 원문 + 근거 WO 2건)을 남겨 이력이 사라지지 않게 했다.

### B. §3 Ownership — 결제 축 producer

**전** `live producer 3개 한정 — pharmacy-hub · neture-b2b · store-service-subscription | 그 외 producer 신규 추가 금지`

**후** `live producer **4개 한정** — pharmacy-hub · neture-b2b · **store-b2b** · store-service-subscription | 그 외 producer 신규 추가 금지. store-b2b 는 승인축 B2B(store_b2b_cart) + Event Offer 특가(store_cart_checkout) 공용 결제 축이며(STORE_B2B_PAYMENT_SERVICE_KEY) 이 WO 로 승인됐다`

"그 외 신규 추가 금지" 원칙은 **유지**했다(무분별 확장 방지가 목적이며 이번 추가는 승인된 것임을 같은 칸에 명시).

### C. §8 서비스별 계약 요약

- **KPA Society**: `Axis A (kpa-groupbuy) · **payment-first**` · buyer 열에 `결제 /kpa/b2b/payments/*` 추가 · 비고의 "실행 leg 은 410 은퇴" 를 **"소비자→매장 판매 leg 은 410 은퇴(B2B 결제와 별개 축)"** 로 명확화.
- **K-Cosmetics**: 동일 패턴 · `결제 /cosmetics/b2b/payments/*` 추가.
- `불변식 S1`(공급자 주문 화면 Neture canonical) · `S2`(승인형/opt-in 두 축) **변경 없음**.

### D. Axis B · Axis C — **변경 없음** (이미 payment-first · 의미 불변)

### F. 상태 표기

**SUPERSEDED 로 표기하지 않았다.** 문서 전체가 낡은 것이 아니라 한 축의 판정이 바뀐 것이므로 `Status: Active` 를 유지하고, 헤더에 **정정 이력 한 줄**(일자 · WO · 정정 절 3곳 · "나머지 절은 불변")을 추가했다.

## 2. spec 변경 · 미변경

`apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts`

| | 내용 |
|---|---|
| 변경 | `살아 있는 payment producer serviceKey 는 3종뿐이다` → **`… 4종이다`** · `store-b2b` 존재 단언 1줄 추가 · 근거 주석 3줄 |
| 미변경 | **단언 구조**(존재 확인 `> 0`)는 그대로 — 배열 전수 비교로 강화하지 않았다(WO §3 금지) |
| 미변경 테스트 | `B2B cart checkout 진입점 2종` · `checkout_order → neture_order bridge 는 결제 완료 주문만` · `은퇴한 소비자 commerce 410 코드가 유지된다` · `POS 연동 없음` · `B2B 취소는 PG 환불과 무연결` · 그 외 전부 |

> 이 테스트는 **원래 깨지지 않았다** — 단언이 존재만 보므로 `store-b2b` 가 늘어도 통과했고 구현 커밋 CI 도 green 이었다. 고친 것은 **이름과 의미의 stale** 이다.

## 3. "결제 축이 아니다" 잔존 0

```bash
grep -rn "결제 축이 아니다" docs/baseline/ | grep -v "정정 이력\|과거"
→ (결과 없음)
```

문자열 자체는 §5-1 하단 **정정 이력 인용문 안에만** 남아 있다(이전 계약이 무엇이었는지 기록). 현행 계약으로 읽히는 위치에는 0건이다.

**추가 확인**

| 기준 | 결과 |
|---|---|
| Axis A flow 에 payment + bridge 단계 | ✅ `b2b/payments/prepare`(150) · `payment.completed`(151) · `CheckoutFulfillmentBridgeService`(153 · 172) |
| §3 producer 4종 | ✅ 119행 |
| §8 두 행 반영 | ✅ |

## 4. 무회귀 spec

```text
b2b-supplier-to-store-order-canonical-contract.spec.ts
store-b2b-payment-first-canonicalization.spec.ts
services/payment/b2b/**  (b2b-payment-controller.test.ts)
checkout-fulfillment-recovery.service.test.ts
→ 4 suites · 88 tests · 전부 PASS
```

## 5. 문서 + spec 외 변경 0

```text
git status --porcelain
 M apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts
 M docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md
git diff --stat → 2 files changed, 39 insertions(+), 9 deletions(-)
```

런타임 코드 경로 **미접촉** · route 추가/제거 0 · API 계약 변경 0 · DB write 0 · migration 0. **별도 서비스 배포 불필요**.

## 6. 중지 조건 A~E

| # | 발동 | 근거 |
|---|---|---|
| A 타 세션이 먼저 수정 | 아니오 | 착수 시 원문이 WO 기재와 동일(118 · 158행) |
| B spec 단언 강화됨 | 아니오 | 존재 단언 그대로 · 다른 테스트 무영향 |
| C COMMERCE-BOUNDARY 충돌 | 아니오 | 소비자→매장 금지선 불변 · 410 유지를 **불변식 A3 로 오히려 명문화** |
| D Frozen Baseline 승격 | 아니오 | CLAUDE.md §14 F1~F12 에 이 문서 없음(§Source of Truth 표에만 등재) |
| E 타 세션 파일 충돌 | 아니오 | 2파일 모두 타 세션 미접촉 |

## 7. 문서 정합

`발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건`

- `O4O-STORE-COMMERCE-BOUNDARY-V1` · `CLAUDE.md` · `CANONICAL-INDEX` 는 **stale 없음** — 수정하지 않았다. CLAUDE.md §4 는 "공급자→매장 B2B 는 현행 계약, 정본은 이 문서" 라고만 하므로 정정 후에도 그대로 유효하다.
- 과거 IR/CHECK 는 기록물이므로 수정 0.

## 8. 트랙 상태

```text
CANONICAL_DOC_ALIGNMENT     = PASS
ORDER_PAYMENT_SSOT          = PASS
PAYMENT_FIRST               = PASS
EVENT_OFFER_SPECIAL_PRICE   = PASS
FULFILLMENT_BRIDGE          = PASS
BRIDGE_RECOVERY             = PASS
SUPPLIER_SHIPPING_BOUNDARY  = PASS
SETTLEMENT_READINESS        = PASS

ORDER_PAYMENT_FULFILLMENT_TRACK = CLOSED

AUTHENTICATED_SUPPLIER_SMOKE = PENDING   (기존 허용 · blocker 아님)
```

**이 축은 더 이상 Supplier 리팩토링 대상으로 다시 열지 않는다.** 다음 축은 **Supplier Identity / Business Profile**.

## 9. Git

- 문서+spec `e45a57813` · CHECK 후속(코드 CI 완주 후 커밋).
- path-specific stage · `git commit -- <paths>` · reset/force 0 · 타 세션 dirty 접촉 0.
- CI 결과는 §10.

## 10. CI

커밋 e45a57813:

| Workflow | 결과 |
|---|---|
| CI Pipeline | **success** (35932511327) — Detect affected scope · API Server Jest · Code Quality Check · Build admin-dashboard 전부 success |
| Deploy API Server (Cloud Run) | success (35932511168) |
| CodeQL Security Analysis | success (35932511306) |

런타임 변경이 없으므로 이 배포는 무해한 재배포다(별도 서비스 배포를 새로 만들 필요 없음 — WO 지시대로).
