import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-LICENSE-INTEGRITY-V1
 * 면허번호 + user_id 유일성 보장
 * - user_id: 1인 1회원 (절대 유일)
 * - license_number: 상태 무관 절대 유일 (NULL 허용 — 약대생은 면허번호 없음)
 */
export class AddKpaMemberUniqueConstraints1707696001000 implements MigrationInterface {
  name = 'AddKpaMemberUniqueConstraints1707696001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 중복 데이터 사전 점검 (있으면 로그만 — 제약 추가 실패 시 원인 파악용)
    const dupUsers = await queryRunner.query(`
      SELECT user_id, COUNT(*) as cnt
      FROM kpa_members
      GROUP BY user_id HAVING COUNT(*) > 1
    `);
    if (dupUsers.length > 0) {
      console.warn('[Migration] Duplicate user_id rows found:', dupUsers);
    }

    const dupLicenses = await queryRunner.query(`
      SELECT license_number, COUNT(*) as cnt
      FROM kpa_members
      WHERE license_number IS NOT NULL AND license_number != ''
      GROUP BY license_number HAVING COUNT(*) > 1
    `);
    if (dupLicenses.length > 0) {
      console.warn('[Migration] Duplicate license_number rows found:', dupLicenses);
    }

    // 2. UNIQUE on user_id (1인 1회원)
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ADD CONSTRAINT "UQ_kpa_members_user_id" UNIQUE ("user_id")
    `);
    console.log('[Migration] Added UNIQUE constraint on kpa_members.user_id');

    // 3. Partial UNIQUE on license_number (NULL 제외, 빈문자열 제외)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_kpa_members_license_number_unique"
      ON "kpa_members" ("license_number")
      WHERE "license_number" IS NOT NULL AND "license_number" != ''
    `);
    console.log('[Migration] Added partial UNIQUE index on kpa_members.license_number');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_kpa_members_license_number_unique"
    `);
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      DROP CONSTRAINT IF EXISTS "UQ_kpa_members_user_id"
    `);
  }
}
