/**
 * Migration: Create Glycopharm Customer Requests Table
 *
 * WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1:
 * 고객 요청(Request) 테이블 생성
 *
 * 핵심:
 * - QR/태블릿/웹 등에서 발생한 고객 요청을 저장
 * - 상태 모델: pending → approved | rejected | cancelled
 * - pharmacy_id 기준 조회 + 상태/시간 필터
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGlycopharmCustomerRequests20260209000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('glycopharm_customer_requests');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_customer_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'pharmacy_id',
            type: 'uuid',
          },
          {
            name: 'purpose',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'source_type',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'source_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'customer_contact',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'requested_at',
            type: 'timestamp with time zone',
          },
          {
            name: 'handled_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'handled_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'handle_note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Index: pharmacy_id (단일 조회)
    await queryRunner.createIndex(
      'glycopharm_customer_requests',
      new TableIndex({
        name: 'IDX_gcr_pharmacy_id',
        columnNames: ['pharmacy_id'],
      })
    );

    // Index: (pharmacy_id, status) — 상태별 필터 조회
    await queryRunner.createIndex(
      'glycopharm_customer_requests',
      new TableIndex({
        name: 'IDX_gcr_pharmacy_status',
        columnNames: ['pharmacy_id', 'status'],
      })
    );

    // Index: (pharmacy_id, requested_at) — 시간순 정렬 조회
    await queryRunner.createIndex(
      'glycopharm_customer_requests',
      new TableIndex({
        name: 'IDX_gcr_pharmacy_requested',
        columnNames: ['pharmacy_id', 'requested_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_customer_requests');
  }
}
