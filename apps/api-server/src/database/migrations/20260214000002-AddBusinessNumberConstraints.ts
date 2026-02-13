import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-BUSINESS-NUMBER-NORMALIZATION-V1 — Phase 2-B
 *
 * 사업자번호 제약조건 추가: NOT NULL + UNIQUE INDEX
 * 대상: glycopharm_pharmacies, glucoseview_pharmacies
 *
 * 선행 조건: Phase 2-A (20260214000001) 완료 후 실행
 *
 * 안전 장치:
 * - NULL이 존재하면 NOT NULL 적용 스킵 (로그 경고)
 * - 중복이 존재하면 UNIQUE 적용 스킵 (로그 경고)
 */
export class AddBusinessNumberConstraints1708300000002 implements MigrationInterface {
  name = 'AddBusinessNumberConstraints1708300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── glycopharm_pharmacies ──
    await this.addConstraints(queryRunner, 'glycopharm_pharmacies', 'idx_glycopharm_business_number');

    // ── glucoseview_pharmacies ──
    await this.addConstraints(queryRunner, 'glucoseview_pharmacies', 'idx_glucoseview_business_number');

    console.log('[BN-Constraints] Phase 2-B complete.');
  }

  private async addConstraints(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    // NULL 검사
    const nullCheck = await queryRunner.query(`
      SELECT COUNT(*) AS cnt FROM ${tableName} WHERE business_number IS NULL
    `);
    const nullCount = parseInt(nullCheck[0].cnt, 10);

    if (nullCount > 0) {
      console.warn(
        `[BN-Constraints] SKIPPING NOT NULL for ${tableName}: ${nullCount} NULL rows exist. ` +
        `Resolve NULLs manually, then re-run.`
      );
    } else {
      await queryRunner.query(`
        ALTER TABLE ${tableName}
        ALTER COLUMN business_number SET NOT NULL
      `);
      console.log(`[BN-Constraints] ${tableName}: NOT NULL applied`);
    }

    // 중복 검사
    const dupCheck = await queryRunner.query(`
      SELECT business_number, COUNT(*) AS cnt
      FROM ${tableName}
      WHERE business_number IS NOT NULL
      GROUP BY business_number
      HAVING COUNT(*) > 1
    `);

    if (dupCheck.length > 0) {
      console.warn(
        `[BN-Constraints] SKIPPING UNIQUE for ${tableName}: ${dupCheck.length} duplicate groups found.`,
        dupCheck,
      );
    } else {
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ${indexName}
        ON ${tableName} (business_number)
      `);
      console.log(`[BN-Constraints] ${tableName}: UNIQUE INDEX ${indexName} created`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 제거
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glycopharm_business_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glucoseview_business_number`);

    // NOT NULL 해제
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ALTER COLUMN business_number DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE glucoseview_pharmacies
      ALTER COLUMN business_number DROP NOT NULL
    `);
  }
}
