import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1
 *
 * Add CHECK constraint on cms_contents.status to enforce 4-stage model:
 *   draft → pending → published → archived
 *
 * Steps:
 * 1. Update any rows with unexpected status values to 'draft' (safety)
 * 2. Add CHECK constraint: status IN ('draft','pending','published','archived')
 */
export class CmsContentPendingStatus1708819200000 implements MigrationInterface {
  name = 'CmsContentPendingStatus1708819200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: coerce any unexpected status values to 'draft'
    await queryRunner.query(`
      UPDATE cms_contents
      SET status = 'draft'
      WHERE status NOT IN ('draft', 'pending', 'published', 'archived')
    `);

    // Add CHECK constraint
    await queryRunner.query(`
      ALTER TABLE cms_contents
      ADD CONSTRAINT chk_cms_content_status
      CHECK (status IN ('draft', 'pending', 'published', 'archived'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cms_contents
      DROP CONSTRAINT IF EXISTS chk_cms_content_status
    `);
  }
}
