/**
 * WO-KPA-RESOURCE-SYSTEM-RESET-V1
 *
 * kpa_resources 테이블 삭제.
 * 개인 자료실 시스템 전면 제거 — 공동자료실 재설계를 위한 초기화.
 *
 * 참고: store_library_items 는 QR landing / product-marketing / StoreLibrarySelectorModal
 * 에서 직접 참조 중이므로 이 마이그레이션에서 제외함.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropKpaResourcesTable20260421000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_resources`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        content TEXT,
        file_url VARCHAR(500),
        external_url VARCHAR(500),
        type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
        tags JSONB NOT NULL DEFAULT '[]',
        role VARCHAR(100),
        memo TEXT,
        created_by UUID,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kpa_resources_created_by ON kpa_resources (created_by, is_deleted)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kpa_resources_type ON kpa_resources (type, is_deleted)`);
  }
}
