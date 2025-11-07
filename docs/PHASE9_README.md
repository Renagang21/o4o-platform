# Phase 9: Seller Authorization System

**Status**: ✅ Implementation Complete
**Version**: 1.0
**Last Updated**: 2025-01-07

---

## Overview

Phase 9 implements a **dual-approval authorization system** for the O4O dropshipping platform, ensuring sellers have both:
1. **Platform-level qualification** (seller role)
2. **Supplier-level product authorization** (explicit approval)

This system enforces business rules including a 10-product limit, 30-day cooldown periods, and permanent revocation capabilities.

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Authorization System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │  Authorization   │◄───────┤  Seller Service  │          │
│  │  Gate Service    │        │                  │          │
│  │  (Caching)       │        └──────────────────┘          │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           │ Check Authorization                             │
│           ▼                                                  │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │   Redis Cache    │        │   PostgreSQL DB  │          │
│  │   (30s TTL)      │        │   (Source of     │          │
│  │                  │        │    Truth)        │          │
│  └──────────────────┘        └──────────────────┘          │
│                                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │        Prometheus Metrics                     │          │
│  │  - Request counters                           │          │
│  │  - Gate latency (P95/P99)                    │          │
│  │  - Cache hit rate                             │          │
│  │  - Business rule enforcement                  │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Key Services

1. **AuthorizationGateService** (`apps/api-server/src/services/AuthorizationGateService.ts`)
   - High-performance authorization checking
   - Redis caching with 30s TTL
   - Fail-open when feature disabled, fail-closed on errors
   - Target: P95 <5ms (cache hit), P95 <15ms (cache miss)

2. **SellerAuthorizationService** (`apps/api-server/src/services/SellerAuthorizationService.ts`)
   - Business logic for authorization workflow
   - Request, approve, reject, revoke, cancel operations
   - Enforces 10-product limit and 30-day cooldown
   - Audit trail creation

3. **AuthorizationMetricsService** (`apps/api-server/src/services/authorization-metrics.service.ts`)
   - Prometheus metrics collection
   - 7 core metrics for monitoring system health

---

## Database Schema

### SellerAuthorization Entity

```typescript
{
  id: string (UUID)
  sellerId: string (FK → User)
  productId: string (FK → Product)
  supplierId: string (FK → Supplier)
  status: REQUESTED | APPROVED | REJECTED | REVOKED | CANCELLED

  // Timestamps
  requestedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  revokedAt?: Date
  cancelledAt?: Date

  // Business logic
  cooldownUntil?: Date (30 days from rejection)
  expiresAt?: Date (optional expiration)

  // Reasons
  rejectionReason?: string
  revocationReason?: string

  // Actors
  approvedBy?: string
  rejectedBy?: string
  revokedBy?: string

  // Metadata
  metadata?: JSON
}
```

### SellerAuthorizationAuditLog Entity

```typescript
{
  id: string (UUID)
  authorizationId: string (FK → SellerAuthorization)
  action: REQUEST | APPROVE | REJECT | REVOKE | CANCEL
  actorId: string
  actorType: seller | supplier | admin | system
  previousStatus?: string
  newStatus?: string
  reason?: string
  metadata?: JSON
  createdAt: Date
}
```

---

## API Endpoints

### Seller Self-Service (7 endpoints)

```
GET    /api/v1/ds/seller/authorizations          # List authorizations
POST   /api/v1/ds/seller/products/:id/request    # Request authorization
DELETE /api/v1/ds/seller/authorizations/:id      # Cancel request
GET    /api/v1/ds/seller/authorizations/:id      # Get details
GET    /api/v1/ds/seller/limits                  # Get limits/cooldowns
GET    /api/v1/ds/seller/gate/:productId         # Check gate status
GET    /api/v1/ds/seller/audit                   # Get audit logs
```

### Supplier Inbox (5 endpoints)

