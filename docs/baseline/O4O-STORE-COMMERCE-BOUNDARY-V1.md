# O4O Store Commerce Boundary V1

> **Status**: Active · **Type**: Canonical Business Boundary
> **Effective**: 2026-08-25
> **WO**: `WO-O4O-STORE-COMMERCE-BOUNDARY-POLICY-DOCUMENT-V1`
> **위상**: 본 문서는 조사 보고서가 아니라 **사업 경계를 고정하는 canonical 기준 문서**다.

---

## 1. 목적

O4O에서 **매장 경영자의 판매·주문·결제·환불 범위**를 반복적으로 오해하는 일이 계속되고 있다.

저장소에는 과거에 만들어진 cart / checkout / payment / refund / consumer order 코드가 남아 있다.
그 코드가 존재한다는 사실만으로 "현재 O4O가 제공하는 기능"으로 오인되어, 같은 기능을
**구현했다가 → 중단하고 → 다시 검토하는** 작업이 반복되었다.

실제 사례:

| 사례 | 결과 |
|---|---|
| KPA 자체 B2C storefront (자체몰) | 철거 — `CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` |
| 소비자→매장 결제 (glycopharm · cosmetics · kpa) | `410 STORE_SALE_PAYMENT_DEPRECATED` 차단 — `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` |
| 네이버 온라인 판매 연동 파일럿 | 외부 판매채널로 대체하는 방향으로 진행 (자격정보 단계에서 중지) |
| 매장 경영자 PG 환불 권한 | `WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1` 에서 축으로 식별 |

본 문서는 이 반복을 끝내기 위해 **사업 경계를 고정한다.**
앞으로 매장 checkout · cart · payment · refund 관련 작업은 **반드시 이 문서를 선행 기준으로 삼는다.**

---

## 2. 최상위 원칙

> ### O4O에서 매장 경영자는 O4O를 이용하여 소비자에게 상품을 판매하지 않는다.
>
> ### O4O는 매장용 자체 소비자 전자상거래 시스템을 만들지 않는다.

이 두 문장은 본 문서의 상위 규정이며, 아래 모든 절은 이 원칙의 적용이다.

---

## 3. 오프라인 판매 구조

매장에서의 실제 판매는 다음 흐름으로 이루어진다.

```text
소비자
→ 매장 방문
→ 상담 / 상품 선택
→ 별도 POS
→ 판매 / 결제
```

경계는 다음과 같다.

```text
판매 실행 시스템        = 외부 POS
정보·콘텐츠·업무지원 시스템 = O4O
```

O4O는 소비자가 매장에서 상품을 이해하고 선택하도록 돕는 **정보·콘텐츠·업무지원 시스템**이다.
판매 원장과 결제 실행은 O4O 밖(POS)에 있다.

---

## 4. 태블릿과 QR의 역할

매장 내 태블릿과 QR은 **정보 제공 수단**이다.

**용도 (허용)**

```text
제품정보 제공
제품 설명
건강정보
상담 지원
콘텐츠 제공
개인 스마트폰으로 정보 연결
```

**용도가 아님 (금지)**

```text
O4O 장바구니
O4O checkout
O4O 소비자 결제
매장 경영자의 온라인 환불
```

태블릿·QR을 O4O 자체 checkout/결제 수단으로 만들지 않는다.

> 같은 취지의 선행 정책: [`STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1`](STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)
> — StoreLocalProduct는 Store Private Display Domain이며 Commerce Object가 아니다
> (Checkout 진입 / Cart 연결 / 결제 버튼 생성 영구 금지).
> 본 문서는 그 원칙을 **매장 commerce 전반으로 확장**한 상위 규정이다.

---

## 5. 외부 판매채널 (네이버 스마트스토어 · 쿠팡 등)

매장이 온라인으로 판매하는 경우, 판매는 **외부 판매채널에서** 이루어진다.

```text
O4O
→ 상품정보 / 콘텐츠 / 판매채널 연동

외부 판매채널
→ 소비자 판매
→ 주문
→ 결제
→ 배송
→ 취소
→ 환불
```

원칙:

```text
외부 판매채널의 Order System of Record
= 해당 외부 판매채널

O4O
= 연동 · 조회 · 분석 · 업무지원
```

O4O는 외부 판매채널의 **원천 주문·결제 시스템을 대체하지 않는다.**

---

## 6. 외부채널 주문 데이터

