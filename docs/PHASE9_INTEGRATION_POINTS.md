# Phase 9: Seller Authorization - Integration Points

This document specifies how Phase 9 Seller Authorization System integrates with existing platform features.

---

## Overview

Phase 9 adds authorization gates at critical transaction points:

1. **Cart**: Block unapproved products from cart
2. **Order**: Validate authorization before order creation
3. **Settlement**: Include authorization metadata in commissions
4. **Product Listing**: Filter products by authorization status

---

## 1. Cart Integration

### Integration Point
- **File**: `apps/api-server/src/controllers/CartController.ts`
- **Method**: `addItem()`
- **Action**: Authorization gate check BEFORE adding to cart

### Implementation Pseudocode

```typescript
import { authorizationGateService } from '../services/AuthorizationGateService.js';
import { FeatureFlags } from '../utils/featureFlags.js';
import { authorizationMetrics } from '../services/authorization-metrics.service.js';

class CartController {
  async addItem(req: Request, res: Response) {
    const { productId, quantity } = req.body;
    const sellerId = req.user.sellerId; // From JWT or session

    // Phase 9: Authorization Gate Check
    if (FeatureFlags.isSellerAuthorizationEnabled()) {
      const startTime = Date.now();
      let cacheHit = false;

      try {
        const isAuthorized = await authorizationGateService.isSellerApprovedForProduct(sellerId, productId);

        if (!isAuthorized) {
          // Authorization denied
          authorizationMetrics.incrementGateDeny('cart');
          authorizationMetrics.recordGateLatency(Date.now() - startTime, cacheHit);

          return res.status(403).json({
            success: false,
            errorCode: 'ERR_SELLER_NOT_AUTHORIZED',
            message: 'You are not authorized to sell this product. Please request authorization from the supplier.',
            productId,
            actions: [
              {
                label: 'Request Authorization',
                endpoint: `/api/v1/ds/seller/products/${productId}/request`,
                method: 'POST',
              },
            ],
          });
        }

        // Authorization approved
        authorizationMetrics.recordGateLatency(Date.now() - startTime, cacheHit);
      } catch (error) {
        // Fail-closed: Deny on error
        logger.error('Authorization gate error', { sellerId, productId, error });
        authorizationMetrics.incrementGateDeny('cart');

        return res.status(500).json({
          success: false,
          errorCode: 'ERR_AUTHORIZATION_CHECK_FAILED',
          message: 'Failed to verify product authorization. Please try again.',
        });
      }
    }

    // Continue with cart add logic (existing code)
    const cartItem = await cartService.addItem(sellerId, productId, quantity);

    return res.status(200).json({
      success: true,
      data: cartItem,
    });
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "errorCode": "ERR_SELLER_NOT_AUTHORIZED",
  "message": "You are not authorized to sell this product. Please request authorization from the supplier.",
  "productId": "uuid",
  "authorizationStatus": {
    "status": "NONE | REQUESTED | REJECTED | REVOKED",
    "canRequest": true,
    "cooldownUntil": "2025-02-06T10:00:00Z", // If rejected
    "reason": "Insufficient credentials" // If rejected/revoked
  },
  "actions": [
    {
      "label": "Request Authorization",
      "endpoint": "/api/v1/ds/seller/products/{productId}/request",
      "method": "POST"
    }
  ]
}
```

### UI Integration (Frontend)

```typescript
// Frontend: apps/main-site/src/components/ProductCard.tsx

const handleAddToCart = async (productId: string) => {
  try {
    await authClient.api.post(`/cart/items`, { productId, quantity: 1 });
    toast.success('Added to cart');
  } catch (error) {
    if (error.errorCode === 'ERR_SELLER_NOT_AUTHORIZED') {
      // Show authorization request modal
      setAuthorizationModal({
        productId,
        status: error.authorizationStatus.status,
        canRequest: error.authorizationStatus.canRequest,
        cooldownUntil: error.authorizationStatus.cooldownUntil,
      });
    } else {
      toast.error('Failed to add to cart');
    }
  }
};
```

---

## 2. Order Integration

### Integration Point
- **File**: `apps/api-server/src/services/OrderService.ts`
- **Method**: `createOrder()`
- **Action**: Bulk authorization check BEFORE order creation

### Implementation Pseudocode

