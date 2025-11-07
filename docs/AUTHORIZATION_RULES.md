# Seller Authorization Rules & System Design
**Phase 9 - Seller Authorization System**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document defines the seller authorization system for the O4O dropshipping platform. It establishes the approval process for sellers to access and sell supplier products, including authorization limits, approval workflows, and access control rules.

---

## System Purpose

### Business Goals

1. **Quality Control**: Suppliers can vet sellers before granting product access
2. **Relationship Management**: Formalize supplier-seller partnerships
3. **Scalability Limits**: Prevent suppliers from being overwhelmed (10 seller limit per product)
4. **Commission Enforcement**: Ensure approved sellers use correct commission policies (Phase 8 integration)
5. **Audit Trail**: Track all authorization requests, approvals, and rejections

### User Stories

**As a Supplier**:
- I want to approve/reject seller requests to sell my products
- I want to limit the number of sellers per product (max 10)
- I want to see which sellers are actively selling my products
- I want to revoke seller access if needed

**As a Seller (Partner)**:
- I want to request access to supplier products
- I want to see my authorization status (pending/approved/rejected)
- I want to know why my request was rejected
- I want to be notified when my request is approved

**As Admin**:
- I want to monitor authorization requests across the platform
- I want to intervene in authorization disputes
- I want to see authorization analytics

---

## Authorization States

### State Diagram

```
                    ┌─────────────┐
                    │   PENDING   │
                    │  (Initial)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         (Approve)                  (Reject)
              │                         │
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │   APPROVED   │          │   REJECTED   │
      │   (Active)   │          │   (Final)    │
      └──────┬───────┘          └──────────────┘
             │
        (Revoke)
             │
             ▼
      ┌──────────────┐
      │   REVOKED    │
      │   (Final)    │
      └──────────────┘
```

### State Definitions

| State | Description | Seller Can Sell | Supplier Can Modify | Reversible |
|-------|-------------|-----------------|---------------------|------------|
| **PENDING** | Request submitted, awaiting supplier review | ❌ No | ✅ Yes (approve/reject) | - |
| **APPROVED** | Supplier approved seller access | ✅ Yes | ✅ Yes (revoke only) | ❌ No (revoke is final) |
| **REJECTED** | Supplier rejected seller request | ❌ No | ❌ No | ❌ No |
| **REVOKED** | Supplier revoked previously approved access | ❌ No | ❌ No | ❌ No |

---

## Authorization Rules

### Rule 1: Approval Required

**Rule**: Sellers MUST be approved by supplier before accessing product details or selling.

**Applies To**:
- Product pricing (wholesale price)
- Product inventory (stock levels)
- Product images (high-resolution)
- Product descriptions (detailed specs)
- Order placement (checkout flow)

**Exceptions**:
- Public product catalog (basic info only: name, category, thumbnail)
- Product search and filtering (limited metadata)

**Enforcement**:
- API endpoint authorization checks
- UI element visibility (conditional rendering)
- Database query filters (WHERE seller_authorizations.status = 'APPROVED')

---

### Rule 2: Supplier Limit (10 Sellers per Product)

**Rule**: Each product can have a maximum of 10 APPROVED sellers.

**Rationale**:
- Prevents supplier overload
- Maintains product exclusivity
- Ensures manageable fulfillment volume

**Enforcement**:
- Count APPROVED authorizations before approving new request
- If count ≥ 10, auto-reject with reason: "Seller limit reached"
- Admin can override limit (manual intervention)

**Future Enhancement**: Tier-based limits (Bronze: 5, Silver: 10, Gold: 20)

---

### Rule 3: One Request per Seller per Product

**Rule**: Seller can only have ONE active authorization record per product.

**States**:
- If PENDING → cannot submit another request (wait for approval/rejection)
- If REJECTED → can submit new request after 30 days (cooling-off period)
- If APPROVED → no new request needed
- If REVOKED → cannot re-request (permanent ban per product)

