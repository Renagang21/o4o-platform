import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1 (P3-2b)
 *
 * 유통참여형 펀딩 = Neture 전용 content-only 모집. 제품 전환 / 매장 진열(OPL) / 고객 전환(매장 도입·첫 주문)
 * 컬럼을 제거한다.
 * - 사전 실측(2026-06-19, read-only): 7개 대상 컬럼 전부 0 / null / none-only. OPL source_type='market_trial' = 0.
 *   → 데이터 손실 없음.
 * - 보존: market_trials.productId (content 소재 참조 — 전환 아님), settlement·payment 전 컬럼 및 기존 데이터
 *   (정산 choice_pending 1 / 결제 paid 1).
 * - 선행: active read/render 제거 완료(WO-...-CONVERSION-READ-WIRING-CLEANUP-V1). entity field 도 동일 커밋에서 제거.
 */
export class DropMarketTrialConversionColumns20261116000000 implements MigrationInterface {
  name = 'DropMarketTrialConversionColumns20261116000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // market_trials — 제품 전환 컬럼
    await queryRunner.query(`ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "convertedProductId"`);
    await queryRunner.query(`ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "convertedProductName"`);
    await queryRunner.query(`ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "conversionNote"`);

    // market_trial_participants — 매장 진열 / 고객 전환 컬럼
    await queryRunner.query(`ALTER TABLE "market_trial_participants" DROP COLUMN IF EXISTS "listingId"`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" DROP COLUMN IF EXISTS "customerConversionStatus"`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" DROP COLUMN IF EXISTS "customerConversionAt"`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" DROP COLUMN IF EXISTS "customerConversionNote"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 구조만 nullable 로 복원 (데이터 복원 없음 — 원본 0/null/none).
    await queryRunner.query(`ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "convertedProductId" uuid`);
    await queryRunner.query(`ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "convertedProductName" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "conversionNote" text`);

    await queryRunner.query(`ALTER TABLE "market_trial_participants" ADD COLUMN IF NOT EXISTS "listingId" uuid`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" ADD COLUMN IF NOT EXISTS "customerConversionStatus" varchar(30) NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" ADD COLUMN IF NOT EXISTS "customerConversionAt" timestamp`);
    await queryRunner.query(`ALTER TABLE "market_trial_participants" ADD COLUMN IF NOT EXISTS "customerConversionNote" text`);
  }
}
