# ecommerce-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** ecommerce-core
- **App Type:** core
- **Package:** @o4o/ecommerce-core
- **Service Group:** All commerce services
- **Status:** Active

## 역할 및 책임

### 주요 역할
판매 원장(Source of Truth)으로서 주문, 결제, 판매 유형을 통합 관리한다.

### 책임 범위
- 주문 관리 (EcommerceOrder, EcommerceOrderItem)
- 결제 관리 (EcommercePayment)
- 판매 유형 분류 (retail, dropshipping, b2b, subscription)
- 주문/결제 상태 관리

### 경계
- 주문/결제 원장만 담당
- 재고 관리는 각 서비스 앱이 담당
- 배송 로직은 dropshipping-core 등에 위임
- 정산은 각 비즈니스 앱이 담당

## 의존성

### Core Dependencies
- organization-core

### Optional Dependencies
(없음)

## 외부 노출

### Services
- EcommerceOrderService
- EcommercePaymentService

### Types
- EcommerceOrder
- EcommerceOrderItem
- EcommercePayment
- OrderType
- OrderStatus
- PaymentStatus

### Events
- `order.created`
- `order.confirmed`
- `order.cancelled`
- `order.completed`
- `payment.pending`
- `payment.completed`
- `payment.failed`
- `payment.refunded`

## 설정

### 기본 설정
- defaultCurrency: 'KRW'
- autoConfirmPayment: false
- orderNumberPrefix: 'ORD'
- paymentTimeout: 30 (분)

### 환경 변수
(없음)

## 특징

- 판매 원장(Source of Truth) 역할
- 모든 커머스 서비스에서 사용
- uninstallPolicy.allowPurge: false (원장 데이터 삭제 금지)