```
GET    /api/v1/ds/supplier/authorizations/inbox     # View pending requests
POST   /api/v1/ds/supplier/authorizations/:id/approve  # Approve request
POST   /api/v1/ds/supplier/authorizations/:id/reject   # Reject with cooldown
POST   /api/v1/ds/supplier/authorizations/:id/revoke   # Permanent revocation
GET    /api/v1/ds/supplier/authorizations/:id          # Get details
```

### Admin Console

```
GET    /api/v1/ds/admin/authorizations              # View all authorizations
POST   /api/v1/ds/admin/authorizations/:id/revoke   # Admin revocation
GET    /api/v1/ds/admin/authorizations/:id/audit    # View audit log
```

---

## Business Rules

### 1. Product Limit (10 products per seller)

- Sellers can have maximum 10 APPROVED products simultaneously
- Enforced at both request and approval time
- Configurable via `SELLER_AUTHORIZATION_LIMIT` (default: 10)

### 2. Cooldown Period (30 days after rejection)

- After rejection, seller cannot re-request the same product for 30 days
- Cooldown calculated from rejection timestamp
- Configurable via `SELLER_AUTHORIZATION_COOLDOWN_DAYS` (default: 30)

### 3. Permanent Revocation

- Revoked authorizations cannot be re-requested (permanent block)
- Only available to suppliers and admins
- Requires reason (minimum 10 characters)

### 4. Self-Seller Bypass

- When `supplierId === seller.user.supplierId`, authorization auto-passes
- Sellers can always sell their own products (no approval needed)

---

## Feature Flag Configuration

### Environment Variables

```bash
# Feature flag (default: false, fail-open)
ENABLE_SELLER_AUTHORIZATION=true

# Business rules
SELLER_AUTHORIZATION_LIMIT=10
SELLER_AUTHORIZATION_COOLDOWN_DAYS=30

# Cache settings
CACHE_TTL=30  # seconds

# Rollout control
SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE=100
SELLER_AUTHORIZATION_WHITELIST=seller-alice,seller-bob
```

---

## UI Components

### 1. Partner Dashboard (`apps/admin-dashboard/src/pages/dropshipping/SellerAuthorizations.tsx`)

**Features**:
- View authorization status for all products
- Request new product authorizations
- Cancel pending requests
- Check gate status and cooldowns
- View authorization limits (current/max/remaining)

**Screenshot**: [Partner Dashboard View]

### 2. Supplier Inbox (`apps/admin-dashboard/src/pages/dropshipping/SupplierAuthorizationInbox.tsx`)

**Features**:
- View pending authorization requests by product
- Approve/reject requests with reason tracking
- View remaining slots for each seller (prevent >10 approvals)
- Filter by product and status

**Screenshot**: [Supplier Inbox View]

### 3. Admin Console (`apps/admin-dashboard/src/pages/dropshipping/AdminAuthorizationConsole.tsx`)

**Features**:
- View all authorizations across sellers/suppliers
- Advanced filtering (seller, supplier, product, status)
- Permanent revocation capability
- Audit log viewer with full history
- Metrics dashboard link

**Screenshot**: [Admin Console View]

---

## Monitoring & Alerting

### Prometheus Metrics (7 total)

1. **seller_auth_requests_total** (Counter)
   - Labels: `action`, `result`
   - Actions: request, approve, reject, revoke, cancel

2. **seller_auth_inbox_size** (Gauge)
   - Labels: `supplierId`
   - Pending requests per supplier

3. **seller_auth_limit_rejections_total** (Counter)
   - Requests rejected due to 10-product limit

4. **seller_auth_cooldown_blocks_total** (Counter)
   - Re-requests blocked due to cooldown

5. **seller_auth_gate_denies_total** (Counter)
   - Labels: `stage` (cart, order, settlement)
   - Denials at authorization gates

6. **seller_auth_gate_duration_seconds** (Histogram)
   - Labels: `cache_hit`
   - Buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]

7. **seller_auth_cache_hit_rate** (Gauge)
   - Cache hit rate (0-1)

### Grafana Dashboard

