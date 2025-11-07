# Schema & Database Integration for Policy System
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies the database schema requirements for the Phase 8 policy resolution system. It focuses on **policy linkage** without requiring new tables or breaking changes.

---

## Existing Schema Review

### 1. Commission Policies Table

**Table**: `commission_policies`

**Current Schema** (from existing codebase):
```typescript
@Entity('commission_policies')
export class CommissionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  policyCode: string;

  @Column({ type: 'varchar', length: 50 })
  policyType: string; // 'DEFAULT' | 'TIER' | 'SUPPLIER' | 'PRODUCT'

  @Column({ type: 'varchar', length: 50 })
  commissionType: string; // 'PERCENTAGE' | 'FIXED'

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number; // For PERCENTAGE (e.g., 15.00%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionAmount?: number; // For FIXED (e.g., 5000 KRW)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission?: number;

  @Column({ type: 'int', default: 0 })
  priority: number; // Higher number = higher priority (for tie-breaking)

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date; // Policy effective from

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date; // Policy expires after

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active' | 'inactive' | 'deleted'

  @Column({ type: 'json', nullable: true })
  metadata?: any; // Flexible field for additional data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**✅ No changes needed** - Schema already supports all policy types.

---

### 2. Suppliers Table

**Table**: `suppliers`

**Required Addition**:
```typescript
@Column({ type: 'uuid', nullable: true })
policyId?: string; // FK to commission_policies.id

@Column({ type: 'int', nullable: true })
settlementCycleDays?: number; // Optional: e.g., 30 days
```

**Relationship**:
```typescript
@ManyToOne(() => CommissionPolicy, { nullable: true })
@JoinColumn({ name: 'policyId' })
policy?: CommissionPolicy;
```

**Index Recommendation**:
```sql
CREATE INDEX idx_suppliers_policy_id ON suppliers(policyId)
  WHERE policyId IS NOT NULL;
```

---

### 3. Products Table

**Table**: `products`

**Required Addition**:
```typescript
@Column({ type: 'uuid', nullable: true })
policyId?: string; // FK to commission_policies.id (override)
```

**Relationship**:
```typescript
@ManyToOne(() => CommissionPolicy, { nullable: true })
@JoinColumn({ name: 'policyId' })
policy?: CommissionPolicy;
```

**Index Recommendation**:
```sql
CREATE INDEX idx_products_policy_id ON products(policyId)
  WHERE policyId IS NOT NULL;
```

---

### 4. Commissions Table

**Table**: `commissions`

**Snapshot Storage** (using existing `metadata` column):
```typescript
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
    appliedAt: string; // ISO 8601
  };
  [key: string]: any; // Other metadata
};
```

**✅ No schema changes needed** - Uses existing `metadata` JSON column.

---

## Migration Strategy

### Phase 8 Migration

**File**: `apps/api-server/src/migrations/YYYYMMDDHHMMSS-add-supplier-product-policy-links.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierProductPolicyLinks1699344000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add policyId to suppliers
    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS "policyId" UUID,
      ADD COLUMN IF NOT EXISTS "settlementCycleDays" INTEGER;
    `);

    // Add policyId to products
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS "policyId" UUID;
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE suppliers
      ADD CONSTRAINT fk_suppliers_policy
      FOREIGN KEY ("policyId")
      REFERENCES commission_policies(id)
      ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE products
      ADD CONSTRAINT fk_products_policy
      FOREIGN KEY ("policyId")
      REFERENCES commission_policies(id)
      ON DELETE SET NULL;
    `);

    // Add indexes (partial, only for non-null)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_policy_id
      ON suppliers("policyId")
      WHERE "policyId" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_policy_id
      ON products("policyId")
      WHERE "policyId" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_suppliers_policy_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_policy_id;`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS fk_suppliers_policy;`);
    await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_policy;`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS "policyId", DROP COLUMN IF EXISTS "settlementCycleDays";`);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS "policyId";`);
  }
}
```

**✅ Zero-Data Safe**: All columns are nullable, no NOT NULL constraints.

---

## Policy Index Strategy

### 1. Commission Policies (Lookup Optimization)

**Composite Index** for fast policy lookup:
```sql
CREATE INDEX idx_commission_policies_lookup
ON commission_policies(status, "policyType", "startDate", "endDate")
WHERE status = 'active';
```

