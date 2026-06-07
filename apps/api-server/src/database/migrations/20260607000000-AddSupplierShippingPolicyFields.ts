import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 (additive)
 *
 * neture_suppliers 에 공급자별 배송 정책 숫자/텍스트 필드를 additive 로 추가한다.
 * 저장/조회 foundation 만 — checkout 배송비 계산은 변경하지 않는다(V2).
 *
 * 불변 보장:
 *   - 모든 컬럼 nullable, 기본값 강제 없음, 기존 데이터 backfill 없음
 *   - 기존 배송 안내(shipping_standard/island/mountain)·주문조건(min_order_amount 등) 무변경
 *   - ADD COLUMN IF NOT EXISTS 로 멱등
 */
export class AddSupplierShippingPolicyFields20260607000000 implements MigrationInterface {
  name = 'AddSupplierShippingPolicyFields20260607000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "base_shipping_fee" integer`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "free_shipping_threshold" integer`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "average_dispatch_days" integer`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "return_exchange_notice" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "return_exchange_notice"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "average_dispatch_days"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "free_shipping_threshold"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "base_shipping_fee"`);
  }
}
