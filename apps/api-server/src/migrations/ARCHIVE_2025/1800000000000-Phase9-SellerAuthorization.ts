import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 9: Seller Authorization System
 *
 * Creates product-level authorization system for sellers:
 * - Dual-approval: Platform (seller role) + Supplier (product access)
 * - 10-product limit per seller (configurable)
 * - 30-day cooldown after rejection
 * - Permanent revocation capability
 *
 * Zero-Data Safe: All columns nullable (except PK)
 * Feature Flag: ENABLE_SELLER_AUTHORIZATION (default: false)
 *
 * Created: 2025-01-07
 */
export class Phase9SellerAuthorization1800000000000 implements MigrationInterface {
  name = 'Phase9SellerAuthorization1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create seller_authorizations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seller_authorizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Foreign Keys (all nullable for Zero-Data safety)
        seller_id UUID NULL REFERENCES sellers(id) ON DELETE CASCADE,
        product_id UUID NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id UUID NULL REFERENCES suppliers(id) ON DELETE CASCADE,

        -- Status (ENUM type for data integrity)
        status VARCHAR(20) NULL DEFAULT 'REQUESTED',

        -- State Timestamps (nullable, set on transitions)
        requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        rejected_at TIMESTAMP NULL,
        revoked_at TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,

        -- Reasons (nullable, required for reject/revoke only)
        rejection_reason TEXT NULL,
        revocation_reason TEXT NULL,

        -- Actor Tracking (nullable, who approved/rejected/revoked)
        approved_by UUID NULL,
        rejected_by UUID NULL,
        revoked_by UUID NULL,

        -- Business Rules
        cooldown_until TIMESTAMP NULL,  -- Rejection cooldown (30 days default)
        expires_at TIMESTAMP NULL,      -- Optional authorization expiry (future enhancement)

        -- Metadata (JSONB for flexibility)
        metadata JSONB NULL,

        -- Audit Timestamps
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

        -- Constraints
        CONSTRAINT seller_authorizations_status_check
          CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REVOKED', 'CANCELLED')),

        -- Unique constraint: One authorization per (seller, product) pair
        CONSTRAINT seller_authorizations_unique_seller_product
          UNIQUE (seller_id, product_id)
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      -- Authorization gate checks (most critical)
      CREATE INDEX IF NOT EXISTS idx_seller_auth_product_status
        ON seller_authorizations(product_id, status);

      CREATE INDEX IF NOT EXISTS idx_seller_auth_seller_status
        ON seller_authorizations(seller_id, status);

      -- Supplier inbox queries
      CREATE INDEX IF NOT EXISTS idx_seller_auth_supplier_status
        ON seller_authorizations(supplier_id, status);

      CREATE INDEX IF NOT EXISTS idx_seller_auth_supplier_requested
        ON seller_authorizations(supplier_id, requested_at DESC)
        WHERE status = 'REQUESTED';

      -- Cooldown enforcement
      CREATE INDEX IF NOT EXISTS idx_seller_auth_cooldown
        ON seller_authorizations(seller_id, product_id, cooldown_until)
        WHERE cooldown_until IS NOT NULL;

      -- Product limit calculations
      CREATE INDEX IF NOT EXISTS idx_seller_auth_seller_limit
        ON seller_authorizations(seller_id)
        WHERE status IN ('APPROVED', 'REJECTED', 'REVOKED');

      -- Audit and analytics
      CREATE INDEX IF NOT EXISTS idx_seller_auth_created
        ON seller_authorizations(created_at DESC);
    `);

    // Add authorization metadata column to commissions table (Phase 8 integration)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'commissions' AND column_name = 'authorization_metadata'
        ) THEN
          ALTER TABLE commissions ADD COLUMN authorization_metadata JSONB NULL;

          COMMENT ON COLUMN commissions.authorization_metadata IS
            'Snapshot of seller authorization at commission calculation time. Includes authorizationId, approvedAt, supplierId.';
        END IF;
      END $$;
    `);

    // Add index for commission authorization metadata queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commissions_auth_metadata
        ON commissions USING GIN (authorization_metadata);
    `);

    // Create audit log table for authorization state changes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seller_authorization_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        authorization_id UUID NULL REFERENCES seller_authorizations(id) ON DELETE CASCADE,

        action VARCHAR(50) NULL,  -- REQUEST, APPROVE, REJECT, REVOKE, CANCEL
        actor_id UUID NULL,       -- User who performed the action
        actor_role VARCHAR(50) NULL,  -- seller, supplier, admin

        status_from VARCHAR(20) NULL,
        status_to VARCHAR(20) NULL,

        reason TEXT NULL,

        metadata JSONB NULL,  -- Additional context (limit_used, cooldown_until, etc.)

        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

        -- Indexes for audit queries
        CONSTRAINT seller_auth_audit_action_check
          CHECK (action IN ('REQUEST', 'APPROVE', 'REJECT', 'REVOKE', 'CANCEL'))
      );

      CREATE INDEX IF NOT EXISTS idx_seller_auth_audit_authorization
        ON seller_authorization_audit_logs(authorization_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_seller_auth_audit_actor
        ON seller_authorization_audit_logs(actor_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_seller_auth_audit_action
        ON seller_authorization_audit_logs(action, created_at DESC);
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE seller_authorizations IS
        'Phase 9: Product-level authorization for sellers. Manages supplier approval workflow with cooldown and limits.';

      COMMENT ON COLUMN seller_authorizations.status IS
        'Authorization state: REQUESTED (pending), APPROVED (active), REJECTED (cooldown), REVOKED (permanent), CANCELLED (withdrawn)';

      COMMENT ON COLUMN seller_authorizations.cooldown_until IS
        'Rejection cooldown expiry. Seller cannot re-request until this date. Default: 30 days from rejection.';

      COMMENT ON COLUMN seller_authorizations.metadata IS
        'Flexible metadata: productSnapshot, businessJustification, expectedVolume, previousRejectionCount, etc.';

      COMMENT ON TABLE seller_authorization_audit_logs IS
        'Audit trail for all authorization state changes. Used for compliance and analytics.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_seller_auth_product_status;
      DROP INDEX IF EXISTS idx_seller_auth_seller_status;
      DROP INDEX IF EXISTS idx_seller_auth_supplier_status;
      DROP INDEX IF EXISTS idx_seller_auth_supplier_requested;
      DROP INDEX IF EXISTS idx_seller_auth_cooldown;
      DROP INDEX IF EXISTS idx_seller_auth_seller_limit;
      DROP INDEX IF EXISTS idx_seller_auth_created;
      DROP INDEX IF EXISTS idx_commissions_auth_metadata;
      DROP INDEX IF EXISTS idx_seller_auth_audit_authorization;
      DROP INDEX IF EXISTS idx_seller_auth_audit_actor;
      DROP INDEX IF EXISTS idx_seller_auth_audit_action;
    `);

    // Drop audit log table
    await queryRunner.query(`
      DROP TABLE IF EXISTS seller_authorization_audit_logs;
    `);

    // Remove authorization metadata column from commissions
    await queryRunner.query(`
      ALTER TABLE commissions DROP COLUMN IF EXISTS authorization_metadata;
    `);

    // Drop main table
    await queryRunner.query(`
      DROP TABLE IF EXISTS seller_authorizations;
    `);
  }
}
