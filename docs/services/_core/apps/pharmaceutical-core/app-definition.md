# pharmaceutical-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** pharmaceutical-core
- **App Type:** core (Phase 3에서 extension으로 전환 예정)
- **Package:** @o4o/pharmaceutical-core
- **Service Group:** diabetes-pharmacy, pharmacyops
- **Status:** Active

## 역할 및 책임

### 주요 역할
의약품 B2B 유통 Core로서 의약품 도매상/제조사와 약국 간 B2B 거래를 관리한다.

### 책임 범위
- 의약품 상품 관리 (PharmaProductMaster)
- Offer 관리 (PharmaOffer)
- 주문 관리 (PharmaOrder)
- 정산 관리 (PharmaSettlementBatch)
- 약품코드 관리
- 약국/도매상 라이선스 검증

### 경계
- 의약품 유통만 담당
- Dropshipping Core와 연동 (productType='pharmaceutical')
- 일반 상품은 dropshipping-core에 위임

## 의존성

### Core Dependencies
- dropshipping-core

### Optional Dependencies
(없음)

## 외부 노출

### Services
- PharmaProductService
- PharmaOfferService
- PharmaOrderService
- PharmaSettlementService

### Types
- PharmaProductCategory
- PharmaProductStatus
- PharmaOfferStatus
- PharmaSupplierType
- PharmaOrderStatus
- PharmaPaymentStatus
- PharmaSettlementStatus

### Events
- `pharma.product.created`
- `pharma.offer.created`
- `pharma.order.created`
- `pharma.settlement.closed`

## 설정

### 기본 설정
- defaultPlatformFeeRate: 0.02 (2%)
- maxCommissionRate: 0.02 (2%)
- settlementPeriodDays: 7
- enableColdChainTracking: true

### 환경 변수
(없음)

## 특징

- Dropshipping Core Extension Interface 구현
- Phase 3에서 extension으로 전환 예정
