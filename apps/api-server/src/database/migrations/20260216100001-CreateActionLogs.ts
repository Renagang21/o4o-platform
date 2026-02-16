/**
 * Migration: Create action_logs table
 *
 * WO-PLATFORM-ACTION-LOG-CORE-V1
 *
 * Hub Trigger 실행 이력을 기록하는 테이블.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateActionLogs20260216100001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('action_logs');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'action_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'service_key', type: 'varchar', length: '50' },
          { name: 'user_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid', isNullable: true },
          { name: 'action_key', type: 'varchar', length: '100' },
          { name: 'source', type: 'varchar', length: '20' },
          { name: 'status', type: 'varchar', length: '20' },
          { name: 'duration_ms', type: 'int', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'meta', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'NOW()' },
        ],
      }),
      true,
    );

    // Indexes for common queries
    await queryRunner.createIndex(
      'action_logs',
      new TableIndex({ name: 'IDX_action_logs_service_key', columnNames: ['service_key'] }),
    );
    await queryRunner.createIndex(
      'action_logs',
      new TableIndex({ name: 'IDX_action_logs_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'action_logs',
      new TableIndex({ name: 'IDX_action_logs_action_key', columnNames: ['action_key'] }),
    );
    await queryRunner.createIndex(
      'action_logs',
      new TableIndex({ name: 'IDX_action_logs_service_created', columnNames: ['service_key', 'created_at'] }),
    );
    await queryRunner.createIndex(
      'action_logs',
      new TableIndex({ name: 'IDX_action_logs_user_created', columnNames: ['user_id', 'created_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('action_logs');
  }
}
