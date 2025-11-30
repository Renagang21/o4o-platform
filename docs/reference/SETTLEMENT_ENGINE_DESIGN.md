# Settlement Engine Integration Design
**Phase 8 - Supplier Policy Resolution**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies the integration of the policy resolution system into the existing settlement calculation engine. It focuses on **minimal disruption** with feature flag control.

---

## Feature Flag Configuration

### Environment Variable

**File**: `.env` (API Server)

```bash
# Phase 8 Feature Flags
ENABLE_SUPPLIER_POLICY=false          # Default: disabled
ENABLE_TIER_POLICY=false              # Default: disabled (for future)
POLICY_RESOLUTION_TIMEOUT_MS=100      # Max time for policy lookup
```

### Usage in Code

```typescript
// utils/env-validator.ts
export const env = {
  // ... existing env methods

  isSupplierPolicyEnabled(): boolean {
    return process.env.ENABLE_SUPPLIER_POLICY === 'true';
  },

  isTierPolicyEnabled(): boolean {
    return process.env.ENABLE_TIER_POLICY === 'true';
  },

  getPolicyResolutionTimeout(): number {
    return parseInt(process.env.POLICY_RESOLUTION_TIMEOUT_MS || '100', 10);
  }
};
```

---

## Policy Resolution Service

### Service Interface

**File**: `services/policyResolution.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionPolicy } from '../entities/CommissionPolicy';
import { Product } from '../entities/Product';
import { Supplier } from '../entities/Supplier';
import { Partner } from '../entities/Partner';
import { env } from '../utils/env-validator';
import logger from '../utils/logger';

export interface PolicyResolutionContext {
  productId: string;
  supplierId: string;
  partnerId: string;
  orderId: string;
  orderItemId?: string;
  orderDate: Date;
}

export interface ResolvedPolicy {
  policy: CommissionPolicy;
  resolutionLevel: 'product' | 'supplier' | 'tier' | 'default' | 'safe_mode';
  resolutionTimeMs: number;
}

@Injectable()
export class PolicyResolutionService {
  constructor(
    @InjectRepository(CommissionPolicy)
    private policyRepo: Repository<CommissionPolicy>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,

    @InjectRepository(Partner)
    private partnerRepo: Repository<Partner>
  ) {}

  /**
   * Main entry point for policy resolution
   * Returns resolved policy or null (safe mode 0%)
   */
  async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
    const startTime = Date.now();

    try {
      // Feature flag check
      if (!env.isSupplierPolicyEnabled()) {
        return await this.resolveLegacy(context, startTime);
      }

      // Priority 1: Product Policy
      const productPolicy = await this.resolveProductPolicy(context);
      if (productPolicy) {
        return {
          policy: productPolicy,
          resolutionLevel: 'product',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Priority 2: Supplier Policy
      const supplierPolicy = await this.resolveSupplierPolicy(context);
      if (supplierPolicy) {
        return {
          policy: supplierPolicy,
          resolutionLevel: 'supplier',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Priority 3: Tier Policy (if enabled)
      if (env.isTierPolicyEnabled()) {
        const tierPolicy = await this.resolveTierPolicy(context);
        if (tierPolicy) {
          return {
            policy: tierPolicy,
            resolutionLevel: 'tier',
            resolutionTimeMs: Date.now() - startTime
          };
        }
      }

      // Priority 4: Default Policy
      const defaultPolicy = await this.resolveDefaultPolicy(context);
      if (defaultPolicy) {
        return {
          policy: defaultPolicy,
          resolutionLevel: 'default',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Safe Mode: No policy found
      logger.warn('Policy resolution failed - entering safe mode', {
        productId: context.productId,
        supplierId: context.supplierId,
        partnerId: context.partnerId,
        orderId: context.orderId
      });

      return null; // Triggers 0% commission

    } catch (error) {
      logger.error('Policy resolution error', {
        error: error.message,
        context
      });

      // Fallback to default policy on error
      const defaultPolicy = await this.resolveDefaultPolicy(context);
      if (defaultPolicy) {
        return {
          policy: defaultPolicy,
          resolutionLevel: 'default',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      return null; // Safe mode
    }
  }

  /**
   * Priority 1: Resolve product-level policy (override)
   */
  private async resolveProductPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const product = await this.productRepo.findOne({
      where: { id: context.productId },
      relations: ['policy']
    });

    if (!product?.policy) {
      return null;
    }

    return this.validatePolicy(product.policy, context.orderDate) ? product.policy : null;
  }

  /**
   * Priority 2: Resolve supplier-level policy
   */
  private async resolveSupplierPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: context.supplierId },
      relations: ['policy']
    });

    if (!supplier?.policy) {
      return null;
    }

    return this.validatePolicy(supplier.policy, context.orderDate) ? supplier.policy : null;
  }

  /**
   * Priority 3: Resolve tier-level policy
   * NOTE: Implementation depends on tier system design
   */
  private async resolveTierPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    // TODO: Implement when tier system is ready
    // const partner = await this.partnerRepo.findOne({
    //   where: { id: context.partnerId },
    //   relations: ['tier', 'tier.policy']
    // });
    // return partner?.tier?.policy;

    return null; // Not implemented yet
  }

  /**
   * Priority 4: Resolve default policy
   */
  private async resolveDefaultPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const defaultPolicy = await this.policyRepo.findOne({
      where: {
        policyType: 'DEFAULT',
        status: 'active'
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });

    if (!defaultPolicy) {
      return null;
    }

    return this.validatePolicy(defaultPolicy, context.orderDate) ? defaultPolicy : null;
  }

  /**
   * Legacy resolution (when feature flag is OFF)
   * Falls back to default policy only
   */
  private async resolveLegacy(context: PolicyResolutionContext, startTime: number): Promise<ResolvedPolicy | null> {
    const defaultPolicy = await this.resolveDefaultPolicy(context);

    if (defaultPolicy) {
      return {
        policy: defaultPolicy,
        resolutionLevel: 'default',
        resolutionTimeMs: Date.now() - startTime
      };
    }

    return null;
  }

  /**
   * Validate policy is active and within date range
   */
  private validatePolicy(policy: CommissionPolicy, orderDate: Date): boolean {
    // Status check
    if (policy.status !== 'active') {
      return false;
    }

    // Start date check
    if (policy.startDate && policy.startDate > orderDate) {
      return false;
    }

    // End date check
    if (policy.endDate && policy.endDate < orderDate) {
      return false;
    }

    return true;
  }

  /**
   * Create immutable snapshot of resolved policy
   */
  createSnapshot(resolved: ResolvedPolicy, calculatedCommission: number) {
    return {
      policyId: resolved.policy.id,
      policyCode: resolved.policy.policyCode,
      policyType: resolved.policy.policyType,
      commissionType: resolved.policy.commissionType,
      commissionRate: resolved.policy.commissionRate,
      commissionAmount: resolved.policy.commissionAmount,
      minCommission: resolved.policy.minCommission,
      maxCommission: resolved.policy.maxCommission,
      resolutionLevel: resolved.resolutionLevel,
      appliedAt: new Date().toISOString(),
      calculatedCommission
    };
  }
}
```