```typescript
import { authorizationGateService } from './AuthorizationGateService.js';
import { FeatureFlags } from '../utils/featureFlags.js';

class OrderService {
  async createOrder(sellerId: string, cartItems: CartItem[]) {
    const productIds = cartItems.map((item) => item.productId);

    // Phase 9: Bulk Authorization Check
    if (FeatureFlags.isSellerAuthorizationEnabled()) {
      const startTime = Date.now();

      try {
        const result = await authorizationGateService.getApprovedProductsForSeller(sellerId, productIds);

        if (result.unauthorizedProducts.length > 0) {
          // Some products unauthorized
          authorizationMetrics.incrementGateDeny('order');
          authorizationMetrics.recordGateLatency(Date.now() - startTime, false);

          throw new Error({
            errorCode: 'ERR_UNAUTHORIZED_PRODUCTS_IN_ORDER',
            message: 'Some products in your cart require authorization.',
            unauthorizedProducts: result.unauthorizedProducts,
            actions: [
              {
                label: 'Remove Unauthorized Products',
                method: 'removeFromCart',
              },
              {
                label: 'Request Authorization',
                method: 'requestAuthorization',
              },
            ],
          });
        }

        // All products authorized
        logger.info('Order authorization check passed', {
          sellerId,
          productCount: productIds.length,
          cacheHitRate: result.cacheHitRate,
          executionTime: result.executionTime,
        });
      } catch (error) {
        // Fail-closed: Deny on error
        logger.error('Order authorization check failed', { sellerId, productIds, error });
        throw error;
      }
    }

    // Continue with order creation (existing code)
    const order = await this.repository.save({
      sellerId,
      items: cartItems,
      status: 'PENDING',
    });

    return order;
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "errorCode": "ERR_UNAUTHORIZED_PRODUCTS_IN_ORDER",
  "message": "Some products in your cart require authorization.",
  "unauthorizedProducts": [
    {
      "productId": "uuid",
      "productName": "Product A",
      "authorizationStatus": {
        "status": "NONE",
        "canRequest": true
      }
    }
  ],
  "actions": [
    {
      "label": "Remove Unauthorized Products",
      "method": "removeFromCart"
    },
    {
      "label": "Request Authorization",
      "method": "requestAuthorization"
    }
  ]
}
```

---

## 3. Settlement Integration (Phase 8)

### Integration Point
- **File**: `apps/api-server/src/services/SettlementService.ts`
- **Method**: `calculateCommissions()`
- **Action**: Include authorization metadata in commission records

### Implementation Pseudocode

```typescript
import { authorizationGateService } from './AuthorizationGateService.js';

class SettlementService {
  async calculateCommissions(order: Order) {
    const commissions = [];

    for (const item of order.items) {
      // Phase 9: Get authorization metadata
      let authorizationMetadata = null;

      if (FeatureFlags.isSellerAuthorizationEnabled()) {
        const authStatus = await authorizationGateService.getAuthorizationStatus(
          order.sellerId,
          item.productId
        );

        if (authStatus.isAuthorized && authStatus.authorizationId) {
          // Snapshot authorization metadata
          authorizationMetadata = {
            authorizationId: authStatus.authorizationId,
            approvedAt: authStatus.approvedAt,
            supplierId: item.supplierId,
            productSnapshot: {
              productId: item.productId,
              productName: item.productName,
              supplierSku: item.supplierSku,
            },
          };
        }
      }

      // Calculate commission (Phase 8 logic)
      const commission = await commissionPolicyService.calculate({
        orderId: order.id,
        productId: item.productId,
        sellerId: order.sellerId,
        supplierId: item.supplierId,
        amount: item.totalPrice,
      });

      // Save commission with authorization metadata
      const commissionRecord = await commissionRepository.save({
        ...commission,
        authorizationMetadata, // Phase 9 field
      });

      commissions.push(commissionRecord);
    }

    return commissions;
  }
}
```

### Commission Table Schema Addition

```sql
-- Migration: Add authorization_metadata column to commissions table
-- (Already included in Phase9-SellerAuthorization.ts migration)

ALTER TABLE commissions ADD COLUMN authorization_metadata JSONB NULL;

COMMENT ON COLUMN commissions.authorization_metadata IS
  'Snapshot of seller authorization at commission calculation time. Includes authorizationId, approvedAt, supplierId.';

-- Index for querying by authorization
CREATE INDEX IF NOT EXISTS idx_commissions_auth_metadata
  ON commissions USING GIN (authorization_metadata);
```

