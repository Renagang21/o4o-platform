# dropshipping-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** dropshipping-core
- **App Type:** core
- **Version:** 1.0.0
- **Package:** @o4o/dropshipping-core

## 구현 완료된 기능

### Backend
- Supplier 관리 (Entity, Service, Controller)
- Seller 관리 (Entity, Service, Controller)
- Product Master 관리
- Supplier Product Offer 관리
- Seller Listing 관리
- Order Relay 워크플로우
- Settlement Batch 관리
- Commission Rule 및 Transaction 관리

### Frontend (Admin)
- Dropshipping 대시보드
- 공급사 목록/관리
- 판매자 목록/관리
- 상품 목록/관리
- 주문 목록/관리
- 정산 목록
- 커미션 설정

### API Routes
- `/api/v1/dropshipping/suppliers`
- `/api/v1/dropshipping/sellers`
- `/api/v1/dropshipping/products`
- `/api/v1/dropshipping/orders`
- `/api/v1/dropshipping/settlement`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음)

## 기본 설정

- enableAutoRelayToSupplier: true
- defaultCommissionRate: 10%
- settlementCycle: monthly
- requireSellerApproval: true
- requireSupplierApproval: true

## 특징

- Extension Interface 제공
- 복잡한 워크플로우 (app-behavior.md 참조)
