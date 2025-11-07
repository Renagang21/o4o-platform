# Authorization Test Matrix
**Phase 9 - Seller Authorization System**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document defines the comprehensive test matrix for validating the Phase 9 seller authorization system, covering functional, security, and integration tests.

---

## Test Environment Setup

### Required Test Data

**Test Suppliers**:
```sql
-- Supplier with authorization enabled
INSERT INTO suppliers (id, code, name, status)
VALUES ('sup_test_auth', 'SUP-AUTH-TEST', 'Test Auth Supplier', 'active');

-- Supplier with multiple products
INSERT INTO suppliers (id, code, name, status)
VALUES ('sup_test_multi', 'SUP-MULTI-TEST', 'Test Multi Supplier', 'active');
```

**Test Products**:
```sql
-- Product with space available (5/10 sellers)
INSERT INTO products (id, sku, name, supplierId, status)
VALUES ('prod_test_available', 'PROD-AVL-001', 'Test Product Available', 'sup_test_auth', 'active');

-- Product at limit (10/10 sellers)
INSERT INTO products (id, sku, name, supplierId, status)
VALUES ('prod_test_full', 'PROD-FULL-001', 'Test Product Full', 'sup_test_auth', 'active');

-- Product with no sellers (0/10)
INSERT INTO products (id, sku, name, supplierId, status)
VALUES ('prod_test_empty', 'PROD-EMPTY-001', 'Test Product Empty', 'sup_test_auth', 'active');
```

**Test Sellers (Partners)**:
```sql
-- Seller with no history
INSERT INTO partners (id, code, name, tierLevel, rating, status)
VALUES ('seller_test_new', 'SELL-NEW-001', 'Test New Seller', 'BRONZE', 0, 'active');

-- Seller with good history
INSERT INTO partners (id, code, name, tierLevel, rating, status)
VALUES ('seller_test_gold', 'SELL-GOLD-001', 'Test Gold Seller', 'GOLD', 4.8, 'active');

-- Seller with rejected history
INSERT INTO partners (id, code, name, tierLevel, rating, status)
VALUES ('seller_test_rejected', 'SELL-REJ-001', 'Test Rejected Seller', 'SILVER', 4.0, 'active');
```

---

## Core Test Scenarios

### Scenario 1: Submit Authorization Request (Happy Path)

**Setup**:
- Seller: `seller_test_new` (no existing requests)
- Product: `prod_test_available` (5/10 sellers)
- Supplier: `sup_test_auth`

**Test Steps**:
1. Seller navigates to product detail page
2. Seller sees "Request Access" button
3. Seller clicks "Request Access"
4. Seller enters optional message: "Interested in this product"
5. Seller submits request

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 201 Created | API returns success |
| Authorization Status | PENDING | Record created with PENDING status |
| Request Message | "Interested in this product" | Message saved correctly |
| Notification Sent | true | Email + in-app notification sent |
| Product Seller Count | 5/10 | Count unchanged (not yet approved) |

**Validation**:
- [ ] API returns 201 with authorization ID
- [ ] Database record created with correct fields
- [ ] Seller receives confirmation message
- [ ] Supplier receives notification
- [ ] Seller cannot submit duplicate request

---

### Scenario 2: Approve Authorization Request

**Setup**:
- Authorization: PENDING from Scenario 1
- Supplier: `sup_test_auth` logged in
- Current seller count: 5/10

**Test Steps**:
1. Supplier navigates to "Pending Requests" tab
2. Supplier sees request from `seller_test_new`
3. Supplier reviews seller stats
4. Supplier clicks "Approve"
5. Supplier adds optional welcome message
6. Supplier confirms approval

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 200 OK | API returns success |
| Authorization Status | APPROVED | Status updated to APPROVED |
| Approved At | Current timestamp | Timestamp recorded |
| Approved By | `sup_test_auth` | Supplier ID recorded |
| Product Seller Count | 6/10 | Count incremented |
| Seller Access | Granted | Seller can view product details |

**Validation**:
- [ ] API returns 200 with updated authorization
- [ ] Database status updated to APPROVED
- [ ] Seller receives approval notification
- [ ] Seller can access product pricing
- [ ] Seller can place orders
- [ ] Product seller count incremented

---

### Scenario 3: Reject Authorization Request

**Setup**:
- Authorization: PENDING
- Seller: `seller_test_new`
- Product: `prod_test_available`
- Supplier: `sup_test_auth` logged in

