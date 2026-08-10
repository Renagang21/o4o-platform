/**
 * SeedPharmacyHubAdminRole
 * WO-O4O-PHARMACY-HUB-ADMIN-ROLE-CATALOG-SEED-V1
 *
 * `pharmacy-hub:admin` 은 WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1 에서 코드·권한 가드에 도입됐지만
 * `roles` 카탈로그에는 등재되지 않아 코드와 DB 가 어긋나 있었다.
 * (guard 2계층은 이 테이블을 읽지 않으므로 인가에는 영향이 없었고, 영향 범위는
 *  RoleController 의 할당 가능 역할 목록 · Membership 콘솔 표시용 카탈로그다.)
 *
 * 20270216000000-SeedPharmacyHubServiceAndRoles 의 roles INSERT 패턴을 그대로 재사용한다.
 * 필드 표준은 기존 서비스 Admin 역할(kpa:admin · neture:admin · glycopharm:admin · cosmetics:admin)과
 * 동일하다 — role_key='admin', is_system=true, is_admin_role=true, is_assignable=true, is_active=true.
 *
 * 범위: roles 1행. 스키마 변경 없음. 기존 역할 · users · role_assignments ·
 *       service_memberships · service_credentials 는 건드리지 않는다.
 * 멱등: ON CONFLICT (name) DO UPDATE — 반복 실행 시 같은 값으로 수렴한다(행 수 불변).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPharmacyHubAdminRole20270226000000 implements MigrationInterface {
  name = 'SeedPharmacyHubAdminRole20270226000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
      VALUES ('pharmacy-hub:admin', 'Pharmacy-Hub Admin', 'Pharmacy-Hub administrator', 'pharmacy-hub', 'admin', true, true, true, true)
      ON CONFLICT (name) DO UPDATE SET
        service_key = EXCLUDED.service_key,
        role_key = EXCLUDED.role_key,
        is_admin_role = EXCLUDED.is_admin_role,
        is_assignable = EXCLUDED.is_assignable,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        updated_at = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name = 'pharmacy-hub:admin'`);
  }
}
