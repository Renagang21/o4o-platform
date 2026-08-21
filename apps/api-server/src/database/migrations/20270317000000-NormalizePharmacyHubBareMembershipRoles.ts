/**
 * NormalizePharmacyHubBareMembershipRoles
 * WO-O4O-PHARMACYHUB-FINAL-ROLE-ENTRY-AND-PRODUCTION-ADOPTION-CLOSURE-V1
 *
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4
 *
 * PharmacyHub 는 `service_memberships.role` 에 prefixed role 을 저장한다. 프로덕션에
 * prefix 없는 `admin` · `operator` · `store_owner` membership 이 각 1건 남아 있다(표기 drift).
 * 승인 경로가 `MembershipApprovalService` STEP3 에서 이 값을 그대로 `role_assignments` 에
 * 부여하므로, 그대로 두면 재승인 시 서비스 축이 없는 bare role 이 부여된다.
 *
 * 권한 변화가 없는 이유 (census 2026-08-21):
 *   - 인가 판정은 `role_assignments` + membership.**status** 로만 이뤄진다
 *     (`createMembershipScopeGuard` — membership.role 은 읽지 않는다).
 *   - 대상 3건의 사용자는 이미 대응 prefixed role_assignment 를 **active 로 보유**한다
 *     (`pharmacy-hub:admin` / `pharmacy-hub:operator` / `pharmacy-hub:store_owner`).
 *   - 따라서 교정 후 재승인이 부여할 role 은 이미 가지고 있는 것과 동일하다.
 *
 * 안전장치: 대응 prefixed role 을 **이미 active 로 보유한 행만** 교정한다(EXISTS 가드).
 *   이후에 다른 경위로 bare row 가 생겨도 이 migration 이 권한을 확대할 수 없다.
 *
 * 하지 않는 것: row 삭제 · 사용자/자격증명 변경 · 다른 서비스 membership 변경 ·
 *   `role_assignments` 신규 부여.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizePharmacyHubBareMembershipRoles20270317000000 implements MigrationInterface {
  name = 'NormalizePharmacyHubBareMembershipRoles20270317000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE service_memberships sm
         SET role = 'pharmacy-hub:' || sm.role, updated_at = NOW()
       WHERE sm.service_key = 'pharmacy-hub'
         AND sm.role IN ('admin', 'operator', 'store_owner')
         AND EXISTS (
           SELECT 1 FROM role_assignments ra
            WHERE ra.user_id = sm.user_id
              AND ra.role = 'pharmacy-hub:' || sm.role
              AND ra.is_active = true
         )
    `);
  }

  public async down(): Promise<void> {
    // 되돌리지 않는다. prefix 제거는 이 migration 이 고친 행과 정상 경로로 생성된
    // canonical 행을 구분하지 못해, 멀쩡한 membership 까지 bare 로 되돌린다.
    // 표기 교정은 권한 변화가 없으므로 rollback 필요성도 없다.
  }
}
