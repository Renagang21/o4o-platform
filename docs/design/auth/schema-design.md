# Authorization Schema Design
**Phase 9 - Seller Authorization System**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies the database schema design for the Phase 9 seller authorization system. It defines the new `seller_authorizations` table and its relationships with existing entities.

---

## Schema Design Principles

1. **Zero-Data Safe**: All new columns are nullable
2. **Audit Trail**: Track who, when, and why for all state changes
3. **Performance**: Indexes on frequently queried columns
4. **Referential Integrity**: Foreign keys with CASCADE/SET NULL behavior
5. **Feature Flag Compatible**: Schema exists even when feature disabled

---

## New Table: `seller_authorizations`

### Purpose

Track authorization requests from sellers to access supplier products.

### Schema Definition

**TypeORM Entity**:
```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Partner } from './Partner'; // Seller is a Partner
import { Product } from './Product';
import { Supplier } from './Supplier';

@Entity('seller_authorizations')
@Index(['sellerId', 'productId'], { unique: true, where: '"status" IN (\'PENDING\', \'APPROVED\')' })
@Index(['supplierId', 'status'])
@Index(['status', 'createdAt'])
export class SellerAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Seller (Partner) requesting access
  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => Partner, { nullable: false })
  @JoinColumn({ name: 'sellerId' })
  seller: Partner;

  // Product being requested
  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  // Supplier who owns the product
  @Column({ type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { nullable: false })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  // Authorization status
  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'],
    default: 'PENDING'
  })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

  // Request details
  @Column({ type: 'text', nullable: true })
  requestMessage?: string; // Optional message from seller

  @CreateDateColumn()
  requestedAt: Date; // When seller submitted request

  // Approval details
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string; // Supplier user ID

  // Rejection details
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  rejectedBy?: string; // Supplier user ID

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason?: string;

  // Revocation details
  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  revokedBy?: string; // Supplier user ID

  @Column({ type: 'varchar', length: 500, nullable: true })
  revocationReason?: string;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata?: {
    sellerTier?: string; // Seller tier at time of request
    sellerRating?: number; // Seller rating at time of request
    autoApproved?: boolean; // If auto-approval was used
    adminOverride?: boolean; // If admin manually approved despite limit
    [key: string]: any;
  };

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### SQL Schema (PostgreSQL)

```sql
CREATE TABLE seller_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  "sellerId" UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "supplierId" UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),

  -- Request
  "requestMessage" TEXT,
  "requestedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Approval
  "approvedAt" TIMESTAMP,
  "approvedBy" UUID,

  -- Rejection
  "rejectedAt" TIMESTAMP,
  "rejectedBy" UUID,
  "rejectionReason" VARCHAR(500),

  -- Revocation
  "revokedAt" TIMESTAMP,
  "revokedBy" UUID,
  "revocationReason" VARCHAR(500),

  -- Metadata
  metadata JSONB,

  -- Timestamps
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_pending_approved UNIQUE ("sellerId", "productId")
    WHERE status IN ('PENDING', 'APPROVED')
);

-- Indexes
CREATE INDEX idx_seller_authorizations_seller_id ON seller_authorizations("sellerId");
CREATE INDEX idx_seller_authorizations_product_id ON seller_authorizations("productId");
CREATE INDEX idx_seller_authorizations_supplier_status ON seller_authorizations("supplierId", status);
CREATE INDEX idx_seller_authorizations_status_created ON seller_authorizations(status, "requestedAt");

-- Comments
COMMENT ON TABLE seller_authorizations IS 'Phase 9: Tracks seller authorization requests for supplier products';
COMMENT ON COLUMN seller_authorizations.status IS 'PENDING: Awaiting review, APPROVED: Access granted, REJECTED: Access denied, REVOKED: Access removed';
COMMENT ON CONSTRAINT unique_pending_approved ON seller_authorizations IS 'Prevents duplicate active requests per seller-product pair';
```

---

## Entity Relationships

### ERD Diagram

```
┌─────────────────────┐
│ partners (sellers)  │
│─────────────────────│
│ id (PK)             │
│ name                │◄─────────┐
│ tierLevel           │          │
│ rating              │          │
└─────────────────────┘          │
                                 │
                                 │ sellerId (FK)
                                 │
┌─────────────────────┐          │
│ products            │          │
│─────────────────────│          │
│ id (PK)             │◄─────┐   │
│ name                │      │   │
│ supplierId (FK)     │───┐  │   │
│ policyId (FK)       │   │  │   │
└─────────────────────┘   │  │   │
                          │  │   │
                          │  │   │ productId (FK)
                          │  │   │
