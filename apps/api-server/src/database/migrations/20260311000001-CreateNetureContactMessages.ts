/**
 * Migration: CreateNetureContactMessages
 *
 * WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * Creates the neture_contact_messages table for storing Neture service contact form submissions.
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNetureContactMessages20260311000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'neture_contact_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'contactType',
            type: 'varchar',
            length: '30',
            default: "'other'",
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
            name: 'adminNotes',
            type: 'text',
            isNullable: true,
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
      true,
    );

    await queryRunner.createIndex(
      'neture_contact_messages',
      new TableIndex({
        name: 'IDX_neture_contact_messages_type_status',
        columnNames: ['contactType', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'neture_contact_messages',
      new TableIndex({
        name: 'IDX_neture_contact_messages_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'neture_contact_messages',
      new TableIndex({
        name: 'IDX_neture_contact_messages_email',
        columnNames: ['email'],
      }),
    );

    console.log('✅ neture_contact_messages table created with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('neture_contact_messages', 'IDX_neture_contact_messages_email');
    await queryRunner.dropIndex('neture_contact_messages', 'IDX_neture_contact_messages_status_createdAt');
    await queryRunner.dropIndex('neture_contact_messages', 'IDX_neture_contact_messages_type_status');
    await queryRunner.dropTable('neture_contact_messages');
    console.log('✅ neture_contact_messages table dropped');
  }
}
