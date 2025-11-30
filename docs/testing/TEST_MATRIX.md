# Test Matrix for Phase 8 Policy Resolution
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document defines the comprehensive test matrix for validating the Phase 8 supplier policy resolution system. It covers 6 core validation scenarios plus edge cases.

---

## Test Environment Setup

### Required Test Data

**Commission Policies**:
```sql
-- DEFAULT Policy
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status)
VALUES ('pol_default', 'DEFAULT-2025', 'DEFAULT', 'PERCENTAGE', 10.00, 'active');

-- SUPPLIER Policy (Active)
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status, startDate, endDate)
VALUES ('pol_supplier_active', 'SUPPLIER-ABC-2025', 'SUPPLIER', 'PERCENTAGE', 15.00, 'active', '2025-01-01', '2025-12-31');

-- SUPPLIER Policy (Expired)
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status, startDate, endDate)
VALUES ('pol_supplier_expired', 'SUPPLIER-XYZ-2024', 'SUPPLIER', 'PERCENTAGE', 20.00, 'active', '2024-01-01', '2024-12-31');

-- PRODUCT Policy (Active)
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, maxCommission, status, startDate, endDate)
VALUES ('pol_product_active', 'PRODUCT-PROMO-Q4', 'PRODUCT', 'PERCENTAGE', 25.00, 100000, 'active', '2025-10-01', '2025-12-31');

-- TIER Policy (for future testing)
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status)
VALUES ('pol_tier_gold', 'TIER-GOLD-2025', 'TIER', 'PERCENTAGE', 12.00, 'active');
```

**Suppliers**:
```sql
-- Supplier with active policy
INSERT INTO suppliers (id, code, name, policyId)
VALUES ('sup_with_policy', 'SUP-ABC', 'Premium Supplier Co.', 'pol_supplier_active');

-- Supplier with expired policy
INSERT INTO suppliers (id, code, name, policyId)
VALUES ('sup_expired_policy', 'SUP-XYZ', 'Legacy Supplier Inc.', 'pol_supplier_expired');

-- Supplier with no policy
INSERT INTO suppliers (id, code, name, policyId)
VALUES ('sup_no_policy', 'SUP-DEF', 'Standard Supplier Ltd.', NULL);
```

**Products**:
```sql
-- Product with active override
INSERT INTO products (id, sku, name, supplierId, policyId)
VALUES ('prod_with_override', 'PROD-001', 'Premium Widget', 'sup_with_policy', 'pol_product_active');

-- Product without override (inherits supplier policy)
INSERT INTO products (id, sku, name, supplierId, policyId)
VALUES ('prod_no_override', 'PROD-002', 'Standard Widget', 'sup_with_policy', NULL);

-- Product from supplier with expired policy
INSERT INTO products (id, sku, name, supplierId, policyId)
VALUES ('prod_expired_supplier', 'PROD-003', 'Legacy Widget', 'sup_expired_policy', NULL);

-- Product from supplier with no policy
INSERT INTO products (id, sku, name, supplierId, policyId)
VALUES ('prod_no_supplier_policy', 'PROD-004', 'Basic Widget', 'sup_no_policy', NULL);
```

**Partners**:
```sql
-- Partner for testing
INSERT INTO partners (id, code, name, tierLevel)
VALUES ('ptr_test', 'PTR-001', 'Test Partner', 'BRONZE');
```

---

## Core Test Scenarios

### Scenario 1: Product Policy Override (Highest Priority)

**Setup**:
- Product: `prod_with_override`
- Product Policy: `pol_product_active` (25%, active)
- Supplier Policy: `pol_supplier_active` (15%, active)
- Default Policy: `pol_default` (10%)

**Test Case**:
```typescript
// Order Item
{
  productId: 'prod_with_override',
  supplierId: 'sup_with_policy',
  partnerId: 'ptr_test',
  price: 100000,
  quantity: 2,
  orderDate: '2025-11-07'
}
```

**Expected Result**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `product` | Product policy has highest priority |
| `policyId` | `pol_product_active` | Product policy selected |
| `commissionRate` | `25.0` | Product policy rate |
| `commissionAmount` | `50000` | (100000 * 2 * 25%) = 50000 |
| `maxCommission` | `100000` | Product policy max cap |