**Test Steps**:
1. Supplier navigates to "Pending Requests" tab
2. Supplier clicks "Reject" on request
3. Supplier selects reason: "DOES_NOT_MEET_REQUIREMENTS"
4. Supplier adds custom reason: "Insufficient sales history"
5. Supplier confirms rejection

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 200 OK | API returns success |
| Authorization Status | REJECTED | Status updated to REJECTED |
| Rejected At | Current timestamp | Timestamp recorded |
| Rejection Reason | "Seller does not meet requirements: Insufficient sales history" | Reason saved |
| Can Reapply At | 30 days from now | Cooling-off period set |
| Seller Access | Denied | Seller cannot access product |

**Validation**:
- [ ] API returns 200 with updated authorization
- [ ] Database status updated to REJECTED
- [ ] Seller receives rejection notification with reason
- [ ] Seller cannot reapply for 30 days
- [ ] Product seller count unchanged

---

### Scenario 4: Seller Limit Enforcement

**Setup**:
- Product: `prod_test_full` (10/10 sellers)
- Seller: `seller_test_new`
- All 10 seller slots filled

**Test Steps**:
1. Seller navigates to product detail page
2. Seller clicks "Request Access"
3. Seller submits request

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 403 Forbidden | Request rejected |
| Error Code | SELLER_LIMIT_REACHED | Correct error code |
| Current Seller Count | 10/10 | Limit reached |
| Authorization Created | false | No record created |

**Validation**:
- [ ] API returns 403 with correct error message
- [ ] No authorization record created
- [ ] Error message indicates limit reached
- [ ] Seller sees clear explanation

---

### Scenario 5: Duplicate Request Prevention

**Setup**:
- Authorization: PENDING from `seller_test_new` for `prod_test_available`

**Test Steps**:
1. Seller attempts to submit another request for same product
2. API validates existing active request

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 400 Bad Request | Request rejected |
| Error Code | DUPLICATE_REQUEST | Correct error code |
| Existing Request ID | Original auth ID | Reference to existing request |

**Validation**:
- [ ] API returns 400 with correct error
- [ ] No new authorization record created
- [ ] Error includes existing request details
- [ ] Unique constraint enforced at database level

---

### Scenario 6: Cooling-Off Period Enforcement

**Setup**:
- Authorization: REJECTED 15 days ago
- Seller: `seller_test_rejected`
- Product: `prod_test_available`
- Cooling-off period: 30 days

**Test Steps**:
1. Seller attempts to reapply for same product
2. API validates cooling-off period

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 400 Bad Request | Request rejected |
| Error Code | COOLING_OFF_PERIOD | Correct error code |
| Rejected At | 15 days ago | Previous rejection timestamp |
| Can Reapply At | 15 days from now | Remaining days shown |
| Days Remaining | 15 | Countdown displayed |

**Validation**:
- [ ] API returns 400 with cooling-off error
- [ ] Error message shows days remaining
- [ ] No new authorization record created
- [ ] After 30 days, seller can reapply

---

### Scenario 7: Revoke Authorization

**Setup**:
- Authorization: APPROVED
- Seller: `seller_test_gold`
- Product: `prod_test_available`
- Current seller count: 6/10
- Existing orders: 3 pending

**Test Steps**:
1. Supplier navigates to "Authorized Sellers" tab
2. Supplier clicks "Revoke Access" on `seller_test_gold`
3. Supplier selects reason: "TERMS_VIOLATION"
4. Supplier adds custom reason: "Selling below MSRP"
5. Supplier confirms revocation

**Expected Result**:
| Field | Expected Value | Validation |
|-------|----------------|------------|
| Response Code | 200 OK | API returns success |
| Authorization Status | REVOKED | Status updated to REVOKED |
| Revoked At | Current timestamp | Timestamp recorded |
| Revocation Reason | "Terms violation: Selling below MSRP" | Reason saved |
| Product Seller Count | 5/10 | Count decremented |
| Existing Orders | 3 pending | Orders honored |
| New Orders | Blocked | Cannot place new orders |
| Reapply | Permanently blocked | Cannot reapply |

**Validation**:
- [ ] API returns 200 with updated authorization
- [ ] Database status updated to REVOKED
- [ ] Seller receives revocation notification
- [ ] Seller loses access immediately
- [ ] Existing orders honored (fulfillment continues)
- [ ] Seller cannot place new orders
- [ ] Seller cannot reapply (permanent ban)
- [ ] Product seller count decremented

---