**Enforcement**:
- Database unique constraint: `UNIQUE(sellerId, productId) WHERE status IN ('PENDING', 'APPROVED')`
- API validation before creating new request

---

### Rule 4: Automatic Approval (Optional, Future)

**Rule**: Suppliers can enable "Auto-Approve" for trusted sellers or all sellers.

**Modes**:
- **Manual**: All requests require supplier review (default)
- **Auto-Approve Trusted**: Auto-approve sellers in whitelist
- **Auto-Approve All**: Approve all requests instantly (until limit reached)

**Phase 9**: Manual mode only
**Phase 10**: Auto-approve feature

---

### Rule 5: Policy Inheritance

**Rule**: Approved sellers inherit supplier's commission policy (Phase 8).

**Integration with Phase 8**:
- When seller is APPROVED → policy resolution includes this seller
- Policy resolution order: Product Override → **Seller Authorization** → Supplier → Tier → Default
- If seller not approved → policy resolution skips product (403 Forbidden)

**Example**:
```typescript
// Policy resolution with authorization check
async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
  // Check seller authorization first
  const isAuthorized = await checkSellerAuthorization(context.sellerId, context.productId);
  if (!isAuthorized) {
    throw new ForbiddenException('Seller not authorized for this product');
  }

  // Continue with policy resolution (Phase 8)
  // ...
}
```

---

## Authorization Workflow

### Workflow 1: Seller Requests Access

**Trigger**: Seller clicks "Request Access" on product page

**Steps**:
1. Seller submits authorization request with optional message
2. System creates `SellerAuthorization` record (status: PENDING)
3. System checks seller limit (< 10 approved sellers)
   - If limit reached → auto-reject with reason
   - If limit OK → proceed
4. System notifies supplier (email + in-app notification)
5. Seller receives confirmation: "Request submitted"

**API**: `POST /api/v1/ds/products/:productId/authorization-request`

---

### Workflow 2: Supplier Reviews Request

**Trigger**: Supplier views "Pending Requests" list in dashboard

**Steps**:
1. Supplier reviews seller profile:
   - Seller name, tier, rating
   - Past sales volume
   - Past disputes/issues
2. Supplier reads seller's request message (optional)
3. Supplier decides: Approve / Reject (with reason)

**API**:
- `POST /api/supplier/authorization-requests/:requestId/approve`
- `POST /api/supplier/authorization-requests/:requestId/reject`

---

### Workflow 3: Approval Granted

**Trigger**: Supplier clicks "Approve"

**Steps**:
1. System updates `SellerAuthorization.status = 'APPROVED'`
2. System records `approvedAt` timestamp and `approvedBy` (supplier ID)
3. System notifies seller (email + in-app notification)
4. Seller gains access to:
   - Product wholesale price
   - Product inventory
   - Product images (full resolution)
   - Order placement flow
5. Seller's dashboard shows product in "My Products" list

**Side Effects**:
- Policy resolution now includes this seller
- Commission calculations use supplier policy
- Analytics track this seller-supplier relationship

---

### Workflow 4: Rejection

**Trigger**: Supplier clicks "Reject" with reason

**Steps**:
1. System updates `SellerAuthorization.status = 'REJECTED'`
2. System records `rejectedAt`, `rejectedBy`, `rejectionReason`
3. System notifies seller with reason
4. Seller cannot re-request for 30 days (cooling-off period)

**Rejection Reasons** (predefined + custom):
- "Product capacity reached" (auto-rejection)
- "Seller does not meet requirements"
- "Supplier policy restrictions"
- "Previous fulfillment issues"
- "Custom reason..." (free text)

---

### Workflow 5: Revocation

**Trigger**: Supplier clicks "Revoke Access" on approved seller

**Use Cases**:
- Seller violates terms
- Seller quality issues
- Supplier wants to reduce active sellers
- Contractual disputes

