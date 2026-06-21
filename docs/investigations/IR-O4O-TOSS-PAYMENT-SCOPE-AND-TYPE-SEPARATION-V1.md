# IR — O4O Toss 결제 범위 및 타입 분리 V1

**IR:** `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1`  
**일자:** 2026-06-21  
**범위:** 결제 범위/타입/후속 WO 순서 고정  
**성격:** 구현 전 조사·설계 경계 문서  
**코드 변경:** 없음  
**DB 변경:** 없음  
**API 변경:** 없음  

---

## 1. 배경

O4O에 Toss 결제를 도입하되, 결제 대상이 단일하지 않다.

현재 논의된 결제 축은 크게 두 가지다.

1. **매장 유료 기능 이용권 결제**
   - 외국인 여행객 판매지원
   - 향후 외부몰 판매지원
   - 향후 판매채널 확장 묶음 상품

2. **매장 → 공급자 B2B 상품 주문결제**
   - 일반 매장 재고 보충
   - 외국인 고객 판매 처리용 공급자 주문
   - 향후 외부몰 주문 처리용 공급자 주문

반대로 다음 결제는 O4O Toss 결제 대상이 아니다.

1. **외국인 고객이 매장에서 상품을 구매하는 결제**
   - 매장 일반 결제로 먼저 처리한다.
   - O4O는 고객 결제를 받지 않는다.

2. **네이버·쿠팡 등 외부몰 고객 결제**
   - 해당 외부몰에서 처리한다.
   - O4O는 외부몰 고객 결제·정산을 처리하지 않는다.

이 IR의 목적은 Toss를 붙이기 전에 위 경계를 고정하고, 후속 구현 WO의 순서를 안전하게 나누는 것이다.

---

## 2. 핵심 결론

### 2.1 Toss는 공통 결제 수단으로 사용한다

O4O는 Toss를 공통 결제 수단으로 도입한다.

다만 Toss 결제 내부 목적은 반드시 분리한다.

```ts
paymentType = SERVICE_ACCESS | B2B_ORDER
```

- `SERVICE_ACCESS`: 매장 유료 기능 이용권 결제
- `B2B_ORDER`: 매장 → 공급자 상품 주문결제

### 2.2 외국인 고객 결제는 O4O 대상이 아니다

외국인 여행객이 무재고 구매를 하는 경우에도, 고객은 매장에서 먼저 일반 결제를 한다.

```text
외국인 고객 → 매장 일반 결제
매장 → O4O에서 공급자 상품 주문
공급자 → 매장 또는 숙소 배송
```

따라서 외국인 고객 결제는 Toss 도입 범위에서 제외한다.

O4O가 담당하는 것은 다음이다.

```text
다국어 상품 설명
구매/배송 처리 보조
공급자 주문 연결
배송/수령 안내
매장 유료 기능 이용권 결제
매장-공급자 B2B 주문결제
```

### 2.3 네이버·쿠팡 입점 기능은 이번 범위에서 제외한다

네이버·쿠팡 입점 및 상품등록 기능은 아직 제작 전이다.

따라서 이번 Toss 결제 범위에는 포함하지 않는다.

이번 IR에서는 향후 확장 후보로만 남긴다.

```text
MARKETPLACE_LISTING_SUPPORT = reserved only
MARKETPLACE_FULFILLMENT = reserved only
```

---

## 3. 결제 대상 / 제외 대상

## 3.1 O4O Toss 결제 대상

| 구분 | 결제 타입 | 설명 | V1 포함 |
|---|---|---|---|
| 외국인 여행객 판매지원 이용권 | `SERVICE_ACCESS` | 매장 유료 기능 월 이용권 | 포함 |
| 향후 외부몰 판매지원 이용권 | `SERVICE_ACCESS` | 네이버·쿠팡 등 외부몰 판매지원 기능 | 예약만 |
| 향후 판매채널 확장 묶음 | `SERVICE_ACCESS` | 외국인 + 외부몰 등 묶음 상품 | 예약만 |
| 일반 공급자 상품 주문 | `B2B_ORDER` | 매장 재고 보충용 공급자 주문 | 포함 |
| 외국인 판매 처리용 공급자 주문 | `B2B_ORDER` | 외국인 고객 매장 결제 후 상품 조달 주문 | 포함 |
| 향후 외부몰 주문 처리용 공급자 주문 | `B2B_ORDER` | 네이버·쿠팡 주문 후 공급자 조달 주문 | 예약만 |

## 3.2 O4O Toss 결제 제외 대상

