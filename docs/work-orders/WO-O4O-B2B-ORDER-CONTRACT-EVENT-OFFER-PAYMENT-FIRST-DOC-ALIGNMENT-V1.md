# WO-O4O-B2B-ORDER-CONTRACT-EVENT-OFFER-PAYMENT-FIRST-DOC-ALIGNMENT-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · **문서 정정 WO**(doc-only + 회귀 가드 spec 정합) · 실행 착수는 별도 명시 지시
> **기준 코드:** 작성 시점 `origin/main` `b8ae53f4e`. 실행은 항상 최신 `origin/main` 에서 시작하며 과거 커밋으로 reset/rebase 하지 않는다
> **정정 대상:** [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) — **기준 문서**이므로 CLAUDE.md §16-4(기준 문서의 내용·판정 변경은 인라인 금지)와 그 문서 자신의 **§11-6**("본 문서 자체의 구조 변경은 별도 WO 가 필요하다")에 따라 이 WO 가 필요하다
> **선행:** [`CHECK-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1`](../checks/CHECK-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1.md) §8-Q15 · §11 — 구현은 끝났고(`f951ad841` · `11c249c80`) **문서만 과거 계약에 머물러 있다**
> **한 줄:** Event Offer 는 특가 판매이며 일반 Supplier→Store B2B commerce 와 **같은 payment-first 축**이다. 문서가 아직 "결제 축이 아니다" 라고 말한다

---

# 1. 왜 지금 문서를 고치는가

CLAUDE.md 의 우선순위는 **사업·정책 정본 > 코드**이고, "본 문서와 충돌하는 코드는 코드를 고친다(역추론 금지)" 가 이 baseline 자신의 §11-5 다. 그런데 지금은 **정책이 바뀌어 코드가 먼저 따라간 상태**다. 문서를 그대로 두면:

- 다음 세션이 baseline 을 읽고 "Event Offer 는 결제 축이 아니다" 를 **현행 계약으로 오인**한다.
- §11-5 규칙대로 **방금 구현한 결제 경로를 "문서와 충돌하는 코드" 로 판정해 되돌릴 위험**이 있다.

즉 이 정정은 문서 미화가 아니라 **회귀 방지**다.

## 1.1 확정 정책 (재판단 대상 아님)

```text
Event Offer = 특가 판매
            = 일반 Supplier→Store B2B commerce
            = checkout_orders (주문+결제 SSOT)
            = payment-first
            = paid 후 fulfillment (bridge → neture_orders → 공급자 처리 → 공급자 직접 배송 → 정산)

Event Offer 에 참여 신청 · 구매 의향 · 예약 · 약정 · 참가자 모집 · 펀딩은 존재하지 않는다.
```

## 1.2 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

---

# 2. 승인 범위 — 정정할 것

## A. §5-1 Axis A 마지막 문장 (158행) — **핵심**

현재:

> 이 축은 **결제 축이 아니다.** 주문 생성까지가 O4O 의 책임이고, 정산은 공급자–매장 간 기존 거래 관계를 따른다.

이 문장을 **payment-first 로 정정**한다. 정정 후 문장이 담아야 할 내용:

- Event Offer(Axis A)는 **특가 판매**이며 Axis B(Neture B2B)와 **같은 payment-first 축**이다.
- 주문은 `checkout_orders` 에 `paymentStatus='pending'` 으로 생성되고, **결제 완료 event 만이 `paid` 로 전이**시킨다.
- `paid` 이후 `CheckoutFulfillmentBridgeService` 가 `neture_orders` 로 투영해야 공급자에게 보인다.
- 결제 진입은 **B2B 전용 namespace**(`/api/v1/{kpa,cosmetics}/b2b/payments/*`)다. 소비자→매장 판매 결제(`/kpa/payments` · `/cosmetics/payments`)는 **410 은퇴 상태 그대로**이며 되살리지 않는다.
- 정산은 `PAID + DELIVERED` 기준이다(후불·외상·인보이스·수금확인 없음).