**Location**: `monitoring/grafana/phase9-authorization-dashboard.json`

**Panels**:
1. Request Volume by Action (line graph)
2. Error Rate (line graph with alerts)
3. Gate Latency P95/P99 (line graph)
4. Cache Hit Rate (gauge, threshold: 70%)
5. Gate Denies by Stage (line graph)
6. Business Rules - Limit Rejections (line graph)
7. Business Rules - Cooldown Blocks (line graph)
8. Supplier Inbox Size (heatmap)
9. Total Pending Requests (stat)

### Alert Rules

**Location**: `monitoring/prometheus/phase9-alerts.yml`

**Critical Alerts** (page on-call):
- High authorization error rate (>0.001 req/s for 10m)
- High gate deny rate (>50/min for 5m)
- Authorization service down (metrics unavailable for 2m)

**Warning Alerts** (Slack notification):
- Slow gate performance (P95 >15ms for 15m)
- Low cache hit rate (<70% for 30m)
- High supplier inbox size (>100 for 1h)
- High limit rejection rate (>10/hour for 1h)
- High cooldown block rate (>5/hour for 1h)
- Unbalanced approval rate (<30% for 2h)

---

## Testing

### Unit Tests (20 test cases)

**Location**: `apps/api-server/src/services/__tests__/`

Files:
- `SellerAuthorizationService.test.ts` (20 tests)
- `AuthorizationGateService.test.ts` (12 tests)

**Run tests**:
```bash
npm run test:unit -- --testPathPattern=SellerAuthorization
```

### Integration Tests (7 scenarios)

**Location**: `apps/api-server/src/services/__tests__/SellerAuthorization.integration.test.ts`

Scenarios:
- A) Request → Approve → Gate OK
- B) Request → Reject → Cooldown → Re-request fail
- C) Approve 10 products → 11th fails (limit)
- D) Revoke → Re-request always fails (permanent)
- E) Self-seller scenario (auto-pass)
- F) Audit log completeness
- G) Cancel workflow

**Run tests**:
```bash
npm run test:integration -- --testPathPattern=SellerAuthorization.integration
```

### End-to-End Test Script

**Location**: `scripts/phase9-integration-test.sh`

**Usage**:
```bash
# Staging
./scripts/phase9-integration-test.sh staging

# Production
./scripts/phase9-integration-test.sh production
```

---

## Deployment & Rollout

### Phase 0: Shadow Mode (3-5 days)
- Feature flag disabled (`ENABLE_SELLER_AUTHORIZATION=false`)
- Metrics collection active (passive monitoring)
- No production behavior changes

### Phase 1: Internal Testing (10% rollout, 1-2 days)
- Enable for test sellers only
- Run all 5 scenarios x 3 iterations (15 tests)
- Validate cache hit rate >70%, P95 latency <15ms

### Phase 2: Limited Production (50% rollout, 2-3 days)
- Progressive: 20% → 35% → 50%
- Monitor all metrics continuously
- Alert rules active

### Phase 3: Full Rollout (100%, 1-2 days)
- Progressive: 75% → 100%
- Post-rollout monitoring (7 days)
- Documentation update

**Full Rollout Strategy**: `docs/phase9-rollout-strategy.md`

---

## Seed Data

### Staging Test Data

**Location**: `apps/api-server/src/database/seeds/phase9-seller-authorization.seed.ts`

**Data Structure**:
- 3 Partner sellers (Alice, Bob, Charlie)
- 2 Suppliers (Electronics, Fashion)
- 5 Products (distributed across suppliers)
- 12 Authorization requests covering all scenarios:
  - 5 APPROVED
  - 3 REQUESTED (pending)
  - 2 REJECTED (with cooldown)
  - 1 REVOKED (permanent)
  - 1 CANCELLED

**Run seed**:
```bash
npm run seed:phase9
```

---

## Troubleshooting

### Issue: High Error Rate

**Symptoms**: Alert "High authorization error rate"

