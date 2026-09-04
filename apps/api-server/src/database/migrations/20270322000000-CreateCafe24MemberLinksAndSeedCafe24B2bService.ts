/**
 * CreateCafe24MemberLinksAndSeedCafe24B2bService
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §1(D2) · §4 · §5
 *
 *   1) cafe24_member_links — Cafe24 거래처 매장 회원 ↔ O4O 내부 매장 연결 원장
 *   2) platform_services   — 신규 serviceKey `cafe24-b2b` 카탈로그 등록
 *   3) roles               — `cafe24-b2b:store_owner` 1종
 *
 * serviceKey 는 기존 `cafe24`/`neture`/supplier 키에 편입하지 않는다 (§1 D2).
 * 20270305000000-SeedKpaBranchServiceAndRoles / 20270216000000-SeedPharmacyHubServiceAndRoles
 * 와 동형이며 전 단계 멱등(IF NOT EXISTS / ON CONFLICT)이다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCafe24MemberLinksAndSeedCafe24B2bService20270322000000 implements MigrationInterface {
  name = 'CreateCafe24MemberLinksAndSeedCafe24B2bService20270322000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cafe24_member_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mall_id VARCHAR(64) NOT NULL,
        shop_no INTEGER NOT NULL DEFAULT 1,
        member_hash VARCHAR(64) NOT NULL,
        client_namespace VARCHAR(32) NOT NULL,
        user_id UUID NOT NULL,
        organization_id UUID,
        status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        CONSTRAINT "UQ_cafe24_member_links_mall_shop_hash"
          UNIQUE (mall_id, shop_no, member_hash),

        CONSTRAINT "CHK_cafe24_member_links_status"
          CHECK (status IN ('ACTIVE', 'INACTIVE')),

        CONSTRAINT "FK_cafe24_member_links_user"
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

        CONSTRAINT "FK_cafe24_member_links_org"
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cafe24_member_links_user"
        ON cafe24_member_links (user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cafe24_member_links_org"
        ON cafe24_member_links (organization_id);
    `);

    // 2) platform_services — 신규 serviceKey (§1 D2)
    //    joinEnabled 개념상 자가 가입 경로가 없다: 회원 identity 는 Cafe24 로그인에서만 온다.
    await queryRunner.query(`
      INSERT INTO "platform_services"
        ("code", "name", "short_description", "entry_url", "service_type", "approval_required", "is_featured", "featured_order", "icon_emoji", "status")
      VALUES
        ('cafe24-b2b', 'Cafe24 B2B 매장 지원', 'Cafe24 B2B 사업자의 거래처 매장 판매지원 서비스', '', 'tool', false, false, 13, '🛍️', 'active')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 3) roles — 매장 주체를 갖는 유일한 역할
    await queryRunner.query(`
      INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
      VALUES ('cafe24-b2b:store_owner', 'Cafe24 B2B Store Owner', 'Cafe24 거래처 매장 경영자', 'cafe24-b2b', 'store_owner', true, false, true, true)
      ON CONFLICT (name) DO UPDATE SET
        service_key = EXCLUDED.service_key,
        role_key = EXCLUDED.role_key,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        updated_at = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name = 'cafe24-b2b:store_owner'`);
    await queryRunner.query(`DELETE FROM "platform_services" WHERE "code" = 'cafe24-b2b'`);
    await queryRunner.query(`DROP TABLE IF EXISTS cafe24_member_links`);
  }
}
