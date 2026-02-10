/**
 * Migration: Add Dispatch Fields to Glycopharm Billing Invoices
 *
 * WO-O4O-INVOICE-DISPATCH-PHASE3E-CP1:
 * 인보이스 발송/수령 상태 관리 컬럼 추가.
 * dispatch_status, dispatched_at, dispatched_to, received_at, dispatch_log
 */

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddInvoiceDispatchFields1739266800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_billing_invoices
      ADD COLUMN IF NOT EXISTS dispatch_status varchar(20) DEFAULT 'NONE' NOT NULL,
      ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
      ADD COLUMN IF NOT EXISTS dispatched_to varchar(255),
      ADD COLUMN IF NOT EXISTS received_at timestamptz,
      ADD COLUMN IF NOT EXISTS dispatch_log jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_billing_invoices
      DROP COLUMN IF EXISTS dispatch_status,
      DROP COLUMN IF EXISTS dispatched_at,
      DROP COLUMN IF EXISTS dispatched_to,
      DROP COLUMN IF EXISTS received_at,
      DROP COLUMN IF EXISTS dispatch_log
    `);
  }
}
