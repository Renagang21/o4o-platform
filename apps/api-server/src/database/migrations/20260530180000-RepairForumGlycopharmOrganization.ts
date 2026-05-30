import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-ORGS-INVALID-UUID-HOTFIX-V1
 *
 * 기존 seed migration `2026020400002-SeedForumServiceOrganizations` 는
 * organizations.id 컬럼(UUID)에 'a1b2c3d4-0001-4000-a000-forum00000001' 을 INSERT 시도.
 * 해당 문자열은 PostgreSQL UUID 형식 위반 (비-hex 문자 f,o,r,u,m + 마지막 세그먼트 13자) 으로
 * 무조건 INSERT 실패. 결과적으로 production organizations 테이블에 GlycoPharm forum-service
 * organization row 가 부재 → `/api/v1/glycopharm/forum/posts` 조회 시 잘못된 UUID 가
 * 파라미터로 전달되어 모든 호출이 500 (invalid input syntax for type uuid).
 *
 * 본 마이그레이션은 유효한 UUID 'a1b2c3d4-0001-4000-a000-91c0fa800001' 로 row 를
 * idempotent 하게 보장한다. (code 컬럼 UNIQUE 충돌 시 NOOP)
 */
export class RepairForumGlycopharmOrganization20260530180000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists";
    `);

    if (!tableExists[0]?.exists) {
      console.log('[RepairForumGlycopharmOrganization] organizations table missing, skipping.');
      return;
    }

    await queryRunner.query(`
      INSERT INTO organizations (id, name, code, type, level, path, metadata, "isActive", "childrenCount", "createdAt", "updatedAt")
      VALUES (
        'a1b2c3d4-0001-4000-a000-91c0fa800001',
        'GlycoPharm',
        'FORUM_GLYCOPHARM',
        'division',
        0,
        '/glycopharm',
        '{"purpose": "forum-service-organization", "serviceCode": "glycopharm"}'::jsonb,
        true,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM organizations
      WHERE code = 'FORUM_GLYCOPHARM'
        AND id = 'a1b2c3d4-0001-4000-a000-91c0fa800001';
    `);
  }
}
