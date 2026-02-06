import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add membership_type, university_name, student_year to kpa_members
 *
 * Phase 3: SVC-A 커뮤니티 약사/약대생 구분 지원
 * - membership_type: 'pharmacist' | 'student' (기존 레코드는 'pharmacist')
 * - university_name: 약대생 재학 대학명
 * - student_year: 약대생 학년 (1-6)
 */
export class AddMembershipTypeToKpaMember20260206200000 implements MigrationInterface {
  name = 'AddMembershipTypeToKpaMember20260206200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if table doesn't exist (created by CreateKpaFoundationTables)
    const hasTable = await queryRunner.hasTable('kpa_members');
    if (!hasTable) {
      console.log('[Migration] kpa_members table does not exist, skipping ADD COLUMN (already created with columns by foundation migration)');
      return;
    }

    // 1. membership_type 컬럼 추가 (기존 레코드는 'pharmacist')
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ADD COLUMN IF NOT EXISTS membership_type varchar(50) NOT NULL DEFAULT 'pharmacist'
    `);

    // 2. university_name 컬럼 추가 (약대생용, nullable)
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ADD COLUMN IF NOT EXISTS university_name varchar(200) NULL
    `);

    // 3. student_year 컬럼 추가 (약대생용, nullable)
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ADD COLUMN IF NOT EXISTS student_year integer NULL
    `);

    console.log('[Migration] Added membership_type, university_name, student_year to kpa_members');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE kpa_members DROP COLUMN IF EXISTS student_year`);
    await queryRunner.query(`ALTER TABLE kpa_members DROP COLUMN IF EXISTS university_name`);
    await queryRunner.query(`ALTER TABLE kpa_members DROP COLUMN IF EXISTS membership_type`);
  }
}
