/**
 * NormalizePharmacyHubMemberMembershipRole
 * WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1
 *
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4
 *
 * PharmacyHub 는 `service_memberships.role` 에 **prefixed role** 을 저장한다
 * (`pharmacy-hub:store_owner` 등). 승인 시 `MembershipApprovalService` 가 이 값을 그대로
 * `role_assignments` 에 부여하기 때문이다.
 *
 * 프로덕션에 prefix 없는 `role = 'member'` membership 1건이 남아 있다(2026-08-13 계정 시드
 * 시점 생성). 그대로 두면 재승인 시 서비스 축이 없는 bare `member` 역할이 부여된다.
 * 값 표기만 canonical 로 맞춘다.
 *
 * 비파괴:
 *   - row 삭제·사용자/자격증명/승인 상태 변경 없음. `role` 컬럼 표기만 교정한다.
 *   - 권한 변화 없음: `pharmacy-hub:member` 는 scope 를 부여하지 않는다
 *     (`PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 에 없음).
 *   - 대상은 service_key='pharmacy-hub' AND role='member' 뿐이다. 다른 서비스·다른 역할 무영향.
 *
 * 범위 밖(의도적으로 건드리지 않음): 같은 서비스의 prefix 없는 'admin' / 'operator' /
 *   'store_owner' membership. 이들은 표기 교정이 **권한 결과를 바꾸므로** 별도 판단이 필요하다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizePharmacyHubMemberMembershipRole20270316000000 implements MigrationInterface {
  name = 'NormalizePharmacyHubMemberMembershipRole20270316000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE service_memberships
         SET role = 'pharmacy-hub:member', updated_at = NOW()
       WHERE service_key = 'pharmacy-hub' AND role = 'member'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE service_memberships
         SET role = 'member', updated_at = NOW()
       WHERE service_key = 'pharmacy-hub' AND role = 'pharmacy-hub:member'
    `);
  }
}
