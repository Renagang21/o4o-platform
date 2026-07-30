/**
 * SeedPharmacyHubServiceAndRoles
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §8
 *
 * Pharmacy-Hub 를 기존 카탈로그 테이블에 등록한다. 신규 전용 테이블은 만들지 않는다.
 *
 *   1) platform_services — 서비스 카탈로그 row (2026020500002-SeedPlatformServices 와 동일 형태)
 *   2) roles             — 역할 카탈로그 row (20260318100000-ExtendRolesTable 와 동일 형태)
 *                          admin 의 role_assignments 부여 경로(roleService.getRoleByName)가
 *                          pharmacy-hub 역할을 인식하도록 하기 위함이다.
 *                          operator 는 자가 신청 불가 — 기존 admin grant flow 에서만 부여된다.
 *
 * 멱등: 두 INSERT 모두 ON CONFLICT DO NOTHING / DO UPDATE.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPharmacyHubServiceAndRoles20270216000000 implements MigrationInterface {
  name = 'SeedPharmacyHubServiceAndRoles20270216000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) platform_services (code = service_key 축)
    await queryRunner.query(`
      INSERT INTO "platform_services" ("code", "name", "short_description", "entry_url", "service_type", "approval_required", "is_featured", "featured_order", "icon_emoji", "status")
      VALUES ('pharmacy-hub', 'Pharmacy-Hub', '공급자와 약국 경영자를 직접 연결하는 약국 전문 서비스', 'https://pharmacyhub.co.kr', 'community', true, false, 11, '🏥', 'active')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 2) roles (role prefix 'pharmacy-hub' = service_key self-map)
    const roles = [
      { name: 'pharmacy-hub:operator', display: 'Pharmacy-Hub Operator', desc: 'Pharmacy-Hub service operator', key: 'operator', admin: false, assignable: true },
      { name: 'pharmacy-hub:store_owner', display: 'Pharmacy-Hub Store Owner', desc: 'Pharmacy-Hub pharmacy store owner', key: 'store_owner', admin: false, assignable: true },
      { name: 'pharmacy-hub:supplier', display: 'Pharmacy-Hub Supplier', desc: 'Pharmacy-Hub supplier', key: 'supplier', admin: false, assignable: true },
    ];

    for (const r of roles) {
      await queryRunner.query(
        `
        INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
        VALUES ($1, $2, $3, 'pharmacy-hub', $4, true, $5, $6, true)
        ON CONFLICT (name) DO UPDATE SET
          service_key = EXCLUDED.service_key,
          role_key = EXCLUDED.role_key,
          is_admin_role = EXCLUDED.is_admin_role,
          is_assignable = EXCLUDED.is_assignable,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          updated_at = now()
      `,
        [r.name, r.display, r.desc, r.key, r.admin, r.assignable],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('pharmacy-hub:operator', 'pharmacy-hub:store_owner', 'pharmacy-hub:supplier')`,
    );
    await queryRunner.query(`DELETE FROM "platform_services" WHERE "code" = 'pharmacy-hub'`);
  }
}
