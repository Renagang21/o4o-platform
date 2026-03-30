/**
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 * Create content_templates table for HTML content template storage.
 */

import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateContentTemplatesTable20260330100000 implements MigrationInterface {
  name = 'CreateContentTemplatesTable20260330100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'content_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            default: "'general'",
          },
          {
            name: 'content_html',
            type: 'text',
          },
          {
            name: 'service_key',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
          },
          {
            name: 'created_by_user_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'content_templates',
      new TableIndex({
        name: 'IDX_content_templates_created_by',
        columnNames: ['created_by_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'content_templates',
      new TableIndex({
        name: 'IDX_content_templates_service_active',
        columnNames: ['service_key', 'is_active'],
      }),
    );

    await queryRunner.createIndex(
      'content_templates',
      new TableIndex({
        name: 'IDX_content_templates_category_active',
        columnNames: ['category', 'is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('content_templates');
  }
}
