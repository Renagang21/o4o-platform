/**
 * Migration: Add Store Attribution Columns to EcommerceOrders
 *
 * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1
 *
 * NO-OP: ecommerce_orders table does not exist.
 * The platform uses checkout_orders (CheckoutOrder entity) instead.
 * Store attribution columns will be added when/if ecommerce_orders is created.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreAttributionToEcommerceOrders20260212000002 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: ecommerce_orders table does not exist
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
