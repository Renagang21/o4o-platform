import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1
 *
 * `role_assignments` 의 활성 유일성 제약을 **정본 규칙으로 교체**한다.
 *
 *   BEFORE  UNIQUE (user_id, role, is_active)          -- 3 컬럼 제약
 *   AFTER   UNIQUE (user_id, role) WHERE is_active     -- 부분 유니크 인덱스
 *
 * ## 왜 바꾸는가
 *
 * 실제 업무 규칙은 "한 사용자에게 같은 역할의 **활성** 행은 1개" 하나뿐이다.
 * 그런데 3 컬럼 제약은 비활성 행에도 유일성을 강제해서, 같은 (user, role) 에
 * 활성 1행 + 비활성 1행이 공존할 수 있고(둘 다 제약을 만족) 그 상태에서
 * **활성 행을 비활성화하면 기존 비활성 행과 충돌해 23505 로 실패**한다.
 *
 * 그 결과 write 경로마다 우회 코드가 따로 자라났다:
 *   - `RoleAssignmentService.assignRole`                    활성 우선 조회 → 비활성 복원
 *   - `MembershipApprovalService.activateRoleAssignment`    동일 패턴 재구현
 *   - `MembershipApprovalService.deactivateRoleAssignment`  비활성 쌍둥이를 DELETE (이력 파괴)
 *   - `RoleAssignmentService.removeRole` / `removeAllRoles` 우회 없음 → 23505 잔존
 *
 * 부분 유니크 인덱스로 바꾸면 비활성 이력 행은 몇 개든 공존할 수 있어
 * **비활성화 방향의 23505 가 구조적으로 사라진다**. 데이터는 한 행도 지우지 않는다.
 *
 * ## 데이터 안전성
 *
 * 새 인덱스는 기존 제약보다 **덜 엄격**하다(활성 행에만 적용). 기존 제약을 만족하던
 * 데이터는 항상 새 인덱스도 만족하므로 사전 데이터 정비가 필요 없다.
 * 그래도 방어적으로 활성 중복을 먼저 확인하고, 있으면 즉시 실패시킨다.
 *
 * 실측(2026-08-11 프로덕션 read-only): 총 43행 / 활성 38 / 비활성 5,
 * 활성 중복 0건, 활성+비활성 쌍둥이 1쌍(`platform:super_admin`).
 * → 본 마이그레이션의 **데이터 변경량은 0행**이다 (구조만 교체).
 *
 * ## 호출부
 *
 * `ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"` 는 제약 이름을 요구하므로
 * 부분 인덱스로는 쓸 수 없다. 런타임 호출부 4곳을
 * `ON CONFLICT (user_id, role) WHERE is_active` 로 함께 교체했다.
 * 기존 마이그레이션들은 본 마이그레이션보다 **먼저** 실행되므로(타임스탬프 순서)
 * 그 시점에는 제약이 존재한다 → 신규 DB 재구축에도 안전하다.
 *
 * F9 RBAC SSOT / F10 Core Freeze: 테이블·컬럼·역할 의미는 불변이고 유일성 표현만
 * 정본 규칙으로 교체하는 결함 수정이다. write 경로는 그대로 하나다.
 */
export class ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000
  implements MigrationInterface
{
  name = 'ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0) 방어 — 활성 중복이 있으면 새 인덱스를 만들 수 없다. 조용히 넘어가지 않는다.
    const dup: Array<{ n: string }> = await queryRunner.query(`
      SELECT count(*)::text AS n FROM (
        SELECT user_id, role FROM role_assignments
        WHERE is_active = true
        GROUP BY user_id, role HAVING count(*) > 1
      ) t
    `);
    const dupCount = Number(dup?.[0]?.n ?? 0);
    if (dupCount > 0) {
      throw new Error(
        `[ReplaceRoleAssignmentsActiveUniqueConstraint] 활성 중복 (user_id, role) ${dupCount}건이 있어 ` +
          `부분 유니크 인덱스를 만들 수 없다. 데이터 정비 후 재실행할 것.`
      );
    }

    // 1) 새 부분 유니크 인덱스 (제약 제거보다 먼저 — 유일성 공백 없음)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_role_assignments_user_role_active"
        ON role_assignments (user_id, role)
        WHERE is_active
    `);

    // 2) 기존 3 컬럼 제약 제거
    await queryRunner.query(`
      ALTER TABLE role_assignments
        DROP CONSTRAINT IF EXISTS "unique_active_role_per_user"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리려면 (user, role) 당 비활성 행이 1개 이하여야 한다.
    // 부분 인덱스 아래에서 비활성 이력이 여러 개 쌓였다면 되돌릴 수 없다 — 명시적으로 실패시킨다.
    const dup: Array<{ n: string }> = await queryRunner.query(`
      SELECT count(*)::text AS n FROM (
        SELECT user_id, role, is_active FROM role_assignments
        GROUP BY user_id, role, is_active HAVING count(*) > 1
      ) t
    `);
    const dupCount = Number(dup?.[0]?.n ?? 0);
    if (dupCount > 0) {
      throw new Error(
        `[ReplaceRoleAssignmentsActiveUniqueConstraint] (user_id, role, is_active) 중복 ${dupCount}건이 있어 ` +
          `3 컬럼 제약을 복원할 수 없다. 롤백하려면 중복 비활성 이력을 먼저 정리해야 한다.`
      );
    }

    await queryRunner.query(`
      ALTER TABLE role_assignments
        ADD CONSTRAINT "unique_active_role_per_user" UNIQUE (user_id, role, is_active)
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_role_assignments_user_role_active"
    `);
  }
}
