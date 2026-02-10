/**
 * Migration: Create Glycopharm Billing Invoices Table
 *
 * WO-O4O-INVOICE-FINALIZATION-PHASE3D-CP1:
 * 청구 스냅샷 고정 · 인보이스 초안/확정.
 * DRAFT → CONFIRMED → ARCHIVED
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGlycopharmBillingInvoices1739180400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_billing_invoices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'service_key',
            type: 'varchar',
            length: '50',
            default: "'glycopharm'",
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'pharmacy_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'period_from',
            type: 'date',
          },
          {
            name: 'period_to',
            type: 'date',
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'unit_price',
            type: 'int',
          },
          {
            name: 'count',
            type: 'int',
          },
          {
            name: 'amount',
            type: 'int',
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'KRW'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'DRAFT'",
          },
          {
            name: 'snapshot_at',
            type: 'timestamptz',
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'confirmed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'confirmed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'line_snapshot',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Unique constraint: prevent duplicate invoices for same period/supplier/pharmacy/unit
    await queryRunner.createIndex(
      'glycopharm_billing_invoices',
      new TableIndex({
        name: 'IDX_billing_invoice_unique_period',
        columnNames: ['supplier_id', 'pharmacy_id', 'period_from', 'period_to', 'unit'],
        isUnique: true,
      }),
    );

    // Status index for listing
    await queryRunner.createIndex(
      'glycopharm_billing_invoices',
      new TableIndex({
        name: 'IDX_billing_invoice_status',
        columnNames: ['status'],
      }),
    );

    // Supplier index
    await queryRunner.createIndex(
      'glycopharm_billing_invoices',
      new TableIndex({
        name: 'IDX_billing_invoice_supplier',
        columnNames: ['supplier_id'],
      }),
    );

    // Pharmacy index
    await queryRunner.createIndex(
      'glycopharm_billing_invoices',
      new TableIndex({
        name: 'IDX_billing_invoice_pharmacy',
        columnNames: ['pharmacy_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_billing_invoices');
  }
}