| 구분 | 결제 주체 | 처리 위치 | 사유 |
|---|---|---|---|
| 외국인 고객 상품 구매 결제 | 외국인 고객 → 매장 | 매장 일반 결제 | O4O 고객결제 아님 |
| 네이버 고객 결제 | 외부몰 고객 → 네이버 | 네이버 | 외부몰 결제·정산 영역 |
| 쿠팡 고객 결제 | 외부몰 고객 → 쿠팡 | 쿠팡 | 외부몰 결제·정산 영역 |
| 면세/환급 처리 | 고객/매장/외부 제도 | 매장 운영 영역 | Toss V1 범위 아님 |

---

## 4. 결제 타입 정의

## 4.1 `SERVICE_ACCESS`

매장이 O4O의 유료 기능을 이용하기 위해 결제하는 타입이다.

대표 예:

```text
FOREIGN_VISITOR_SALES_SUPPORT
```

결제 성공 후 처리:

```text
1. payment.status = PAID
2. entitlement.status = ACTIVE
3. startsAt / endsAt 설정
4. 해당 기능 메뉴 오픈
5. 만료일 표시
```

V1 정책:

```text
1회 결제형 월 이용권
자동결제 아님
빌링키 없음
구독 해지/자동 재시도 없음
```

## 4.2 `B2B_ORDER`

매장이 공급자 상품을 주문하기 위해 결제하는 타입이다.

대표 예:

```text
STORE_STOCK
FOREIGN_VISITOR_FULFILLMENT
MARKETPLACE_FULFILLMENT_RESERVED
```

결제 성공 후 처리:

```text
1. payment.status = PAID
2. order/paymentGroup.status = PAID
3. 공급자 주문 확인 가능 상태 전환
4. 장바구니/주문대기 상태 정리
```

---

## 5. 유료 기능 플랜 코드

V1에서 즉시 구현 대상은 외국인 여행객 판매지원이다.

```ts
planCode = FOREIGN_VISITOR_SALES_SUPPORT
```

예약 플랜:

```ts
planCode = MARKETPLACE_LISTING_SUPPORT // reserved only
planCode = SALES_CHANNEL_GROWTH_BUNDLE // reserved only
```

### 5.1 `FOREIGN_VISITOR_SALES_SUPPORT`

의미:

```text
외국인 여행객에게 다국어 상품 설명, QR/SNS 안내, 숙소 배송 또는 매장 수령 안내,
공급자 주문 연결을 지원하는 매장 유료 기능
```

중요 경계:

```text
외국인 고객 결제는 매장 일반 결제로 처리한다.
O4O는 고객 결제를 받지 않는다.
O4O는 매장의 판매지원과 공급자 조달 주문을 지원한다.
```

### 5.2 `MARKETPLACE_LISTING_SUPPORT` — reserved only

의미:

```text
향후 네이버·쿠팡 등 외부몰 판매지원 기능을 위한 예약 코드
```

V1 제외:

```text
네이버 입점
쿠팡 입점
외부몰 상품등록
외부몰 API 연동
외부몰 주문 수집
외부몰 고객 결제/정산
```

### 5.3 `SALES_CHANNEL_GROWTH_BUNDLE` — reserved only

의미:

```text
향후 외국인 여행객 판매지원 + 외부몰 판매지원 등을 묶는 통합 이용권 후보
```

V1에서는 구현하지 않는다.

---

## 6. B2B 주문 목적 코드

공급자 상품 주문에는 주문 목적을 둔다.

```ts
orderPurpose = STORE_STOCK | FOREIGN_VISITOR_FULFILLMENT | MARKETPLACE_FULFILLMENT_RESERVED
```

| 코드 | 의미 | V1 |
|---|---|---|
| `STORE_STOCK` | 일반 매장 재고 보충 | 포함 |
| `FOREIGN_VISITOR_FULFILLMENT` | 외국인 고객 매장 결제 후 공급자 조달 주문 | 포함 |
| `MARKETPLACE_FULFILLMENT_RESERVED` | 향후 외부몰 주문 처리용 공급자 주문 | 예약만 |

### 6.1 `FOREIGN_VISITOR_FULFILLMENT`

흐름:

```text
1. 외국인 고객이 매장에서 일반 결제
2. 매장 직원이 O4O에서 공급자 상품 주문
3. 주문 목적 = FOREIGN_VISITOR_FULFILLMENT
4. 배송 방식 선택
5. 매장 또는 숙소로 배송 요청
```

V1 권장 배송 방식:

```text
기본: 공급자 → 매장 배송
선택: 공급자 → 숙소 배송, 단 공급자/매장 정책이 허용하는 경우
```

---

## 7. Toss 연동 기준

V1은 Toss 결제위젯 기반 일반결제를 전제로 한다.

### 7.1 공통 원칙

```text
프론트는 결제 UI를 호출한다.
서버는 결제 금액과 결제 목적을 확정한다.
결제 성공 URL 진입만으로 결제 완료 처리하지 않는다.
서버 confirm 성공 후에만 PAID 처리한다.
```

### 7.2 준비 API