**Rationale**:
- Filter by `status = 'active'` first (most selective)
- Then by `policyType` (DEFAULT, TIER, SUPPLIER, PRODUCT)
- Date range checks (`startDate`, `endDate`) for validity
- Partial index (only active policies) reduces index size

**Query Pattern**:
```sql
SELECT * FROM commission_policies
WHERE status = 'active'
  AND "policyType" = 'SUPPLIER'
  AND ("startDate" IS NULL OR "startDate" <= NOW())
  AND ("endDate" IS NULL OR "endDate" >= NOW())
LIMIT 1;
```

---

### 2. Suppliers (Policy Linkage)

**Index**:
```sql
CREATE INDEX idx_suppliers_policy_id
ON suppliers("policyId")
WHERE "policyId" IS NOT NULL;
```

**Rationale**:
- Partial index (only suppliers with policies)
- Fast lookup: `SELECT * FROM suppliers WHERE policyId = 'xxx'`

---

### 3. Products (Policy Override)

**Index**:
```sql
CREATE INDEX idx_products_policy_id
ON products("policyId")
WHERE "policyId" IS NOT NULL;
```

**Rationale**:
- Partial index (only products with overrides)
- Fast lookup: `SELECT * FROM products WHERE policyId = 'xxx'`

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│ commission_policies │
│─────────────────────│
│ id (PK)             │
│ policyCode (UQ)     │
│ policyType          │◄─────────┐
│ commissionType      │          │
│ commissionRate      │          │
│ startDate           │          │
│ endDate             │          │
│ status              │          │
└─────────────────────┘          │
                                 │
                                 │ FK
                    ┌────────────┴───────────┐
                    │                        │
         ┌──────────▼──────────┐  ┌─────────▼──────────┐
         │ suppliers           │  │ products           │
         │─────────────────────│  │────────────────────│
         │ id (PK)             │  │ id (PK)            │
         │ policyId (FK) ◄─────┼──┤ policyId (FK)      │
         │ settlementCycleDays │  │ supplierId (FK)    │
         └─────────────────────┘  └────────────────────┘
                    │
                    │
         ┌──────────▼──────────┐
         │ commissions         │
         │─────────────────────│
         │ id (PK)             │
         │ policyId (ref)      │
         │ metadata (JSON)     │
         │  ├─ policySnapshot  │ ◄─── Immutable snapshot
         └─────────────────────┘
```

---

## Data Population Guide

### 1. Create Default Policy

```sql
INSERT INTO commission_policies (
  id,
  "policyCode",
  "policyType",
  "commissionType",
  "commissionRate",
  "status",
  "priority",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'DEFAULT-2025',
  'DEFAULT',
  'PERCENTAGE',
  10.00,
  'active',
  0,
  NOW(),
  NOW()
) ON CONFLICT ("policyCode") DO NOTHING;
```

---

### 2. Create Supplier Policy

```sql
-- Create policy
INSERT INTO commission_policies (
  id,
  "policyCode",
  "policyType",
  "commissionType",
  "commissionRate",
  "status",
  "priority",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'SUPPLIER-ABC-2025',
  'SUPPLIER',
  'PERCENTAGE',
  15.00,
  'active',
  1,
  '2025-01-01 00:00:00',
  '2025-12-31 23:59:59',
  NOW(),
  NOW()
) RETURNING id;

-- Link to supplier
UPDATE suppliers
SET "policyId" = '<policy_id_from_above>',
    "settlementCycleDays" = 30
WHERE code = 'SUP-ABC';
```

---

### 3. Create Product Override

```sql
-- Create policy
INSERT INTO commission_policies (
  id,
  "policyCode",
  "policyType",
  "commissionType",
  "commissionRate",
  "maxCommission",
  "status",
  "priority",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'PRODUCT-XYZ-PROMO-Q4',
  'PRODUCT',
  'PERCENTAGE',
  25.00,
  100000, -- Max 100,000 KRW per order
  'active',
  2,
  '2025-10-01 00:00:00',
  '2025-12-31 23:59:59',
  NOW(),
  NOW()
) RETURNING id;

