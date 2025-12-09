# Commission Policy Rules & Priority System
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document defines the commission policy resolution system for the O4O dropshipping platform. It establishes a clear priority hierarchy for policy application when multiple policies may apply to a single transaction.

---

## Policy Resolution Priority

When calculating commission for an order item, the system evaluates policies in the following priority order:

### Priority Hierarchy (Highest to Lowest)

1. **🎯 Product Policy (Override)**
   - **Scope**: Specific product
   - **Purpose**: Special promotions, premium products, clearance items
   - **Use Case**: "Double commission on Product ABC for Q4"
   - **Database**: `products.policyId`

2. **🏢 Supplier Policy**
   - **Scope**: All products from a specific supplier
   - **Purpose**: Supplier-specific commission agreements
   - **Use Case**: "15% commission for all Supplier XYZ products"
   - **Database**: `suppliers.policyId`

3. **⭐ Partner Tier Policy** *(if implemented)*
   - **Scope**: Partner tier level (Bronze, Silver, Gold, Platinum)
   - **Purpose**: Reward high-performing partners
   - **Use Case**: "Gold partners get 12% base commission"
   - **Database**: `partner_tiers.policyId` or `partners.tierId → tier.policyId`

4. **📋 Default Policy**
   - **Scope**: Platform-wide fallback
   - **Purpose**: Baseline commission when no specific policy applies
   - **Use Case**: "10% standard commission"
   - **Database**: `commission_policies WHERE policyType = 'DEFAULT' AND status = 'active'`

### 🔒 Safe Mode

If **no policy** matches at any level:
- **Commission**: 0%
- **Action**: Log warning with context (orderId, productId, partnerId)
- **Metric**: Increment `policy_resolution_failures` counter

---

## Decision Table

| Product Policy | Supplier Policy | Tier Policy | Default Policy | **Result** |
|----------------|-----------------|-------------|----------------|------------|
| ✅ Active | ✅ Active | ✅ Active | ✅ Active | **Product Policy** |
| ❌ None | ✅ Active | ✅ Active | ✅ Active | **Supplier Policy** |
| ❌ None | ❌ None | ✅ Active | ✅ Active | **Tier Policy** |
| ❌ None | ❌ None | ❌ None | ✅ Active | **Default Policy** |
| ❌ None | ❌ None | ❌ None | ❌ None | **0% + Warning** |
| ✅ Expired | ✅ Active | - | - | **Supplier Policy** |
| ❌ None | ✅ Expired | ✅ Active | ✅ Active | **Tier Policy** |

**Rule**: First matching **active & valid** policy is selected. No policy mixing.

---

## Policy Validation Rules

### 1. Status Check
```typescript
policy.status === 'active'
```

### 2. Date Range Check
```typescript
const now = new Date();
const isValid =
  (!policy.startDate || policy.startDate <= now) &&
  (!policy.endDate || policy.endDate >= now);
```

### 3. Policy Type Match
```typescript
const validTypes = ['DEFAULT', 'TIER', 'SUPPLIER', 'PRODUCT'];
validTypes.includes(policy.policyType);
```

---

## Lookup Algorithm

### Pseudocode
```typescript
function lookupEffectivePolicy(orderItem: OrderItem): CommissionPolicy | null {
  const { productId, supplierId, partnerId } = orderItem;

  // 1. Check Product Override
  const productPolicy = findPolicyByProductId(productId);
  if (productPolicy && isValid(productPolicy)) {
    return productPolicy;
  }

  // 2. Check Supplier Policy
  const supplierPolicy = findPolicyBySupplierId(supplierId);
  if (supplierPolicy && isValid(supplierPolicy)) {
    return supplierPolicy;
  }

  // 3. Check Partner Tier Policy (if tier system enabled)
  if (ENABLE_TIER_POLICY) {
    const tierPolicy = findPolicyByPartnerTier(partnerId);
    if (tierPolicy && isValid(tierPolicy)) {
      return tierPolicy;
    }
  }

  // 4. Fallback to Default
  const defaultPolicy = findDefaultPolicy();
  if (defaultPolicy && isValid(defaultPolicy)) {
    return defaultPolicy;
  }

  // 5. Safe Mode
  logger.warn('No valid policy found', { productId, supplierId, partnerId });
  metrics.increment('policy_resolution_failures');
  return null; // Triggers 0% commission
}

function isValid(policy: CommissionPolicy): boolean {
  if (policy.status !== 'active') return false;

  const now = new Date();
  if (policy.startDate && policy.startDate > now) return false;
  if (policy.endDate && policy.endDate < now) return false;

  return true;
}
```

