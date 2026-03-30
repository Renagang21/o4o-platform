/**
 * WO-O4O-TEMPLATE-USAGE-ANALYTICS-V1
 * Add usage_count and last_used_at columns for template usage analytics.
 */

import { type MigrationInterface, type QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUsageAnalyticsToContentTemplates20260330300000 implements MigrationInterface {
  name = 'AddUsageAnalyticsToContentTemplates20260330300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'content_templates',
      new TableColumn({
        name: 'usage_count',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'content_templates',
      new TableColumn({
        name: 'last_used_at',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );

    await queryRunner.createIndex(
      'content_templates',
      new TableIndex({
        name: 'IDX_content_templates_usage',
        columnNames: ['usage_count', 'is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('content_templates', 'IDX_content_templates_usage');
    await queryRunner.dropColumn('content_templates', 'last_used_at');
    await queryRunner.dropColumn('content_templates', 'usage_count');
  }
}
