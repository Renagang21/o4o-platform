/**
 * Migration: CreateGlycopharmForumCategoryRequests
 * GlycoPharm 포럼 카테고리 신청 테이블 생성
 */

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGlycopharmForumCategoryRequests1737100600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('glycopharm_forum_category_requests');
    if (tableExists) {
      console.log('Table glycopharm_forum_category_requests already exists, skipping...');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_forum_category_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'requester_id',
            type: 'uuid',
          },
          {
            name: 'requester_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'requester_email',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'reviewer_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewer_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'review_comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_category_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_category_slug',
            type: 'varchar',
            length: '100',
            isNullable: true,
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
        indices: [
          {
            name: 'idx_glycopharm_forum_requests_requester',
            columnNames: ['requester_id'],
          },
          {
            name: 'idx_glycopharm_forum_requests_status',
            columnNames: ['status'],
          },
        ],
      }),
      true
    );

    console.log('Created glycopharm_forum_category_requests table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_forum_category_requests', true);
  }
}
