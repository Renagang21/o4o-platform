# Phase 9: Seller Authorization System - Implementation Changelog

## Overview

Phase 9 introduces a **dual-approval authorization system** for the dropshipping platform, managing:

1. **Platform-level qualification**: Admin approval for users to become sellers (role-based)
2. **Product-level access rights**: Supplier approval for sellers to access specific products

This system integrates with Phase 8's policy engine and settlement framework to ensure only authorized sellers can transact with supplier products.

---

## System Architecture

### Dual-Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  USER JOURNEY                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Platform Qualification                            │
│  ┌─────────┐    request    ┌──────────┐   approve  ┌────┐ │
│  │  User   │──────────────>│  Admin   │───────────>│Role│ │
│  └─────────┘               └──────────┘            └────┘ │
│       │                                               │    │
│       │                                               v    │
│       │                                        "seller" role│
│       │                                                     │
│  Step 2: Product Access (Per-Product)                      │
│  ┌─────────┐   request     ┌──────────┐  approve  ┌─────┐ │
│  │ Seller  │──────────────>│ Supplier │──────────>│Auth │ │
│  └─────────┘               └──────────┘           └─────┘ │
│                                  │                    │    │
│                                  │ reject             │    │
│                                  v                    v    │
│                           30-day cooldown      Can transact│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Zero-Data Safety**: All migrations are nullable, no data seeding
2. **Feature Flag Gated**: Default OFF, shadow mode testing required
3. **Performance First**: Authorization gates must complete in <5ms (P95)
4. **Audit Trail**: Every state change logged with reason and actor
5. **Graceful Degradation**: If gate check fails, deny access (fail-closed)

---

## Integration with Phase 8 Policy Engine

### Policy Validation Points

| Stage | Check | Phase 8 Policy Reference |
|-------|-------|-------------------------|
| **Cart Add** | `isSellerApprovedForProduct()` | N/A (new gate) |
| **Order Creation** | Bulk authorization check | Integrates with `OrderValidationPolicy` |
| **Commission Calc** | Authorization snapshot | `CommissionPolicy.calculate()` |
| **Settlement** | Authorization metadata | `SettlementPolicy.validate()` |

### Metadata Snapshot (Phase 8 Integration)

When calculating commissions, authorization metadata is captured:

```typescript
{
  commissions: {
    metadata: {
      authorizationId: "uuid",
      approvedAt: "2025-01-07T10:00:00Z",
      supplierId: "uuid",
      authorizedBy: "supplier-admin-id"
    }
  }
}
```

This ensures audit trails and prevents retroactive authorization changes from affecting settled transactions.

---

## API Contract

### 7 Seller/Supplier Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/v1/ds/seller/authorizations` | GET | Seller | List my authorization requests/approvals |
| `/api/v1/ds/seller/products/:productId/request` | POST | Seller | Request access to supplier product |
| `/api/v1/ds/seller/products/:productId/cancel` | POST | Seller | Cancel pending request |
| `/api/v1/ds/supplier/authorizations/inbox` | GET | Supplier | View pending authorization requests |
| `/api/v1/ds/supplier/authorizations/:id/approve` | POST | Supplier | Approve seller access |
| `/api/v1/ds/supplier/authorizations/:id/reject` | POST | Supplier | Reject with 30-day cooldown |
| `/api/v1/ds/supplier/authorizations/:id/revoke` | POST | Supplier | Permanent revocation |

### 2 Admin Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/admin/dropshipping/sellers/:userId/approve-role` | POST | Admin | Grant seller qualification (role) |
| `/api/admin/dropshipping/sellers/:userId/revoke-role` | POST | Admin | Revoke seller qualification |

---

## Business Rules

### 1. Product Access Limits

- **Default Limit**: 10 products per seller (configurable via `SELLER_PRODUCT_LIMIT`)
- **Enforcement**: At request time, count approved authorizations
- **Metric**: `seller_auth_limit_rejections_total` (Counter)

### 2. Cooldown Period