### Authorization Metadata Format

```json
{
  "authorizationId": "uuid",
  "approvedAt": "2025-01-07T10:00:00Z",
  "supplierId": "uuid",
  "authorizedBy": "supplier-admin-id",
  "productSnapshot": {
    "productId": "uuid",
    "productName": "Product A",
    "supplierSku": "SKU123",
    "version": "v1"
  }
}
```

### Use Cases for Authorization Metadata

1. **Audit Trail**: Verify seller was authorized at time of sale
2. **Dispute Resolution**: Prove authorization existed during transaction
3. **Analytics**: Track commission by authorization date
4. **Retroactive Analysis**: Prevent authorization changes from affecting past settlements

---

## 4. Product Listing Integration

### Integration Point
- **File**: `apps/api-server/src/services/ProductService.ts`
- **Method**: `getSellerProducts()`
- **Action**: Filter products by authorization status

### Implementation Pseudocode

```typescript
class ProductService {
  async getSellerProducts(sellerId: string, filters: ProductFilters) {
    // Fetch all products
    const products = await this.repository.find({
      where: { supplierId: filters.supplierId },
    });

    // Phase 9: Filter by authorization status
    if (FeatureFlags.isSellerAuthorizationEnabled()) {
      const productIds = products.map((p) => p.id);

      const { authorizedProducts } = await authorizationGateService.getApprovedProductsForSeller(
        sellerId,
        productIds
      );

      // Add authorization badge to each product
      const productsWithAuth = products.map((product) => ({
        ...product,
        authorization: {
          isAuthorized: authorizedProducts.includes(product.id),
          canSell: authorizedProducts.includes(product.id),
        },
      }));

      // Filter by authorization status (if requested)
      if (filters.authorizationStatus) {
        return productsWithAuth.filter((p) => {
          if (filters.authorizationStatus === 'AUTHORIZED') {
            return p.authorization.isAuthorized;
          } else if (filters.authorizationStatus === 'UNAUTHORIZED') {
            return !p.authorization.isAuthorized;
          }
          return true;
        });
      }

      return productsWithAuth;
    }

    // Feature flag OFF: Return all products
    return products;
  }
}
```

### Product Response Format

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product A",
        "price": 10000,
        "supplierId": "uuid",
        "authorization": {
          "isAuthorized": true,
          "canSell": true,
          "status": "APPROVED",
          "approvedAt": "2025-01-07T10:00:00Z"
        }
      },
      {
        "id": "uuid",
        "name": "Product B",
        "price": 20000,
        "supplierId": "uuid",
        "authorization": {
          "isAuthorized": false,
          "canSell": false,
          "status": "NONE",
          "canRequest": true,
          "actions": [
            {
              "label": "Request Authorization",
              "endpoint": "/api/v1/ds/seller/products/{productId}/request",
              "method": "POST"
            }
          ]
        }
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 20
    }
  }
}
```

### UI Integration (Frontend)

```typescript
// Frontend: apps/admin-dashboard/src/pages/Products.tsx

