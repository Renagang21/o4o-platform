import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE4-DEAD-CODE-AND-DROP-V1
 *
 * Phase 4: kpa_branch_* 테이블 DROP
 *
 * 전제:
 *   Phase 3 (20260415000000-ArchiveBranchAndChapterData)에서
 *   모든 데이터가 soft-delete/비활성화 처리 완료됨.
 *
 * DROP 순서 (FK 안전 순서):
 *   1. kpa_branch_docs
 *   2. kpa_branch_news
 *   3. kpa_branch_officers
 *   4. kpa_branch_settings
 *
 * down(): 이미 데이터가 soft-deleted된 상태이므로
 *         테이블 복구만 가능하며 데이터 복구는 불가.
 */
export class DropBranchTables20260500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // kpa_branch_docs
    const hasBranchDocs = await queryRunner.hasTable('kpa_branch_docs');
    if (hasBranchDocs) {
      await queryRunner.query(`DROP TABLE kpa_branch_docs`);
      console.log('[DropBranchTables] kpa_branch_docs dropped');
    }

    // kpa_branch_news
    const hasBranchNews = await queryRunner.hasTable('kpa_branch_news');
    if (hasBranchNews) {
      await queryRunner.query(`DROP TABLE kpa_branch_news`);
      console.log('[DropBranchTables] kpa_branch_news dropped');
    }

    // kpa_branch_officers
    const hasBranchOfficers = await queryRunner.hasTable('kpa_branch_officers');
    if (hasBranchOfficers) {
      await queryRunner.query(`DROP TABLE kpa_branch_officers`);
      console.log('[DropBranchTables] kpa_branch_officers dropped');
    }

    // kpa_branch_settings
    const hasBranchSettings = await queryRunner.hasTable('kpa_branch_settings');
    if (hasBranchSettings) {
      await queryRunner.query(`DROP TABLE kpa_branch_settings`);
      console.log('[DropBranchTables] kpa_branch_settings dropped');
    }

    console.log('[DropBranchTables] Phase 4 table drop complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 테이블 구조만 복구 (데이터 복구 불가 — Phase 3에서 soft-delete 후 DROP됨)
    // 필요 시 Phase 3 migration down()을 실행하여 kpa_organizations를 복구해야 함

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_branch_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_branch_officers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        member_id UUID,
        name VARCHAR(100) NOT NULL,
        position VARCHAR(100) NOT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_branch_news (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_branch_docs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    console.log('[DropBranchTables] Phase 4 rollback: tables recreated (empty, no data restored).');
  }
}
