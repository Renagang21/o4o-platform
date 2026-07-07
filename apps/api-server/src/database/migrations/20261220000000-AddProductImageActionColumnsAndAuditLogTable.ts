import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1 (Phase 1)
 *
 * Additive migration. 3 parts, all idempotent (IF NOT EXISTS / IF EXISTS):
 *  A. product_images: created_by / updated_by / deleted_at / deleted_by / source 컬럼 추가
 *     (source 기본값은 애플리케이션에서 'admin_upload' 주입. 컬럼 자체는 nullable, backfill 없음.)
 *  B. active primary 유일성: 기존 non-unique filtered idx_product_images_primary 를
 *     active-primary UNIQUE (master 당 is_primary=true AND deleted_at IS NULL 1개) 로 교체.
 *     precheck: master당 primary>1 = 0 확인 후 적용(안전).
 *  C. 공통 audit_logs 테이블 생성. AuditLog entity 는 존재했으나 테이블/등록이 없어 dormant 였음.
 *     ProductMaster 이미지 이벤트(image_added / image_primary_changed) 기록 대상.
 *     스키마는 src/entities/AuditLog.ts 와 일치(컬럼명 camelCase, naming strategy 없음).
 *
 * 데이터 backfill 없음. ProductMaster/설명/후보 데이터 무변경.
 */
export class AddProductImageActionColumnsAndAuditLogTable20261220000000 implements MigrationInterface {
  name = 'AddProductImageActionColumnsAndAuditLogTable20261220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A. product_images additive columns
    await queryRunner.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS created_by uuid NULL`);
    await queryRunner.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS updated_by uuid NULL`);
    await queryRunner.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS deleted_by uuid NULL`);
    await queryRunner.query(`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS source varchar(32) NULL`);

    // B. replace non-unique filtered primary index with active-primary UNIQUE (one active primary per master)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_images_primary`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_active_primary
         ON product_images (master_id)
         WHERE is_primary = true AND deleted_at IS NULL`,
    );

    // C. common audit_logs table (matches src/entities/AuditLog.ts). Was dormant (entity only, no table).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "entityType" varchar(100) NOT NULL,
        "entityId" uuid NOT NULL,
        action varchar(50) NOT NULL,
        "userId" uuid NULL,
        changes jsonb NULL,
        reason text NULL,
        "ipAddress" varchar(50) NULL,
        "userAgent" text NULL,
        "createdAt" timestamp NOT NULL DEFAULT NOW()
      )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity" ON audit_logs ("entityType", "entityId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user" ON audit_logs ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created" ON audit_logs ("createdAt")`);

    console.log('[AddProductImageActionColumnsAndAuditLogTable] product_images +5 cols, active-primary UNIQUE, audit_logs table created. No backfill.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // C. drop audit_logs (this migration created it)
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);

    // B. restore non-unique filtered primary index
    await queryRunner.query(`DROP INDEX IF EXISTS uq_product_images_active_primary`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_images_primary
         ON product_images (master_id, is_primary)
         WHERE is_primary = true`,
    );

    // A. drop added columns
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS source`);
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS deleted_by`);
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS updated_by`);
    await queryRunner.query(`ALTER TABLE product_images DROP COLUMN IF EXISTS created_by`);
  }
}
