import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateGlycopharmDisplayTables9980000000000 implements MigrationInterface {
  name = 'CreateGlycopharmDisplayTables9980000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Display Playlists
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_display_playlists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'pharmacy_id', type: 'uuid', isNullable: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
          { name: 'is_public', type: 'boolean', default: false },
          { name: 'total_duration', type: 'int', default: 0 },
          { name: 'like_count', type: 'int', default: 0 },
          { name: 'download_count', type: 'int', default: 0 },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // 2. Display Media
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_display_media',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'pharmacy_id', type: 'uuid', isNullable: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'source_type', type: 'varchar', length: '20' },
          { name: 'source_url', type: 'varchar', length: '500' },
          { name: 'embed_id', type: 'varchar', length: '100' },
          { name: 'thumbnail_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'duration', type: 'int', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // 3. Display Playlist Items
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_display_playlist_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'playlist_id', type: 'uuid' },
          { name: 'media_id', type: 'uuid' },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'play_duration', type: 'int', isNullable: true },
          { name: 'transition_type', type: 'varchar', length: '20', default: "'fade'" },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // 4. Display Schedules
    await queryRunner.createTable(
      new Table({
        name: 'glycopharm_display_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'pharmacy_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'playlist_id', type: 'uuid' },
          { name: 'days_of_week', type: 'text' }, // simple-array로 저장
          { name: 'start_time', type: 'time' },
          { name: 'end_time', type: 'time' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'priority', type: 'int', default: 0 },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // 5. Forum Category Requests
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
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'description', type: 'text' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'requester_id', type: 'uuid' },
          { name: 'requester_name', type: 'varchar', length: '100' },
          { name: 'requester_email', type: 'varchar', length: '200', isNullable: true },
          { name: 'reviewer_id', type: 'uuid', isNullable: true },
          { name: 'reviewer_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'review_comment', type: 'text', isNullable: true },
          { name: 'reviewed_at', type: 'timestamp', isNullable: true },
          { name: 'created_category_id', type: 'uuid', isNullable: true },
          { name: 'created_category_slug', type: 'varchar', length: '100', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true
    );

    // Foreign Keys
    await queryRunner.createForeignKey(
      'glycopharm_display_playlist_items',
      new TableForeignKey({
        columnNames: ['playlist_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'glycopharm_display_playlists',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'glycopharm_display_playlist_items',
      new TableForeignKey({
        columnNames: ['media_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'glycopharm_display_media',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'glycopharm_display_schedules',
      new TableForeignKey({
        columnNames: ['playlist_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'glycopharm_display_playlists',
        onDelete: 'CASCADE',
      })
    );

    // Indexes
    await queryRunner.query(`
      CREATE INDEX idx_display_playlists_pharmacy ON glycopharm_display_playlists(pharmacy_id);
      CREATE INDEX idx_display_playlists_public ON glycopharm_display_playlists(is_public, status);
      CREATE INDEX idx_display_media_pharmacy ON glycopharm_display_media(pharmacy_id);
      CREATE INDEX idx_display_schedules_pharmacy ON glycopharm_display_schedules(pharmacy_id);
      CREATE INDEX idx_forum_requests_requester ON glycopharm_forum_category_requests(requester_id);
      CREATE INDEX idx_forum_requests_status ON glycopharm_forum_category_requests(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('glycopharm_forum_category_requests', true);
    await queryRunner.dropTable('glycopharm_display_schedules', true);
    await queryRunner.dropTable('glycopharm_display_playlist_items', true);
    await queryRunner.dropTable('glycopharm_display_media', true);
    await queryRunner.dropTable('glycopharm_display_playlists', true);
  }
}
