/**
 * Migration: CreateKpaResourcesTable
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * kpa_resources 테이블 생성
 * 파일/텍스트/외부링크 자료를 단일 테이블로 관리
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaResourcesTable20260420100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_resources (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       VARCHAR(300) NOT NULL,
        content     TEXT,
        file_url    VARCHAR(500),
        external_url VARCHAR(500),
        type        VARCHAR(20) NOT NULL DEFAULT 'TEXT',
        tags        JSONB NOT NULL DEFAULT '[]',
        role        VARCHAR(100),
        memo        TEXT,
        created_by  UUID,
        is_deleted  BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_resources_created_by
        ON kpa_resources (created_by, is_deleted)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_resources_type
        ON kpa_resources (type, is_deleted)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_resources`);
  }
}
