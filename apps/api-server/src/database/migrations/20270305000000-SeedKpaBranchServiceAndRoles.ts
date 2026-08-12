/**
 * SeedKpaBranchServiceAndRoles
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2, §4
 *
 * 약사회 분회 서비스(kpa-branch)를 기존 카탈로그 테이블에 등록한다.
 * 신규 카탈로그 테이블은 만들지 않는다. 20270216000000-SeedPharmacyHubServiceAndRoles 와 동형.
 *
 *   1) platform_services — 서비스 카탈로그 row
 *   2) roles             — 역할 카탈로그 row (role prefix 'kpa-branch' = service_key self-map,
 *                          resolveCanonicalServiceKey 가 self-map 하므로 별도 매핑 불필요)
 *
 * 역할은 WO §4 의 최소 3종만 둔다.
 *   kpa-branch:admin    — 서비스 전체 관리 (분회 registry / 도메인 승인)
 *   kpa-branch:operator — 분회 운영자. **분회 식별자를 role 에 넣지 않는다.**
 *                         "어느 분회의 운영자인가"는 branch_memberships 의 active 소속으로
 *                         결정한다 (4축 분리 — 분회 축을 RBAC 에 중복 저장하지 않는다).
 *   kpa-branch:member   — 분회 회원.
 *
 * 조직 직책(회장·부회장·위원장 등)은 이번 WO 에서 RBAC 역할로 만들지 않는다.
 *
 * 멱등: ON CONFLICT DO NOTHING / DO UPDATE.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedKpaBranchServiceAndRoles20270305000000 implements MigrationInterface {
  name = 'SeedKpaBranchServiceAndRoles20270305000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) platform_services (code = service_key 축)
    await queryRunner.query(`
      INSERT INTO "platform_services" ("code", "name", "short_description", "entry_url", "service_type", "approval_required", "is_featured", "featured_order", "icon_emoji", "status")
      VALUES ('kpa-branch', '약사회 분회', '약사회 분회 홈페이지 및 분회 회원 관리 서비스', 'https://branch.kpa-society.co.kr', 'community', true, false, 12, '🏛️', 'active')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 2) roles
    const roles = [
      { name: 'kpa-branch:admin', display: 'KPA Branch Admin', desc: '분회 서비스 전체 관리자', key: 'admin', admin: true, assignable: true },
      { name: 'kpa-branch:operator', display: 'KPA Branch Operator', desc: '분회 운영자 (대상 분회는 branch_memberships 로 결정)', key: 'operator', admin: false, assignable: true },
      { name: 'kpa-branch:member', display: 'KPA Branch Member', desc: '분회 회원', key: 'member', admin: false, assignable: true },
    ];

    for (const r of roles) {
      await queryRunner.query(
        `
        INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
        VALUES ($1, $2, $3, 'kpa-branch', $4, true, $5, $6, true)
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
      `DELETE FROM roles WHERE name IN ('kpa-branch:admin', 'kpa-branch:operator', 'kpa-branch:member')`,
    );
    await queryRunner.query(`DELETE FROM "platform_services" WHERE "code" = 'kpa-branch'`);
  }
}
