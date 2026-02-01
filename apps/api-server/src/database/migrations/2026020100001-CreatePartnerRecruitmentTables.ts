import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * Creates:
 * - neture_partner_recruitments (제품 × 판매자 파트너 모집 공고)
 * - neture_partner_applications (파트너 참여 신청)
 */
export class CreatePartnerRecruitmentTables2026020100001 implements MigrationInterface {
  name = 'CreatePartnerRecruitmentTables2026020100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_partner_recruitment_status_enum" AS ENUM ('recruiting', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_partner_application_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create neture_partner_recruitments
    const recruitmentExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_partner_recruitments'
      );
    `);

    if (!recruitmentExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_partner_recruitments',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'product_id', type: 'varchar', isNullable: false },
            { name: 'product_name', type: 'varchar', isNullable: false },
            { name: 'manufacturer', type: 'varchar', isNullable: true },
            { name: 'consumer_price', type: 'decimal', precision: 10, scale: 0, default: 0 },
            { name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 0 },
            { name: 'seller_id', type: 'varchar', isNullable: false },
            { name: 'seller_name', type: 'varchar', isNullable: false },
            { name: 'shop_url', type: 'text', isNullable: true },
            { name: 'service_name', type: 'varchar', isNullable: true },
            { name: 'service_id', type: 'varchar', isNullable: true },
            { name: 'image_url', type: 'text', isNullable: true },
            {
              name: 'status',
              type: 'enum',
              enum: ['recruiting', 'closed'],
              enumName: 'neture_partner_recruitment_status_enum',
              default: `'recruiting'`,
            },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
          ],
          uniques: [
            { columnNames: ['product_id', 'seller_id'] },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'neture_partner_recruitments',
        new TableIndex({
          name: 'IDX_neture_partner_recruitments_status',
          columnNames: ['status'],
        }),
      );
    }

    // 3. Create neture_partner_applications
    const applicationExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_partner_applications'
      );
    `);

    if (!applicationExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_partner_applications',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'recruitment_id', type: 'uuid', isNullable: false },
            { name: 'partner_id', type: 'varchar', isNullable: false },
            { name: 'partner_name', type: 'varchar', isNullable: true },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'approved', 'rejected'],
              enumName: 'neture_partner_application_status_enum',
              default: `'pending'`,
            },
            { name: 'applied_at', type: 'timestamp', default: 'NOW()' },
            { name: 'decided_at', type: 'timestamp', isNullable: true },
            { name: 'decided_by', type: 'varchar', isNullable: true },
            { name: 'reason', type: 'text', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
          ],
          uniques: [
            { columnNames: ['recruitment_id', 'partner_id'] },
          ],
          foreignKeys: [
            {
              columnNames: ['recruitment_id'],
              referencedTableName: 'neture_partner_recruitments',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'neture_partner_applications',
        new TableIndex({
          name: 'IDX_neture_partner_applications_recruitment_id',
          columnNames: ['recruitment_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_partner_applications',
        new TableIndex({
          name: 'IDX_neture_partner_applications_partner_id',
          columnNames: ['partner_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_partner_applications',
        new TableIndex({
          name: 'IDX_neture_partner_applications_status',
          columnNames: ['status'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('neture_partner_applications', true);
    await queryRunner.dropTable('neture_partner_recruitments', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_partner_application_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_partner_recruitment_status_enum"`);
  }
}
