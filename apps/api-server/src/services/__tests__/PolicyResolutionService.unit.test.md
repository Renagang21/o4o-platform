# PolicyResolutionService Unit Test Specification

**Phase 8: Supplier Policy Integration**
**Created**: 2025-11-07
**Status**: Ready for Implementation

---

## Overview

This document specifies comprehensive unit tests for the `PolicyResolutionService` based on TEST_MATRIX.md requirements. The full implementation is available in `PolicyResolutionService.test.ts` but requires Jest/ESM configuration fixes to run.

---

## Test Coverage Summary

### Core Scenarios (6 tests)
1. **Product Policy Override** - Highest priority test
2. **Supplier Policy** - Second priority test
3. **Default Policy Fallback** - Fallback mechanism test
4. **Expired Policy Falls Back** - Date validation test
5. **Safe Mode** - No policy found test
6. **Min/Max Commission Caps** - Cap application test

### Edge Cases (5 tests)
1. **Policy Expires During Processing** - Snapshot immutability test
2. **Policy Updated After Order** - Historical snapshot test
3. **Feature Flag Disabled** - Legacy mode test
4. **Database Connection Failure** - Error handling test
5. **Policy Resolution Timeout** - Performance test

### Additional Tests
- **Policy Validation** (3 tests) - Status and date range checks
- **Snapshot Creation** (2 tests) - Immutable snapshot generation
- **Priority Hierarchy** (2 tests) - Resolution order verification
- **Metrics Recording** (2 tests) - Observability verification

**Total**: 19 comprehensive unit tests

---

## Detailed Test Specifications

### Scenario 1: Product Policy Override

**Test**: `should select product policy when product has override and supplier has policy`

**Setup**:
```typescript
const productPolicy = {
  id: 'pol_product_active',
  policyType: PolicyType.PRODUCT_SPECIFIC,
  commissionRate: 25.0,
  maxCommission: 100000,
  status: PolicyStatus.ACTIVE
};

const supplierPolicy = {
  id: 'pol_supplier_active',
  policyType: PolicyType.TIER_BASED,
  commissionRate: 15.0,
  status: PolicyStatus.ACTIVE
};

const context = {
  productId: 'product-id',
  supplierId: 'supplier-id',
  orderDate: new Date('2025-11-07')
};
```

**Mock Configuration**:
- Product has `policy: productPolicy`
- Supplier has `policy: supplierPolicy`
- `mockProductRepo.findOne` returns product with policy

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).not.toBeNull();
expect(result.resolutionLevel).toBe('product');
expect(result.policy.id).toBe('pol_product_active');
expect(result.policy.commissionRate).toBe(25.0);
expect(result.policy.maxCommission).toBe(100000);
```

**Metrics Verification**:
```typescript
expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
  source: 'product',
  durationMs: expect.any(Number),
  success: true
});
```

---

### Scenario 2: Supplier Policy

**Test**: `should select supplier policy when product has no override`

**Setup**:
```typescript
const supplierPolicy = {
  id: 'pol_supplier_active',
  policyType: PolicyType.TIER_BASED,
  commissionRate: 15.0,
  status: PolicyStatus.ACTIVE
};

const context = {
  productId: 'product-id',
  supplierId: 'supplier-id',
  orderDate: new Date('2025-11-07')
};
```

**Mock Configuration**:
- Product has `policy: undefined` (no override)
- Supplier has `policy: supplierPolicy`
- `mockProductRepo.findOne` returns product without policy
- `mockSupplierRepo.findOne` returns supplier with policy

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).not.toBeNull();
expect(result.resolutionLevel).toBe('supplier');
expect(result.policy.id).toBe('pol_supplier_active');
expect(result.policy.commissionRate).toBe(15.0);
```

**Repo Call Verification**:
```typescript
expect(mockSupplierRepo.findOne).toHaveBeenCalledWith({
  where: { id: 'supplier-id' },
  relations: ['policy']
});
```

---

### Scenario 3: Default Policy Fallback

**Test**: `should select default policy when no product/supplier policy found`

**Setup**:
```typescript
const defaultPolicy = {
  id: 'pol_default',
  policyCode: 'DEFAULT-2025',
  policyType: PolicyType.DEFAULT,
  commissionRate: 10.0,
  status: PolicyStatus.ACTIVE
};
```

