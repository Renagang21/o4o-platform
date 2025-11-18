/**
 * Migration: Enhance Notifications Table for PD-7
 *
 * Changes:
 * - Add channel column (in_app | email)
 * - Rename recipientId to userId for consistency
 * - Rename read to isRead for consistency
 * - Rename data to metadata
 * - Add indexes for performance
 * - Update timestamp columns to use timestamp with time zone
 */

import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class EnhanceNotificationsForPD71763450000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('notifications');

    if (hasTable) {
      // Add channel column
      const hasChannelColumn = await queryRunner.hasColumn('notifications', 'channel');
      if (!hasChannelColumn) {
        await queryRunner.addColumn(
          'notifications',
          new TableColumn({
            name: 'channel',
            type: 'varchar',
            length: '50',
            default: "'in_app'",
          })
        );
      }

      // Rename recipientId to userId if recipientId exists
      const hasRecipientId = await queryRunner.hasColumn('notifications', 'recipientId');
      const hasUserId = await queryRunner.hasColumn('notifications', 'userId');

      if (hasRecipientId && !hasUserId) {
        await queryRunner.renameColumn('notifications', 'recipientId', 'userId');
      }

      // Rename read to isRead if read exists
      const hasRead = await queryRunner.hasColumn('notifications', 'read');
      const hasIsRead = await queryRunner.hasColumn('notifications', 'isRead');

      if (hasRead && !hasIsRead) {
        await queryRunner.renameColumn('notifications', 'read', 'isRead');
      }

      // Rename data to metadata if data exists
      const hasData = await queryRunner.hasColumn('notifications', 'data');
      const hasMetadata = await queryRunner.hasColumn('notifications', 'metadata');

      if (hasData && !hasMetadata) {
        await queryRunner.renameColumn('notifications', 'data', 'metadata');
      }

      // Change metadata type to jsonb if it's json
      const metadataColumn = await queryRunner.getTable('notifications');
      const metadataColumnDef = metadataColumn?.columns.find(col => col.name === 'metadata');

      if (metadataColumnDef && metadataColumnDef.type === 'json') {
        await queryRunner.changeColumn(
          'notifications',
          'metadata',
          new TableColumn({
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          })
        );
      }

      // Update createdAt to timestamp with time zone
      await queryRunner.changeColumn(
        'notifications',
        'createdAt',
        new TableColumn({
          name: 'createdAt',
          type: 'timestamp with time zone',
          default: 'CURRENT_TIMESTAMP',
        })
      );

      // Update readAt to timestamp with time zone if it exists
      const hasReadAt = await queryRunner.hasColumn('notifications', 'readAt');
      if (hasReadAt) {
        await queryRunner.changeColumn(
          'notifications',
          'readAt',
          new TableColumn({
            name: 'readAt',
            type: 'timestamp with time zone',
            isNullable: true,
          })
        );
      }

      // Drop updatedAt if it exists (not needed for notifications)
      const hasUpdatedAt = await queryRunner.hasColumn('notifications', 'updatedAt');
      if (hasUpdatedAt) {
        await queryRunner.dropColumn('notifications', 'updatedAt');
      }

      // Add indexes for performance
      await queryRunner.createIndex(
        'notifications',
        new TableIndex({
          name: 'IDX_notifications_userId_isRead_createdAt',
          columnNames: ['userId', 'isRead', 'createdAt'],
        })
      );

      await queryRunner.createIndex(
        'notifications',
        new TableIndex({
          name: 'IDX_notifications_type_createdAt',
          columnNames: ['type', 'createdAt'],
        })
      );
    } else {
      // Create table from scratch if it doesn't exist
      await queryRunner.query(`
        CREATE TABLE "notifications" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "userId" uuid NOT NULL,
          "channel" varchar(50) NOT NULL DEFAULT 'in_app',
          "type" varchar(50) NOT NULL,
          "title" varchar(255) NOT NULL,
          "message" text,
          "metadata" jsonb,
          "isRead" boolean NOT NULL DEFAULT false,
          "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "readAt" timestamp with time zone,
          CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.createIndex(
        'notifications',
        new TableIndex({
          name: 'IDX_notifications_userId_isRead_createdAt',
          columnNames: ['userId', 'isRead', 'createdAt'],
        })
      );

      await queryRunner.createIndex(
        'notifications',
        new TableIndex({
          name: 'IDX_notifications_type_createdAt',
          columnNames: ['type', 'createdAt'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('notifications');

    if (hasTable) {
      // Drop indexes
      await queryRunner.dropIndex('notifications', 'IDX_notifications_userId_isRead_createdAt');
      await queryRunner.dropIndex('notifications', 'IDX_notifications_type_createdAt');

      // Revert column renames (for backward compatibility)
      const hasUserId = await queryRunner.hasColumn('notifications', 'userId');
      if (hasUserId) {
        await queryRunner.renameColumn('notifications', 'userId', 'recipientId');
      }

      const hasIsRead = await queryRunner.hasColumn('notifications', 'isRead');
      if (hasIsRead) {
        await queryRunner.renameColumn('notifications', 'isRead', 'read');
      }

      const hasMetadata = await queryRunner.hasColumn('notifications', 'metadata');
      if (hasMetadata) {
        await queryRunner.renameColumn('notifications', 'metadata', 'data');
      }

      // Remove channel column
      const hasChannel = await queryRunner.hasColumn('notifications', 'channel');
      if (hasChannel) {
        await queryRunner.dropColumn('notifications', 'channel');
      }
    }
  }
}
