import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-APPROVAL-ANALYTICS-QUERY-OPTIMIZATION-V1
 *
 * 1. Composite index (service_key, approval_status) — covers analytics + list queries
 * 2. Partial index on reason WHERE rejected — covers TOP rejection reason query
 */
export class AddAnalyticsIndexesOfferServiceApprovals20260328120000 implements MigrationInterface {
  name = 'AddAnalyticsIndexesOfferServiceApprovals20260328120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Composite index: most analytics/list queries filter by service_key + approval_status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_osa_service_status
      ON offer_service_approvals (service_key, approval_status)
    `);

    // Partial index: rejection reason TOP query — only rejected rows with reason
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_osa_rejected_reason
      ON offer_service_approvals (reason)
      WHERE approval_status = 'rejected'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_osa_rejected_reason');
    await queryRunner.query('DROP INDEX IF EXISTS idx_osa_service_status');
  }
}
