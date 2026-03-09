import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-REGISTRY-REFORM-V1
 *
 * platform_services에 product-level service key 추가.
 * 기존 서비스 (glycopharm, glucoseview, neture, kpa-society, k-cosmetics) 유지.
 * product 도메인에서 사용하는 키 (kpa, cosmetics, kpa-groupbuy) 추가.
 */
export class SeedProductServiceKeys20260309200000 implements MigrationInterface {
  name = 'SeedProductServiceKeys20260309200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if platform_services table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'platform_services'
      ) AS "exists"
    `);

    if (!tableExists[0]?.exists) {
      console.log('[SeedProductServiceKeys] platform_services table does not exist, skipping.');
      return;
    }

    // Add product-level service keys
    await queryRunner.query(`
      INSERT INTO "platform_services" ("id", "code", "name", "short_description", "service_type", "status", "created_at", "updated_at")
      VALUES
        (gen_random_uuid(), 'kpa', 'KPA Product Domain', 'KPA 약국 제품 도메인', 'tool', 'active', NOW(), NOW()),
        (gen_random_uuid(), 'cosmetics', 'Cosmetics Product Domain', '화장품 제품 도메인', 'tool', 'active', NOW(), NOW()),
        (gen_random_uuid(), 'kpa-groupbuy', 'KPA Group Buy', 'KPA 공동구매 도메인', 'tool', 'active', NOW(), NOW())
      ON CONFLICT ("code") DO NOTHING
    `);

    console.log('[SeedProductServiceKeys] Product-level service keys seeded.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "platform_services"
      WHERE "code" IN ('kpa', 'cosmetics', 'kpa-groupbuy')
    `);
  }
}
