import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * users 테이블에 대응하는 계정이 없는 KPA 회원(orphan) 삭제.
 * kpa_member_services는 FK CASCADE로 자동 삭제.
 * 프로필(pharmacist/student)도 함께 정리.
 */
export class CleanupOrphanKpaMembers1712199600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // orphan user_id 목록 확인
    const orphans = await queryRunner.query(`
      SELECT m.id, m.user_id FROM kpa_members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE u.id IS NULL
    `);
    console.log(`[CleanupOrphanKpaMembers] Found ${orphans.length} orphan members`);

    if (orphans.length === 0) return;

    const userIds = orphans.map((r: any) => r.user_id);
    const memberIds = orphans.map((r: any) => r.id);

    // 프로필 삭제
    await queryRunner.query(
      `DELETE FROM kpa_pharmacist_profiles WHERE user_id = ANY($1)`, [userIds]
    ).catch(() => {});
    await queryRunner.query(
      `DELETE FROM kpa_student_profiles WHERE user_id = ANY($1)`, [userIds]
    ).catch(() => {});

    // 회원 삭제 (CASCADE: kpa_member_services)
    const result = await queryRunner.query(
      `DELETE FROM kpa_members WHERE id = ANY($1)`, [memberIds]
    );
    console.log(`[CleanupOrphanKpaMembers] Deleted ${result?.[1] ?? orphans.length} orphan members`);
  }

  public async down(): Promise<void> {
    console.log('[CleanupOrphanKpaMembers] Rollback not supported');
  }
}