---

## Settlement Calculation Integration

### Modified Settlement Service

**File**: `services/settlement.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PolicyResolutionService } from './policyResolution.service';
import logger from '../utils/logger';

@Injectable()
export class SettlementService {
  constructor(
    private policyResolutionService: PolicyResolutionService,
    // ... other dependencies
  ) {}

  /**
   * Calculate commission for order item
   */
  async calculateCommission(orderItem: OrderItem): Promise<CommissionCalculation> {
    const startTime = Date.now();

    // Resolve policy (with feature flag control)
    const resolved = await this.policyResolutionService.resolve({
      productId: orderItem.productId,
      supplierId: orderItem.supplierId,
      partnerId: orderItem.partnerId,
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      orderDate: orderItem.createdAt
    });

    // Safe mode: No policy found
    if (!resolved) {
      logger.warn('Commission calculation: Safe mode (0%)', {
        orderItemId: orderItem.id,
        productId: orderItem.productId
      });

      return {
        commissionAmount: 0,
        commissionRate: 0,
        appliedPolicy: null,
        resolutionLevel: 'safe_mode'
      };
    }

    // Calculate commission based on policy type
    let commissionAmount = 0;

    if (resolved.policy.commissionType === 'PERCENTAGE') {
      const rate = resolved.policy.commissionRate || 0;
      commissionAmount = (orderItem.price * orderItem.quantity * rate) / 100;
    } else if (resolved.policy.commissionType === 'FIXED') {
      commissionAmount = resolved.policy.commissionAmount || 0;
    }

    // Apply min/max constraints
    if (resolved.policy.minCommission && commissionAmount < resolved.policy.minCommission) {
      commissionAmount = resolved.policy.minCommission;
    }

    if (resolved.policy.maxCommission && commissionAmount > resolved.policy.maxCommission) {
      commissionAmount = resolved.policy.maxCommission;
    }

    // Create snapshot
    const snapshot = this.policyResolutionService.createSnapshot(resolved, commissionAmount);

    // Log structured event
    logger.info('policy_resolution', {
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      productId: orderItem.productId,
      supplierId: orderItem.supplierId,
      partnerId: orderItem.partnerId,
      appliedPolicy: {
        id: resolved.policy.id,
        code: resolved.policy.policyCode,
        type: resolved.policy.policyType,
        rate: resolved.policy.commissionRate,
        level: resolved.resolutionLevel
      },
      calculatedCommission: commissionAmount,
      resolutionTimeMs: resolved.resolutionTimeMs,
      totalCalculationTimeMs: Date.now() - startTime
    });

    return {
      commissionAmount,
      commissionRate: resolved.policy.commissionRate,
      appliedPolicy: snapshot,
      resolutionLevel: resolved.resolutionLevel
    };
  }
}

interface CommissionCalculation {
  commissionAmount: number;
  commissionRate?: number;
  appliedPolicy: any | null;
  resolutionLevel: string;
}
```