## Edge Case Tests

### Edge Case 1: Concurrent Approval at Limit

**Scenario**: Two suppliers approve different sellers simultaneously when product is at 9/10

**Setup**:
- Product: `prod_test_available` (9/10 sellers)
- Two pending requests: seller A and seller B
- Two suppliers approve simultaneously

**Expected Result**:
- First approval succeeds (10/10)
- Second approval fails with SELLER_LIMIT_REACHED
- Database transaction ensures atomicity

**Validation**:
- [ ] Only one approval succeeds
- [ ] Second approval returns 403 error
- [ ] No race condition occurs
- [ ] Database lock prevents duplicate approval

---

### Edge Case 2: Seller Deletes Account with Pending Request

**Scenario**: Seller submits request then deletes account

**Setup**:
- Authorization: PENDING
- Seller soft-deletes account (status: 'deleted')

**Expected Result**:
- Authorization record remains (historical data)
- Supplier sees "[Seller Deleted]" in request list
- Supplier can manually reject to clean up

**Validation**:
- [ ] Authorization record not deleted
- [ ] Supplier UI shows deleted seller notice
- [ ] Supplier can reject request

---

### Edge Case 3: Product Deleted with Authorizations

**Scenario**: Supplier deletes product with 5 approved sellers

**Setup**:
- Product: `prod_test_available` (5/10 sellers)
- Product soft-deleted (status: 'deleted')

**Expected Result**:
- Authorizations remain (historical data)
- Sellers lose access immediately
- Existing orders honored
- New orders blocked

**Validation**:
- [ ] Authorization records not deleted
- [ ] Sellers cannot access product
- [ ] Existing orders fulfill normally
- [ ] New orders return 403

---

### Edge Case 4: Cooling-Off Period Exact Boundary

**Scenario**: Seller reapplies exactly 30 days after rejection

**Setup**:
- Authorization: REJECTED exactly 30 days ago
- Seller attempts to reapply

**Expected Result**:
- Request succeeds (30 days elapsed)
- New PENDING authorization created

**Validation**:
- [ ] Request succeeds at exactly 30 days
- [ ] Request fails at 29 days 23 hours 59 seconds
- [ ] Boundary condition handled correctly

---

### Edge Case 5: Supplier Approves Own Request (Security)

**Scenario**: Seller is also a supplier, tries to approve own request

**Setup**:
- User has both seller and supplier roles
- Submits request as seller
- Attempts to approve as supplier

**Expected Result**:
- System detects conflict of interest
- Approval blocked with error

**Validation**:
- [ ] API detects self-approval attempt
- [ ] Returns 403 Forbidden
- [ ] Requires different supplier to approve

---

## Security Tests

### Security Test 1: Authorization Bypass

**Scenario**: Malicious seller attempts to bypass UI and directly access product API

**Setup**:
- Seller: NOT APPROVED for product
- Seller has valid authentication token
- Seller calls `GET /api/v1/ds/products/:id` directly

**Expected Result**:
- API returns 403 Forbidden
- Pricing and inventory hidden
- Authorization check enforced server-side

**Validation**:
- [ ] API blocks access without approval
- [ ] Middleware checks authorization
- [ ] Database-level constraints enforced

---

### Security Test 2: Token Manipulation

**Scenario**: Seller modifies JWT token to impersonate approved seller

**Setup**:
- Seller A: NOT APPROVED
- Seller B: APPROVED
- Seller A modifies token to claim Seller B's ID

**Expected Result**:
- Token validation fails (signature invalid)
- Request rejected with 401 Unauthorized

**Validation**:
- [ ] JWT signature validation works
- [ ] Cannot modify token without secret
- [ ] Token expiration enforced

---

### Security Test 3: SQL Injection

**Scenario**: Malicious seller submits SQL injection in request message

**Setup**:
- Request message: `'; DROP TABLE seller_authorizations; --`

**Expected Result**:
- Message sanitized and stored safely
- No SQL injection executed
- Parameterized queries prevent injection

**Validation**:
- [ ] SQL injection blocked
- [ ] Malicious content escaped
- [ ] Database unaffected

---

### Security Test 4: Rate Limiting

**Scenario**: Seller submits 20 authorization requests in 1 minute

**Setup**:
- Seller attempts rapid-fire requests
- Rate limit: 10 requests per day

**Expected Result**:
- First 10 requests succeed (if valid)
- 11th request returns 429 Too Many Requests
- Rate limit enforced

