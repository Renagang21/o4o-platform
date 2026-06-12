import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CONTENT-USAGE
 *
 * Adds usage fields to store_contents:
 * - slug (public access key)
 * - shareImage (SNS/POP share image)
 * - isPublic (public visibility flag)
 */
export class AddStoreContentUsageFields1771200000013 implements MigrationInterface {
  name = 'AddStoreContentUsageFields1771200000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "store_contents" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(200)`);
    await queryRunner.query(`ALTER TABLE "store_contents" ADD COLUMN IF NOT EXISTS "shareImage" VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE "store_contents" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_contents_slug" ON "store_contents" ("slug") WHERE "slug" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_contents_slug"`);
    await queryRunner.query(`ALTER TABLE "store_contents" DROP COLUMN IF EXISTS "isPublic"`);
    await queryRunner.query(`ALTER TABLE "store_contents" DROP COLUMN IF EXISTS "shareImage"`);
    await queryRunner.query(`ALTER TABLE "store_contents" DROP COLUMN IF EXISTS "slug"`);
  }
}
