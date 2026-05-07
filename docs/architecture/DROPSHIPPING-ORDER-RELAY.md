# Dropshipping Order Relay Architecture (DS-4.1)

> **이 문서는 Dropshipping 주문 전달(Order Relay)의 개념과 책임 경계를 정의한다.**
> 구현 전에 반드시 이 문서를 이해하고 따라야 한다.
> 이 문서를 위반하는 구현은 버그로 간주된다.

**Version:** 1.0.0
**Status:** Active
**Authority:** DS-1 (Dropshipping Domain Rules)
**Last Updated:** 2025-12-31

---

## 1. Order Relay란 무엇인가?

### 1.1 정의

**Order Relay(주문 전달)**는 판매자(Seller)의 외부 채널에서 발생한 주문을
공급자(Supplier)에게 전달하고, 이행(Fulfillment) 과정을 추적하는 **프로세스 단위**이다.

Order Relay는 다음을 의미한다:

| 의미 | 설명 |
|------|------|
| **주문 수신** | 외부 채널(스마트스토어, 쿠팡, ERP 등)에서 주문 정보를 받아들임 |
| **공급자 할당** | 해당 상품을 제공할 수 있는 공급자를 결정함 |
| **이행 의도** | 공급자에게 주문 이행을 요청하고 상태를 추적함 |
| **상태 동기화** | 출고, 배송 등의 상태를 원본 채널과 동기화함 |

### 1.2 Order Relay가 아닌 것 (Non-goals)

Order Relay는 다음을 **절대로 수행하지 않는다**:

| 금지 항목 | 이유 | 담당 도메인 |
|-----------|------|------------|
| **결제 처리** | Dropshipping은 결제를 다루지 않음 | Payment Core |
| **고객 결제 승인** | 소비자 체크아웃은 Dropshipping 영역이 아님 | Ecommerce Core |
| **환불 실행** | 환불 금전 이동은 Payment 책임 | Payment Core |
| **고객 계정 생성** | 사용자 관리는 Core 책임 | Auth Core |
| **가격 결정** | 판매가는 Seller가 Listing에서 결정 | Seller (Listing) |
| **재고 차감** | 재고는 Supplier Offer에서 관리 | Supplier (Offer) |

### 1.3 프로세스 시스템으로서의 Dropshipping

Dropshipping은 **상점(Storefront)**이 아니다.
Dropshipping은 **프로세스 시스템**이다.

```
Dropshipping ≠ 쇼핑몰
Dropshipping = 주문 → 공급자 → 이행 → 정산 프로세스
```

고객이 직접 Dropshipping 시스템에서 결제하거나 주문하는 경우는 **존재하지 않는다**.
모든 주문은 외부 채널(또는 Ecommerce Core)에서 발생하고, Dropshipping은 이를 **전달**할 뿐이다.

---

## 2. 관계 구조 (Relationship Model)

### 2.1 SellerOffer / SellerListing과의 관계

Order Relay는 반드시 **SellerListing**에 연결된다.

```
SellerListing (판매자의 채널 등록 상품)
    ↓
OrderRelay (주문 전달 단위)
```

| 관계 | 설명 |
|------|------|
| `listingId` | OrderRelay가 어떤 Listing에 대한 주문인지 식별 |
| 1:N | 하나의 Listing에 여러 OrderRelay 가능 |
| 필수 | listingId는 NOT NULL |

### 2.2 SupplierProductOffer와의 관계

OrderRelay는 Listing을 통해 **간접적으로** SupplierProductOffer에 연결된다.

```
SupplierProductOffer (공급자의 공급 조건)
    ↓
SellerListing (판매자의 채널 상품)
    ↓
OrderRelay (주문 전달)
```

OrderRelay가 직접 SupplierProductOffer를 참조하지 않는 이유:
- 판매자가 어떤 Offer를 선택했는지는 **Listing 생성 시점**에 결정됨
- 주문 시점에 Offer가 변경되어도 Listing 기준으로 이행

### 2.3 외부 주문 소스와의 관계

OrderRelay는 다양한 외부 소스에서 생성될 수 있다.

| 소스 유형 | 설명 | 식별 방식 |
|-----------|------|----------|
| **Ecommerce Core** | 플랫폼 내 주문 | `ecommerceOrderId` (필수) |
| **외부 채널** | 스마트스토어, 쿠팡 등 | `externalOrderId` |
| **ERP 연동** | 기업 ERP 시스템 | `externalOrderId` + `metadata` |
| **수동 입력** | 관리자 직접 생성 | `metadata.source = 'manual'` |

---

## 3. 소유권 규칙 (Ownership Rules)

### 3.1 Dropshipping이 소유하는 것

