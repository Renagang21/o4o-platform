import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Add requested_slug Column to Application Tables
 *
 * WO-CORE-STORE-REQUESTED-SLUG-V1
 *
 * Allows applicants to specify their desired slug during application.
 * This slug is validated and used during approval if available.
 */
export class AddRequestedSlugToApplications1771200000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add requested_slug to glycopharm_applications (public schema)
    await queryRunner.addColumn(
      'glycopharm_applications',
      new TableColumn({
        name: 'requested_slug',
        type: 'varchar',
        length: '120',
        isNullable: true,
        comment: 'Optional slug requested by applicant (validated on submission)',
      })
    );

    // Add requested_slug to cosmetics_store_applications (cosmetics schema)
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_applications
      ADD COLUMN requested_slug varchar(120) NULL
    `);

    // Add comment to cosmetics column
    await queryRunner.query(`
      COMMENT ON COLUMN cosmetics.cosmetics_store_applications.requested_slug
      IS 'Optional slug requested by applicant (validated on submission)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove from glycopharm_applications
    await queryRunner.dropColumn('glycopharm_applications', 'requested_slug');

    // Remove from cosmetics_store_applications
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_applications
      DROP COLUMN requested_slug
    `);
  }
}