**Investigation**:
1. Check logs: `grep "ERR_" /var/log/o4o-api.log`
2. Identify error code (ERR_PRODUCT_LIMIT_REACHED, ERR_COOLDOWN_ACTIVE, etc.)
3. Determine if expected (business rule) or bug

**Resolution**:
- Business rule error → Document and monitor
- Bug → Rollback immediately

### Issue: Slow Gate Performance

**Symptoms**: P95 latency >15ms

**Investigation**:
1. Check cache hit rate (should be >70%)
2. Check Redis health: `redis-cli --latency`
3. Review database query times

**Resolution**:
- Increase cache TTL to 60s
- Warm cache on startup: `AuthorizationGateService.warmCache()`

### Issue: Supplier Inbox Overload

**Symptoms**: `seller_auth_inbox_size` >100

**Resolution**:
- Notify suppliers via email/Slack
- Temporarily pause new requests for overloaded suppliers

---

## Runbook

### Emergency Rollback

**Trigger**: Critical alert OR error rate >1%

**Action**:
```bash
# Set feature flag to false (fail-open)
ssh o4o-api
cd /home/ubuntu/o4o-platform
export ENABLE_SELLER_AUTHORIZATION=false
pm2 restart o4o-api-server
```

**Expected Behavior**:
- All authorization gates return `true` immediately
- No seller transactions blocked
- Metrics collection continues

**RTO**: 5 minutes

---

## API Client Examples

### Request Authorization (Seller)

```typescript
import { authClient } from '@o4o/auth-client';

const result = await authClient.api.post(
  '/api/v1/ds/seller/products/product-123/request',
  {
    metadata: {
      businessJustification: 'Expanding into fashion category'
    }
  }
);

console.log(result.data); // { success: true, data: { authorization: {...} } }
```

### Approve Authorization (Supplier)

```typescript
const result = await authClient.api.post(
  '/api/v1/ds/supplier/authorizations/auth-456/approve',
  {
    approvedBy: 'supplier-admin-123'
  }
);
```

### Check Gate Status (Seller)

```typescript
const result = await authClient.api.get(
  '/api/v1/ds/seller/gate/product-789'
);

console.log(result.data.data);
// {
//   isAuthorized: true,
//   status: 'APPROVED',
//   authorizationId: 'auth-123',
//   canRequest: false
// }
```

---

## Contributing

### Adding New Business Rules

1. Update `SellerAuthorization` entity with new fields
2. Create migration: `npm run migration:generate -- AddNewRule`
3. Implement validation in `SellerAuthorizationService`
4. Add metrics in `AuthorizationMetricsService`
5. Update tests (unit + integration)
6. Document in this README

### Adding New Metrics

1. Define metric in `authorization-metrics.service.ts`
2. Add Prometheus query to Grafana dashboard
3. Create alert rule if needed
4. Document in this README

---

## FAQ

**Q: What happens if feature flag is disabled?**
A: Authorization gates return `true` (fail-open), no seller transactions blocked.

**Q: Can sellers request more than 10 products?**
A: No, the 10-product limit is enforced. Sellers must revoke existing products first.

**Q: How long is the cooldown period?**
A: 30 days by default (configurable via `SELLER_AUTHORIZATION_COOLDOWN_DAYS`).

**Q: Can a revoked authorization be re-requested?**
A: No, revocation is permanent. Only admins can manually create a new authorization.

**Q: What if a supplier doesn't respond to requests?**
A: Requests remain in REQUESTED status indefinitely. Monitor `seller_auth_inbox_size` metric.

**Q: How do I warm the cache?**
A: Call `AuthorizationGateService.warmCache(sellerId)` on application startup.

---

## Support

- **Documentation**: `/docs/phase9-*.md`
- **Runbook**: `/docs/phase9-rollout-strategy.md`
- **Issues**: https://github.com/o4o-platform/issues
- **Slack**: #phase9-seller-authorization

---

**Last Updated**: 2025-01-07
**Version**: 1.0
**Owner**: Platform Engineering Team
