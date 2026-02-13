import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-BUSINESS-NUMBER-NORMALIZATION-V1 — Phase 2-A
 *
 * 사업자번호 정규화 (하이픈 제거 + 컬럼 길이 통일)
 * 대상: glycopharm_pharmacies, glucoseview_pharmacies
 *
 * 이 마이그레이션은 데이터를 정규화만 하고 제약조건은 추가하지 않음.
 * 제약조건은 Phase 2-B (20260214000002) 에서 처리.
 */
export class NormalizeBusinessNumbers1708300000001 implements MigrationInterface {
  name = 'NormalizeBusinessNumbers1708300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: 현재 상태 로깅 ──
    const glycopharmStats = await queryRunner.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE business_number IS NULL) AS null_count,
        COUNT(*) FILTER (WHERE business_number IS NOT NULL
          AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number) AS needs_normalize
      FROM glycopharm_pharmacies
    `);
    console.log('[BN-Normalize] glycopharm_pharmacies stats:', glycopharmStats[0]);

    const glucoseviewStats = await queryRunner.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE business_number IS NULL) AS null_count,
        COUNT(*) FILTER (WHERE business_number IS NOT NULL
          AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number) AS needs_normalize
      FROM glucoseview_pharmacies
    `);
    console.log('[BN-Normalize] glucoseview_pharmacies stats:', glucoseviewStats[0]);

    // ── Step 2: 하이픈/공백 제거 (숫자만 남김) ──
    await queryRunner.query(`
      UPDATE glycopharm_pharmacies
      SET business_number = regexp_replace(business_number, '[^0-9]', '', 'g')
      WHERE business_number IS NOT NULL
        AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number
    `);

    await queryRunner.query(`
      UPDATE glucoseview_pharmacies
      SET business_number = regexp_replace(business_number, '[^0-9]', '', 'g')
      WHERE business_number IS NOT NULL
        AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number
    `);

    // ── Step 3: 컬럼 타입 통일 (varchar(20)) ──
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ALTER COLUMN business_number TYPE varchar(20)
    `);

    await queryRunner.query(`
      ALTER TABLE glucoseview_pharmacies
      ALTER COLUMN business_number TYPE varchar(20)
    `);

    // ── Step 4: 정규화 후 중복 검사 (로깅만) ──
    const glycopharmDups = await queryRunner.query(`
      SELECT business_number, COUNT(*) AS cnt
      FROM glycopharm_pharmacies
      WHERE business_number IS NOT NULL
      GROUP BY business_number
      HAVING COUNT(*) > 1
    `);
    if (glycopharmDups.length > 0) {
      console.warn('[BN-Normalize] WARNING: glycopharm_pharmacies has duplicates:', glycopharmDups);
    } else {
      console.log('[BN-Normalize] glycopharm_pharmacies: no duplicates found');
    }

    const glucoseviewDups = await queryRunner.query(`
      SELECT business_number, COUNT(*) AS cnt
      FROM glucoseview_pharmacies
      WHERE business_number IS NOT NULL
      GROUP BY business_number
      HAVING COUNT(*) > 1
    `);
    if (glucoseviewDups.length > 0) {
      console.warn('[BN-Normalize] WARNING: glucoseview_pharmacies has duplicates:', glucoseviewDups);
    } else {
      console.log('[BN-Normalize] glucoseview_pharmacies: no duplicates found');
    }

    console.log('[BN-Normalize] Phase 2-A complete. Data normalized to digits-only varchar(20).');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: 컬럼 길이만 원래대로. 하이픈은 복원 불가.
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ALTER COLUMN business_number TYPE varchar(50)
    `);

    await queryRunner.query(`
      ALTER TABLE glucoseview_pharmacies
      ALTER COLUMN business_number TYPE varchar(100)
    `);
  }
}
