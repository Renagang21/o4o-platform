/**
 * Migration: Create Glycopharm Request Action Logs Table
 *
 * WO-O4O-REQUEST-POST-ACTION-PHASE2C:
 * 승인 후 후속 액션 로그 테이블 생성
 *
 * 핵심:
 * - 승인된 요청의 후속 액션(상담로그, 샘플이행, 주문초안, 후속기록) 추적
 * - 모든 액션은 draft → in_progress → completed 상태 모델
 * - request_id 기준 조회
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateGlycopharmRequestActionLogs20260210000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('glycopharm_request_action_logs');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_request_action_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'request_id',
            type: 'uuid',
          },
          {
            name: 'action_type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
          },
          {
            name: 'performed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'note',
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

    // Index: request_id (단일 조회)
    await queryRunner.createIndex(
      'glycopharm_request_action_logs',
      new TableIndex({
        name: 'IDX_gral_request_id',
        columnNames: ['request_id'],
      })
    );

    // Index: (request_id, action_type)
    await queryRunner.createIndex(
      'glycopharm_request_action_logs',
      new TableIndex({
        name: 'IDX_gral_request_action',
        columnNames: ['request_id', 'action_type'],
      })
    );

    // Foreign key to glycopharm_customer_requests
    await queryRunner.createForeignKey(
      'glycopharm_request_action_logs',
      new TableForeignKey({
        name: 'FK_gral_request',
        columnNames: ['request_id'],
        referencedTableName: 'glycopharm_customer_requests',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_request_action_logs');
  }
}
