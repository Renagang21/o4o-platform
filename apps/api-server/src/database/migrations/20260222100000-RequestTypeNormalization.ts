import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-C-REQUEST-TYPE-NORMALIZATION-V1
 *
 * kpa_organization_join_requests.request_type 정리:
 *   A: pharmacy_operator → operator 변환
 *   B: 잔여 pharmacy_join 확인 (이미 migration 20260219000006에서 이관/삭제됨)
 *   C: CHECK 제약 추가 (join, promotion, operator만 허용)
 */
export class RequestTypeNormalization20260222100000 implements MigrationInterface {
  name = 'RequestTypeNormalization20260222100000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── A: pharmacy_operator → operator 변환 ──
    const convertResult = await queryRunner.query(`
      UPDATE kpa_organization_join_requests
      SET request_type = 'operator'
      WHERE request_type = 'pharmacy_operator'
    `);
    console.log(`[RequestTypeNorm] pharmacy_operator → operator converted`);

    // ── B: 잔여 pharmacy_join 확인 ──
    const remaining = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt FROM kpa_organization_join_requests
      WHERE request_type = 'pharmacy_join'
    `);
    const remainingCount = remaining[0]?.cnt ?? 0;
    if (remainingCount > 0) {
      console.warn(`[RequestTypeNorm] WARNING: ${remainingCount} pharmacy_join records still exist — skipping CHECK constraint`);
      return;
    }

    // ── C: CHECK 제약 추가 ──
    const checkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'CHK_valid_request_type'
        AND table_name = 'kpa_organization_join_requests'
    `);

    if (checkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE kpa_organization_join_requests
        ADD CONSTRAINT "CHK_valid_request_type"
        CHECK (request_type IN ('join', 'promotion', 'operator'))
      `);
      console.log('[RequestTypeNorm] CHECK constraint added: join, promotion, operator only');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove CHECK constraint
    await queryRunner.query(`
      ALTER TABLE kpa_organization_join_requests
      DROP CONSTRAINT IF EXISTS "CHK_valid_request_type"
    `);
    console.log('[RequestTypeNorm] Reverted: CHECK constraint removed');
  }
}
