# Phase 9: Seller Authorization System - Test Report

## Test Strategy

This document defines the test scenarios for Phase 9 Seller Authorization System. Tests are categorized into:

1. **Unit Tests (10)**: Service logic, state transitions, business rules
2. **Integration Tests (6)**: End-to-end flows with database and cache
3. **Performance Tests**: Gate latency and throughput benchmarks

---

## Unit Test Scenarios

### 1. Product Limit Enforcement

**Test**: `should reject authorization request when seller reaches product limit`

**Setup**:
- Seller has 9 approved authorizations
- Limit is set to 10 via `SELLER_PRODUCT_LIMIT=10`

**Action**:
- Request authorization for 10th product: PASS
- Request authorization for 11th product: FAIL

**Expected**:
- 10th request: Status 201, auth created with status=REQUESTED
- 11th request: Status 400, error code `ERR_PRODUCT_LIMIT_REACHED`
- Metric incremented: `seller_auth_limit_rejections_total`

**Edge Cases**:
- Revoked authorizations DO count toward limit
- Rejected authorizations DO count toward limit
- Cancelled authorizations DO NOT count

---

### 2. 30-Day Cooldown After Rejection

**Test**: `should enforce 30-day cooldown after supplier rejects request`

**Setup**:
- Seller requests product A: status=REQUESTED
- Supplier rejects with reason "Insufficient credentials"
- Rejection timestamp: 2025-01-07 10:00:00

**Action**:
- Immediately re-request product A: FAIL (within cooldown)
- Request on 2025-01-20 (13 days later): FAIL (still in cooldown)
- Request on 2025-02-07 (31 days later): PASS (cooldown expired)

**Expected**:
- Cooldown blocked requests: Status 400, error `ERR_COOLDOWN_ACTIVE`
- Response includes `cooldownUntil: 2025-02-06T10:00:00Z`
- After cooldown: New auth created with status=REQUESTED
- Metric incremented: `seller_auth_cooldown_blocks_total`

**Edge Cases**:
- Cooldown applies per (sellerId, productId) pair
- Different products have independent cooldowns
- Admin can manually clear cooldown (via database)

---

### 3. Permanent Block After Revocation

**Test**: `should permanently block seller after supplier revokes authorization`

**Setup**:
- Seller requests product B: status=REQUESTED
- Supplier approves: status=APPROVED
- Supplier revokes with reason "Contract violation": status=REVOKED

**Action**:
- Attempt to re-request product B: FAIL

**Expected**:
- Re-request returns: Status 400, error `ERR_AUTHORIZATION_REVOKED`
- Response message: "Authorization was permanently revoked. Reason: Contract violation"
- Database constraint prevents duplicate (sellerId, productId) when status=REVOKED
- No metric (permanent state, not a rate event)

**Edge Cases**:
- Revocation CANNOT be undone (by design)
- Seller can still request OTHER products from same supplier

---

### 4. Duplicate Request Prevention

**Test**: `should prevent duplicate authorization requests for same product`