Axis A 흐름 코드블록(141~148행)에도 결제·bridge 단계를 반영한다. 현재는 `checkout_orders` 에서 끝난다.

## B. §3 Ownership 표 118행 — 결제 축 producer 목록

현재:

> \| 결제 축 \| live producer 3개 한정 — `pharmacy-hub` · `neture-b2b` · `store-service-subscription` \| 그 외 producer 신규 추가 금지 \|

**`store-b2b` 를 추가**해 4개로 갱신한다(`STORE_B2B_PAYMENT_SERVICE_KEY` — 승인축 B2B + Event Offer 공통). "그 외 producer 신규 추가 금지" 원칙 자체는 **유지**한다(무분별 확장 방지가 목적이며, 이번 추가는 이 WO 로 승인된 것임을 명시).

## C. §8 서비스별 계약 요약 표 — KPA / K-Cosmetics 행

`비고` 열이 Axis A 를 결제 없는 축으로 읽히게 두지 않는다. 두 행에 **payment-first · B2B 결제 경로 존재**를 반영한다. `불변식 S1`(공급자 주문 화면은 Neture canonical) · `S2`(승인형/opt-in 두 축)는 **변경 없음**.

## D. §5-2 Axis B · §5-3 Axis C — **변경 없음**

Neture B2B · Pharmacy-Hub 는 이미 payment-first 이고 이번 변경으로 의미가 바뀌지 않았다. 손대지 않는다.

## E. 회귀 가드 spec 정합 — `b2b-supplier-to-store-order-canonical-contract.spec.ts`

문서 하단이 가리키는 회귀 가드다. 193행 테스트:

```ts
it('살아 있는 payment producer serviceKey 는 3종뿐이다', () => {
  expect(hits(/['"`]neture-b2b['"`]/).length).toBeGreaterThan(0);
  expect(hits(/['"`]pharmacy-hub['"`]/).length).toBeGreaterThan(0);
  expect(hits(/['"`]store-service-subscription['"`]/).length).toBeGreaterThan(0);
});
```

- **현재 CI 는 green 이다** — 단언이 "존재(`> 0`)" 만 보므로 `store-b2b` 가 늘어도 깨지지 않았다.
- 그러나 **테스트 이름("3종뿐")과 의미가 stale** 하다. 이름을 실제 계약(4종)으로 고치고 `store-b2b` 존재 단언을 추가한다. 단언 방식(존재 확인)은 바꾸지 않는다 — 배열 전수 비교로 강화하는 것은 이 WO 범위 밖이다.
- **다른 테스트는 손대지 않는다.** 특히 `checkout_order → neture_order bridge 는 결제 완료 주문만` · `은퇴한 소비자 commerce 410 코드가 유지된다` 는 이번 정책을 그대로 지지하므로 **유지**한다.

## F. 상태 표기

`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` 는 **SUPERSEDED 로 표기하지 않는다.** 문서 전체가 낡은 것이 아니라 **한 축의 판정이 바뀐 것**이므로 해당 절을 정정하고, 헤더에 정정 이력(이 WO 번호 · 정정일 · 정정 절)을 한 줄 남긴다.

## G. 허용되는 부수 작업

- `docs/checks/CHECK-O4O-B2B-ORDER-CONTRACT-EVENT-OFFER-PAYMENT-FIRST-DOC-ALIGNMENT-V1.md` 작성.
- 정정으로 인해 링크가 깨지면 기계적 수정(§16-3 ②).

---

# 3. 하지 않는 것

```text
다른 baseline 문서 수정            (O4O-STORE-COMMERCE-BOUNDARY-V1 등 — 소비자 commerce 금지선은 불변)
코드 동작 변경 · route 추가/제거 · API 계약 변경
DB write · migration · 배포 트리거를 목적으로 한 코드 커밋
spec 의 단언 방식 강화(배열 전수 비교) · 다른 테스트 수정
§5-2 Axis B · §5-3 Axis C · §12 · §13 · 불변식 S1/S2 수정
§10 DEFERRED 항목 재개 · 새 DF 항목 추가
Event Offer 에 참여/예약/의향 개념 재도입
/kpa/payments · /cosmetics/payments 410 경로 부활
CHECK §11 의 보류 항목(SupplierUnifiedOrderService 은퇴 · glycopharm 4건 · user_id 복구) 착수
```

`glycopharm-event-offer` 는 **은퇴 서비스의 historical 데이터**로 이미 분류됐다(CHECK §11). 이 문서에 활성 축으로 기재하지 않는다.

---

# 4. 실행 순서

1. 최신 `origin/main` 확인. 정정 대상 4곳(§2-A~C, E)의 **현재 원문을 먼저 읽는다** — 줄 번호는 타 세션 커밋으로 이동했을 수 있다.
2. 문서 정정(A~D, F) → spec 정합(E).
3. `npx jest src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts` + 관련 payment/bridge spec 재실행.
4. CHECK 작성 → path-specific stage → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push.
5. 코드 변경이 spec 1파일뿐이라 CI 는 빠르게 끝난다. **문서 커밋이 코드 CI 를 취소하지 않도록** spec 이 포함된 커밋의 CI 완주 후 CHECK 를 커밋한다(문서+spec 을 한 커밋으로 묶어도 무방 — 그 경우 CI 완주 후 CHECK 만 별도).

---

# 5. 중지 조건

| # | 조건 |
|---|---|
| A | 정정하려는 문장이 이미 다른 세션에 의해 수정돼 있고 내용이 이 WO 와 다름 → 정본 유지 + 차이 보고 |
| B | spec 의 "3종뿐" 단언이 그 사이 배열 전수 비교로 강화돼 `store-b2b` 추가가 다른 테스트를 깨뜨림 |
| C | 정정이 `O4O-STORE-COMMERCE-BOUNDARY-V1` 의 소비자 commerce 금지선과 충돌하는 것으로 보임(= 정책 재확인 필요) |
| D | 이 baseline 이 Frozen Baseline(CLAUDE.md §14 F1~F12)으로 승격돼 있음 → 본문 수정 불가 · 보고 |
| E | 타 세션과 동일 파일 충돌 |

---

# 6. 검증

| 항목 | PASS 기준 |
|---|---|
| 문서 정합 | 정정 후 문서에 "결제 축이 아니다" 류 문장이 **0** · Axis A 흐름에 결제·bridge 단계 포함 · §3 producer 4종 · §8 두 행 반영 |
| spec | `b2b-supplier-to-store-order-canonical-contract.spec.ts` **전부 PASS** · 테스트 이름이 실제 계약과 일치 · `store-b2b` 단언 추가 |
| 무회귀 | payment/bridge/recovery 관련 spec 재실행 PASS(`store-b2b-payment-first-canonicalization.spec.ts` · `b2b-payment-controller.test.ts` · `checkout-fulfillment-recovery.service.test.ts`) |
| 코드 동작 | 문서 + spec 외 파일 변경 **0**(`git diff --stat` 로 증명) |
| CI | CI Pipeline success |

---

# 7. 완료 보고 (CHECK 필수 항목)

1. 정정한 절과 **정정 전/후 문장**(A~D, F)
2. spec 변경 내용 · 변경하지 않은 테스트 목록
3. "결제 축이 아니다" 잔존 0 증명(grep)
4. 무회귀 spec 결과
5. 문서+spec 외 변경 0 증명
6. 중지 조건 A~E 발동 여부
7. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
8. commit hash · `HEAD == origin/main`

> **이 WO 완료 시점에 ORDER / PAYMENT / FULFILLMENT TRACK = CLOSED.** 남는 것은 `AUTHENTICATED_SUPPLIER_SMOKE = PENDING`(WO 허용 · blocker 아님)뿐이고, 다음 축은 **Supplier Identity / Business Profile** 이다.
