# O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1

> **유형**: Architecture / Policy (canonical) — 유통참여형 펀딩(Market Trial)의 `market_trials.productId` legacy 정책 고정.
> **성격**: 문서 저장 전용. 코드/DB/migration/API/UI **무변경**.
> **WO**: `WO-O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1`
> **기준**: `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1` (content-only 경계).
> **작성일**: 2026-06-19
> **상태**: Active — `productId` 관련 모든 향후 구현·정정의 기준.

---

## 0. 한 문장 정의

```
market_trials.productId 는 제품 전환·주문 연결 컬럼이 아니다.
펀딩 콘텐츠가 참고한 등록 제품(ProductMaster)을 표시하기 위한 optional·nullable legacy reference 일 뿐이다.
productId 가 존재한다고 해서 유통참여형 펀딩이 "기존 제품 기반 펀딩"이 되는 것은 아니다.
```

---

## 1. 배경

유통참여형 펀딩은 Neture 전용 **content-only 모집** 기능으로 확정되었고(`O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1`), 제품화·주문·배송·전환 잔재가 단계적으로 제거되었다(P0~P3-2b).

P3-2b(`WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1`)에서 **전환 컬럼 7개**가 DB에서 제거되었다:

```
market_trials.convertedProductId / convertedProductName / conversionNote
market_trial_participants.listingId / customerConversionStatus / customerConversionAt / customerConversionNote
```

반면 `market_trials.productId` 는 **제거하지 않았다.** `productId` 는 제품 전환 결과나 주문 연결 키가 아니라, 과거 설계에서 "펀딩 콘텐츠가 참고한 등록 제품"을 표시하는 **legacy nullable reference** 로 쓰였기 때문이다(IR `...CORE-CONVERSION-COLUMNS-CLEANUP-AUDIT-V1` → 분류 B: legacy 유지).

본 문서는 `productId` 의 의미·사용 제한을 고정하여, 유통참여형 펀딩이 다시 **제품 기반 펀딩으로 회귀하지 않도록** 한다.

---

## 2. 허용 의미 (productId 는 이런 것이다)

```
- 기존 데이터 호환을 위한 nullable·optional legacy field
- 펀딩 콘텐츠 작성 시 참고한 등록 제품(ProductMaster)을 표시하기 위한 optional reference
- 운영자/공급자가 과거 자료(어떤 등록 제품을 소재로 했는지)를 확인하기 위한 보조 참조
```

---

## 3. 금지 의미 (productId 는 이런 것이 아니다)

```
- 기존 제품을 불러와 펀딩을 생성하는 필수 기준
- ProductMaster 기반 펀딩 생성 조건
- SupplierProductOffer 연결 기준
- 제품 전환(conversion) 결과
- O4O 주문 가능 상품 연결 기준
- OPL 매장 진열 연결 기준
- 가격·공급가·정산 기준
- checkout / order / payment / shipping 연결 키
```

**등가 부정:**

```
productId 있음 ≠ 기존 제품 기반 펀딩
productId 있음 ≠ ProductMaster 전환
productId 있음 ≠ SupplierProductOffer 연결
productId 있음 ≠ O4O 주문 가능 상품
productId 있음 ≠ 매장 진열
```

---

## 4. 신규 생성 정책 (optional)

```
- productId 없이 유통참여형 펀딩을 생성할 수 있어야 한다.
- productId 를 요구하는 validation 을 만들지 않는다.
- productId 부재를 이유로 게시 요청·검수·참여 모집·콘텐츠 작성을 막지 않는다.
```

**허용**: 운영자/공급자가 등록 제품을 콘텐츠 소재로 참고하려는 경우 optional reference 연결 · 기존 데이터 조회 시 참고 제품 표시.

**금지**: 제품 선택을 펀딩 생성의 첫 단계로 강제 · "기존 제품에서 펀딩 만들기" 진입 · 상품 상세 drawer/상품 목록에서 펀딩 생성 진입 · ProductMaster 상세를 펀딩 본문 자동 주입 · SPO 가격을 펀딩 가격 자동 사용 · productId 기준 OPL/주문/정산/배송 생성.

---

## 5. 화면 정책