const ProductCard = ({ product }) => {
  const { authorization } = product;

  return (
    <Card>
      <h3>{product.name}</h3>
      <p>{product.price}</p>

      {authorization.isAuthorized ? (
        <Badge color="green">Authorized</Badge>
      ) : (
        <div>
          <Badge color="gray">Unauthorized</Badge>
          {authorization.canRequest && (
            <Button onClick={() => requestAuthorization(product.id)}>
              Request Authorization
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
```

---

## 5. Admin Dashboard Integration

### Integration Point
- **File**: `apps/admin-dashboard/src/pages/Sellers.tsx`
- **Action**: Display seller authorization stats and manage roles

### Admin Dashboard Features

1. **Seller List**:
   - Show seller role status (APPROVED, PENDING, REJECTED)
   - Show authorization count (e.g., "8/10 products")
   - Action: Approve/Revoke seller role

2. **Authorization Inbox**:
   - Supplier inbox (pending requests)
   - Admin overview (all pending requests)
   - Bulk approve/reject actions

3. **Analytics Dashboard**:
   - Authorization approval rate
   - Average response time (request → approve/reject)
   - Product limit hit rate
   - Cooldown blocks per day
   - Revocation rate

### API Endpoints for Admin Dashboard

```typescript
// Seller management
GET /api/admin/dropshipping/sellers
POST /api/admin/dropshipping/sellers/:userId/approve-role
POST /api/admin/dropshipping/sellers/:userId/revoke-role

// Authorization management
GET /api/admin/dropshipping/authorizations/stats
GET /api/admin/dropshipping/authorizations/audit
POST /api/admin/dropshipping/authorizations/bulk-approve
```

---

## 6. Notification Integration

### Email Notifications (Existing EmailService)

**Triggers**:
1. **Seller Requests Authorization**: Email to supplier
2. **Supplier Approves**: Email to seller
3. **Supplier Rejects**: Email to seller (with reason and cooldown)
4. **Supplier Revokes**: Email to seller (with reason)
5. **Admin Approves Seller Role**: Email to seller
6. **Admin Revokes Seller Role**: Email to seller

### Email Templates

```typescript
// services/email/templates/seller-authorization.ts

export const TEMPLATES = {
  SELLER_REQUESTS_AUTHORIZATION: {
    to: 'supplier',
    subject: 'New Authorization Request from Seller',
    body: `
      Seller {{ sellerName }} has requested authorization to sell your product:

      Product: {{ productName }}
      Seller Tier: {{ sellerTier }}
      Business Justification: {{ businessJustification }}

      Review and respond within 3 business days:
      {{ approveLink }}
      {{ rejectLink }}
    `,
  },

  SUPPLIER_APPROVES: {
    to: 'seller',
    subject: 'Authorization Approved',
    body: `
      Your authorization request for {{ productName }} has been approved!

      You can now add this product to your store.
      {{ productLink }}
    `,
  },

  SUPPLIER_REJECTS: {
    to: 'seller',
    subject: 'Authorization Rejected',
    body: `
      Your authorization request for {{ productName }} has been rejected.

      Reason: {{ reason }}

      You can re-apply after {{ cooldownUntil }}.
    `,
  },
};
```

---

## 7. Analytics Integration (Phase 7)

### Analytics Events

```typescript
// Track authorization events in analytics system

analytics.track('seller_authorization_requested', {
  sellerId: 'uuid',
  supplierId: 'uuid',
  productId: 'uuid',
  timestamp: new Date(),
});

analytics.track('seller_authorization_approved', {
  sellerId: 'uuid',
  supplierId: 'uuid',
  productId: 'uuid',
  responseTime: 3600, // seconds from request to approve
  timestamp: new Date(),
});

analytics.track('seller_authorization_denied', {
  sellerId: 'uuid',
  supplierId: 'uuid',
  productId: 'uuid',
  stage: 'cart', // cart, order, settlement
  reason: 'not_authorized',
  timestamp: new Date(),
});
```

---

## Integration Checklist

- [ ] Cart Controller: Add authorization gate check
- [ ] Order Service: Add bulk authorization validation
- [ ] Settlement Service: Include authorization metadata in commissions
- [ ] Product Service: Add authorization filtering
- [ ] Admin Dashboard: Add seller role management UI
- [ ] Admin Dashboard: Add authorization inbox UI
- [ ] Email Service: Add authorization email templates
- [ ] Analytics: Track authorization events
- [ ] Frontend: Add authorization request modal
- [ ] Frontend: Add authorization status badges

---

## Backward Compatibility

**Non-Dropshipping Products**: NOT affected by Phase 9
- Regular e-commerce products (non-dropshipping)
- Direct sales (no supplier)
- Seller's own products (not from supplier)

**Condition**: Only dropshipping products (products with supplierId) require authorization

```typescript
// Example: Bypass authorization for non-dropshipping products

if (!product.supplierId) {
  // Not a dropshipping product, bypass authorization
  return true;
}

// Dropshipping product, check authorization
return await authorizationGateService.isSellerApprovedForProduct(sellerId, productId);
```

---

## Success Criteria

- [ ] Cart integration: Blocks unapproved products
- [ ] Order integration: Validates all items before creation
- [ ] Settlement integration: Authorization metadata captured
- [ ] Product listing: Shows authorization status
- [ ] Admin dashboard: Seller role management functional
- [ ] Notifications: All emails sent correctly
- [ ] Backward compatibility: Non-dropshipping products unaffected

---

**Version**: 1.0.0
**Created**: 2025-01-07
**Status**: Integration Specification (Implementation Pending)