**Validation**:
- [ ] Rate limiting works correctly
- [ ] 429 status returned after limit
- [ ] Reset after 24 hours

---

## Integration Tests

### Integration Test 1: End-to-End Authorization Flow

**Steps**:
1. Seller submits request
2. Supplier receives notification
3. Supplier approves request
4. Seller receives notification
5. Seller accesses product details
6. Seller places order
7. Commission calculated with supplier policy

**Validation**:
- [ ] Full workflow completes successfully
- [ ] All notifications sent
- [ ] Product access granted
- [ ] Order placement works
- [ ] Commission policy applied correctly

---

### Integration Test 2: Authorization + Policy Resolution (Phase 8)

**Steps**:
1. Seller APPROVED for product
2. Supplier has commission policy (15%)
3. Seller places order
4. Policy resolution includes authorization check
5. Commission calculated at 15%

**Validation**:
- [ ] Policy resolution checks authorization
- [ ] Correct policy applied (15%)
- [ ] Commission snapshot includes authorization

---

### Integration Test 3: Revocation + Existing Orders

**Steps**:
1. Seller has APPROVED authorization
2. Seller has 3 pending orders
3. Supplier revokes authorization
4. System honors existing orders
5. Seller cannot place new orders

**Validation**:
- [ ] Authorization revoked
- [ ] Existing orders fulfill normally
- [ ] New order attempts blocked
- [ ] Order fulfillment service checks authorization

---

## Performance Tests

### Performance Test 1: Authorization Check Latency

**Target**: P95 < 5ms

**Method**:
- Generate 1000 concurrent authorization checks
- Measure latency for each

**Validation**:
- [ ] P95 < 5ms
- [ ] P99 < 10ms
- [ ] No timeouts

---

### Performance Test 2: Request List Query Performance

**Target**: P95 < 20ms

**Method**:
- Generate 10,000 authorization records
- Query pending requests (paginated)
- Measure query time

**Validation**:
- [ ] P95 < 20ms
- [ ] Indexes used correctly
- [ ] Pagination works

---

## UI Tests

### UI Test 1: Seller Request Flow

**Steps**:
1. Navigate to product page
2. Click "Request Access"
3. Fill in optional message
4. Submit request
5. Verify confirmation modal

**Validation**:
- [ ] UI renders correctly
- [ ] Form validation works
- [ ] Success message shown
- [ ] Badge updates to "Pending"

---

### UI Test 2: Supplier Review Flow

**Steps**:
1. Navigate to "Pending Requests"
2. Review seller stats
3. Click "Approve"
4. Verify confirmation modal

**Validation**:
- [ ] Request list displays correctly
- [ ] Seller stats shown
- [ ] Approval modal works
- [ ] Success message shown

---

## Monitoring Tests

### Monitoring Test 1: Structured Logs

**Validation**:
- [ ] `authorization_request_created` log emitted
- [ ] `authorization_approved` log emitted
- [ ] `authorization_rejected` log emitted
- [ ] `authorization_revoked` log emitted
- [ ] All logs include required fields

---

### Monitoring Test 2: Prometheus Metrics

**Validation**:
- [ ] `o4o_authorization_requests_total` increments
- [ ] `o4o_authorization_approvals_total` increments
- [ ] `o4o_authorization_rejections_total` increments
- [ ] `o4o_authorization_review_duration_seconds` records latency

---

## Test Execution Summary

### Test Coverage

| Category | Total Tests | Pass | Fail | Coverage |
|----------|-------------|------|------|----------|
| **Core Scenarios** | 7 | - | - | - |
| **Edge Cases** | 5 | - | - | - |
| **Security Tests** | 4 | - | - | - |
| **Integration Tests** | 3 | - | - | - |
| **Performance Tests** | 2 | - | - | - |
| **UI Tests** | 2 | - | - | - |
| **Monitoring Tests** | 2 | - | - | - |
| **TOTAL** | **25** | - | - | - |

---

## Success Criteria

**All tests must pass** before production deployment:
- [ ] 7 core scenarios pass
- [ ] 5 edge cases handled correctly
- [ ] 4 security tests pass
- [ ] 3 integration tests pass
- [ ] 2 performance tests meet targets
- [ ] 2 UI tests pass
- [ ] 2 monitoring tests pass
- [ ] Zero regressions in existing tests

---

## Version History

- **1.0** (2025-11-07): Initial test matrix for Phase 9

---

*Generated with [Claude Code](https://claude.com/claude-code)*