**Setup**:
- Seller requests product C: status=REQUESTED
- Request still pending (supplier hasn't acted)

**Action**:
- Seller attempts to request product C again: FAIL

**Expected**:
- Second request: Status 409, error `ERR_DUPLICATE_AUTHORIZATION`
- Response includes existing authorization ID
- Database UNIQUE constraint (sellerId, productId) enforces at DB level

**Edge Cases**:
- Seller CAN cancel and re-request
- After rejection + cooldown expiry, CAN re-request
- After approval, CANNOT re-request (already authorized)

---

### 5. Role-Based Access Control

**Test**: `should restrict seller endpoints to users with 'seller' role`

**Setup**:
- User A has roles: ['user', 'seller']
- User B has roles: ['user']

**Action**:
- User A calls `/api/v1/ds/seller/authorizations`: PASS
- User B calls `/api/v1/ds/seller/authorizations`: FAIL

**Expected**:
- User A: Status 200 (or 501 in stub phase)
- User B: Status 403, error `ERR_INSUFFICIENT_PERMISSIONS`
- Middleware: `requireRole('seller')`

**Edge Cases**:
- Admin role can bypass (for debugging)
- Supplier role CANNOT access seller endpoints

---

### 6. Status Transition Validation

**Test**: `should validate legal status transitions`

**Setup**:
- Authorization exists with status=APPROVED

**Action**:
- Attempt invalid transitions:
  - APPROVED → REQUESTED: FAIL
  - APPROVED → REJECTED: FAIL
  - APPROVED → REVOKED: PASS
  - REVOKED → APPROVED: FAIL

**Expected**:
- Invalid transitions: Throw `InvalidStateTransitionError`
- Valid transitions: Update status and timestamps
- Audit log entry created for each attempt

**State Machine**:
```
REQUESTED → [APPROVED, REJECTED, CANCELLED]
APPROVED → [REVOKED]
REJECTED → [REQUESTED (after cooldown)]
REVOKED → [] (terminal state)
CANCELLED → [] (terminal state)
```

---

### 7. Cooldown Calculation Accuracy

**Test**: `should calculate cooldown expiry correctly across timezones and DST`

**Setup**:
- `SELLER_REJECT_COOLDOWN_DAYS=30`
- Rejection timestamp: 2025-01-07 10:00:00 UTC

**Action**:
- Calculate cooldown expiry

**Expected**:
- `cooldownUntil = 2025-02-06 10:00:00 UTC` (exactly 30 days)
- Calculation: `rejectedAt + (30 * 24 * 60 * 60 * 1000)`
- Timezone-agnostic (uses UTC)

**Edge Cases**:
- Leap years (2024: Feb has 29 days)
- DST transitions (should NOT affect UTC calculation)
- Configurable cooldown period (test with 7, 14, 30, 90 days)

---

### 8. Metadata Snapshot Integrity

**Test**: `should capture authorization metadata at approval time`

**Setup**:
- Seller requests product D
- Product metadata: `{ supplierSku: "SKU123", version: "v1" }`

**Action**:
- Supplier approves request
- Authorization metadata should snapshot product details

**Expected**:
```json
{
  "authorizationMetadata": {
    "productId": "uuid",
    "supplierId": "uuid",
    "approvedAt": "2025-01-07T10:00:00Z",
    "approvedBy": "supplier-admin-id",
    "productSnapshot": {
      "name": "Product D",
      "supplierSku": "SKU123",
      "version": "v1"
    }
  }
}
```

**Edge Cases**:
- Product changes after approval (metadata remains unchanged)
- Metadata used in commission calculation (Phase 8 integration)

---

### 9. Authorization Expiry (Future Enhancement)

**Test**: `should support optional authorization expiry dates`

**Setup**:
- Supplier approves with 90-day expiry
- Approval timestamp: 2025-01-07
- Expiry: 2025-04-07

**Action**:
- Check authorization on 2025-03-01: VALID
- Check authorization on 2025-04-08: EXPIRED

**Expected**:
- Before expiry: Gate returns `true`
- After expiry: Gate returns `false`, error `ERR_AUTHORIZATION_EXPIRED`
- Email notification to seller 7 days before expiry

**Implementation Note**: NOT in Phase 9 MVP, but schema supports `expiresAt` column

---

### 10. Bulk Authorization Check Performance

**Test**: `should efficiently check authorization for multiple products`

**Setup**:
- Seller has 50 approved authorizations
- Cart contains 10 products (8 authorized, 2 not)

**Action**:
- Call `getApprovedProductsForSeller(sellerId, [prod1, prod2, ..., prod10])`

**Expected**:
- Returns: `[prod1, prod3, prod4, prod5, prod6, prod7, prod9, prod10]` (8 products)
- Database query: Single `WHERE (sellerId, productId) IN (...)` query
- Cache hit rate: >80% (assuming repeat checks)
- P95 latency: <10ms

**Edge Cases**:
- Empty product list: Returns empty array
- All products unauthorized: Returns empty array
- Cache miss: Fallback to database query

---

## Integration Test Scenarios

### 1. Unapproved Seller Blocked from Order

**Test**: `should block unapproved seller from creating order`

**Flow**:
1. Seller requests product authorization: status=REQUESTED
2. Seller attempts to add product to cart: FAIL

**Expected**:
- Cart add: Status 403, error `ERR_SELLER_NOT_AUTHORIZED`
- Error message: "You must be authorized by the supplier to sell this product"
- Cart remains empty
- Metric incremented: `seller_auth_gate_denies_total{stage="cart"}`

**Verification**:
- Order table: No order created
- Cart table: No cart item created
- Audit log: Gate denial logged

---

### 2. Approved Seller Can Create Order

**Test**: `should allow approved seller to create order`

**Flow**:
1. Seller requests product authorization
2. Supplier approves request
3. Cache invalidation: `seller_auth:{sellerId}:{productId}` cleared
4. Seller adds product to cart: PASS
5. Seller creates order: PASS

**Expected**:
- Cart add: Status 200, cart item created
- Order creation: Status 201, order created
- Commission metadata includes authorization ID
- Gate check P95 latency: <5ms

**Verification**:
- Order table: Order exists with correct commissions
- Commissions metadata: `authorizationId` field populated
- Cache: `seller_auth:{sellerId}:{productId}` = "approved" (TTL 60s)

---

### 3. Reject → 30-Day Cooldown → Re-Request Blocked

**Test**: `should enforce cooldown across all seller actions`

**Flow**:
1. Seller requests product: status=REQUESTED
2. Supplier rejects: `cooldownUntil = now + 30 days`
3. Seller attempts to re-request within 30 days: FAIL
4. Seller attempts to add product to cart (bypass?): FAIL
5. After 30 days, seller re-requests: PASS

**Expected**:
- Re-request within cooldown: Status 400, error `ERR_COOLDOWN_ACTIVE`
- Cart add within cooldown: Status 403, error `ERR_SELLER_NOT_AUTHORIZED`
- After cooldown: New authorization created, status=REQUESTED
- Cooldown check: Database query `WHERE cooldownUntil > NOW()`

**Verification**:
- Authorization table: `cooldownUntil` column set correctly
- Metric: `seller_auth_cooldown_blocks_total` incremented
- Email notification: Seller receives "cooldown active" email

---

### 4. Product Limit Threshold Enforcement

**Test**: `should enforce product limit across concurrent requests`

**Flow**:
1. Seller has 9 approved authorizations (limit is 10)
2. Seller sends 3 concurrent requests (products A, B, C)
3. Only 1 should succeed (race condition test)

**Expected**:
- First request to commit: Status 201 (reaches limit exactly)
- Other 2 requests: Status 400, error `ERR_PRODUCT_LIMIT_REACHED`
- Database transaction isolation prevents over-limit
- Limit calculation uses `SELECT COUNT(*) ... FOR UPDATE`

**Verification**:
- Authorization table: Exactly 10 approved authorizations
- Metric: `seller_auth_limit_rejections_total` incremented 2 times
- Audit log: All 3 requests logged

---

### 5. Authorization Error Codes

**Test**: `should return consistent error codes across all endpoints`

**Error Code Matrix**:

| Code | HTTP Status | Scenario | Retry? |
|------|-------------|----------|--------|
| `ERR_SELLER_NOT_AUTHORIZED` | 403 | Product not authorized | No (request auth) |
| `ERR_PRODUCT_LIMIT_REACHED` | 400 | 10 product limit | No |
| `ERR_COOLDOWN_ACTIVE` | 400 | Rejected within 30 days | Yes (after cooldown) |
| `ERR_AUTHORIZATION_REVOKED` | 400 | Permanent revocation | No |
| `ERR_DUPLICATE_AUTHORIZATION` | 409 | Already requested | No (cancel first) |
| `ERR_AUTHORIZATION_NOT_FOUND` | 404 | Invalid auth ID | No |
| `ERR_INSUFFICIENT_PERMISSIONS` | 403 | Not a seller | No |

**Expected**:
- All error responses include:
  - `errorCode` (machine-readable)
  - `message` (human-readable)
  - `details` (context: cooldownUntil, limitUsed, etc.)

---

### 6. Audit Log Generation

**Test**: `should create audit log for all authorization state changes`

**Flow**:
1. Seller requests authorization
2. Supplier rejects with reason
3. Seller cancels another request
4. Supplier approves a third request
5. Supplier revokes the approved authorization

**Expected**:
- 5 audit log entries created
- Each entry includes:
  - `authorizationId`
  - `action` (REQUEST, APPROVE, REJECT, CANCEL, REVOKE)
  - `actorId` (seller or supplier admin)
  - `statusFrom`, `statusTo`
  - `reason` (for reject/revoke)
  - `metadata` (limit, cooldown, etc.)
  - `timestamp`

**Verification**:
- Audit log table: 5 entries with correct data
- Query performance: Index on `authorizationId`, `createdAt`
- Log retention: 1 year (compliance requirement)

---

## Performance Test Scenarios

### 1. Authorization Gate Latency

**Test**: `should check authorization in <5ms (P95)`

**Setup**:
- 1000 sellers, each with 10 approved authorizations
- Redis cache: 80% hit rate
- Load: 100 concurrent gate checks per second

**Measurements**:
- P50 latency: <2ms (cache hit)
- P95 latency: <5ms (cache miss, DB query)
- P99 latency: <10ms
- Throughput: >1000 checks/sec per instance

**Tooling**:
- k6 load testing script
- Prometheus metrics: `histogram_quantile(0.95, seller_auth_gate_duration_seconds)`

---

### 2. Bulk Authorization Check Efficiency

**Test**: `should check 100 products in <50ms`

**Setup**:
- Seller requests authorization status for 100 products
- 60% cache hit rate

**Expected**:
- Cache hits (60 products): <1ms each = 60ms total
- Cache misses (40 products): Single DB query <20ms
- Total latency: <80ms (P95)

**Optimization**:
- Use `IN (...)` query with index on (sellerId, productId)
- Redis pipelining for cache lookups

---

### 3. Supplier Inbox Query Performance

**Test**: `should load supplier inbox in <100ms (P95)`

**Setup**:
- Supplier has 500 pending authorization requests
- Pagination: 20 per page

**Expected**:
- First page load: <50ms
- Subsequent pages: <30ms (index-optimized)
- Index: (supplierId, status, requestedAt DESC)

---

## Test Execution Commands

### Unit Tests
```bash
# Run all Phase 9 unit tests
pnpm test --testPathPattern=phase9

# Run specific unit test
pnpm test seller-authorization.service.spec.ts

# Run with coverage
pnpm test:cov --testPathPattern=phase9
```

### Integration Tests
```bash
# Run integration tests (requires Docker)
docker-compose -f docker-compose.test.yml up -d
pnpm test:integration --testPathPattern=phase9

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

### Performance Tests
```bash
# Run k6 load test
k6 run tests/performance/phase9-gate-latency.js

# Monitor metrics
curl http://localhost:4000/metrics | grep seller_auth
```

---

## Coverage Requirements

- **Line Coverage**: >80%
- **Branch Coverage**: >75%
- **Critical Paths**: 100% (gate checks, cooldown enforcement, limit checks)

---

## Test Data Setup

### Seed Data (Test Environment Only)

```sql
-- 10 test sellers
INSERT INTO sellers (id, userId, status, tier) VALUES
  ('seller-1', 'user-1', 'APPROVED', 'BRONZE'),
  ('seller-2', 'user-2', 'APPROVED', 'SILVER'),
  ...;

-- 5 test suppliers
INSERT INTO suppliers (id, userId, companyName) VALUES
  ('supplier-1', 'user-11', 'Test Supplier A'),
  ...;

-- 20 test products
INSERT INTO products (id, supplierId, name, price) VALUES
  ('product-1', 'supplier-1', 'Product A', 10000),
  ...;

-- 30 authorization scenarios
INSERT INTO seller_authorizations (id, sellerId, productId, supplierId, status) VALUES
  ('auth-1', 'seller-1', 'product-1', 'supplier-1', 'APPROVED'),
  ('auth-2', 'seller-1', 'product-2', 'supplier-1', 'REQUESTED'),
  ('auth-3', 'seller-2', 'product-3', 'supplier-2', 'REJECTED'),
  ...;
```

---

## Regression Test Checklist

After Phase 9 implementation, verify:

- [ ] Existing cart flow (non-dropshipping) unchanged
- [ ] Order creation (non-dropshipping) unchanged
- [ ] Seller registration (existing flow) unchanged
- [ ] Product catalog (non-dropshipping) unchanged
- [ ] Phase 8 commission calculation unchanged (metadata added only)

---

## Success Criteria

- [ ] All 10 unit tests pass
- [ ] All 6 integration tests pass
- [ ] Performance benchmarks met (P95 <5ms)
- [ ] Error codes documented and consistent
- [ ] Audit logs complete and queryable
- [ ] Test coverage >80%

---

**Version**: 1.0.0
**Created**: 2025-01-07
**Status**: Test Scenarios Defined (Implementation Pending)
