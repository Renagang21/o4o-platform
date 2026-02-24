import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPI-SERVICE-KEY-ISOLATION-V1
 *
 * NO-OP: ecommerce_orders table does not exist.
 * The platform uses checkout_orders (CheckoutOrder entity) instead.
 * Index will be added when/if ecommerce_orders is created.
 */
export class AddEcommerceOrdersServiceKeyIndex20260224500000 implements MigrationInterface {
  name = 'AddEcommerceOrdersServiceKeyIndex20260224500000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: ecommerce_orders table does not exist
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
