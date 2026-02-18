/**
 * Migration: Add seller_organization_id to checkout_orders
 *
 * WO-CHECKOUT-ORG-BOUNDARY-FIX-V1
 *
 * 매장 단위 주문 추적을 위한 조직 참조 컬럼 추가.
 * - NULLABLE: 기존 데이터 영향 없음 (기존 주문은 seller_organization_id = NULL)
 * - 새 주문 생성 시 판매 조직 ID 기록 가능
 * - sellerId(VARCHAR) 유지: 레거시 호환
 *
 * Retail Stable Rule 영향 분석:
 * - Visibility Gate 4중 조건: 미해당 (checkout_orders 외부)
 * - Sales Limit 계산: 미해당 (WHERE status='PAID' 변경 없음)
 * - Payment 상태 전이: 미해당 (additive column)
 * - 결론: 비파괴적 추가, 5개 Frozen 항목 미영향
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerOrganizationIdToCheckoutOrders20260218000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // checkout_orders 테이블 존재 확인
    const tableExists = await queryRunner.hasTable('checkout_orders');
    if (!tableExists) {
      // synchronize:true로 생성되지 않은 환경에서는 스킵
      return;
    }

    // 컬럼 존재 확인 (idempotent)
    const columns = await queryRunner.getTable('checkout_orders');
    const hasColumn = columns?.columns.some(c => c.name === 'seller_organization_id');
    if (hasColumn) {
      return;
    }

    // seller_organization_id 컬럼 추가 (NULLABLE UUID)
    await queryRunner.query(`
      ALTER TABLE checkout_orders
      ADD COLUMN seller_organization_id UUID
    `);

    // 인덱스 추가
    await queryRunner.query(`
      CREATE INDEX "IDX_checkout_orders_seller_org_id"
      ON checkout_orders (seller_organization_id)
      WHERE seller_organization_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('checkout_orders');
    if (!tableExists) return;

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_checkout_orders_seller_org_id"`);
    await queryRunner.query(`ALTER TABLE checkout_orders DROP COLUMN IF EXISTS seller_organization_id`);
  }
}
