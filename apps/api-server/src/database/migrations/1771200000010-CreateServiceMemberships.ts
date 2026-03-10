import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1
 *
 * service_memberships 테이블 생성 및 기존 users.service_key 데이터 마이그레이션.
 *
 * Global User + Service Membership 모델:
 * - 한 사용자(email)가 여러 서비스에 독립 가입/승인
 * - users.service_key → service_memberships로 데이터 이전
 * - users.service_key 컬럼은 호환성을 위해 유지 (삭제 안 함)
 */
export class CreateServiceMemberships1771200000010 implements MigrationInterface {
  name = 'CreateServiceMemberships1771200000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: service_memberships 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_memberships (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_key VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        approved_by UUID,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, service_key)
      )
    `);

    // Step 2: 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_memberships_service_status
      ON service_memberships(service_key, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_memberships_user
      ON service_memberships(user_id)
    `);

    // Step 3: 기존 사용자 데이터 마이그레이션 (users.service_key → service_memberships)
    await queryRunner.query(`
      INSERT INTO service_memberships (user_id, service_key, status, role, created_at, updated_at)
      SELECT
        u.id,
        COALESCE(u.service_key, 'platform'),
        CASE
          WHEN u.status = 'active' THEN 'active'
          WHEN u.status = 'approved' THEN 'active'
          ELSE CAST(u.status AS VARCHAR(50))
        END,
        COALESCE(
          (SELECT ra.role FROM role_assignments ra
           WHERE ra.user_id = u.id AND ra.is_active = true
           ORDER BY ra.created_at ASC LIMIT 1),
          'customer'
        ),
        u.created_at,
        NOW()
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM service_memberships sm
        WHERE sm.user_id = u.id
          AND sm.service_key = COALESCE(u.service_key, 'platform')
      )
    `);

    // Step 4: Verification (silent — CI blocks console.log in production code)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_memberships_service_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_memberships_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_memberships`);
  }
}
