# pharmaceutical-core

> **Status**: Active (Phase 3에서 extension 전환 예정) | **Version**: 1.0.0 | **Package**: @o4o/pharmaceutical-core

## 역할

의약품 B2B 유통 Core. diabetes-pharmacy, pharmacyops에서 사용.

| 책임 | 경계 |
|------|------|
| PharmaProductMaster / Offer / Order | 일반 상품 → dropshipping-core |
| PharmaSettlementBatch | 연동: productType='pharmaceutical' |
| 약품코드 / 라이선스 검증 | |

## 외부 노출

**Services**: PharmaProductService, PharmaOfferService, PharmaOrderService, PharmaSettlementService
**Types**: PharmaProductCategory, PharmaProductStatus, PharmaOfferStatus, PharmaSupplierType, PharmaOrderStatus, PharmaPaymentStatus, PharmaSettlementStatus
**Events**: `pharma.product/offer/order.created`, `pharma.settlement.closed`

## API Routes

- `/api/v1/pharma/products`
- `/api/v1/pharma/offers`
- `/api/v1/pharma/orders`
- `/api/v1/pharma/settlement`

## 설정

- defaultPlatformFeeRate: 2%, maxCommissionRate: 2%
- settlementPeriodDays: 7, enableColdChainTracking: true

## Dependencies

- dropshipping-core
