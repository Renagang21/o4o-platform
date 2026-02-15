/**
 * Migration: Add sales_limit column to organization_product_channels
 *
 * WO-PHARMACY-PRODUCT-CHANNEL-MANAGEMENT-V1
 *
 * 채널별 판매 한도 설정. null = 제한 없음.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesLimitToProductChannels20260215200004 implements MigrationInterface {
  name = 'AddSalesLimitToProductChannels20260215200004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'organization_product_channels' AND column_name = 'sales_limit'`
    );
    if (colExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "organization_product_channels" ADD COLUMN "sales_limit" INTEGER`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_product_channels" DROP COLUMN IF EXISTS "sales_limit"`
    );
  }
}
