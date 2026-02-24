import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1
 *
 * Signage를 즉시 배포 모델 → 승인형 모델로 전환.
 *
 * Status 통합: draft | pending | active | archived
 *
 * 기존 값 매핑:
 *   inactive → archived
 *   processing → draft
 *
 * CHECK 제약 추가로 DB 레벨 강제.
 */
export class SignageApprovalStatusModel1708819200000 implements MigrationInterface {
  name = 'SignageApprovalStatusModel1708819200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 기존 'inactive' → 'archived' 전환
    await queryRunner.query(`
      UPDATE signage_media SET status = 'archived' WHERE status = 'inactive'
    `);
    await queryRunner.query(`
      UPDATE signage_playlists SET status = 'archived' WHERE status = 'inactive'
    `);

    // 2. 기존 'processing' → 'draft' 전환
    await queryRunner.query(`
      UPDATE signage_media SET status = 'draft' WHERE status = 'processing'
    `);

    // 3. CHECK 제약 추가
    await queryRunner.query(`
      ALTER TABLE signage_media
        ADD CONSTRAINT chk_signage_media_status
        CHECK (status IN ('draft', 'pending', 'active', 'archived'))
    `);
    await queryRunner.query(`
      ALTER TABLE signage_playlists
        ADD CONSTRAINT chk_signage_playlists_status
        CHECK (status IN ('draft', 'pending', 'active', 'archived'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // CHECK 제약 제거
    await queryRunner.query(`
      ALTER TABLE signage_media DROP CONSTRAINT IF EXISTS chk_signage_media_status
    `);
    await queryRunner.query(`
      ALTER TABLE signage_playlists DROP CONSTRAINT IF EXISTS chk_signage_playlists_status
    `);

    // 값 복원
    await queryRunner.query(`
      UPDATE signage_media SET status = 'inactive' WHERE status = 'archived'
    `);
    await queryRunner.query(`
      UPDATE signage_playlists SET status = 'inactive' WHERE status = 'archived'
    `);
  }
}