**Steps**:
1. System updates `SellerAuthorization.status = 'REVOKED'`
2. System records `revokedAt`, `revokedBy`, `revocationReason`
3. System notifies seller
4. Seller loses access immediately:
   - Cannot place new orders
   - Existing orders honored (fulfillment continues)
   - Product removed from "My Products"
5. Seller cannot re-request (permanent ban for this product)

**Revocation Reasons**:
- "Terms violation"
- "Quality issues"
- "Fulfillment problems"
- "Supplier decision"
- "Custom reason..." (free text)

---

## Access Control Rules

### Product Access Levels

| Feature | Public | Pending Seller | Approved Seller | Supplier |
|---------|--------|----------------|-----------------|----------|
| **Basic Info** (name, category, thumbnail) | ✅ | ✅ | ✅ | ✅ |
| **Detailed Description** | ❌ | ❌ | ✅ | ✅ |
| **Wholesale Price** | ❌ | ❌ | ✅ | ✅ |
| **Inventory Stock** | ❌ | ❌ | ✅ | ✅ |
| **High-Res Images** | ❌ | ❌ | ✅ | ✅ |
| **Place Order** | ❌ | ❌ | ✅ | ✅ |
| **Edit Product** | ❌ | ❌ | ❌ | ✅ |
| **Approve Sellers** | ❌ | ❌ | ❌ | ✅ |

---

### API Authorization Matrix

| Endpoint | Public | Seller (Pending) | Seller (Approved) | Supplier | Admin |
|----------|--------|------------------|-------------------|----------|-------|
| `GET /api/v1/ds/products` (list) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/v1/ds/products/:id` (details) | ❌ | ❌ | ✅ | ✅ | ✅ |
| `POST /api/v1/ds/products/:id/authorization-request` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/v1/ds/orders` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `GET /api/supplier/authorization-requests` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /api/supplier/authorization-requests/:id/approve` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /api/supplier/authorization-requests/:id/reject` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /api/supplier/authorizations/:id/revoke` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Notification Rules

### Notification Events

| Event | Recipient | Channel | Content |
|-------|-----------|---------|---------|
| **Request Submitted** | Seller | Email + In-app | "Your request for [Product] has been submitted" |
| **Request Submitted** | Supplier | Email + In-app | "New seller request from [Seller] for [Product]" |
| **Request Approved** | Seller | Email + In-app | "Your request for [Product] has been approved" |
| **Request Rejected** | Seller | Email + In-app | "Your request for [Product] was rejected: [Reason]" |
| **Access Revoked** | Seller | Email + In-app | "Your access to [Product] has been revoked: [Reason]" |
| **Limit Reached** | Supplier | In-app | "Product [Product] has reached seller limit (10)" |

---

### Notification Templates

**Seller - Request Approved**:
```
Subject: ✅ Your request to sell [Product Name] has been approved!

Hi [Seller Name],

Great news! [Supplier Name] has approved your request to sell their product:

📦 Product: [Product Name]
💰 Your Commission: [Rate]% (based on supplier policy)
📊 Inventory Available: [Stock] units

You can now:
- View full product details
- Access wholesale pricing
- Place orders for your customers

Start selling: [Link to Product Page]

Best regards,
O4O Platform
```

**Supplier - New Request**:
```
Subject: 🔔 New seller request for [Product Name]

Hi [Supplier Name],

[Seller Name] has requested access to sell your product:

📦 Product: [Product Name]
👤 Seller: [Seller Name] (Tier: [Bronze/Silver/Gold])
📈 Seller Stats:
   - Total Sales: [Amount]
   - Success Rate: [Rate]%
   - Rating: [Rating]/5

Message from seller:
"[Optional message from seller]"

Review Request: [Link to Dashboard]

Current Status: [X]/10 sellers approved for this product