┌─────────────────────┐   │  │   │
│ suppliers           │   │  │   │
│─────────────────────│   │  │   │
│ id (PK)             │◄──┤  │   │
│ name                │   │  │   │
│ policyId (FK)       │   │  │   │
└─────────────────────┘   │  │   │
                          │  │   │
                          │  │   │
           supplierId (FK)│  │   │
                          │  │   │
                          │  │   │
┌────────────────────────────┐  │
│ seller_authorizations      │  │
│────────────────────────────│  │
│ id (PK)                    │  │
│ sellerId (FK) ─────────────┼──┘
│ productId (FK) ────────────┼─────────┘
│ supplierId (FK) ───────────┘
│ status                     │
│ requestMessage             │
│ requestedAt                │
│ approvedAt                 │
│ approvedBy                 │
│ rejectedAt                 │
│ rejectedBy                 │
│ rejectionReason            │
│ revokedAt                  │
│ revokedBy                  │
│ revocationReason           │
│ metadata (JSON)            │
└────────────────────────────┘
```

---

## Migration Script

### TypeORM Migration

**File**: `apps/api-server/src/migrations/YYYYMMDDHHMMSS-create-seller-authorizations.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSellerAuthorizations1699350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create seller_authorizations table
    await queryRunner.createTable(
      new Table({
        name: 'seller_authorizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()'
          },
          {
            name: 'sellerId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'productId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'supplierId',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
            isNullable: false
          },
          {
            name: 'requestMessage',
            type: 'text',
            isNullable: true
          },
          {
            name: 'requestedAt',
            type: 'timestamp',
            default: 'NOW()',
            isNullable: false
          },
          {
            name: 'approvedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'approvedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'rejectedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'rejectedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'rejectionReason',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'revokedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'revokedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'revocationReason',
            type: 'varchar',
            length: '500',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
            isNullable: false
          }
        ]
      }),
      true
    );

    // Add CHECK constraint for status enum
    await queryRunner.query(`
      ALTER TABLE seller_authorizations
      ADD CONSTRAINT check_status_enum
      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'));
    `);

    // Add foreign key: sellerId -> partners(id)
    await queryRunner.createForeignKey(
      'seller_authorizations',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedTableName: 'partners',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    // Add foreign key: productId -> products(id)
    await queryRunner.createForeignKey(
      'seller_authorizations',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    // Add foreign key: supplierId -> suppliers(id)
    await queryRunner.createForeignKey(
      'seller_authorizations',
      new TableForeignKey({
        columnNames: ['supplierId'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    // Add unique partial index (PENDING + APPROVED only)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_seller_product_unique_active
      ON seller_authorizations("sellerId", "productId")
      WHERE status IN ('PENDING', 'APPROVED');
    `);

    // Add composite index for supplier queries
    await queryRunner.createIndex(
      'seller_authorizations',
      new TableIndex({
        name: 'idx_seller_authorizations_supplier_status',
        columnNames: ['supplierId', 'status']
      })
    );

    // Add index for status + date queries
    await queryRunner.createIndex(
      'seller_authorizations',
      new TableIndex({
        name: 'idx_seller_authorizations_status_requested',
        columnNames: ['status', 'requestedAt']
      })
    );

    // Add index for seller queries
    await queryRunner.createIndex(
      'seller_authorizations',
      new TableIndex({
        name: 'idx_seller_authorizations_seller',
        columnNames: ['sellerId']
      })
    );

    // Add index for product queries
    await queryRunner.createIndex(
      'seller_authorizations',
      new TableIndex({
        name: 'idx_seller_authorizations_product',
        columnNames: ['productId']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_product_unique_active');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_supplier_status');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_status_requested');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_seller');
    await queryRunner.dropIndex('seller_authorizations', 'idx_seller_authorizations_product');

    // Drop foreign keys
    const table = await queryRunner.getTable('seller_authorizations');
    const foreignKeys = table.foreignKeys;
    for (const fk of foreignKeys) {
      await queryRunner.dropForeignKey('seller_authorizations', fk);
    }

    // Drop table
    await queryRunner.dropTable('seller_authorizations');
  }
}
```

---

## Index Strategy

### Primary Indexes

**1. Unique Partial Index (Prevent Duplicate Active Requests)**:
```sql
CREATE UNIQUE INDEX idx_seller_product_unique_active
ON seller_authorizations("sellerId", "productId")
WHERE status IN ('PENDING', 'APPROVED');
```

**Purpose**: Prevent seller from having multiple PENDING or APPROVED requests for same product

**Query Pattern**:
```sql
-- Check if seller already has active request
SELECT * FROM seller_authorizations
WHERE "sellerId" = $1 AND "productId" = $2
  AND status IN ('PENDING', 'APPROVED');
```

---

**2. Composite Index (Supplier Dashboard Queries)**:
```sql
CREATE INDEX idx_seller_authorizations_supplier_status
ON seller_authorizations("supplierId", status);
```

**Purpose**: Fast queries for supplier's pending requests

**Query Pattern**:
```sql
-- Get supplier's pending requests
SELECT * FROM seller_authorizations
WHERE "supplierId" = $1 AND status = 'PENDING'
ORDER BY "requestedAt" DESC;
```

---

**3. Composite Index (Status + Date)**:
```sql
CREATE INDEX idx_seller_authorizations_status_requested
ON seller_authorizations(status, "requestedAt");
```

**Purpose**: Fast queries for recent requests by status

**Query Pattern**:
```sql
-- Get recent pending requests (admin dashboard)
SELECT * FROM seller_authorizations
WHERE status = 'PENDING'
ORDER BY "requestedAt" DESC
LIMIT 100;
```

---

**4. Single Column Index (Seller Queries)**:
```sql
CREATE INDEX idx_seller_authorizations_seller
ON seller_authorizations("sellerId");
```

**Purpose**: Fast queries for seller's request history

**Query Pattern**:
```sql
-- Get seller's authorization history
SELECT * FROM seller_authorizations
WHERE "sellerId" = $1
ORDER BY "requestedAt" DESC;
```

---

**5. Single Column Index (Product Queries)**:
```sql
CREATE INDEX idx_seller_authorizations_product
ON seller_authorizations("productId");
```

**Purpose**: Count approved sellers for product (limit check)

**Query Pattern**:
```sql
-- Count approved sellers for product
SELECT COUNT(*) FROM seller_authorizations
WHERE "productId" = $1 AND status = 'APPROVED';
```

---

## Query Patterns

### Query 1: Check Seller Authorization

**Use Case**: Verify seller can access product before showing details

**Query**:
```typescript
async isSellerAuthorized(sellerId: string, productId: string): Promise<boolean> {
  const auth = await this.authRepo.findOne({
    where: {
      sellerId,
      productId,
      status: 'APPROVED'
    }
  });

  return !!auth;
}
```

**SQL**:
```sql
SELECT id FROM seller_authorizations
WHERE "sellerId" = $1 AND "productId" = $2 AND status = 'APPROVED'
LIMIT 1;
```

**Index Used**: Unique partial index (if APPROVED included) or composite

---

### Query 2: Get Supplier's Pending Requests

**Use Case**: Supplier dashboard "Pending Requests" tab

**Query**:
```typescript
async getSupplierPendingRequests(
  supplierId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ requests: SellerAuthorization[]; total: number }> {
  const [requests, total] = await this.authRepo.findAndCount({
    where: {
      supplierId,
      status: 'PENDING'
    },
    relations: ['seller', 'product'],
    order: {
      requestedAt: 'DESC'
    },
    skip: (page - 1) * limit,
    take: limit
  });

  return { requests, total };
}
```

**SQL**:
```sql
SELECT sa.*, s.name AS seller_name, p.name AS product_name
FROM seller_authorizations sa
LEFT JOIN partners s ON sa."sellerId" = s.id
LEFT JOIN products p ON sa."productId" = p.id
WHERE sa."supplierId" = $1 AND sa.status = 'PENDING'
ORDER BY sa."requestedAt" DESC
LIMIT $2 OFFSET $3;
```

**Index Used**: `idx_seller_authorizations_supplier_status`

---

### Query 3: Count Approved Sellers for Product

**Use Case**: Check if product reached seller limit (10)

**Query**:
```typescript
async getApprovedSellerCount(productId: string): Promise<number> {
  return await this.authRepo.count({
    where: {
      productId,
      status: 'APPROVED'
    }
  });
}
```

**SQL**:
```sql
SELECT COUNT(*) FROM seller_authorizations
WHERE "productId" = $1 AND status = 'APPROVED';
```

**Index Used**: `idx_seller_authorizations_product`

---

### Query 4: Get Seller's Authorized Products

**Use Case**: Seller dashboard "My Products" list

**Query**:
```typescript
async getSellerAuthorizedProducts(sellerId: string): Promise<Product[]> {
  const auths = await this.authRepo.find({
    where: {
      sellerId,
      status: 'APPROVED'
    },
    relations: ['product', 'product.supplier']
  });

  return auths.map(auth => auth.product);
}
```

**SQL**:
```sql
SELECT p.*
FROM seller_authorizations sa
LEFT JOIN products p ON sa."productId" = p.id
WHERE sa."sellerId" = $1 AND sa.status = 'APPROVED';
```

**Index Used**: `idx_seller_authorizations_seller`

---

### Query 5: Check Cooling-Off Period

**Use Case**: Validate seller can re-request after rejection

**Query**:
```typescript
async canSellerReapply(sellerId: string, productId: string): Promise<boolean> {
  const rejectedAuth = await this.authRepo.findOne({
    where: {
      sellerId,
      productId,
      status: 'REJECTED'
    },
    order: {
      rejectedAt: 'DESC'
    }
  });

  if (!rejectedAuth) {
    return true; // No previous rejection
  }

  const coolOffDays = parseInt(process.env.SELLER_REAPPLY_COOLOFF_DAYS || '30');
  const daysSinceRejection = (Date.now() - rejectedAuth.rejectedAt.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceRejection >= coolOffDays;
}
```

**SQL**:
```sql
SELECT "rejectedAt" FROM seller_authorizations
WHERE "sellerId" = $1 AND "productId" = $2 AND status = 'REJECTED'
ORDER BY "rejectedAt" DESC
LIMIT 1;
```

---

## Data Constraints

### Business Rules Enforced by Database

**1. Unique Active Request**:
- Constraint: `UNIQUE(sellerId, productId) WHERE status IN ('PENDING', 'APPROVED')`
- Prevents: Multiple pending/approved requests for same seller-product pair

**2. Status Enum**:
- Constraint: `CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'))`
- Prevents: Invalid status values

**3. Foreign Key Cascades**:
- `sellerId` ON DELETE CASCADE: Delete authorizations when seller deleted
- `productId` ON DELETE CASCADE: Delete authorizations when product deleted
- `supplierId` ON DELETE CASCADE: Delete authorizations when supplier deleted

**4. Timestamps**:
- `requestedAt` NOT NULL: Always track when request was made
- `updatedAt` auto-updated: Track last modification

---

## Metadata Schema

### Metadata JSON Structure

```typescript
interface AuthorizationMetadata {
  // Seller info at time of request
  sellerTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  sellerRating?: number; // 0-5
  sellerTotalSales?: number;
  sellerSuccessRate?: number; // 0-100

  // Automation flags
  autoApproved?: boolean; // If auto-approval rule triggered
  adminOverride?: boolean; // If admin manually approved despite limit

  // Notifications
  sellerNotified?: boolean;
  supplierNotified?: boolean;
  notificationSentAt?: string; // ISO 8601

  // Audit
  ipAddress?: string; // Request origin IP
  userAgent?: string; // Request user agent

  // Custom data
  [key: string]: any;
}
```

**Example**:
```json
{
  "sellerTier": "GOLD",
  "sellerRating": 4.7,
  "sellerTotalSales": 1500000,
  "sellerSuccessRate": 98.5,
  "autoApproved": false,
  "adminOverride": false,
  "sellerNotified": true,
  "supplierNotified": true,
  "notificationSentAt": "2025-11-07T12:00:00Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Performance Considerations

### Expected Query Performance

| Query | Target | Notes |
|-------|--------|-------|
| Check authorization | < 2ms | Uses unique partial index |
| List pending requests | < 10ms | Uses composite index |
| Count approved sellers | < 5ms | Uses product index |
| Seller's authorized products | < 10ms | Uses seller index |

### Optimization Strategies

**1. Partial Index for Active Requests**:
- Reduces index size (only PENDING + APPROVED indexed)
- Faster constraint checks

**2. Composite Indexes**:
- Covers multiple filter conditions
- Reduces need for table scans

**3. Foreign Key Indexes**:
- Automatically created on foreign key columns
- Speeds up joins

**4. JSONB for Metadata**:
- Flexible schema
- GIN index可 if needed (future)

---

## Data Migration Strategy

### Zero-Data Compatible

**Initial State**:
- Table created but empty
- No existing authorizations
- Feature flag OFF

**Gradual Rollout**:
1. Create table in production (migration)
2. Feature flag ON for 10% of suppliers
3. Suppliers opt-in to authorization system
4. Sellers start requesting access
5. Feature flag ON for 100%

**No Breaking Changes**:
- Existing seller-product relationships unaffected
- Sellers can still view public product info
- Authorization required only when feature enabled

---

## Rollback Strategy

### Migration Rollback

**Steps**:
```bash
# Rollback migration
NODE_ENV=production pnpm run migration:revert

# Verify rollback
NODE_ENV=production pnpm run migration:show
```

**Effect**:
- Table dropped
- Indexes removed
- Foreign keys removed
- Data lost (if any)

**Alternative (Soft Rollback)**:
- Keep table
- Disable feature flag: `ENABLE_SELLER_AUTHORIZATION=false`
- Data preserved for future re-enable

---

## Version History

- **1.0** (2025-11-07): Initial schema design for Phase 9

---

*Generated with [Claude Code](https://claude.com/claude-code)*