| 영역 | 허용 | 금지 |
|------|------|------|
| 공급자 | 기존 데이터 상세의 참고 제품 read-only 표시 / legacy 표시 | 제품 선택을 신규 생성 첫 단계로 / "기존 제품에서 펀딩 만들기" / 상품 목록 진입 |
| 운영자 | "참고 제품 / 콘텐츠 소재 제품 / legacy reference" 표시 | "전환 제품 / 연결 상품 / 주문 가능 상품 / 공급 상품 / 매장 진열 상품 / 활용 상품" 표현 |
| 참여자 | (기본 미노출) | productId 노출 — 참여자는 "제품 주문"이 아니라 "참여 모집 콘텐츠"로 인식해야 함 |

> 참고: 현재 구현(`toTrialDTO`/`toOperatorTrialDTO`)은 `productId` + `product`(TrialProductRef, 표시 전용 요약)를 반환하며, supplier 상세에 "연결 제품"으로 read-only 표시한다 — 본 정책의 허용 범위(소재 참조 표시)와 정합.

---

## 6. API / DTO 정책

**허용**: nullable optional field · legacy read 호환 · operator/supplier 내부 참고 표시.

**금지**: required field · create DTO 필수값 · approval gate 조건 · participation gate 조건 · order/payment/shipping 연동 키 · ProductMaster 자동 전환 키 · SPO 자동 생성 키.

가능하면 타입/주석에 다음을 명시한다:

```
productId 는 유통참여형 펀딩의 optional legacy reference 이며, 제품 전환 또는 주문 연결을 의미하지 않는다.
```

---

## 7. DB 정책

```
- market_trials.productId 는 당분간 유지(nullable).
- FK 가 있다면 soft/nullable reference 로 유지.
- 필수화 금지 · productId NOT NULL migration 금지 · productId 기반 자동 join 확대 금지.
```

**후속 제거 검토 조건 (모두 충족 시):**

```
- 운영 데이터에서 장기간 productId 사용 0건
- 생성/조회/API/화면에서 productId 완전 미사용
- 콘텐츠 소재 참조 기능이 별도 필드로 대체됨
- legacy 데이터 보존 필요 없음
```

그 전까지는 제거하지 않는다.

---

## 8. 정산·결제와의 관계

`productId` 는 정산·결제 기준이 **아니다.** 유통참여형 펀딩의 정산·결제 기록(참여 조건/참여 금액/오프라인 입금 상태/펀딩 처리 상태/운영 기록)은 `productId` 와 연결하지 않는다.

**금지**: productId 기반 정산 금액 계산 · ProductMaster 가격 기반 펀딩 정산 · SPO 공급가 기반 펀딩 정산 · O4O 상품 주문 이력으로 펀딩 입금 기록 전환.

> settlement/payment 자체의 운영 정책은 후속 `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1` 에서 다룬다(삭제 대상 아님 — 오프라인 운영 기록).

---

## 9. content-only 원칙과의 관계 (충돌 없음)

```
유통참여형 펀딩은 기존 제품을 불러오는 기능이 아니다.
유통참여형 펀딩은 ProductMaster/SupplierProductOffer 기반 기능이 아니다.
유통참여형 펀딩은 O4O 주문·결제·정산·배송 기능이 아니다.
유통참여형 펀딩은 Neture 전용 콘텐츠형 참여 모집 기능이다.
```

`productId` 가 nullable optional reference 로 남아 있는 것은 위 원칙과 **충돌하지 않는다.** productId 는 "소재 표시"일 뿐, 제품 기반 펀딩·전환·주문을 의미하지 않기 때문이다(§3).

---

## 10. 후속

- **P3-3** `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1` — settlement/payment = 오프라인 입금·펀딩 정산 운영 기록 보존 정책(삭제 비대상, O4O 정식 상품/주문/배송 이력과 분리).

---

*Date: 2026-06-19 · 문서 저장 전용 · productId = optional·nullable legacy 소재 참조(제품 전환/주문 연결 아님) · 신규 생성 optional · 제품 기반 펀딩 회귀 금지 · OPL/order/payment/shipping/정산 연결 금지 · content-only 원칙과 무충돌 · 제거는 §7 조건 충족 후.*