| 소유 항목 | 설명 |
|-----------|------|
| **Relay 상태** | pending, relayed, confirmed, shipped, delivered, cancelled, refunded |
| **할당 정보** | 어떤 공급자에게 할당되었는지 |
| **이행 의도** | 공급자에게 이행을 요청한 기록 |
| **타임스탬프** | relayedAt, confirmedAt, shippedAt, deliveredAt |
| **배송 정보** | shippingInfo (배송 추적 정보) |

### 3.2 Dropshipping이 소유하지 않는 것

| 비소유 항목 | 담당 도메인 | 연결 방식 |
|------------|------------|----------|
| **결제 상태** | Ecommerce Core | ecommerceOrderId 참조 |
| **고객 정보 원본** | Ecommerce Core | customerInfo는 복사본 |
| **환불 금액** | Payment Core | 계산 결과만 참조 |
| **고객 계약** | Ecommerce Core | 판매 원장 책임 |

### 3.3 Ecommerce Core가 소유하는 것

Ecommerce Core의 EcommerceOrder는 다음을 소유한다:

| 소유 항목 | 설명 |
|-----------|------|
| **판매 계약** | 고객과의 구매 계약 |
| **결제 상태** | 결제 승인, 취소, 환불 상태 |
| **고객 정보** | 구매자 정보 원본 |
| **최종 판매가** | 고객이 지불한 금액 |
| **OrderType** | 주문 유형 (생성 시 불변) |

---

## 4. 명시적 비목표 (Explicit Non-goals)

다음 기능은 Dropshipping Order Relay의 범위에서 **명시적으로 제외**된다.

### 4.1 고객 직접 접점

Dropshipping은 고객(Consumer)과 직접 상호작용하지 않는다.

| 금지 | 이유 |
|------|------|
| 고객 주문 생성 API | 고객은 Ecommerce에서 주문 |
| 고객 결제 API | 결제는 Payment Core |
| 고객 주문 조회 API | 조회는 Ecommerce Core |
| 고객 취소 요청 API | 취소 요청은 Ecommerce 경유 |

### 4.2 결제/정산 실행

Dropshipping은 금전 이동을 실행하지 않는다.

| 금지 | 이유 |
|------|------|
| 결제 승인 호출 | Payment Core 책임 |
| 환불 실행 | Payment Core 책임 |
| 계좌 이체 | Finance 시스템 책임 |
| PG 연동 | Payment Core 책임 |

### 4.3 가격 정책 결정

Dropshipping은 가격을 결정하지 않는다.

| 금지 | 이유 |
|------|------|
| 판매가 결정 | Seller가 Listing에서 결정 |
| 공급가 결정 | Supplier가 Offer에서 결정 |
| 할인 적용 | Ecommerce Core 또는 채널 책임 |
| 쿠폰 처리 | Ecommerce Core 책임 |

---

## 5. 필수 불변식 (Required Invariants)

### 5.1 멱등성 (Idempotency)

동일한 외부 주문에 대해 OrderRelay는 **한 번만 생성**되어야 한다.

```
불변식: (listingId, externalOrderId) 조합은 고유해야 한다
예외: externalOrderId가 NULL인 경우 (수동 생성)
```

중복 생성 시도는 다음과 같이 처리한다:
- 동일한 externalOrderId로 재요청 시 → 기존 OrderRelay 반환
- 새로운 OrderRelay 생성 금지

### 5.2 추적 가능성 (Traceability)

모든 OrderRelay는 **원본 소스를 추적**할 수 있어야 한다.

| 필수 조건 | 설명 |
|-----------|------|
| `orderNumber` | 내부 고유 번호 (자동 생성) |
| `externalOrderId` OR `ecommerceOrderId` | 최소 하나는 존재해야 함 |
| `createdAt` | 생성 시점 기록 |
| `metadata.source` | 생성 경로 기록 (권장) |

### 5.3 불변 지점 (Immutability Points)

특정 상태에 도달하면 일부 필드는 **변경 불가**가 된다.

| 상태 | 불변 필드 |
|------|----------|
| `relayed` 이후 | listingId, quantity, unitPrice, totalPrice |
| `confirmed` 이후 | 위 + ecommerceOrderId |
| `shipped` 이후 | 위 + shippingInfo.carrier, shippingInfo.trackingNumber |
| `delivered` 이후 | 모든 핵심 필드 불변 |
| `cancelled/refunded` | 상태 변경 불가 (터미널) |

---

## 6. 데이터 경계 (Data Boundaries)

### 6.1 복사되는 데이터 (Copied)

다음 데이터는 OrderRelay 생성 시 **복사**된다.

| 필드 | 원본 소스 | 복사 이유 |
|------|----------|----------|
| `unitPrice` | SellerListing.sellingPrice | 주문 시점 가격 고정 |
| `customerInfo` | Ecommerce Order | 배송 목적 스냅샷 |
| `shippingInfo` | 외부 채널 또는 입력 | 배송 처리용 |

