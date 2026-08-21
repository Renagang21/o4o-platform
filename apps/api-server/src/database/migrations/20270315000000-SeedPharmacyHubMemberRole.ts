/**
 * SeedPharmacyHubMemberRole
 * WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1
 *
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4
 *
 * 일반 약사 회원(`pharmacy-hub:member`) 을 역할 카탈로그에 추가한다.
 *
 * 왜 필요한가:
 *   PharmacyHub 자가 가입 유형은 **일반 약사 회원 / 약국 경영자** 둘이다. 승인 시
 *   `MembershipApprovalService` 가 `service_memberships.role` 을 그대로 `role_assignments`
 *   에 부여하므로, 운영자 역할 관리 화면(`roleService.getRolesByService` / `getAssignableRoles`
 *   — 둘 다 `is_active = true` 필터)이 이 값을 인식하려면 카탈로그 row 가 있어야 한다.
 *   (`kpa-branch:member` 와 같은 형태다.)
 *
 * 이 role 이 **아닌** 것:
 *   - 자격 증명이 아니다. 약사 자격은 role 이 아니라 profile 축(`kpa_pharmacist_profiles`)이다
 *     — KPA 선례: `20260326300000-DeactivateQualificationRoles` 가 `kpa:pharmacist` 를
 *     profile 로 대체하며 비활성화했다. 여기서 자격 role 을 다시 만들지 않는다.
 *   - capability 가 아니다. `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 에 넣지 않으므로
 *     매장 경영 API/화면은 통과하지 못한다. 매장 capability 는 store_owner 뿐이다.
 *
 * 하지 않는 것: 기존 seed migration(20270216000000) 편집 · 다른 서비스 role 변경 · row 삭제.
 * 멱등: ON CONFLICT (name) DO UPDATE.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPharmacyHubMemberRole20270315000000 implements MigrationInterface {
  name = 'SeedPharmacyHubMemberRole20270315000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, display_name, description, service_key, role_key,
                         is_system, is_admin_role, is_assignable, is_active)
      VALUES ('pharmacy-hub:member', 'Pharmacy-Hub Member',
              'Pharmacy-Hub general pharmacist member (no store management capability)',
              'pharmacy-hub', 'member', true, false, true, true)
      ON CONFLICT (name) DO UPDATE SET
        service_key = EXCLUDED.service_key,
        role_key = EXCLUDED.role_key,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        is_admin_role = EXCLUDED.is_admin_role,
        is_assignable = EXCLUDED.is_assignable,
        is_active = EXCLUDED.is_active,
        updated_at = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 카탈로그에서만 닫는다. 실제 배정(role_assignments)은 건드리지 않는다.
    await queryRunner.query(`
      UPDATE roles SET is_assignable = false, is_active = false, updated_at = now()
       WHERE name = 'pharmacy-hub:member'
    `);
  }
}
