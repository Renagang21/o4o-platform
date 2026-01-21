/**
 * Migration: CreatePlatformInquiriesTable
 *
 * Creates the platform_inquiries table for storing platform-level contact form submissions.
 * Used for:
 * - SiteGuide 도입 상담 요청
 * - o4o 플랫폼 문의
 * - 제휴/파트너십 문의
 * - 기타 SaaS 사업자에게 오는 문의
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePlatformInquiriesTable2026012100002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_inquiries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'platform'",
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'company',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'new'",
          },
          {
            name: 'source',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'referrer',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'adminNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notificationSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'resolvedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'platform_inquiries',
      new TableIndex({
        name: 'IDX_platform_inquiries_type_status',
        columnNames: ['type', 'status'],
      })
    );

    await queryRunner.createIndex(
      'platform_inquiries',
      new TableIndex({
        name: 'IDX_platform_inquiries_status_createdAt',
        columnNames: ['status', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'platform_inquiries',
      new TableIndex({
        name: 'IDX_platform_inquiries_email',
        columnNames: ['email'],
      })
    );

    console.log('✅ platform_inquiries table created with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('platform_inquiries', 'IDX_platform_inquiries_email');
    await queryRunner.dropIndex('platform_inquiries', 'IDX_platform_inquiries_status_createdAt');
    await queryRunner.dropIndex('platform_inquiries', 'IDX_platform_inquiries_type_status');
    await queryRunner.dropTable('platform_inquiries');
    console.log('✅ platform_inquiries table dropped');
  }
}
