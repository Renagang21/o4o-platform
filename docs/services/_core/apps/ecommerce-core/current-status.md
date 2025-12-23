# ecommerce-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** ecommerce-core
- **App Type:** core
- **Version:** 1.0.0
- **Package:** @o4o/ecommerce-core

## 구현 완료된 기능

### Backend
- EcommerceOrder Entity 및 Service
- EcommerceOrderItem Entity
- EcommercePayment Entity 및 Service
- 주문 상태 관리
- 결제 상태 관리
- 판매 유형 분류

### Frontend (Admin)
- E-commerce 대시보드 (`/admin/ecommerce`)
- 주문 목록 (`/admin/ecommerce/orders`)
- 주문 상세 (`/admin/ecommerce/orders/:id`)
- 결제 목록 (`/admin/ecommerce/payments`)

### API Routes
- `/api/v1/ecommerce/orders`
- `/api/v1/ecommerce/orders/:id`
- `/api/v1/ecommerce/payments`
- `/api/v1/ecommerce/payments/:id`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음)

## 기본 설정

- defaultCurrency: 'KRW'
- autoConfirmPayment: false
- orderNumberPrefix: 'ORD'
- paymentTimeout: 30 (분)

## 특징

- 판매 원장(Source of Truth) 역할
- allowPurge: false (원장 데이터 삭제 금지)