각 결제 타입별 준비 API가 필요하다.

예:

```text
POST /api/v1/{service}/payments/service-access/prepare
POST /api/v1/{service}/payments/b2b-orders/prepare
```

prepare에서 할 일:

```text
1. 결제 주체 확인
2. 결제 타입 확인
3. 금액 서버 산정
4. 주문명 생성
5. Toss orderId 생성
6. Payment READY 또는 PAYMENT_PENDING 생성
7. clientKey/orderId/orderName/amount 반환
```

### 7.3 confirm API

예:

```text
POST /api/v1/{service}/payments/confirm
```

confirm에서 할 일:

```text
1. orderId로 Payment 조회
2. amount 서버 저장값과 비교
3. paymentType별 후처리 분기
4. Toss confirm 호출
5. paymentKey 저장
6. PAID 처리
7. SERVICE_ACCESS면 이용권 ACTIVE
8. B2B_ORDER면 주문 PAID
```

### 7.4 fail 처리

```text
1. 실패 코드/메시지 기록
2. payment.status = FAILED 또는 PAYMENT_PENDING 유지 정책 결정
3. 재결제 가능 상태 제공
```

---

## 8. 자동결제 제외

V1에서는 자동결제를 제외한다.

제외 항목:

```text
빌링키
카드 자동 청구
월 자동갱신
결제 실패 자동 재시도
구독 해지/갱신 UI
```

이유:

```text
1. Toss 자동결제는 일반 결제와 별도 흐름이다.
2. 빌링키 저장/해지/재시도/고지 정책이 필요하다.
3. 초기에는 1회 결제형 월 이용권으로 충분히 검증 가능하다.
```

후속 후보:

```text
IR-O4O-TOSS-BILLING-AUTO-RENEWAL-V1
```

---

## 9. 개발 순서

### 9.1 이번 IR 이후 권장 순서

```text
1. WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
2. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
3. WO-O4O-TOSS-PAYMENT-CORE-V1
4. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1
5. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-V1
6. WO-O4O-B2B-ORDER-PURPOSE-V1
7. WO-O4O-B2B-ORDER-PAYMENT-GROUP-PREPARE-V1
8. WO-O4O-B2B-ORDER-TOSS-PAYMENT-V1
9. WO-O4O-FOREIGN-VISITOR-FULFILLMENT-ORDER-LINK-V1
10. WO-O4O-OPERATOR-PAYMENT-AND-ENTITLEMENT-OVERVIEW-V1
11. WO-O4O-TOSS-PAYMENT-CANCEL-REFUND-V1
```

### 9.2 첫 구현 WO

첫 구현은 다음이 적절하다.

```text
WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
```

이유:

```text
1. 결제보다 먼저 이용권/메뉴 오픈 기준이 필요하다.
2. 외국인 여행객 판매지원과 향후 외부몰 판매지원이 같은 기반을 공유할 수 있다.
3. Toss 없이도 기능 게이트를 먼저 검증할 수 있다.
```

---

## 10. V1에서 하지 않을 것

```text
네이버 입점/상품등록
쿠팡 입점/상품등록
외부몰 API 연동
외부몰 주문 자동 수집
외부몰 고객 결제 처리
외부몰 정산 처리
외국인 고객 온라인 결제
해외카드 직접 결제
면세/환급 자동 처리
Toss 자동결제/빌링키
부분 취소
공급자 정산 자동화
```

---

## 11. 검증 기준

이 IR은 구현 전 문서이므로 검증 기준은 다음이다.

```text
1. 결제 대상/제외 대상이 명확히 분리되어 있는가
2. SERVICE_ACCESS와 B2B_ORDER가 혼합되지 않는가
3. 외국인 고객 결제가 O4O Toss 결제 대상에서 제외되어 있는가
4. 네이버·쿠팡 기능이 V1 구현 범위에서 제외되어 있는가
5. 자동결제/빌링키가 V1에서 제외되어 있는가
6. 후속 WO 순서가 결제 충돌을 줄이는 순서인가
```

---

## 12. 결론

O4O Toss 결제는 다음 두 축으로 시작한다.

```text
1. SERVICE_ACCESS
   - 매장 유료 기능 이용권 결제
   - V1 대상: 외국인 여행객 판매지원 월 이용권

2. B2B_ORDER
   - 매장 → 공급자 상품 주문결제
   - V1 대상: 일반 재고 보충, 외국인 고객 판매 처리용 공급자 주문
```

다음은 V1 Toss 결제 대상이 아니다.

```text
외국인 고객이 매장에서 상품을 구매하는 결제
네이버·쿠팡 등 외부몰 고객 결제
네이버·쿠팡 입점/상품등록 기능
Toss 자동결제/빌링키
```

따라서 다음 작업은 `WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1`로 진행하는 것이 적절하다.