**Validation**:
- [ ] Policy resolution selects product policy first
- [ ] Supplier policy ignored (lower priority)
- [ ] Default policy ignored (lowest priority)
- [ ] Commission calculated correctly
- [ ] Max commission cap applied if needed

---

### Scenario 2: Supplier Policy (Product Has No Override)

**Setup**:
- Product: `prod_no_override`
- Product Policy: None
- Supplier Policy: `pol_supplier_active` (15%, active)
- Default Policy: `pol_default` (10%)

**Test Case**:
```typescript
// Order Item
{
  productId: 'prod_no_override',
  supplierId: 'sup_with_policy',
  partnerId: 'ptr_test',
  price: 50000,
  quantity: 1,
  orderDate: '2025-11-07'
}
```

**Expected Result**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `supplier` | Supplier policy is next priority |
| `policyId` | `pol_supplier_active` | Supplier policy selected |
| `commissionRate` | `15.0` | Supplier policy rate |
| `commissionAmount` | `7500` | (50000 * 1 * 15%) = 7500 |

**Validation**:
- [ ] Product policy lookup returns null (no override)
- [ ] Supplier policy selected
- [ ] Default policy ignored
- [ ] Commission calculated correctly

---

### Scenario 3: Default Policy Fallback

**Setup**:
- Product: `prod_no_supplier_policy`
- Product Policy: None
- Supplier Policy: None
- Default Policy: `pol_default` (10%)

**Test Case**:
```typescript
// Order Item
{
  productId: 'prod_no_supplier_policy',
  supplierId: 'sup_no_policy',
  partnerId: 'ptr_test',
  price: 30000,
  quantity: 3,
  orderDate: '2025-11-07'
}
```

**Expected Result**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `default` | No product/supplier policy found |
| `policyId` | `pol_default` | Default policy selected |
| `commissionRate` | `10.0` | Default policy rate |
| `commissionAmount` | `9000` | (30000 * 3 * 10%) = 9000 |

**Validation**:
- [ ] Product policy lookup returns null
- [ ] Supplier policy lookup returns null
- [ ] Default policy selected
- [ ] Commission calculated correctly

---

### Scenario 4: Expired Policy Falls Back to Next Level

**Setup**:
- Product: `prod_expired_supplier`
- Product Policy: None
- Supplier Policy: `pol_supplier_expired` (20%, **expired on 2024-12-31**)
- Default Policy: `pol_default` (10%)
- Order Date: `2025-11-07` (after expiry)

**Test Case**:
```typescript
// Order Item
{
  productId: 'prod_expired_supplier',
  supplierId: 'sup_expired_policy',
  partnerId: 'ptr_test',
  price: 40000,
  quantity: 1,
  orderDate: '2025-11-07'
}
```

**Expected Result**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `default` | Supplier policy expired, fallback to default |
| `policyId` | `pol_default` | Default policy selected |
| `commissionRate` | `10.0` | Default policy rate |
| `commissionAmount` | `4000` | (40000 * 1 * 10%) = 4000 |

**Validation**:
- [ ] Product policy lookup returns null
- [ ] Supplier policy lookup returns expired policy
- [ ] Policy validation rejects expired policy (`endDate < orderDate`)
- [ ] Falls back to default policy
- [ ] Commission calculated with default rate

---

### Scenario 5: Safe Mode (No Policy Found)

**Setup**:
- Product: `prod_no_supplier_policy`
- Product Policy: None
- Supplier Policy: None
- Default Policy: **Deleted/Inactive** (status = 'inactive')

**Test Case**:
```typescript
// Order Item
{
  productId: 'prod_no_supplier_policy',
  supplierId: 'sup_no_policy',
  partnerId: 'ptr_test',
  price: 25000,
  quantity: 2,
  orderDate: '2025-11-07'
}

// Simulate default policy inactive
UPDATE commission_policies SET status = 'inactive' WHERE id = 'pol_default';
```

