import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Digital Signage Tables
 * Creates tables for devices, slides, playlists, and schedules
 */
export class CreateSignageTables1830000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create signage_devices table
    await queryRunner.createTable(
      new Table({
        name: 'signage_devices',
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
            length: '255',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
            isUnique: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resolution',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'orientation',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'lastHeartbeat',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'registeredAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create signage_slides table
    await queryRunner.createTable(
      new Table({
        name: 'signage_slides',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'json',
            type: 'jsonb',
          },
          {
            name: 'thumbnail',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'integer',
            default: 10,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create signage_playlists table
    await queryRunner.createTable(
      new Table({
        name: 'signage_playlists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'loop',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create signage_playlist_items table
    await queryRunner.createTable(
      new Table({
        name: 'signage_playlist_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'playlistId',
            type: 'uuid',
          },
          {
            name: 'slideId',
            type: 'uuid',
          },
          {
            name: 'order',
            type: 'integer',
          },
          {
            name: 'duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create signage_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'signage_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'deviceId',
            type: 'uuid',
          },
          {
            name: 'playlistId',
            type: 'uuid',
          },
          {
            name: 'startTime',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'endTime',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'daysOfWeek',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'integer',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for signage_devices
    await queryRunner.createIndex(
      'signage_devices',
      new TableIndex({
        name: 'IDX_signage_devices_token',
        columnNames: ['token'],
      }),
    );

    await queryRunner.createIndex(
      'signage_devices',
      new TableIndex({
        name: 'IDX_signage_devices_active',
        columnNames: ['active'],
      }),
    );

    // Create indexes for signage_slides
    await queryRunner.createIndex(
      'signage_slides',
      new TableIndex({
        name: 'IDX_signage_slides_active',
        columnNames: ['active'],
      }),
    );

    await queryRunner.createIndex(
      'signage_slides',
      new TableIndex({
        name: 'IDX_signage_slides_category',
        columnNames: ['category'],
      }),
    );

    // Create indexes for signage_playlists
    await queryRunner.createIndex(
      'signage_playlists',
      new TableIndex({
        name: 'IDX_signage_playlists_active',
        columnNames: ['active'],
      }),
    );

    // Create indexes for signage_playlist_items
    await queryRunner.createIndex(
      'signage_playlist_items',
      new TableIndex({
        name: 'IDX_signage_playlist_items_playlistId',
        columnNames: ['playlistId'],
      }),
    );

    await queryRunner.createIndex(
      'signage_playlist_items',
      new TableIndex({
        name: 'IDX_signage_playlist_items_slideId',
        columnNames: ['slideId'],
      }),
    );

    // Create indexes for signage_schedules
    await queryRunner.createIndex(
      'signage_schedules',
      new TableIndex({
        name: 'IDX_signage_schedules_deviceId',
        columnNames: ['deviceId'],
      }),
    );

    await queryRunner.createIndex(
      'signage_schedules',
      new TableIndex({
        name: 'IDX_signage_schedules_playlistId',
        columnNames: ['playlistId'],
      }),
    );

    await queryRunner.createIndex(
      'signage_schedules',
      new TableIndex({
        name: 'IDX_signage_schedules_active',
        columnNames: ['active'],
      }),
    );

    await queryRunner.createIndex(
      'signage_schedules',
      new TableIndex({
        name: 'IDX_signage_schedules_priority',
        columnNames: ['priority'],
      }),
    );

    // Create foreign keys for signage_playlist_items
    await queryRunner.createForeignKey(
      'signage_playlist_items',
      new TableForeignKey({
        columnNames: ['playlistId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'signage_playlists',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'signage_playlist_items',
      new TableForeignKey({
        columnNames: ['slideId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'signage_slides',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign keys for signage_schedules
    await queryRunner.createForeignKey(
      'signage_schedules',
      new TableForeignKey({
        columnNames: ['deviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'signage_devices',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'signage_schedules',
      new TableForeignKey({
        columnNames: ['playlistId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'signage_playlists',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const schedulesTable = await queryRunner.getTable('signage_schedules');
    if (schedulesTable) {
      const deviceFk = schedulesTable.foreignKeys.find(fk => fk.columnNames.indexOf('deviceId') !== -1);
      if (deviceFk) await queryRunner.dropForeignKey('signage_schedules', deviceFk);

      const playlistFk = schedulesTable.foreignKeys.find(fk => fk.columnNames.indexOf('playlistId') !== -1);
      if (playlistFk) await queryRunner.dropForeignKey('signage_schedules', playlistFk);
    }

    const playlistItemsTable = await queryRunner.getTable('signage_playlist_items');
    if (playlistItemsTable) {
      const playlistFk = playlistItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('playlistId') !== -1);
      if (playlistFk) await queryRunner.dropForeignKey('signage_playlist_items', playlistFk);

      const slideFk = playlistItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('slideId') !== -1);
      if (slideFk) await queryRunner.dropForeignKey('signage_playlist_items', slideFk);
    }

    // Drop tables in reverse order
    await queryRunner.dropTable('signage_schedules');
    await queryRunner.dropTable('signage_playlist_items');
    await queryRunner.dropTable('signage_playlists');
    await queryRunner.dropTable('signage_slides');
    await queryRunner.dropTable('signage_devices');
  }
}
