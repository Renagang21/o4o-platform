import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 — Phase 2 (contract)
 *
 * Phase 1 (1789523426775) 이 남긴 배포 창 호환 VIEW 2개를 제거하고, 배포된 entity 가 더 이상 매핑하지
 * 않는 Legacy Partner 컬럼 1개를 DROP 한다. Phase 1 을 실은 새 revision 이 프로덕션 트래픽을 받고
 * Seller Recruitment smoke 가 통과한 뒤에만 실행된다 (이 migration 을 실은 배포 = 그 이후).
 *
 *   ① DROP VIEW public.neture_partner_recruitments · public.neture_partner_applications (TEMP_COMPAT)
 *   ② DROP COLUMN market_trial_decisions."selectedSellerIds" — 사전 단언: non-null 0
 *
 * down(): VIEW 재생성 + 컬럼 재추가(값은 복원하지 않는다 — 은퇴 후 항상 null 이었다).
 */
export class DropSellerRecruitmentCompatViewsAndSelectedSellerIds1789525702200 implements MigrationInterface {
  name = 'DropSellerRecruitmentCompatViewsAndSelectedSellerIds1789525702200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM public.market_trial_decisions WHERE "selectedSellerIds" IS NOT NULL`,
    )) as Array<{ n: number | string }>;
    const nonNull = Number(rows?.[0]?.n ?? 0);
    if (nonNull !== 0) {
      throw new Error(`[partner-physical-cleanup phase2] ABORT: market_trial_decisions."selectedSellerIds" has ${nonNull} non-null rows (expected 0)`);
    }

    await queryRunner.query(`DROP VIEW public.neture_partner_applications`);
    await queryRunner.query(`DROP VIEW public.neture_partner_recruitments`);
    await queryRunner.query(`ALTER TABLE public.market_trial_decisions DROP COLUMN "selectedSellerIds"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.market_trial_decisions ADD COLUMN "selectedSellerIds" text`);
    await queryRunner.query(`
      CREATE VIEW public.neture_partner_recruitments AS
        SELECT id, product_id, product_name, manufacturer, consumer_price, commission_rate,
               seller_id, seller_name, shop_url, service_name, service_id, image_url, status,
               created_at, updated_at, exposure_status, exposure_reviewed_at, exposure_reviewed_by,
               exposure_review_note
          FROM public.seller_recruitments
    `);
    await queryRunner.query(`
      CREATE VIEW public.neture_partner_applications AS
        SELECT id, recruitment_id, applicant_id AS partner_id, applicant_name AS partner_name,
               status, applied_at, decided_at, decided_by, reason, created_at, updated_at
          FROM public.seller_recruitment_applications
    `);
  }
}
