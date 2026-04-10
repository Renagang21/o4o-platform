import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create signage_categories table
 *
 * WO-O4O-SIGNAGE-CONTENT-CENTERED-REFACTOR-V1 Phase 4
 *
 * 운영자가 관리하는 사이니지 카테고리 테이블.
 * signage_media.category (varchar) 값의 기준 목록을 제공.
 * (FK 변경 없음 — 기존 media.category 문자열 유지, 드롭다운 소스로 활용)
 */
export class CreateSignageCategories20260410100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS signage_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "serviceKey" VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("serviceKey", name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_signage_categories_service_active"
        ON signage_categories ("serviceKey", "isActive", "sortOrder")
    `);

    // Seed default categories for kpa-society
    await queryRunner.query(`
      INSERT INTO signage_categories ("serviceKey", name, "sortOrder") VALUES
        ('kpa-society', '건강정보', 10),
        ('kpa-society', '약국홍보', 20),
        ('kpa-society', '안전복약', 30),
        ('kpa-society', '행사안내', 40),
        ('kpa-society', '교육자료', 50),
        ('kpa-society', '기타', 99)
      ON CONFLICT ("serviceKey", name) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS signage_categories`);
  }
}
