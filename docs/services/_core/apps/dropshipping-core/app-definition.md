# dropshipping-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** dropshipping-core
- **App Type:** core
- **Package:** @o4o/dropshipping-core
- **Service Group:** cosmetics, tourist, operations
- **Status:** Active

## 역할 및 책임

### 주요 역할
산업 중립적 확장형 드롭쉬핑 엔진으로서 Supplier/Seller/Product/Order/Settlement/Commission을 관리한다.

### 책임 범위
- Supplier 및 Seller 관리
- Product Master, Offer, Listing 관리
- Order Relay 워크플로우
- Settlement Batch 관리
- Commission Rule 및 Transaction 관리

### 경계
- 드롭쉬핑 워크플로우만 담당
- 실제 주문 원장은 ecommerce-core에 위임
- 업종별 검증은 Extension에 위임 (pharmaceutical-extension 등)
- 결제는 ecommerce-core에 위임

## 의존성

### Core Dependencies
- organization-core

### Optional Dependencies
(없음)

## 외부 노출

### Services
- SupplierService
- SellerService
- ProductService
- OrderRelayService
- SettlementService
- CommissionService

### Types
- Supplier
- Seller
- ProductMaster
- SupplierProductOffer
- SellerListing
- OrderRelay

### Events
- `product.master.updated`
- `product.offer.updated`
- `listing.created`
- `order.created`
- `order.relay.dispatched`
- `order.relay.fulfilled`
- `settlement.closed`
- `commission.applied`

## 설정

### 기본 설정
- enableAutoRelayToSupplier: true
- defaultCommissionRate: 10
- settlementCycle: 'monthly'
- requireSellerApproval: true
- requireSupplierApproval: true

### 환경 변수
(없음)

## 특징

- 산업 중립적 설계
- Extension Interface 제공
- 복잡한 워크플로우 (app-behavior.md 참조)