- **Trigger**: Supplier rejects request
- **Duration**: 30 days (configurable via `SELLER_REJECT_COOLDOWN_DAYS`)
- **Calculation**: `cooldownUntil = rejectedAt + 30 days`
- **Enforcement**: Block re-request if `now < cooldownUntil`
- **Metric**: `seller_auth_cooldown_blocks_total` (Counter)

### 3. Permanent Revocation

- **Trigger**: Supplier revokes authorization (after approval)
- **Effect**: Seller can NEVER re-request (status = REVOKED)
- **Use Case**: Fraud, contract violation, quality issues
- **Enforcement**: Database constraint prevents duplicate requests

### 4. Authorization Gates

| Gate | Location | Performance Requirement |
|------|----------|------------------------|
| Cart Add | `CartController.addItem()` | P95 < 5ms |
| Order Create | `OrderService.createOrder()` | P95 < 10ms (bulk check) |
| Settlement | `SettlementService.calculate()` | P95 < 5ms |

**Caching Strategy**:
- Cache key: `seller_auth:{sellerId}:{productId}`
- TTL: 60 seconds
- Invalidation: On status change (approve/reject/revoke)

---

## Authorization State Machine

```
┌────────────┐
│  REQUESTED │ ──┐
└────────────┘   │
       │         │
       │ approve │ cancel
       v         v
┌────────────┐  ┌──────────┐
│  APPROVED  │  │ CANCELLED│
└────────────┘  └──────────┘
       │
       │ revoke
       v
┌────────────┐  ┌──────────┐
│  REVOKED   │<─│ REJECTED │
└────────────┘  └──────────┘
   (permanent)  (30-day cooldown)
```

### State Transitions

| From | To | Actor | Constraint |
|------|-----|-------|-----------|
| - | REQUESTED | Seller | Product limit, no active auth |
| REQUESTED | APPROVED | Supplier | - |
| REQUESTED | REJECTED | Supplier | Reason required, sets cooldown |
| REQUESTED | CANCELLED | Seller | Before approval |
| APPROVED | REVOKED | Supplier | Reason required, permanent |
| REJECTED | REQUESTED | Seller | After cooldown expires |

---

## Feature Flags

### Environment Variables

```bash
# Feature toggle (default: false)
ENABLE_SELLER_AUTHORIZATION=false

# Business rules (defaults shown)
SELLER_PRODUCT_LIMIT=10
SELLER_REJECT_COOLDOWN_DAYS=30
```

### Feature Flag Methods (Added to `featureFlags.ts`)

```typescript
static isSellerAuthorizationEnabled(): boolean {
  return process.env.ENABLE_SELLER_AUTHORIZATION === 'true';
}

static getSellerProductLimit(): number {
  return parseInt(process.env.SELLER_PRODUCT_LIMIT || '10', 10);
}

static getSellerRejectCooldownDays(): number {
  return parseInt(process.env.SELLER_REJECT_COOLDOWN_DAYS || '30', 10);
}
```

---

## Rollout Plan (Summary)

| Phase | Duration | Flag Value | Products % | Monitoring |
|-------|----------|------------|-----------|------------|
| **Phase 0** | 3-5 days | OFF | 0% (shadow) | Log-only mode |
| **Phase 1** | 7 days | ON | 10% | Canary (whitelist) |
| **Phase 2** | 7 days | ON | 50% | Half products |
| **Phase 3** | - | ON | 100% | Full rollout |

**Rollback Trigger**: Gate latency P95 > 10ms, error rate > 1%

See `phase9_rollout_plan.md` for detailed steps.

---

## Risk Mitigation

### 1. Performance Degradation

**Risk**: Authorization gate slows cart/order flow
**Mitigation**:
- Redis caching (60s TTL)
- Database indexes on (productId, sellerId, status)
- Prometheus alerting on P95 latency

### 2. Authorization Bypass

**Risk**: Logic bug allows unapproved sellers to order
**Mitigation**:
- Fail-closed design (deny on error)
- Integration tests covering all gate points
- Audit logs for all authorization checks