---

## Database Integration

### Commission Entity Update

**File**: `entities/Commission.ts`

```typescript
// Add to existing metadata structure
@Column({ type: 'json', nullable: true })
metadata?: {
  policySnapshot?: {
    policyId: string;
    policyCode: string;
    policyType: 'DEFAULT' | 'TIER' | 'SUPPLIER' | 'PRODUCT';
    commissionType: 'PERCENTAGE' | 'FIXED';
    commissionRate?: number;
    commissionAmount?: number;
    minCommission?: number;
    maxCommission?: number;
    resolutionLevel: 'product' | 'supplier' | 'tier' | 'default' | 'safe_mode';
    appliedAt: string;
    calculatedCommission: number;
  };
  [key: string]: any;
};
```

**Save snapshot**:
```typescript
const commission = new Commission();
commission.commissionAmount = calculation.commissionAmount;
commission.metadata = {
  policySnapshot: calculation.appliedPolicy
};
await commissionRepo.save(commission);
```

---

## Monitoring Integration

### Metrics Collection

**File**: `services/prometheus-metrics.service.ts`

```typescript
import { Histogram, Counter, Gauge } from 'prom-client';

// Policy resolution duration
const policyResolutionDuration = new Histogram({
  name: 'policy_resolution_duration_ms',
  help: 'Time taken to resolve commission policy',
  labelNames: ['resolution_level', 'success'],
  buckets: [1, 2, 5, 10, 20, 50, 100]
});

// Policy resolution by level
const policyResolutionByLevel = new Counter({
  name: 'policy_resolution_total',
  help: 'Total policy resolutions by level',
  labelNames: ['resolution_level']
});

// Policy resolution failures
const policyResolutionFailures = new Counter({
  name: 'policy_resolution_failures_total',
  help: 'Total policy resolution failures (safe mode)',
  labelNames: ['reason']
});

// Usage in service
policyResolutionDuration.observe(
  { resolution_level: resolved.resolutionLevel, success: 'true' },
  resolved.resolutionTimeMs
);

policyResolutionByLevel.inc({ resolution_level: resolved.resolutionLevel });
```

---

## Error Handling

### Timeout Protection

```typescript
async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
  const timeout = env.getPolicyResolutionTimeout();

  const resolutionPromise = this.performResolution(context);

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      logger.warn('Policy resolution timeout', { timeout, context });
      resolve(null);
    }, timeout);
  });

  return Promise.race([resolutionPromise, timeoutPromise]);
}
```

### Database Connection Errors

```typescript
try {
  const policy = await this.policyRepo.findOne({ ... });
} catch (error) {
  logger.error('Database error during policy resolution', { error });

  // Fallback to cached default policy or safe mode
  return this.getCachedDefaultPolicy() || null;
}
```

---

## Testing Hooks

### Test Mode Configuration

```bash
# .env.test
ENABLE_SUPPLIER_POLICY=true
POLICY_RESOLUTION_TIMEOUT_MS=5000  # Longer timeout for tests
```

### Mock Policy Resolution

```typescript
// For unit tests
class MockPolicyResolutionService {
  async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
    return {
      policy: mockPolicy,
      resolutionLevel: 'default',
      resolutionTimeMs: 1
    };
  }
}
```

---

## Rollback Strategy

### Immediate Rollback (Feature Flag)

```bash
# On API server
ssh o4o-api
cd /home/ubuntu/o4o-platform
echo "ENABLE_SUPPLIER_POLICY=false" >> .env
pm2 restart o4o-api-server
```

**Effect**:
- Policy resolution bypassed
- Falls back to default policy only
- No code deployment needed
- Reversible instantly

### Code Rollback (if flag fails)

```bash
git revert <commit_hash>
git push origin main
# GitHub Actions deploys automatically
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Policy resolution | P95 < 10ms | Histogram `policy_resolution_duration_ms` |
| Total commission calc | P95 < 50ms | Include DB writes |
| Resolution success rate | > 99% | `(total - failures) / total * 100` |
| Cache hit rate | > 80% | (future Redis integration) |

---

## Migration Checklist

- [ ] Add `PolicyResolutionService` to `services/`
- [ ] Update `SettlementService.calculateCommission()`
- [ ] Add feature flag checks to `env-validator.ts`
- [ ] Add Prometheus metrics to `prometheus-metrics.service.ts`
- [ ] Update `Commission.metadata` type definition
- [ ] Add structured logging for policy resolution
- [ ] Add timeout protection
- [ ] Add error handling (DB, timeout, missing data)
- [ ] Write unit tests (6 scenarios from TEST_MATRIX.md)
- [ ] Write integration tests (end-to-end)
- [ ] Document rollback procedure

---

## Version History

- **1.0** (2025-11-07): Initial settlement engine design for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
