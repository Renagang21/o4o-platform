import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 신규 등록의 기본 미게시와 기존 Neture 기본 공급 선택을 분리한다. */
export class SeparateSupplierRegistrationPublication1792110685889 implements MigrationInterface {
  name = 'SeparateSupplierRegistrationPublication1792110685889';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE supplier_product_offers ADD COLUMN default_supply_enabled boolean NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE supplier_product_offers ADD COLUMN registration_rejection_reason text`);
    await q.query(`UPDATE supplier_product_offers spo SET registration_rejection_reason = (
      SELECT osa.reason FROM offer_service_approvals osa
      WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected' AND osa.reason IS NOT NULL
      ORDER BY osa.decided_at DESC NULLS LAST, osa.id DESC LIMIT 1
    ) WHERE spo.approval_status = 'REJECTED'`);
    // 이전 default 카탈로그 자격을 정확히 보존한다. 기존 가격·승인·서비스 선택·주문은 바꾸지 않는다.
    await q.query(`UPDATE supplier_product_offers SET default_supply_enabled = true
      WHERE approval_status = 'APPROVED' AND cardinality(COALESCE(service_keys, '{}'::text[])) = 0`);
  }

  async down(q: QueryRunner): Promise<void> {
    // rollback은 종전의 암묵적 기본 공급 정책으로 돌아가므로 운영에서 자동 실행하지 않는다.
    await q.query(`ALTER TABLE supplier_product_offers DROP COLUMN default_supply_enabled, DROP COLUMN registration_rejection_reason`);
  }
}
