# pharmaceutical-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** pharmaceutical-core
- **App Type:** core
- **Version:** 1.0.0
- **Package:** @o4o/pharmaceutical-core

## 구현 완료된 기능

### Backend
- PharmaProductMaster Entity 및 Service
- PharmaOffer Entity 및 Service
- PharmaOrder Entity 및 Service
- PharmaSettlementBatch Entity 및 Service
- PharmaDispatch Entity 및 Service
- 약품코드 관리
- 라이선스 검증

### Frontend (Admin)
- 의약품 상품 목록/관리
- Offer 목록/관리
- 주문 관리
- 정산 관리

### API Routes
- `/api/v1/pharma/products`
- `/api/v1/pharma/offers`
- `/api/v1/pharma/orders`
- `/api/v1/pharma/settlement`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음)

## 기본 설정

- defaultPlatformFeeRate: 0.02 (2%)
- maxCommissionRate: 0.02 (2%)
- settlementPeriodDays: 7
- enableColdChainTracking: true

## 특징

- Dropshipping Core Extension Interface 구현
- Phase 3에서 extension으로 전환 예정
