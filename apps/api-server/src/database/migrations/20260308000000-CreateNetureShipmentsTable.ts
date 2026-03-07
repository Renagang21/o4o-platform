import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SHIPMENT-ENGINE-V1
 *
 * neture_shipments 테이블 생성
 *
 * - carrier_code / carrier_name: 택배사 정보
 * - tracking_number: 송장번호
 * - status: preparing → shipped → in_transit → delivered
 * - shipped_at / delivered_at: 발송/배송완료 시각
 *
 * FK는 코드 레벨 참조만 (cross-schema 이슈 회피)
 */
export class CreateNetureShipmentsTable20260308000000 implements MigrationInterface {
  name = 'CreateNetureShipmentsTable20260308000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        supplier_id UUID NOT NULL,

        carrier_code VARCHAR(50) NOT NULL,
        carrier_name VARCHAR(100) NOT NULL,
        tracking_number VARCHAR(100) NOT NULL,

        status VARCHAR(30) NOT NULL DEFAULT 'preparing',

        shipped_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_shipments_order_id
      ON neture_shipments (order_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_shipments_supplier_id
      ON neture_shipments (supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_shipments_tracking_number
      ON neture_shipments (tracking_number)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture_shipments`);
  }
}
