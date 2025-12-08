import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateForumNotifications1700100000000 implements MigrationInterface {
  name = 'CreateForumNotifications1700100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create forum_notifications table
    await queryRunner.createTable(
      new Table({
        name: 'forum_notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'actorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'postId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'commentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'targetType',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'readAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['actorId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'forum_notifications',
      new TableIndex({
        name: 'IDX_FORUM_NOTIF_USER_READ_CREATED',
        columnNames: ['userId', 'isRead', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'forum_notifications',
      new TableIndex({
        name: 'IDX_FORUM_NOTIF_TYPE_CREATED',
        columnNames: ['type', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'forum_notifications',
      new TableIndex({
        name: 'IDX_FORUM_NOTIF_ORG_CREATED',
        columnNames: ['organizationId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'forum_notifications',
      new TableIndex({
        name: 'IDX_FORUM_NOTIF_POST',
        columnNames: ['postId'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('forum_notifications');
  }
}
