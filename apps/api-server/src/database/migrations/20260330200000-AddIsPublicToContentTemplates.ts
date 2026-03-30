/**
 * WO-O4O-TEMPLATE-PUBLIC-SHARING-V1
 * Add is_public column to content_templates for public template sharing.
 */

import { type MigrationInterface, type QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddIsPublicToContentTemplates20260330200000 implements MigrationInterface {
  name = 'AddIsPublicToContentTemplates20260330200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'content_templates',
      new TableColumn({
        name: 'is_public',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.createIndex(
      'content_templates',
      new TableIndex({
        name: 'IDX_content_templates_public_service',
        columnNames: ['is_public', 'service_key', 'is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('content_templates', 'IDX_content_templates_public_service');
    await queryRunner.dropColumn('content_templates', 'is_public');
  }
}
