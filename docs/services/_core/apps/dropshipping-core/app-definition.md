# dropshipping-core

> **Status**: Active | **Version**: 1.0.0 | **Package**: @o4o/dropshipping-core

## 역할

산업 중립적 드롭쉬핑 엔진. cosmetics, tourist, operations에서 사용.

| 책임 | 경계 |
|------|------|
| Supplier / Seller 관리 | 주문 원장 → ecommerce-core |
| Product Master / Offer / Listing | 업종별 검증 → Extension |
| Order Relay 워크플로우 | 결제 → ecommerce-core |
| Settlement / Commission | |

## 외부 노출

**Services**: SupplierService, SellerService, ProductService, OrderRelayService, SettlementService, CommissionService
**Types**: Supplier, Seller, ProductMaster, SupplierProductOffer, SellerListing, OrderRelay
**Events**: `product.master/offer.updated`, `listing.created`, `order.created/relay.dispatched/relay.fulfilled`, `settlement.closed`, `commission.applied`

## API Routes

- `/api/v1/dropshipping/suppliers`
- `/api/v1/dropshipping/sellers`
- `/api/v1/dropshipping/products`
- `/api/v1/dropshipping/orders`
- `/api/v1/dropshipping/settlement`

## 설정

- enableAutoRelayToSupplier: true, defaultCommissionRate: 10%
- settlementCycle: monthly
- requireSellerApproval: true, requireSupplierApproval: true

## Dependencies

- organization-core
