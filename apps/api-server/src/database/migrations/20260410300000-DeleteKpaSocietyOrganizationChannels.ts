import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Delete all organization_channels for kpa-society organizations.
 *
 * Background: 226 channel records were incorrectly seeded for KPA Society.
 * All channels scoped to organizations enrolled in kpa-society service are
 * test/wrong data and must be physically removed.
 *
 * Scope:
 *   DELETE organization_channels
 *   WHERE organization_id IN (
 *     SELECT organization_id FROM organization_service_enrollments
 *     WHERE service_code = 'kpa-society'
 *   )
 */
export class DeleteKpaSocietyOrganizationChannels20260410300000 implements MigrationInterface {
  name = 'DeleteKpaSocietyOrganizationChannels20260410300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Log count before deletion for audit trail
    const [{ cnt }] = await queryRunner.query(`
      SELECT COUNT(*)::int as cnt
      FROM organization_channels oc
      WHERE oc.organization_id IN (
        SELECT organization_id FROM organization_service_enrollments
        WHERE service_code = 'kpa-society'
      )
    `);
    console.log(`[Migration] Deleting ${cnt} organization_channels for kpa-society`);

    await queryRunner.query(`
      DELETE FROM organization_channels
      WHERE organization_id IN (
        SELECT organization_id FROM organization_service_enrollments
        WHERE service_code = 'kpa-society'
      )
    `);

    console.log(`[Migration] Deleted ${cnt} kpa-society organization_channels`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Data deletion is irreversible — no rollback possible.
    console.warn('[Migration] DeleteKpaSocietyOrganizationChannels: down() is a no-op (data cannot be restored)');
  }
}