Best regards,
O4O Platform
```

---

## Edge Cases & Handling

### Edge Case 1: Concurrent Approval at Limit

**Scenario**: Two suppliers approve different sellers simultaneously when at 9/10 limit

**Handling**:
- Database transaction with row-level lock
- Count APPROVED sellers within transaction
- First approval succeeds (10/10)
- Second approval auto-rejects with "Seller limit reached"

**Implementation**:
```typescript
async approveSeller(requestId: string) {
  return this.db.transaction(async (tx) => {
    // Lock product row
    const product = await tx.products.findOne({
      where: { id: productId },
      lock: 'FOR UPDATE'
    });

    // Count approved sellers
    const approvedCount = await tx.sellerAuthorizations.count({
      where: {
        productId,
        status: 'APPROVED'
      }
    });

    if (approvedCount >= 10) {
      throw new BadRequestException('Seller limit reached');
    }

    // Approve
    await tx.sellerAuthorizations.update({
      where: { id: requestId },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });
  });
}
```

---

### Edge Case 2: Seller Requests Access Then Deletes Account

**Scenario**: Seller submits request, then deletes account before supplier reviews

**Handling**:
- Soft delete seller account (status: 'deleted')
- Authorization requests remain (status: 'PENDING')
- Supplier sees greyed-out request with "[Seller Deleted]" label
- Supplier can manually reject to clean up

**Alternative**: Auto-reject pending requests on seller account deletion

---

### Edge Case 3: Product Deleted While Authorizations Exist

**Scenario**: Supplier deletes product with active seller authorizations

**Handling**:
- Soft delete product (status: 'deleted')
- Authorizations remain (historical record)
- Sellers lose access immediately
- Orders in progress honored (fulfillment continues)
- Future orders blocked (403 Forbidden)

---

### Edge Case 4: Supplier Changes Product Commission Policy

**Scenario**: Supplier updates commission rate after sellers approved

**Handling**:
- New commission rate applies to all approved sellers (Phase 8)
- Existing orders use policy snapshot (immutable)
- Sellers notified of commission change
- No re-approval needed

---

### Edge Case 5: Seller Reaches Cooling-Off Period

**Scenario**: Seller rejected 30 days ago, wants to re-request

**Handling**:
- Check `rejectedAt` timestamp
- If `NOW() - rejectedAt > 30 days` → allow new request
- If `NOW() - rejectedAt <= 30 days` → block with error: "Please wait [X] days before reapplying"
- Reset cooling-off period on new rejection

---

## Monitoring & Metrics

### Key Metrics

**1. Authorization Request Volume**:
```promql
sum(rate(o4o_authorization_requests_total[5m])) by (status)
```

**2. Approval Rate**:
```promql
sum(rate(o4o_authorization_requests_total{status="approved"}[5m]))
/ sum(rate(o4o_authorization_requests_total[5m]))
* 100
```

**3. Average Review Time**:
```promql
histogram_quantile(0.95, sum by (le) (
  rate(o4o_authorization_review_duration_seconds_bucket[5m])
))
```

**4. Seller Limit Utilization**:
```promql
avg(o4o_product_seller_count / 10) * 100
```

**5. Revocation Rate**:
```promql
sum(rate(o4o_authorization_revocations_total[1d]))
/ sum(o4o_authorization_approved_total)
* 100
```

---

### Structured Logs

**Log Event: Authorization Request Created**:
```json
{
  "event": "authorization_request_created",
  "level": "info",
  "timestamp": "2025-11-07T12:00:00Z",
  "data": {
    "requestId": "auth_req_abc123",
    "sellerId": "seller_xyz789",
    "productId": "prod_def456",
    "supplierId": "sup_ghi012",
    "message": "Interested in selling your premium widgets",
    "currentSellerCount": 7
  }
}
```

**Log Event: Authorization Approved**:
```json
{
  "event": "authorization_approved",
  "level": "info",
  "timestamp": "2025-11-07T12:30:00Z",
  "data": {
    "requestId": "auth_req_abc123",
    "sellerId": "seller_xyz789",
    "productId": "prod_def456",
    "supplierId": "sup_ghi012",
    "approvedBy": "sup_ghi012",
    "reviewDurationSeconds": 1800,
    "currentSellerCount": 8
  }
}
```

**Log Event: Authorization Rejected**:
```json
{
  "event": "authorization_rejected",
  "level": "info",
  "timestamp": "2025-11-07T12:45:00Z",
  "data": {
    "requestId": "auth_req_def456",
    "sellerId": "seller_abc123",
    "productId": "prod_ghi789",
    "supplierId": "sup_jkl012",
    "rejectedBy": "sup_jkl012",
    "reason": "Seller does not meet requirements",
    "reviewDurationSeconds": 900
  }
}
```

---

## Feature Flag Control

### Environment Variable

```bash
# .env
ENABLE_SELLER_AUTHORIZATION=false          # Default: disabled
SELLER_AUTHORIZATION_LIMIT=10              # Max sellers per product
SELLER_REAPPLY_COOLOFF_DAYS=30            # Days before re-applying after rejection
```

### Behavior When Disabled

**Feature Flag OFF** (`ENABLE_SELLER_AUTHORIZATION=false`):
- All sellers can access all products (legacy behavior)
- No authorization checks performed
- Authorization UI hidden
- Database schema exists but unused
- Migration safe (nullable columns)

**Feature Flag ON** (`ENABLE_SELLER_AUTHORIZATION=true`):
- Authorization checks enforced
- Sellers must request access
- Suppliers see authorization dashboard
- Metrics collected

---

## Security Considerations

### Authorization Bypass Prevention

**Risk**: Malicious seller bypasses UI and directly calls order API

**Mitigation**:
- Server-side authorization check on ALL API endpoints
- Database-level foreign key constraint (seller_authorizations)
- API middleware: `checkSellerAuthorization(sellerId, productId)`
- Rate limiting on authorization requests (max 10 requests/day per seller)

**Example Middleware**:
```typescript
async function checkSellerAuthorization(req, res, next) {
  const { sellerId, productId } = req.body;

  const auth = await sellerAuthorizationRepo.findOne({
    where: {
      sellerId,
      productId,
      status: 'APPROVED'
    }
  });

  if (!auth) {
    throw new ForbiddenException('Seller not authorized for this product');
  }

  next();
}
```

---

### Information Disclosure Prevention

**Risk**: Unapproved seller views pricing via API inspection

**Mitigation**:
- API responses filtered by authorization status
- Pricing fields omitted for unapproved sellers
- GraphQL field-level authorization
- Database views with authorization filters

**Example**:
```typescript
// GET /api/v1/ds/products/:id
async getProduct(productId: string, sellerId: string) {
  const product = await productRepo.findOne({ id: productId });

  const isAuthorized = await checkAuthorization(sellerId, productId);

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    thumbnail: product.thumbnail,
    // Conditionally include sensitive fields
    ...(isAuthorized && {
      wholesalePrice: product.wholesalePrice,
      inventory: product.inventory,
      highResImages: product.images
    })
  };
}
```

---

## Implementation Checklist

- [ ] Create `SellerAuthorization` entity
- [ ] Add authorization status enum (PENDING, APPROVED, REJECTED, REVOKED)
- [ ] Create authorization request API endpoints
- [ ] Create supplier review API endpoints
- [ ] Add authorization middleware to protected endpoints
- [ ] Implement seller limit validation (max 10)
- [ ] Implement cooling-off period validation (30 days)
- [ ] Add email notification service
- [ ] Add in-app notification service
- [ ] Create supplier authorization dashboard UI
- [ ] Create seller request flow UI
- [ ] Add structured logging
- [ ] Add Prometheus metrics
- [ ] Write unit tests (8 scenarios)
- [ ] Write integration tests
- [ ] Document API contracts

---

## Version History

- **1.0** (2025-11-07): Initial authorization rules for Phase 9

---

*Generated with [Claude Code](https://claude.com/claude-code)*
