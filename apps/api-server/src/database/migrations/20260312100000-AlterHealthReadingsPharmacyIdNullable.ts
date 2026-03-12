import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLYCOPHARM-GLUCOSE-INPUT-PAGE-V1
 *
 * Allow patient self-entry of health readings without pharmacy context.
 * pharmacy_id must be nullable for sourceType = 'patient_self'.
 */
export class AlterHealthReadingsPharmacyIdNullable20260312100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "health_readings"
      ALTER COLUMN "pharmacy_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "health_readings"
      ALTER COLUMN "pharmacy_id" SET NOT NULL
    `);
  }
}
