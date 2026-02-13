import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-BUSINESS-NUMBER-NORMALIZATION-V1 — Phase 2-A
 *
 * 사업자번호 정규화 (하이픈 제거 + 컬럼 길이 통일)
 * 대상: glycopharm_pharmacies, glucoseview_pharmacies
 *
 * 테이블이 존재하지 않으면 SKIP (glucoseview_pharmacies는 아직 미생성 가능)
 */
export class NormalizeBusinessNumbers1708300000001 implements MigrationInterface {
  name = 'NormalizeBusinessNumbers1708300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.normalizeTable(queryRunner, 'glycopharm_pharmacies');
    await this.normalizeTable(queryRunner, 'glucoseview_pharmacies');
    console.log('[BN-Normalize] Phase 2-A complete.');
  }

  private async normalizeTable(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<void> {
    // 테이블 존재 여부 확인
    if (!(await this.tableExists(queryRunner, tableName))) {
      console.log(`[BN-Normalize] SKIP: ${tableName} does not exist yet`);
      return;
    }

    // Step 1: 현재 상태 로깅
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE business_number IS NULL) AS null_count,
        COUNT(*) FILTER (WHERE business_number IS NOT NULL
          AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number) AS needs_normalize
      FROM ${tableName}
    `);
    console.log(`[BN-Normalize] ${tableName} stats:`, stats[0]);

    // Step 2: 하이픈/공백 제거 (숫자만 남김)
    await queryRunner.query(`
      UPDATE ${tableName}
      SET business_number = regexp_replace(business_number, '[^0-9]', '', 'g')
      WHERE business_number IS NOT NULL
        AND regexp_replace(business_number, '[^0-9]', '', 'g') != business_number
    `);

    // Step 3: 컬럼 타입 통일 (varchar(20))
    await queryRunner.query(`
      ALTER TABLE ${tableName}
      ALTER COLUMN business_number TYPE varchar(20)
    `);

    // Step 4: 정규화 후 중복 검사 (로깅만)
    const dups = await queryRunner.query(`
      SELECT business_number, COUNT(*) AS cnt
      FROM ${tableName}
      WHERE business_number IS NOT NULL
      GROUP BY business_number
      HAVING COUNT(*) > 1
    `);
    if (dups.length > 0) {
      console.warn(`[BN-Normalize] WARNING: ${tableName} has duplicates:`, dups);
    } else {
      console.log(`[BN-Normalize] ${tableName}: no duplicates found`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'glycopharm_pharmacies')) {
      await queryRunner.query(`
        ALTER TABLE glycopharm_pharmacies
        ALTER COLUMN business_number TYPE varchar(50)
      `);
    }
    if (await this.tableExists(queryRunner, 'glucoseview_pharmacies')) {
      await queryRunner.query(`
        ALTER TABLE glucoseview_pharmacies
        ALTER COLUMN business_number TYPE varchar(100)
      `);
    }
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `, [tableName]);
    return result[0].exists;
  }
}
