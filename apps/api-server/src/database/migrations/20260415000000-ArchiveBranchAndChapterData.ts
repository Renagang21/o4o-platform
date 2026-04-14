import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE3-DATA-AND-ROLE-CLEANUP-V1
 *
 * Phase 3: 지부/분회 데이터 및 권한 archive
 *
 * 목적:
 *   Phase 1(가입 신청 차단), Phase 2(UI/API 차단)에 이어
 *   지부/분회 관련 권한과 데이터를 비활성화/soft-delete 상태로 전환한다.
 *
 * 이 migration은 hard delete가 아닌 soft-delete/비활성화이므로 롤백 가능하다.
 *
 * 처리 순서 (FK 안전 순서):
 *   1. role_assignments — branch 역할 비활성화
 *   2. kpa_branch_docs, kpa_branch_news — is_deleted = true
 *   3. kpa_branch_officers — is_deleted = true
 *   4. kpa_branch_settings — is_active = false
 *   5. kpa_organizations (type='group') — is_active = false (자식 먼저)
 *   6. kpa_organizations (type='branch') — is_active = false
 *
 * 참고:
 *   - forum_post.organization_id → organizations 테이블 참조 (kpa_organizations 아님)
 *   - lms_courses.organizationId → organizations 테이블 참조 (kpa_organizations 아님)
 *   - 위 두 테이블은 kpa_organizations FK 없으므로 이 migration 대상 아님
 */
export class ArchiveBranchAndChapterData20260415000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. role_assignments: branch 역할 비활성화 ─────────────────────────
    const hasRoleAssignments = await queryRunner.hasTable('role_assignments');
    if (hasRoleAssignments) {
      const result = await queryRunner.query(`
        UPDATE role_assignments
        SET is_active = false
        WHERE role IN ('kpa:branch_admin', 'kpa:branch_operator')
          AND is_active = true
      `);
      console.log(`[ArchiveBranchAndChapterData] role_assignments deactivated: ${JSON.stringify(result)}`);
    }

    // ─── 2. kpa_branch_docs: soft-delete ──────────────────────────────────
    const hasBranchDocs = await queryRunner.hasTable('kpa_branch_docs');
    if (hasBranchDocs) {
      const result = await queryRunner.query(`
        UPDATE kpa_branch_docs
        SET is_deleted = true
        WHERE is_deleted = false
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_branch_docs soft-deleted: ${JSON.stringify(result)}`);
    }

    // ─── 3. kpa_branch_news: soft-delete ──────────────────────────────────
    const hasBranchNews = await queryRunner.hasTable('kpa_branch_news');
    if (hasBranchNews) {
      const result = await queryRunner.query(`
        UPDATE kpa_branch_news
        SET is_deleted = true
        WHERE is_deleted = false
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_branch_news soft-deleted: ${JSON.stringify(result)}`);
    }

    // ─── 4. kpa_branch_officers: soft-delete ──────────────────────────────
    const hasBranchOfficers = await queryRunner.hasTable('kpa_branch_officers');
    if (hasBranchOfficers) {
      const result = await queryRunner.query(`
        UPDATE kpa_branch_officers
        SET is_deleted = true
        WHERE is_deleted = false
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_branch_officers soft-deleted: ${JSON.stringify(result)}`);
    }

    // ─── 5. kpa_branch_settings: deactivate ───────────────────────────────
    const hasBranchSettings = await queryRunner.hasTable('kpa_branch_settings');
    if (hasBranchSettings) {
      const result = await queryRunner.query(`
        UPDATE kpa_branch_settings
        SET is_active = false
        WHERE is_active = true
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_branch_settings deactivated: ${JSON.stringify(result)}`);
    }

    // ─── 6. kpa_organizations: group(분회) 먼저 비활성화 ────────────────────
    const hasOrganizations = await queryRunner.hasTable('kpa_organizations');
    if (hasOrganizations) {
      const groupResult = await queryRunner.query(`
        UPDATE kpa_organizations
        SET is_active = false
        WHERE type = 'group'
          AND is_active = true
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_organizations (group) deactivated: ${JSON.stringify(groupResult)}`);

      // ─── 7. kpa_organizations: branch(지부) 비활성화 ─────────────────────
      const branchResult = await queryRunner.query(`
        UPDATE kpa_organizations
        SET is_active = false
        WHERE type = 'branch'
          AND is_active = true
      `);
      console.log(`[ArchiveBranchAndChapterData] kpa_organizations (branch) deactivated: ${JSON.stringify(branchResult)}`);
    }

    console.log('[ArchiveBranchAndChapterData] Phase 3 archive complete.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: 비활성화된 항목을 다시 활성화 (soft-delete 복구)

    // kpa_organizations 복구
    await queryRunner.query(`
      UPDATE kpa_organizations
      SET is_active = true
      WHERE type IN ('branch', 'group')
        AND is_active = false
    `);

    // kpa_branch_settings 복구
    const hasBranchSettings = await queryRunner.hasTable('kpa_branch_settings');
    if (hasBranchSettings) {
      await queryRunner.query(`
        UPDATE kpa_branch_settings SET is_active = true WHERE is_active = false
      `);
    }

    // kpa_branch_officers 복구
    const hasBranchOfficers = await queryRunner.hasTable('kpa_branch_officers');
    if (hasBranchOfficers) {
      await queryRunner.query(`
        UPDATE kpa_branch_officers SET is_deleted = false WHERE is_deleted = true
      `);
    }

    // kpa_branch_news 복구
    const hasBranchNews = await queryRunner.hasTable('kpa_branch_news');
    if (hasBranchNews) {
      await queryRunner.query(`
        UPDATE kpa_branch_news SET is_deleted = false WHERE is_deleted = true
      `);
    }

    // kpa_branch_docs 복구
    const hasBranchDocs = await queryRunner.hasTable('kpa_branch_docs');
    if (hasBranchDocs) {
      await queryRunner.query(`
        UPDATE kpa_branch_docs SET is_deleted = false WHERE is_deleted = true
      `);
    }

    // role_assignments 복구
    const hasRoleAssignments = await queryRunner.hasTable('role_assignments');
    if (hasRoleAssignments) {
      await queryRunner.query(`
        UPDATE role_assignments
        SET is_active = true
        WHERE role IN ('kpa:branch_admin', 'kpa:branch_operator')
          AND is_active = false
      `);
    }

    console.log('[ArchiveBranchAndChapterData] Phase 3 rollback complete.');
  }
}
