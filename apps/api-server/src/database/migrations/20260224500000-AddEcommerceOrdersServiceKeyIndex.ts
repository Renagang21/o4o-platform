import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPI-SERVICE-KEY-ISOLATION-V1
 *
 * ecommerce_orders.metadata->>'serviceKey' 에 대한 인덱스 추가.
 * KPI 집계 쿼리 성능 보장 — 모든 서비스 어댑터가
 * metadata->>'serviceKey' 필터를 사용하므로 인덱스 필수.
 *
 * CREATE INDEX CONCURRENTLY 사용 불가 (TypeORM migration 내부),
 * 대신 일반 CREATE INDEX 사용. 테이블 크기가 작으므로 안전.
 */
export class AddEcommerceOrdersServiceKeyIndex20260224500000 implements MigrationInterface {
  name = 'AddEcommerceOrdersServiceKeyIndex20260224500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_ecommerce_orders_service_key"
        ON "ecommerce_orders" ((metadata->>'serviceKey'))
        WHERE metadata IS NOT NULL
    `);

    console.log('[AddEcommerceOrdersServiceKeyIndex] Index on metadata->>serviceKey created.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ecommerce_orders_service_key"
    `);
  }
}