### 3. Supplier Inbox Overload

**Risk**: Too many requests, suppliers miss important ones
**Mitigation**:
- Email notifications for new requests
- Metric: `seller_auth_inbox_size{supplierId}` (Gauge)
- Admin dashboard for pending requests

### 4. Data Inconsistency

**Risk**: Authorization state out of sync with orders
**Mitigation**:
- Metadata snapshot in commissions (Phase 8)
- UNIQUE constraint on (sellerId, productId)
- Transactional authorization checks

---

## Metrics & Monitoring

### Prometheus Metrics (5 Types)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `seller_auth_requests_total` | Counter | action, result | Request/cancel/approve/reject counts |
| `seller_auth_inbox_size` | Gauge | supplierId | Pending requests per supplier |
| `seller_auth_limit_rejections_total` | Counter | - | Product limit violations |
| `seller_auth_cooldown_blocks_total` | Counter | - | Re-requests blocked by cooldown |
| `seller_auth_gate_denies_total` | Counter | stage | Cart/order denials by stage |

### Structured Logging Keys

```json
{
  "authId": "uuid",
  "sellerId": "uuid",
  "supplierId": "uuid",
  "productId": "uuid",
  "statusFrom": "REQUESTED",
  "statusTo": "APPROVED",
  "reason": "string",
  "limitUsed": 8,
  "limitCap": 10,
  "cooldownUntil": "2025-02-06T10:00:00Z"
}
```

---

## Database Schema (Summary)

**Table**: `seller_authorizations`

**Key Columns**:
- `id` (PK, UUID)
- `sellerId` (FK → sellers, UUID)
- `productId` (FK → products, UUID)
- `supplierId` (FK → suppliers, UUID)
- `status` (ENUM: REQUESTED, APPROVED, REJECTED, REVOKED)
- `cooldownUntil` (TIMESTAMP, nullable)
- `metadata` (JSONB, nullable)

**Indexes**:
- UNIQUE (sellerId, productId)
- (productId, status)
- (sellerId, status)
- (supplierId, status)

**Zero-Data Constraint**: All columns nullable except PK

See migration file for full DDL.

---

## Testing Strategy (Summary)

- **10 Unit Tests**: Limit, cooldown, revoke, status transitions, etc.
- **6 Integration Tests**: Cart/order gates, cooldown re-request, etc.
- **Performance Tests**: Gate check P95 < 5ms target

See `phase9_test_report.md` for detailed scenarios.

---

## Integration Points (Summary)

| System | Integration Method | Document |
|--------|-------------------|----------|
| Cart | `AuthorizationGateService.isSellerApprovedForProduct()` | PHASE9_INTEGRATION_POINTS.md |
| Order | Bulk authorization check before creation | PHASE9_INTEGRATION_POINTS.md |
| Settlement | Metadata snapshot in commissions | Phase 8 docs |
| Product Listing | Filter by authorization status | PHASE9_INTEGRATION_POINTS.md |

---

## Key Decisions

1. **Product-level authorization** (not supplier-level): Allows granular control
2. **30-day cooldown** (configurable): Balances seller opportunity vs. supplier protection
3. **Permanent revocation**: Enforces contract compliance
4. **Redis caching**: Performance over strict consistency (60s staleness acceptable)
5. **Fail-closed gates**: Security over availability

---

## Dependencies

- **Phase 8**: Policy engine, commission metadata
- **Existing entities**: Seller, Supplier, Product, User
- **Infrastructure**: Redis (caching), Prometheus (metrics)

---

## Success Criteria

- [ ] All API stubs return 501 Not Implemented
- [ ] Migration DDL designed (Zero-Data safe)
- [ ] Feature flags added (default OFF)
- [ ] 5 Prometheus metrics specified
- [ ] Test scenarios documented (16 tests)
- [ ] Integration points documented
- [ ] Build passes with no behavior changes

---

**Version**: 1.0.0
**Created**: 2025-01-07
**Status**: Specification Phase (Implementation Pending)