---

## Commission Snapshot

When a policy is applied, capture a **snapshot** for auditability:

### Snapshot Schema
```typescript
interface CommissionSnapshot {
  policyId: string;
  policyCode: string;
  policyType: 'DEFAULT' | 'TIER' | 'SUPPLIER' | 'PRODUCT';
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionRate?: number;      // For PERCENTAGE
  commissionAmount?: number;     // For FIXED
  minCommission?: number;
  maxCommission?: number;
  appliedAt: Date;
  resolutionLevel: 'product' | 'supplier' | 'tier' | 'default' | 'safe_mode';
  orderId: string;
  orderItemId: string;
  calculatedCommission: number;
}
```

### Storage
- **During Calculation**: Store in `commissions.metadata.policySnapshot`
- **Read-Only**: Never modify after creation
- **Audit Trail**: Link to original policy record via `policyId`

---

## Edge Cases & Handling

### Case 1: Multiple Policies at Same Level
**Scenario**: Product has 2 policies (shouldn't happen)
**Handling**:
- Select policy with highest `priority` field
- If tied, select most recently created (`createdAt DESC`)
- Log warning about data inconsistency

### Case 2: Policy Expires During Order Processing
**Scenario**: Policy valid when order placed, expired during settlement
**Handling**:
- Use snapshot from order creation time
- Snapshot is immutable, so commission remains valid
- Settlement uses snapshot, not live policy

### Case 3: Policy Updated After Order
**Scenario**: Policy rate changes from 10% → 15% after order placed
**Handling**:
- Commission already calculated uses 10% (snapshot)
- New orders use 15%
- No retroactive updates (immutable snapshots)

### Case 4: Circular Policy References
**Scenario**: Supplier policy references tier policy (invalid)
**Handling**:
- Validation at policy creation prevents this
- Each policy is self-contained
- No policy inheritance or chaining

### Case 5: Deleted Policy
**Scenario**: Policy deleted but referenced in old commissions
**Handling**:
- Soft delete: Set `status = 'deleted'` instead of hard delete
- Snapshots remain intact
- Historical commissions unaffected

---

## Feature Flag Control

### Environment Variable
```bash
ENABLE_SUPPLIER_POLICY=false  # Default: disabled
```

### Behavior When Disabled
- Skip product/supplier policy lookup
- Jump directly to tier → default resolution
- Existing snapshots remain readable
- No calculation changes for old commissions

### Gradual Rollout
1. **Staging**: `ENABLE_SUPPLIER_POLICY=true` → Test with real data
2. **Production 10%**: Enable for 10% of partners (randomized)
3. **Production 100%**: Full rollout after 7 days stable

---

## Monitoring & Metrics

### Key Metrics

1. **Policy Resolution Success Rate**
   ```
   success_rate = (total_resolutions - failures) / total_resolutions * 100
   ```
   Target: > 99%

2. **Resolution by Level**
   ```
   - product_policy: X%
   - supplier_policy: Y%
   - tier_policy: Z%
   - default_policy: W%
   ```
   Target: < 1% default (most should have specific policies)

3. **Resolution Latency**
   ```
   P95 < 10ms per lookup
   ```

### Structured Logs

```json
{
  "event": "policy_resolution",
  "level": "info",
  "orderId": "ord_abc123",
  "orderItemId": "item_xyz789",
  "productId": "prod_456",
  "supplierId": "sup_789",
  "partnerId": "ptr_012",
  "appliedPolicy": {
    "id": "pol_def345",
    "code": "SUPPLIER-XYZ-2025",
    "type": "SUPPLIER",
    "rate": 15.0,
    "level": "supplier"
  },
  "evaluatedLevels": ["product", "supplier"],
  "resolutionTimeMs": 3.2,
  "timestamp": "2025-11-07T10:30:00Z"
}
```

### Warning Logs

```json
{
  "event": "policy_resolution_failure",
  "level": "warn",
  "orderId": "ord_abc123",
  "productId": "prod_456",
  "supplierId": "sup_789",
  "partnerId": "ptr_012",
  "reason": "no_policy_found",
  "fallback": "safe_mode_0_percent",
  "timestamp": "2025-11-07T10:30:00Z"
}
```

---

## API Contract Impact

### Settlement Calculation Response
```json
{
  "success": true,
  "data": {
    "settlement": {
      "id": "stl_abc123",
      "totalCommission": 50000,
      "appliedPolicy": {
        "policyId": "pol_def345",
        "policyCode": "SUPPLIER-XYZ-2025",
        "policyType": "SUPPLIER",
        "commissionRate": 15.0,
        "resolutionLevel": "supplier",
        "appliedAt": "2025-11-07T10:30:00Z"
      },
      "items": [...]
    }
  }
}
```

---

## Migration & Rollback

### Phase 8 Migration
- **No schema changes required** (uses existing `policyId` columns)
- **Suppliers**: Connect to policies via Admin UI or API
- **Products**: Optional override via Admin UI or API

### Rollback Plan
1. Set `ENABLE_SUPPLIER_POLICY=false`
2. System reverts to tier → default resolution
3. No data loss (snapshots preserved)
4. Re-enable when issues resolved

---

## Examples

### Example 1: Product Override

**Setup**:
- Product A: `policyId = "pol_product_abc"` (20% commission)
- Supplier X: `policyId = "pol_supplier_xyz"` (15% commission)
- Partner (Gold Tier): Tier policy (12% commission)
- Default: 10% commission

**Result**: **20%** (Product policy wins)

---

### Example 2: Supplier Policy

**Setup**:
- Product B: `policyId = null` (no override)
- Supplier Y: `policyId = "pol_supplier_y"` (18% commission)
- Partner (Silver Tier): Tier policy (11% commission)
- Default: 10% commission

**Result**: **18%** (Supplier policy wins)

---

### Example 3: Expired Product Policy

**Setup**:
- Product C: `policyId = "pol_promo_expired"` (30% commission, **endDate: 2025-10-31**)
- Supplier Z: `policyId = "pol_supplier_z"` (15% commission)
- Order Date: 2025-11-07 (today)

**Result**: **15%** (Supplier policy, because product policy expired)

---

### Example 4: Safe Mode

**Setup**:
- Product D: `policyId = null`
- Supplier (no policy): `policyId = null`
- Partner (no tier): Tier policy N/A
- Default: Policy deleted/inactive

**Result**: **0%** + Warning log

---

## Implementation Checklist

- [ ] Create `lookupEffectivePolicy()` function
- [ ] Add policy validation (`isValid()`)
- [ ] Implement snapshot creation
- [ ] Add structured logging
- [ ] Add metrics (resolution success, level distribution, latency)
- [ ] Feature flag integration (`ENABLE_SUPPLIER_POLICY`)
- [ ] Unit tests (6 scenarios from TEST_MATRIX.md)
- [ ] Integration tests (end-to-end order → commission)
- [ ] Performance tests (P95 < 10ms)
- [ ] Documentation (API contract update)

---

## Version History

- **1.0** (2025-11-07): Initial policy rules for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
