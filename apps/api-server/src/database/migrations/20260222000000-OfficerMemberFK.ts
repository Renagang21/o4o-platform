import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-C-OFFICER-FK-NORMALIZATION-V1
 *
 * kpa_branch_officers → kpa_members FK 정규화
 *
 * Steps:
 *   A: member_id UUID 컬럼 추가 (nullable)
 *   B: 기존 데이터 best-effort 매칭 (organization_id + name)
 *   C: FK 제약조건 추가 (ON DELETE CASCADE)
 *   D: 전부 매칭된 경우 NOT NULL 적용
 */
export class OfficerMemberFK20260222000000 implements MigrationInterface {
  name = 'OfficerMemberFK20260222000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── A: member_id 컬럼 추가 (nullable) ──
    const colExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'kpa_branch_officers' AND column_name = 'member_id'
    `);

    if (colExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_branch_officers ADD COLUMN member_id UUID
      `);
      console.log('[OfficerMemberFK] Added member_id column');
    } else {
      console.log('[OfficerMemberFK] member_id column already exists — skipping ADD');
    }

    // ── B: 기존 데이터 best-effort 매칭 ──
    // organization_id 일치 + users.name = officer.name 매칭
    const matchResult = await queryRunner.query(`
      UPDATE kpa_branch_officers bo
      SET member_id = m.id
      FROM kpa_members m
      JOIN users u ON u.id = m.user_id
      WHERE bo.organization_id = m.organization_id
        AND LOWER(TRIM(u.name)) = LOWER(TRIM(bo.name))
        AND m.status = 'active'
        AND bo.member_id IS NULL
    `);
    console.log('[OfficerMemberFK] Best-effort match completed');

    // ── C: 매칭 결과 로그 ──
    const matched = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt FROM kpa_branch_officers WHERE member_id IS NOT NULL
    `);
    const unmatched = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt FROM kpa_branch_officers
      WHERE member_id IS NULL AND is_deleted = false
    `);
    const matchedCount = matched[0]?.cnt ?? 0;
    const unmatchedCount = unmatched[0]?.cnt ?? 0;

    console.log(`[OfficerMemberFK] Matched: ${matchedCount}, Unmatched (active): ${unmatchedCount}`);

    // ── D: FK 제약조건 추가 ──
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'FK_branch_officer_member'
        AND table_name = 'kpa_branch_officers'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_branch_officers
        ADD CONSTRAINT "FK_branch_officer_member"
        FOREIGN KEY (member_id) REFERENCES kpa_members(id) ON DELETE CASCADE
      `);
      console.log('[OfficerMemberFK] FK constraint added');
    }

    // ── E: 전부 매칭 시 NOT NULL 적용 ──
    if (unmatchedCount === 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_branch_officers ALTER COLUMN member_id SET NOT NULL
      `);
      console.log('[OfficerMemberFK] All officers matched → NOT NULL applied');
    } else {
      console.warn(
        `[OfficerMemberFK] ${unmatchedCount} unmatched officers — member_id stays nullable`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove NOT NULL if applied
    await queryRunner.query(`
      ALTER TABLE kpa_branch_officers ALTER COLUMN member_id DROP NOT NULL
    `).catch(() => { /* may already be nullable */ });

    // Remove FK
    await queryRunner.query(`
      ALTER TABLE kpa_branch_officers DROP CONSTRAINT IF EXISTS "FK_branch_officer_member"
    `);

    // Remove column
    await queryRunner.query(`
      ALTER TABLE kpa_branch_officers DROP COLUMN IF EXISTS member_id
    `);

    console.log('[OfficerMemberFK] Reverted: member_id column and FK removed');
  }
}
