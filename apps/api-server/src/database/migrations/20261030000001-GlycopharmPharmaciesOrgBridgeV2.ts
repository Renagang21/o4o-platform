/**
 * GlycopharmPharmaciesOrgBridgeV2
 *
 * WO-O4O-GLYCOPHARM-ORG-BRIDGE-V1
 *
 * glycopharm_pharmacies 테이블에 organization_id FK를 추가하여
 * 플랫폼 Canonical Business Structure(organizations)와 연결한다.
 *
 * 배경:
 *   - Phase C (20260221100000)가 glycopharm_pharmacies를 DROP
 *   - EnsureGlycopharmPharmaciesTable (20260318120000)이 organization_id 없이 재생성
 *   - 신규 약국은 organizations 직접 생성 (approval flow) → 이미 정상
 *   - glycopharm_pharmacies는 구조적 legacy entity로 organization_id 결손
 *
 * 이 마이그레이션:
 *   1. 구형 stale FK (FK_pharmacy_organization → kpa_organizations) 정리
 *   2. organization_id 컬럼 추가 (nullable)
 *   3. business_number 기반 backfill
 *   4. 인덱스 추가
 *   5. FK → organizations(id) ON DELETE SET NULL
 *
 * Idempotent: 모든 단계에 IF EXISTS / IF NOT EXISTS 가드 적용.
 * 데이터 삭제 금지: organization_id NULL 유지.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GlycopharmPharmaciesOrgBridgeV220261030000001 implements MigrationInterface {
  name = 'GlycopharmPharmaciesOrgBridgeV220261030000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // glycopharm_pharmacies 테이블 존재 확인
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'glycopharm_pharmacies' AND table_schema = 'public'
    `);

    if (tableCheck.length === 0) {
      console.log('[Migration] glycopharm_pharmacies 테이블 없음 — 스킵');
      return;
    }

    // ----------------------------------------------------------------
    // 1. stale FK 정리 (kpa_organizations 참조 — 구 테이블명)
    // ----------------------------------------------------------------
    const staleFk = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'glycopharm_pharmacies'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'FK_pharmacy_organization'
        AND table_schema = 'public'
    `);

    if (staleFk.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "glycopharm_pharmacies"
        DROP CONSTRAINT IF EXISTS "FK_pharmacy_organization"
      `);
      console.log('[Migration] stale FK FK_pharmacy_organization 제거 완료');
    }

    // ----------------------------------------------------------------
    // 2. organization_id 컬럼 추가 (nullable)
    // ----------------------------------------------------------------
    const colCheck = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'glycopharm_pharmacies'
        AND column_name = 'organization_id'
        AND table_schema = 'public'
    `);

    if (colCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "glycopharm_pharmacies"
        ADD COLUMN "organization_id" UUID NULL
      `);
      console.log('[Migration] organization_id 컬럼 추가');
    }

    // ----------------------------------------------------------------
    // 3. Backfill: business_number 기준 organizations 매핑
    //    - glycopharm_pharmacies는 Phase C 후 재생성된 빈 테이블이거나
    //      이전 데이터가 남아있을 수 있음 (환경에 따라 다름)
    //    - 매핑 불가 행은 organization_id = NULL 유지 (데이터 삭제 금지)
    // ----------------------------------------------------------------
    const backfill = await queryRunner.query(`
      UPDATE "glycopharm_pharmacies" p
      SET "organization_id" = o.id
      FROM "organizations" o
      WHERE p."business_number" IS NOT NULL
        AND p."business_number" != ''
        AND p."business_number" = o."business_number"
        AND o."business_number" IS NOT NULL
        AND o."business_number" != ''
        AND p."organization_id" IS NULL
      RETURNING p.id
    `);

    const totalRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt FROM "glycopharm_pharmacies"
    `);
    const nullRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt FROM "glycopharm_pharmacies" WHERE "organization_id" IS NULL
    `);

    console.log(
      `[Migration] Backfill 완료: ${backfill.length}행 매핑, ` +
      `${nullRows[0].cnt}/${totalRows[0].cnt}행 organization_id NULL 유지`
    );

    // ----------------------------------------------------------------
    // 4. 인덱스 추가
    // ----------------------------------------------------------------
    const idxCheck = await queryRunner.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'glycopharm_pharmacies'
        AND indexname = 'IDX_glycopharm_pharmacies_organization_id'
    `);

    if (idxCheck.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_glycopharm_pharmacies_organization_id"
        ON "glycopharm_pharmacies" ("organization_id")
        WHERE "organization_id" IS NOT NULL
      `);
      console.log('[Migration] IDX_glycopharm_pharmacies_organization_id 인덱스 추가');
    }

    // ----------------------------------------------------------------
    // 5. FK → organizations(id) ON DELETE SET NULL
    //    (nullable 컬럼 → organization 삭제 시 NULL로 유지)
    // ----------------------------------------------------------------
    const fkCheck = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'glycopharm_pharmacies'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'FK_glycopharm_pharmacies_organization_id'
        AND table_schema = 'public'
    `);

    if (fkCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "glycopharm_pharmacies"
        ADD CONSTRAINT "FK_glycopharm_pharmacies_organization_id"
        FOREIGN KEY ("organization_id")
        REFERENCES "organizations"("id")
        ON DELETE SET NULL
      `);
      console.log('[Migration] FK FK_glycopharm_pharmacies_organization_id → organizations 추가');
    }

    console.log('[Migration] WO-O4O-GLYCOPHARM-ORG-BRIDGE-V1 완료');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
      DROP CONSTRAINT IF EXISTS "FK_glycopharm_pharmacies_organization_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_glycopharm_pharmacies_organization_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
      DROP COLUMN IF EXISTS "organization_id"
    `);
    console.log('[Migration] WO-O4O-GLYCOPHARM-ORG-BRIDGE-V1 rollback 완료');
  }
}