**Expected Result**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `safe_mode` | No valid policy found at any level |
| `policyId` | `null` | No policy applied |
| `commissionRate` | `0` | Safe mode fallback |
| `commissionAmount` | `0` | Zero commission |
| `appliedPolicy` | `null` | No policy snapshot |

**Validation**:
- [ ] Product policy lookup returns null
- [ ] Supplier policy lookup returns null
- [ ] Tier policy lookup returns null (if enabled)
- [ ] Default policy lookup returns inactive policy
- [ ] Policy validation rejects inactive policy
- [ ] Safe mode triggered
- [ ] Warning logged: `policy_resolution_failure`
- [ ] Metric incremented: `policy_resolution_failures_total`
- [ ] Commission = 0

---

### Scenario 6: Min/Max Commission Caps

**Setup**:
- Product: `prod_with_override`
- Product Policy: `pol_product_active` (25%, maxCommission = 100000)
- Order Amount: Large enough to exceed max

**Test Case 6A - Max Cap Applied**:
```typescript
// Order Item (high value)
{
  productId: 'prod_with_override',
  supplierId: 'sup_with_policy',
  partnerId: 'ptr_test',
  price: 500000,  // High price
  quantity: 2,
  orderDate: '2025-11-07'
}

// Raw commission: 500000 * 2 * 25% = 250000
// Max cap: 100000
// Final commission: 100000
```

**Expected Result 6A**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `product` | Product policy selected |
| `policyId` | `pol_product_active` | Product policy |
| `commissionRate` | `25.0` | Product policy rate |
| `rawCommission` | `250000` | Before cap |
| `commissionAmount` | `100000` | **Capped at maxCommission** |
| `maxCommission` | `100000` | Cap applied |

**Test Case 6B - Min Cap Applied**:
```sql
-- Create policy with minCommission
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, minCommission, status)
VALUES ('pol_min_test', 'SUPPLIER-MIN-TEST', 'SUPPLIER', 'PERCENTAGE', 5.00, 5000, 'active');

-- Link to supplier
UPDATE suppliers SET policyId = 'pol_min_test' WHERE id = 'sup_with_policy';
```

```typescript
// Order Item (low value)
{
  productId: 'prod_no_override',  // No product override
  supplierId: 'sup_with_policy',  // Supplier with minCommission policy
  partnerId: 'ptr_test',
  price: 10000,  // Low price
  quantity: 1,
  orderDate: '2025-11-07'
}

// Raw commission: 10000 * 1 * 5% = 500
// Min cap: 5000
// Final commission: 5000
```

**Expected Result 6B**:
| Field | Expected Value | Reason |
|-------|----------------|--------|
| `resolutionLevel` | `supplier` | Supplier policy selected |
| `policyId` | `pol_min_test` | Supplier policy with min cap |
| `commissionRate` | `5.0` | Supplier policy rate |
| `rawCommission` | `500` | Before cap |
| `commissionAmount` | `5000` | **Raised to minCommission** |
| `minCommission` | `5000` | Cap applied |

**Validation**:
- [ ] Max commission cap applied when raw > max
- [ ] Min commission cap applied when raw < min
- [ ] Policy snapshot includes cap values
- [ ] Commission calculation logic correct

---

## Edge Case Tests

### Edge Case 1: Policy Expires During Order Processing

**Scenario**: Policy is valid when order placed, expires before settlement calculated

**Setup**:
```sql
-- Policy expires at midnight
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status, startDate, endDate)
VALUES ('pol_expiring_soon', 'SUPPLIER-EXPIRING', 'SUPPLIER', 'PERCENTAGE', 18.00, 'active', '2025-01-01', '2025-11-07 23:59:59');

UPDATE suppliers SET policyId = 'pol_expiring_soon' WHERE id = 'sup_with_policy';
```

**Test**:
```typescript
// Order placed before expiry
{
  productId: 'prod_no_override',
  supplierId: 'sup_with_policy',
  partnerId: 'ptr_test',
  orderDate: '2025-11-07 10:00:00',  // Before expiry
  price: 50000,
  quantity: 1
}

// Settlement calculated after expiry
settlementDate: '2025-11-08 10:00:00'  // After expiry
```