**Mock Configuration**:
- Product has `policy: undefined`
- Supplier has `policy: undefined`
- `mockPolicyRepo.findOne` returns default policy

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).not.toBeNull();
expect(result.resolutionLevel).toBe('default');
expect(result.policy.commissionRate).toBe(10.0);
```

**Query Verification**:
```typescript
expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({
  where: {
    policyType: PolicyType.DEFAULT,
    status: PolicyStatus.ACTIVE
  },
  order: {
    priority: 'DESC',
    createdAt: 'DESC'
  }
});
```

---

### Scenario 4: Expired Policy Falls Back

**Test**: `should reject expired policy and fallback to default`

**Setup**:
```typescript
const expiredPolicy = {
  id: 'pol_supplier_expired',
  commissionRate: 20.0,
  status: PolicyStatus.ACTIVE,
  validFrom: new Date('2024-01-01'),
  validUntil: new Date('2024-12-31') // Expired
};

const defaultPolicy = {
  id: 'pol_default',
  policyType: PolicyType.DEFAULT,
  commissionRate: 10.0,
  status: PolicyStatus.ACTIVE
};

const context = {
  orderDate: new Date('2025-11-07') // After expiry
};
```

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).not.toBeNull();
expect(result.resolutionLevel).toBe('default');
expect(result.policy.commissionRate).toBe(10.0);
```

**Validation Logic**:
- Policy's `validUntil < orderDate` → Rejected
- Falls back to next level (default)

---

### Scenario 5: Safe Mode

**Test**: `should return null when no valid policy found at any level`

**Setup**:
```typescript
const inactivePolicy = {
  id: 'pol_default',
  policyType: PolicyType.DEFAULT,
  status: PolicyStatus.INACTIVE // Inactive!
};
```

**Mock Configuration**:
- Product has no policy
- Supplier has no policy
- Default policy is INACTIVE

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).toBeNull(); // Safe mode = 0% commission
```

**Metrics Verification**:
```typescript
expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
  source: 'safe_mode',
  durationMs: expect.any(Number),
  success: true
});
```

---

### Scenario 6: Min/Max Commission Caps

**Test 6A**: `should include maxCommission in resolved policy`

**Setup**:
```typescript
const policyWithMax = {
  commissionRate: 25.0,
  maxCommission: 100000 // Max cap
};

// Order value: 500,000 KRW * 2 = 1,000,000 KRW
// Raw commission: 1,000,000 * 25% = 250,000 KRW
// Capped commission: 100,000 KRW
```

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result.policy.commissionRate).toBe(25.0);
expect(result.policy.maxCommission).toBe(100000);
// Commission capping is done by CommissionPolicy.calculateCommission()
```

**Test 6B**: `should include minCommission in resolved policy`

**Setup**:
```typescript
const policyWithMin = {
  commissionRate: 5.0,
  minCommission: 5000 // Min cap
};

// Order value: 10,000 KRW * 1 = 10,000 KRW
// Raw commission: 10,000 * 5% = 500 KRW
// Raised commission: 5,000 KRW
```

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result.policy.commissionRate).toBe(5.0);
expect(result.policy.minCommission).toBe(5000);
```

---

## Edge Case Tests

### Edge Case 1: Policy Expires During Processing

**Test**: `should use policy snapshot from order time`

**Scenario**: Policy is valid at order time but expires before settlement calculation.

**Setup**:
```typescript
const expiringPolicy = {
  commissionRate: 18.0,
  validFrom: new Date('2025-01-01'),
  validUntil: new Date('2025-11-07T23:59:59') // Expires at midnight
};

const context = {
  orderDate: new Date('2025-11-07T10:00:00') // Before expiry
};
```

**Expected Behavior**:
- Policy is valid at order time → Accepted
- Snapshot preserves policy even after expiry
- Settlement can occur after midnight (2025-11-08) using snapshot

---

### Edge Case 2: Policy Updated After Order

**Test**: `should resolve to current policy at order time`

**Scenario**: Policy rate is 10% at order time, updated to 15% later.

**Expected Behavior**:
- Order placed on 2025-11-07 with 10% policy
- Policy updated to 15% on 2025-11-08
- Existing order commission remains 10% (snapshot)
- New orders use 15%

---

### Edge Case 3: Feature Flag Disabled

**Test**: `should skip product/supplier lookup when feature disabled`

**Setup**:
```typescript
FeatureFlags.isSupplierPolicyEnabled() = false;
```

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result.resolutionLevel).toBe('default');
expect(mockProductRepo.findOne).not.toHaveBeenCalled();
expect(mockSupplierRepo.findOne).not.toHaveBeenCalled();
```

---

### Edge Case 4: Database Connection Failure

**Test**: `should handle product lookup error gracefully`

**Setup**:
```typescript
mockProductRepo.findOne.mockRejectedValue(
  new Error('Database connection timeout')
);
```

**Expected Behavior**:
```typescript
const result = await service.resolve(context);

expect(result).not.toBeNull(); // Fallback to default
expect(result.resolutionLevel).toBe('default');
```

