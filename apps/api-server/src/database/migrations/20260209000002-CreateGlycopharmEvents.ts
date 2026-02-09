/**
 * Migration: Create Glycopharm Events Table
 *
 * WO-O4O-REQUEST-EVENT-CONNECTION-PHASE2A:
 * 이벤트 로그 테이블 생성
 *
 * 핵심:
 * - impression / click / qr_scan 이벤트 기록
 * - Event → Request 승격 추적 (promoted_to_request_id)
 * - pharmacy_id 기준 조회 + 타입/시간 필터
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGlycopharmEvents20260209000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('glycopharm_events');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_events',
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
            name: 'event_type',
            type: 'varchar',
            length: '20',
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
            name: 'purpose',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'promoted_to_request_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Index: (pharmacy_id, event_type, created_at) — 약국별 이벤트 타입 조회
    await queryRunner.createIndex(
      'glycopharm_events',
      new TableIndex({
        name: 'IDX_ge_pharmacy_type_date',
        columnNames: ['pharmacy_id', 'event_type', 'created_at'],
      })
    );

    // Index: (source_type, source_id, created_at) — 출처별 이벤트 조회
    await queryRunner.createIndex(
      'glycopharm_events',
      new TableIndex({
        name: 'IDX_ge_source_date',
        columnNames: ['source_type', 'source_id', 'created_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_events');
  }
}