**Expected Behavior**:
- Commission uses policy snapshot from order time
- Snapshot remains valid even after policy expires
- Commission calculation unaffected by policy expiry

**Validation**:
- [ ] Snapshot created at order time
- [ ] Snapshot is immutable
- [ ] Settlement uses snapshot, not live policy
- [ ] No recalculation when policy expires

---

### Edge Case 2: Policy Updated After Order

**Scenario**: Policy rate changes after order placed but before settlement

**Setup**:
```sql
-- Initial policy
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status)
VALUES ('pol_updatable', 'SUPPLIER-UPDATABLE', 'SUPPLIER', 'PERCENTAGE', 10.00, 'active');

UPDATE suppliers SET policyId = 'pol_updatable' WHERE id = 'sup_with_policy';

-- Order placed with 10% rate
-- ... order created ...

-- Policy updated to 15%
UPDATE commission_policies SET commissionRate = 15.00 WHERE id = 'pol_updatable';
```

**Expected Behavior**:
- Existing order commission remains at 10% (snapshot)
- New orders use 15%
- No retroactive updates

**Validation**:
- [ ] Old order commission = 10%
- [ ] New order commission = 15%
- [ ] Snapshot immutable
- [ ] No recalculation

---

### Edge Case 3: Feature Flag Disabled

**Scenario**: `ENABLE_SUPPLIER_POLICY=false`

**Setup**:
```bash
ENABLE_SUPPLIER_POLICY=false
```

**Test**:
```typescript
// Product with override
{
  productId: 'prod_with_override',  // Has product override
  supplierId: 'sup_with_policy',    // Has supplier policy
  partnerId: 'ptr_test',
  orderDate: '2025-11-07'
}
```

**Expected Behavior**:
- Product/supplier policy lookup **skipped**
- Jump directly to tier → default resolution
- `resolutionLevel` = `default` (or `tier` if enabled)
- Existing policy links preserved (data not deleted)

**Validation**:
- [ ] Product policy lookup skipped
- [ ] Supplier policy lookup skipped
- [ ] Tier policy checked (if enabled)
- [ ] Default policy selected
- [ ] Feature flag respected

---

### Edge Case 4: Database Connection Failure

**Scenario**: Policy lookup fails due to DB error

**Setup**:
- Simulate database timeout or connection error during policy lookup

**Expected Behavior**:
- Try fallback to cached default policy
- If cache miss, trigger safe mode (0%)
- Log error: `policy_resolution_error`
- Increment metric: `policy_resolution_failures_total`

**Validation**:
- [ ] Error caught and handled gracefully
- [ ] Fallback to cached policy if available
- [ ] Safe mode if cache miss
- [ ] Error logged with context
- [ ] Metric incremented
- [ ] No exception thrown to caller

---

### Edge Case 5: Policy Resolution Timeout

**Scenario**: Policy lookup exceeds `POLICY_RESOLUTION_TIMEOUT_MS`

**Setup**:
```bash
POLICY_RESOLUTION_TIMEOUT_MS=100
```

**Test**: Simulate slow database query (>100ms)

**Expected Behavior**:
- Resolution aborted after 100ms
- Fallback to cached default policy
- If cache miss, trigger safe mode (0%)
- Warning logged: `policy_resolution_timeout`

**Validation**:
- [ ] Timeout protection works
- [ ] Resolution aborted at 100ms
- [ ] Fallback or safe mode triggered
- [ ] Warning logged
- [ ] No blocking wait

---

### Edge Case 6: Multiple Policies at Same Level (Data Inconsistency)

**Scenario**: Product has 2 policies linked (should not happen, but handle gracefully)

**Setup**:
```sql
-- Simulate data inconsistency (manual SQL)
INSERT INTO products (id, sku, name, supplierId, policyId)
VALUES ('prod_duplicate', 'PROD-DUP', 'Duplicate Widget', 'sup_with_policy', 'pol_product_active');

-- Manually insert duplicate policy reference (bypassing application logic)
-- This simulates corrupted data
```

**Expected Behavior**:
- Select policy with highest `priority` field
- If tied, select most recently created (`createdAt DESC`)
- Log warning: `multiple_policies_at_same_level`