**Metrics Verification**:
```typescript
expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
  source: 'default',
  durationMs: expect.any(Number),
  success: false // Error occurred
});
```

---

### Edge Case 5: Policy Resolution Timeout

**Test**: `should complete resolution within reasonable time`

**Setup**:
```typescript
const startTime = Date.now();
const result = await service.resolve(context);
const duration = Date.now() - startTime;
```

**Expected Behavior**:
```typescript
expect(result).not.toBeNull();
expect(duration).toBeLessThan(100); // 100ms timeout
expect(result.resolutionTimeMs).toBeGreaterThanOrEqual(0);
```

---

## Priority Hierarchy Verification

### Test: Product > Supplier Priority

**Setup**:
```typescript
const productPolicy = { commissionRate: 30.0, priority: 10 };
const supplierPolicy = { commissionRate: 20.0, priority: 100 };
```

**Expected Behavior**:
```typescript
// Product policy wins regardless of priority field value
expect(result.resolutionLevel).toBe('product');
expect(result.policy.commissionRate).toBe(30.0);
```

### Test: Supplier > Default Priority

**Setup**:
```typescript
const supplierPolicy = { commissionRate: 15.0 };
const defaultPolicy = { commissionRate: 10.0 };
```

**Expected Behavior**:
```typescript
expect(result.resolutionLevel).toBe('supplier');
expect(result.policy.commissionRate).toBe(15.0);
```

---

## Snapshot Creation Tests

### Test: Create Immutable Snapshot

**Setup**:
```typescript
const policy = {
  id: 'pol_test',
  policyCode: 'TEST-2025',
  policyType: PolicyType.PRODUCT_SPECIFIC,
  commissionType: CommissionType.PERCENTAGE,
  commissionRate: 25.0,
  minCommission: 1000,
  maxCommission: 50000
};

const resolved = { policy, resolutionLevel: 'product' };
const snapshot = service.createSnapshot(resolved, 12500);
```

**Expected Snapshot**:
```typescript
expect(snapshot).toEqual({
  policyId: 'pol_test',
  policyCode: 'TEST-2025',
  policyType: 'product_specific',
  commissionType: 'percentage',
  commissionRate: 25.0,
  minCommission: 1000,
  maxCommission: 50000,
  resolutionLevel: 'product',
  appliedAt: expect.any(String),
  calculatedCommission: 12500
});
```

---

## Test Execution Instructions

### Running Tests

```bash
# Run all PolicyResolutionService tests
cd /home/sohae21/o4o-platform/apps/api-server
pnpm test PolicyResolutionService.test.ts

# Run with coverage
pnpm test:cov PolicyResolutionService.test.ts

# Run in watch mode
pnpm test:watch PolicyResolutionService.test.ts
```

### Coverage Goals

- **Line Coverage**: ≥ 80%
- **Branch Coverage**: ≥ 75%
- **Function Coverage**: ≥ 90%

### Known Issues

**ESM/Jest Configuration**:
- Current Jest config has issues with `import.meta.url` in `database/connection.ts`
- Requires ESM preset configuration or Jest 29+ with proper ESM support
- Workaround: Mock entire database connection module or use babel-jest

**TypeScript Types**:
- Jest types may not be recognized during ts-jest compilation
- Solution: Add `"types": ["jest", "node"]` to tsconfig.json or jest ts-jest config
- Alternative: Set `diagnostics: false` in ts-jest config

---

## Mock Repository Patterns

### Standard Mock Setup

```typescript
mockProductRepo.findOne.mockResolvedValue({
  id: 'product-id',
  policy: productPolicy
});

mockSupplierRepo.findOne.mockResolvedValue({
  id: 'supplier-id',
  policy: supplierPolicy
});

mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);
```

### Error Simulation

```typescript
mockProductRepo.findOne.mockRejectedValue(
  new Error('Database error')
);
```

### Assertion Patterns

```typescript
expect(mockProductRepo.findOne).toHaveBeenCalledWith({
  where: { id: 'product-id' },
  relations: ['policy']
});

expect(mockProductRepo.findOne).toHaveBeenCalledTimes(1);
expect(mockSupplierRepo.findOne).not.toHaveBeenCalled();
```

---

## Success Criteria

All tests must pass before merging to staging:

- [ ] 6 core scenarios pass
- [ ] 5 edge cases pass
- [ ] Policy validation tests pass
- [ ] Snapshot creation tests pass
- [ ] Priority hierarchy tests pass
- [ ] Metrics recording tests pass
- [ ] Code coverage ≥ 80%
- [ ] No TypeScript compilation errors
- [ ] No runtime errors or unhandled rejections

---

## Version History

- **1.0** (2025-11-07): Initial test specification for Phase 8

---

Generated with Claude Code