### 6.2 참조되는 데이터 (Referenced)

다음 데이터는 **참조만** 한다 (복사하지 않음).

| 필드 | 참조 대상 | 참조 방식 |
|------|----------|----------|
| `listingId` | SellerListing | UUID Soft FK |
| `ecommerceOrderId` | EcommerceOrder | UUID Soft FK |
| `commissionTransactions` | CommissionTransaction | 관계 연결 |

### 6.3 절대 저장하지 않는 데이터

다음 데이터는 OrderRelay에 **저장하지 않는다**.

| 금지 데이터 | 이유 |
|------------|------|
| 결제 카드 정보 | PCI DSS 위반 |
| 비밀번호/토큰 | 보안 위반 |
| 사용자 인증 정보 | Auth Core 책임 |
| 다른 주문의 정보 | 데이터 격리 |

---

## 7. 실패 처리 원칙 (Failure Handling Principles)

### 7.1 자동 복구 금지 (No Auto-heal Without Audit)

OrderRelay는 실패 시 **자동으로 상태를 변경하지 않는다**.

| 원칙 | 설명 |
|------|------|
| 실패 기록 | 모든 실패는 로그/감사 테이블에 기록 |
| 수동 개입 | 관리자가 명시적으로 재시도 또는 취소 |
| 자동 재시도 | 네트워크 일시 오류에 한해 제한적 허용 |
| 상태 롤백 | 금지 (대신 새로운 상태로 전이) |

### 7.2 실패 시 상태 처리

| 실패 유형 | 처리 방식 |
|-----------|----------|
| Relay 전송 실패 | `metadata.lastError` 기록, 상태 유지 |
| 공급자 거부 | `cancelled` 전이, 사유 기록 |
| 배송 실패 | 수동 개입 대기, 상태 유지 |
| 시스템 오류 | 로그 기록, 알림, 수동 개입 |

### 7.3 감사 로그 필수

다음 이벤트는 **반드시 감사 로그**에 기록한다.

| 이벤트 | 기록 항목 |
|--------|----------|
| 상태 변경 | 이전 상태, 새 상태, 변경자, 시각 |
| 데이터 수정 | 변경 전/후 값, 변경자, 시각 |
| 외부 통신 | 요청/응답, 성공/실패, 시각 |
| 취소/환불 | 사유, 요청자, 승인자, 시각 |

---

## 8. Ecommerce Core 연동 규칙

### 8.1 필수 연동 흐름

외부 주문이 아닌, 플랫폼 내 주문인 경우 **반드시 Ecommerce Core를 경유**한다.

```
1. 고객이 Ecommerce에서 주문 생성
2. EcommerceOrderService.create() 호출 → EcommerceOrder 생성
3. ecommerce_order_id 획득
4. OrderRelay 생성 시 ecommerceOrderId 저장 (필수)
5. 이후 모든 결제/환불 상태는 EcommerceOrder 참조
```

### 8.2 ecommerceOrderId 규칙

| 규칙 | 설명 |
|------|------|
| 플랫폼 주문 시 필수 | 외부 채널 주문은 nullable |
| 생성 후 불변 | 한 번 설정되면 변경 불가 |
| 유효성 검증 | 존재하는 EcommerceOrder여야 함 |
| 중복 불가 | 동일 ecommerceOrderId로 여러 Relay 금지 |

### 8.3 Ecommerce Core 우회 금지

다음 상황에서도 Ecommerce Core를 **우회할 수 없다**.

| 상황 | 올바른 처리 |
|------|------------|
| "빠른 주문 처리" | Ecommerce 경유 필수 |
| "테스트 주문" | 테스트 EcommerceOrder 생성 후 연결 |
| "수동 주문" | Admin이 EcommerceOrder 먼저 생성 |
| "대량 주문" | 배치로 EcommerceOrder 생성 후 연결 |

---

## 9. 준수 체크리스트

OrderRelay 구현 시 다음을 **반드시 확인**한다.

| 항목 | 확인 |
|------|------|
| OrderRelay는 결제를 처리하지 않는가? | ☐ |
| 고객 직접 API가 없는가? | ☐ |
| listingId가 필수로 설정되어 있는가? | ☐ |
| 중복 생성 방지 로직이 있는가? | ☐ |
| 상태 변경 시 감사 로그를 기록하는가? | ☐ |
| 불변 지점 이후 필드 변경을 막는가? | ☐ |
| 플랫폼 주문 시 ecommerceOrderId가 필수인가? | ☐ |
| 자동 복구 없이 실패를 기록하는가? | ☐ |

---

*Document Version: 1.0.0*
*Phase: DS-4 Architecture*
*Authority: DS-1 (Dropshipping Domain Rules)*
*Status: Awaiting Approval*
