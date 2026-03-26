import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-ORGANIZATION-ENROLLMENT-SEED-V1
 *
 * autoExpandPublicProduct() 검증을 위한 최소 운영 데이터 세팅.
 * 기존 KPA 조직 2개(대한약사회, 서울특별시약사회)를 neture 서비스에 enrollment.
 *
 * 조건부 INSERT — 이미 존재하면 skip.
 */
export class SeedNetureOrgEnrollments1711444200000 implements MigrationInterface {
  name = 'SeedNetureOrgEnrollments1711444200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: 대상 조직 존재 확인
    const orgs = await queryRunner.query(`
      SELECT id, name
      FROM organizations
      WHERE id IN (
        'a0000000-0a00-4000-a000-000000000001',
        'a0000000-0a00-4000-a000-000000000002'
      )
    `);
    if (orgs.length === 0) {
      throw new Error('ABORT: Target organizations not found. Seed KPA organizations first.');
    }

    // Safety: neture 서비스 존재 확인
    const svc = await queryRunner.query(`
      SELECT code FROM platform_services WHERE code = 'neture'
    `);
    if (svc.length === 0) {
      throw new Error('ABORT: platform_services "neture" not found.');
    }

    // 조건부 INSERT — 중복 방지
    const result = await queryRunner.query(`
      INSERT INTO organization_service_enrollments (
        organization_id,
        service_code,
        status
      )
      SELECT
        o.id,
        'neture',
        'active'
      FROM organizations o
      WHERE o.id IN (
        'a0000000-0a00-4000-a000-000000000001',
        'a0000000-0a00-4000-a000-000000000002'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM organization_service_enrollments e
        WHERE e.organization_id = o.id
          AND e.service_code = 'neture'
      )
    `);

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    // Log is informational — migration succeeds even if 0 rows (idempotent)
    console.log(`[SeedNetureOrgEnrollments] Inserted ${count} enrollment(s)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM organization_service_enrollments
      WHERE service_code = 'neture'
        AND organization_id IN (
          'a0000000-0a00-4000-a000-000000000001',
          'a0000000-0a00-4000-a000-000000000002'
        )
    `);
  }
}