**Validation**:
- [ ] First policy selected (by priority/date)
- [ ] Warning logged
- [ ] Commission calculated correctly
- [ ] No error thrown

---

## Integration Tests

### Integration Test 1: End-to-End Order Flow

**Steps**:
1. Partner places order via API
2. Order items created with product/supplier references
3. Commission calculation triggered
4. Policy resolution performed
5. Commission snapshot saved
6. Settlement calculation includes snapshot

**Validation**:
- [ ] Order created successfully
- [ ] Policy resolved correctly
- [ ] Snapshot saved in `commissions.metadata`
- [ ] Settlement includes `appliedPolicy`
- [ ] All fields correct

---

### Integration Test 2: Admin Policy Linkage

**Steps**:
1. Admin creates new supplier policy via Admin UI
2. Admin links policy to supplier
3. Partner places order for product from that supplier
4. Commission uses new supplier policy

**Validation**:
- [ ] Policy created successfully
- [ ] Policy linked to supplier
- [ ] Order commission uses supplier policy
- [ ] `resolutionLevel` = `supplier`
- [ ] API response includes policy details

---

### Integration Test 3: Product Override Priority

**Steps**:
1. Supplier has policy (15%)
2. Admin creates product override (25%)
3. Admin links product override
4. Partner places order for that product
5. Commission uses product override (not supplier policy)

**Validation**:
- [ ] Product override created
- [ ] Product override linked
- [ ] Order commission uses product policy (25%)
- [ ] `resolutionLevel` = `product`
- [ ] Supplier policy ignored

---

## Performance Tests

### Performance Test 1: Policy Resolution Latency

**Target**: P95 < 10ms

**Method**:
- Generate 1000 concurrent policy resolution requests
- Measure resolution time for each
- Calculate P95, P99 latencies

**Validation**:
- [ ] P95 < 10ms
- [ ] P99 < 20ms
- [ ] No timeouts

---

### Performance Test 2: Settlement Calculation with Policy Snapshots

**Target**: P95 < 50ms (including DB writes)

**Method**:
- Generate settlement for 100 order items
- Measure total calculation time
- Include policy resolution + commission calc + DB write

**Validation**:
- [ ] P95 < 50ms
- [ ] No timeouts
- [ ] All snapshots saved correctly

---

## Test Execution Checklist

### Unit Tests
- [ ] PolicyResolutionService.resolve() - all 6 scenarios
- [ ] PolicyResolutionService.validatePolicy() - date range checks
- [ ] SettlementService.calculateCommission() - with policy resolution
- [ ] Commission snapshot creation
- [ ] Min/max cap application

### Integration Tests
- [ ] End-to-end order flow with policy resolution
- [ ] Admin policy linkage → order commission
- [ ] Product override priority
- [ ] API contract compliance

### Edge Case Tests
- [ ] Expired policy fallback
- [ ] Policy updated after order (immutability)
- [ ] Feature flag disabled
- [ ] Database error handling
- [ ] Timeout protection
- [ ] Multiple policies at same level

### Performance Tests
- [ ] Policy resolution P95 < 10ms
- [ ] Settlement calculation P95 < 50ms
- [ ] 1000 concurrent requests

### Monitoring Tests
- [ ] Structured logs emitted correctly
- [ ] Prometheus metrics collected
- [ ] Alerts trigger on failures

---

## Test Data Cleanup

After testing, clean up test data:
```sql
-- Delete test policies
DELETE FROM commission_policies WHERE policyCode LIKE '%TEST%';

-- Unlink test policies
UPDATE suppliers SET policyId = NULL WHERE id LIKE 'sup_%';
UPDATE products SET policyId = NULL WHERE id LIKE 'prod_%';

-- Delete test orders (if applicable)
DELETE FROM orders WHERE partnerId = 'ptr_test';
```

---

## Success Criteria

**All tests must pass** before moving to staging:
- [ ] 6 core scenarios pass
- [ ] 6 edge cases handled correctly
- [ ] 3 integration tests pass
- [ ] Performance targets met
- [ ] Monitoring validated
- [ ] Zero regressions in existing tests

---

## Version History

- **1.0** (2025-11-07): Initial test matrix for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