-- Link to product
UPDATE products
SET "policyId" = '<policy_id_from_above>'
WHERE sku = 'PROD-XYZ-001';
```

---

## Query Patterns

### 1. Lookup Product Policy

```typescript
const product = await productRepo.findOne({
  where: { id: productId },
  relations: ['policy']
});

if (product?.policy && isValid(product.policy)) {
  return product.policy;
}
```

**SQL**:
```sql
SELECT p.*, pol.*
FROM products p
LEFT JOIN commission_policies pol ON p."policyId" = pol.id
WHERE p.id = $1
  AND pol.status = 'active'
  AND (pol."startDate" IS NULL OR pol."startDate" <= NOW())
  AND (pol."endDate" IS NULL OR pol."endDate" >= NOW());
```

---

### 2. Lookup Supplier Policy

```typescript
const supplier = await supplierRepo.findOne({
  where: { id: supplierId },
  relations: ['policy']
});

if (supplier?.policy && isValid(supplier.policy)) {
  return supplier.policy;
}
```

**SQL**:
```sql
SELECT s.*, pol.*
FROM suppliers s
LEFT JOIN commission_policies pol ON s."policyId" = pol.id
WHERE s.id = $1
  AND pol.status = 'active'
  AND (pol."startDate" IS NULL OR pol."startDate" <= NOW())
  AND (pol."endDate" IS NULL OR pol."endDate" >= NOW());
```

---

### 3. Lookup Default Policy

```typescript
const defaultPolicy = await policyRepo.findOne({
  where: {
    policyType: 'DEFAULT',
    status: 'active'
  },
  order: { priority: 'DESC', createdAt: 'DESC' }
});
```

**SQL**:
```sql
SELECT *
FROM commission_policies
WHERE "policyType" = 'DEFAULT'
  AND status = 'active'
  AND ("startDate" IS NULL OR "startDate" <= NOW())
  AND ("endDate" IS NULL OR "endDate" >= NOW())
ORDER BY priority DESC, "createdAt" DESC
LIMIT 1;
```

---

## Performance Considerations

### 1. Index Usage

**Expected query plan**:
```
Index Scan using idx_commission_policies_lookup
  Filter: status = 'active' AND policyType = 'SUPPLIER'
  Rows: ~10 (out of 1000 total policies)
```

### 2. Query Optimization

- **Eager loading**: Load policy with product/supplier in 1 query (LEFT JOIN)
- **Caching**: Cache active policies in Redis (5-minute TTL)
- **Batch lookups**: For order with 10 items, fetch all policies in 2 queries (products + suppliers)

### 3. Estimated Latency

| Operation | Target | Notes |
|-----------|--------|-------|
| Product policy lookup | < 2ms | Index scan |
| Supplier policy lookup | < 2ms | Index scan |
| Default policy lookup | < 1ms | Cached or index scan |
| **Total resolution** | **< 10ms** | All 4 levels + validation |

---

## Migration Rollback

### Rollback Script

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_suppliers_policy_id;
DROP INDEX IF EXISTS idx_products_policy_id;

-- Drop foreign keys
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS fk_suppliers_policy;
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_policy;

-- Drop columns (WARNING: Data loss!)
ALTER TABLE suppliers DROP COLUMN IF EXISTS "policyId";
ALTER TABLE suppliers DROP COLUMN IF EXISTS "settlementCycleDays";
ALTER TABLE products DROP COLUMN IF EXISTS "policyId";
```

**⚠️ Note**: Dropping columns loses policy linkages. Consider soft rollback via Feature Flag instead:
```bash
ENABLE_SUPPLIER_POLICY=false
```

---

## Zero-Data Compatibility

### Current State (Before Migration)
- `suppliers.policyId` = NULL (all suppliers)
- `products.policyId` = NULL (all products)
- Only `DEFAULT` policy exists

### After Migration
- Schema adds nullable columns
- No data changes
- Feature flag OFF → same behavior as before

### Gradual Adoption
1. Create supplier/product policies via Admin UI
2. Link policies to suppliers/products manually
3. Enable feature flag
4. Monitor policy resolution metrics
5. Rollback via flag if issues

**✅ Safe**: No breaking changes, no forced data migration.

---

## Version History

- **1.0** (2025-11-07): Initial schema integration for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