외부 주문 데이터를 O4O로 가져오는 것은 **허용할 수 있다.**

허용 예:

```text
주문 조회
판매 현황 분석
상품 성과 분석
공급 / 재고 업무지원
배송상태 확인
```

단, 명확히 한다.

> **외부채널 주문 데이터를 O4O에 저장한다고 해서
> O4O가 판매·결제의 원천 시스템(System of Record)이 되는 것은 아니다.**

동기화된 주문 데이터는 **업무지원을 위한 사본**이다. 그 데이터를 근거로
O4O 안에 소비자 결제·취소·환불 실행 경로를 만들지 않는다.

---

## 7. 매장 환불

```text
O4O 내부에 매장 소비자 주문이 없으므로
O4O 매장 경영자의 자체 PG 환불 권한도 canonical 기능으로 존재하지 않는다.
```

다음은 **legacy commerce 후보**로 본다.

```text
STORE_OWNER_REFUND
매장 경영자 PG cancel
매장 자체 checkout refund
매장 자체 소비자 주문 환불
```

소비자 환불은 실제 판매가 일어난 곳에서 처리된다 — **POS 또는 외부 판매채널**.

> 참고: `WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1`(2026-08-25)은
> 환불 authorization 을 3축으로 정리하면서 `STORE_OWNER_REFUND` 축을 식별했다.
> 그 WO는 **권한 계약**을 정리한 것이고, 본 문서는 **그 축이 사업적으로 존재해야 하는가**를 규정한다.
> 두 문서가 만나는 지점은 §8 판정 절차의 대상이다.

---

## 8. 기존 checkout / cart / payment / refund 코드의 취급

```text
기존 코드의 존재 ≠ 현재 사업 기능
```

저장소에서 매장 commerce 성격의 코드를 발견하면 **아래 순서로 판정한다.**

```text
1. 본 business boundary 문서 확인
2. 현재 producer 확인      (누가 이 데이터를 만드는가)
3. 현재 consumer 확인      (누가 이 API·화면을 실제로 호출하는가)
4. production / runtime 사용 여부 확인
5. POS 또는 외부 판매채널 지원 코드인지 확인
6. canonical / legacy / dead 판정
```

**판정 전에 기능을 복구하거나 확장하지 않는다.**

---

## 9. Legacy Commerce 분류

| 분류 | 의미 |
|---|---|
| `ACTIVE_CANONICAL` | 현재 사업 규정에 부합하며 실제로 사용 중인 기능. 유지·개선 대상. |
| `EXTERNAL_CHANNEL_SUPPORT` | 네이버·쿠팡 등 외부 판매채널 연동·조회·분석을 지원하는 코드. 허용. O4O가 판매 원장이 되지 않는 범위 안에서만 유지. |
| `POS_INTEGRATION_SUPPORT` | POS와의 정보·데이터 연동을 지원하는 코드. 허용. O4O가 POS를 대체하지 않는 범위 안에서만 유지. |
| `LEGACY_COMMERCE` | 과거 O4O 자체 B2C / 매장 소비자 commerce 코드. 현재 사업 규정과 충돌. 유지·제거·archive 여부를 **별도 판정** 후 결정. |
| `DEAD` | 라우팅·소비처·런타임 사용이 모두 0인 코드. 사업 판단 이전에 이미 동작하지 않음. |
| `UNKNOWN` | 위 판정을 아직 수행하지 않았거나 근거가 부족한 상태. |

> ### `UNKNOWN` 상태에서는 기능을 복구·확장하지 않는다.

판정 근거가 없다는 것은 "일단 살려도 된다"는 뜻이 아니라 **"아직 만지지 않는다"**는 뜻이다.

---

## 10. 개발 금지선

별도의 **사업 모델 변경 승인** 없이, 다음 기능을 새로 만들거나 legacy 코드에서 복구하지 않는다.

```text
O4O 자체 소비자 쇼핑몰
O4O 자체 소비자 장바구니
O4O 자체 checkout
매장별 온라인 소비자 결제
매장 경영자 PG 환불
O4O 자체 소비자 배송관리
매장 자체 온라인 소비자 주문
```

"기존에 코드가 있었다"는 것은 승인 근거가 아니다 (§8 · §11).

---

## 11. POS 연동과 O4O commerce의 차이

**POS 연동 자체는 허용된다.**

허용 예:

```text
O4O 상품정보 → POS
POS 판매결과 → O4O
POS 재고정보 → O4O
```

그러나 반드시 구분한다.

```text
POS 연동 ≠ O4O가 POS가 되는 것

판매 원장과 결제 실행 = POS
O4O                  = 필요한 정보와 데이터를 연동
```

O4O가 판매 원장을 직접 들고 결제를 실행하기 시작하면, 그것은 연동이 아니라 §10 위반이다.

---

## 12. B2B Order와 소비자 Order의 구분

**본 문서는 O4O에서 `order` 자체를 금지하지 않는다.**

다음은 계속 존재할 수 있다.

```text
공급자 → 매장 주문
발주
상품 공급 신청
샘플 신청
프로모션 신청
사업자 간 거래
외부 판매채널 주문 동기화
```

legacy commerce 판정의 핵심 질문은 하나다.

> ### "소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?"

`YES` 이면 현재 매장 사업 모델과 충돌하는 **legacy 후보**로 본다.
`NO` (사업자 간 거래 · 외부채널 동기화 · POS 연동)이면 본 문서의 금지선 대상이 아니다.

---

## 13. 플랫폼 직접 판매와의 구분

본 정책은 우선 **매장 경영자의 소비자 판매 금지**를 확정하는 문서다.

기존 코드에 다음이 있더라도, 그것만으로 **O4O 플랫폼 직접판매 사업이 승인된 것으로 간주하지 않는다.**

```text
platform-seller
platform checkout
platform refund
```

플랫폼 자체 판매는 **별도 사업 계약이 있어야 한다.**
계약이 없으면 해당 코드 역시 **현행성 조사가 필요하다.**

---

## 14. 변경 우선순위 (Precedence)

```text
1. 현재 승인된 사업 규정
2. canonical architecture 문서
3. 현재 production에서 실제 사용하는 계약
4. 현재 코드
5. 과거 WO / CHECK
6. legacy 코드
```

> ### 오래된 코드가 현재 사업 규정보다 우선하지 않는다.

기존 코드와 본 문서가 충돌하면, **기존 코드를 자동으로 현행 기능으로 간주하지 않는다.**

---

## 15. 향후 사업 모델 변경 절차

향후 O4O 자체 소비자 commerce를 도입하려면 **일반 WO로 바로 구현할 수 없다.**

최소한 다음이 선행되어야 한다.

```text
사업 모델 변경 결정
판매 주체 정의
전자상거래 책임 정의
결제 / PG 계약 정의
주문 원장 SSOT 정의
취소 / 환불 책임 정의
정산 책임 정의
법적 검토
architecture / business decision 문서
```

그 후 **별도 프로젝트**로 추진한다.

---

## 16. 적용 영역

본 문서는 다음 영역의 개발 판단에 사용하는 **canonical business boundary 문서**다.

```text
store
store-owner
store-hub
consumer
cart
checkout
orders
payments
refund
PG
POS
tablet
QR
Naver SmartStore
Coupang
external sales channel
```

---

## 17. 관련 문서

| 문서 | 관계 |
|---|---|
| [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) | 상위 — 사업 철학 SSOT (참여 주체 정의) |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md) | 상위 — 3자 Canonical Flow |
| [`STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1`](STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md) | 정합 — 매장 자체 상품의 Commerce 연결 금지 |
| [`E-COMMERCE-ORDER-CONTRACT`](E-COMMERCE-ORDER-CONTRACT.md) | 기술 계약 — 주문 **생성 방식**을 정의. 어떤 주문이 사업적으로 허용되는가는 본 문서가 정한다 |
| [`O4O-RETAIL-STABLE-V1`](../platform/architecture/O4O-RETAIL-STABLE-V1.md) | **조사 필요** — `channel_type='B2C'` storefront closed loop 을 기술한다. §8 판정 대상 |
| [`CHECKOUT-STABLE-DECLARATION-V1`](CHECKOUT-STABLE-DECLARATION-V1.md) | 기술 계약 — checkout/payment 안정화 선언 |
| `CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` | 선례 — KPA 자체몰 철거 (역사 기록, 수정 금지) |
| `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` | 선례 — 소비자→매장 결제 경로 `410` 차단 (역사 기록, 수정 금지) |
| `CHECK-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1` | 선례 — 외부 판매채널 연동 파일럿 (역사 기록, 수정 금지) |
