import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * CreateSignageCoreEntities Migration
 *
 * Phase 2 Production Build - Sprint 2-1.5
 * Creates all 12 Signage Core entities:
 * - signage_playlists
 * - signage_playlist_items
 * - signage_media
 * - signage_media_tags
 * - signage_schedules
 * - signage_templates
 * - signage_template_zones
 * - signage_layout_presets
 * - signage_content_blocks
 * - signage_playlist_shares
 * - signage_ai_generation_logs
 * - signage_analytics
 */
export class CreateSignageCoreEntities2026011700001 implements MigrationInterface {
  name = 'CreateSignageCoreEntities2026011700001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== 1. signage_playlists ==========
    const playlistsExists = await this.tableExists(queryRunner, 'signage_playlists');
    if (!playlistsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_playlists',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
            { name: 'loopEnabled', type: 'boolean', default: true },
            { name: 'defaultItemDuration', type: 'int', default: 10 },
            { name: 'transitionType', type: 'varchar', length: '20', default: "'fade'" },
            { name: 'transitionDuration', type: 'int', default: 500 },
            { name: 'totalDuration', type: 'int', default: 0 },
            { name: 'itemCount', type: 'int', default: 0 },
            { name: 'isPublic', type: 'boolean', default: false },
            { name: 'likeCount', type: 'int', default: 0 },
            { name: 'downloadCount', type: 'int', default: 0 },
            { name: 'createdByUserId', type: 'uuid', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_playlists', new TableIndex({
        name: 'IDX_signage_playlists_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_playlists', new TableIndex({
        name: 'IDX_signage_playlists_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_playlists', new TableIndex({
        name: 'IDX_signage_playlists_service_org',
        columnNames: ['serviceKey', 'organizationId'],
      }));
      await queryRunner.createIndex('signage_playlists', new TableIndex({
        name: 'IDX_signage_playlists_status',
        columnNames: ['status'],
      }));
      await queryRunner.createIndex('signage_playlists', new TableIndex({
        name: 'IDX_signage_playlists_isPublic',
        columnNames: ['isPublic'],
      }));
    }

    // ========== 2. signage_media ==========
    const mediaExists = await this.tableExists(queryRunner, 'signage_media');
    if (!mediaExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_media',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'mediaType', type: 'varchar', length: '20' },
            { name: 'sourceType', type: 'varchar', length: '20' },
            { name: 'sourceUrl', type: 'text' },
            { name: 'embedId', type: 'varchar', length: '100', isNullable: true },
            { name: 'thumbnailUrl', type: 'text', isNullable: true },
            { name: 'duration', type: 'int', isNullable: true },
            { name: 'resolution', type: 'varchar', length: '20', isNullable: true },
            { name: 'fileSize', type: 'bigint', isNullable: true },
            { name: 'mimeType', type: 'varchar', length: '100', isNullable: true },
            { name: 'content', type: 'text', isNullable: true },
            { name: 'tags', type: 'text', isArray: true, default: "'{}'" },
            { name: 'category', type: 'varchar', length: '100', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'active'" },
            { name: 'createdByUserId', type: 'uuid', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_mediaType',
        columnNames: ['mediaType'],
      }));
      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_sourceType',
        columnNames: ['sourceType'],
      }));
      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_status',
        columnNames: ['status'],
      }));
      await queryRunner.createIndex('signage_media', new TableIndex({
        name: 'IDX_signage_media_category',
        columnNames: ['category'],
      }));
    }

    // ========== 3. signage_playlist_items ==========
    const playlistItemsExists = await this.tableExists(queryRunner, 'signage_playlist_items');
    if (!playlistItemsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_playlist_items',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'playlistId', type: 'uuid' },
            { name: 'mediaId', type: 'uuid' },
            { name: 'sortOrder', type: 'int' },
            { name: 'duration', type: 'int', isNullable: true },
            { name: 'transitionType', type: 'varchar', length: '20', isNullable: true },
            { name: 'isActive', type: 'boolean', default: true },
            { name: 'isForced', type: 'boolean', default: false },
            { name: 'sourceType', type: 'varchar', length: '30', default: "'store'" },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_playlist_items', new TableIndex({
        name: 'IDX_signage_playlist_items_playlistId',
        columnNames: ['playlistId'],
      }));
      await queryRunner.createIndex('signage_playlist_items', new TableIndex({
        name: 'IDX_signage_playlist_items_mediaId',
        columnNames: ['mediaId'],
      }));
      await queryRunner.createIndex('signage_playlist_items', new TableIndex({
        name: 'IDX_signage_playlist_items_sortOrder',
        columnNames: ['playlistId', 'sortOrder'],
      }));
      await queryRunner.createIndex('signage_playlist_items', new TableIndex({
        name: 'IDX_signage_playlist_items_sourceType',
        columnNames: ['sourceType'],
      }));

      // Foreign keys
      await queryRunner.createForeignKey('signage_playlist_items', new TableForeignKey({
        name: 'FK_signage_playlist_items_playlist',
        columnNames: ['playlistId'],
        referencedTableName: 'signage_playlists',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
      await queryRunner.createForeignKey('signage_playlist_items', new TableForeignKey({
        name: 'FK_signage_playlist_items_media',
        columnNames: ['mediaId'],
        referencedTableName: 'signage_media',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
    }

    // ========== 4. signage_media_tags ==========
    const mediaTagsExists = await this.tableExists(queryRunner, 'signage_media_tags');
    if (!mediaTagsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_media_tags',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'mediaId', type: 'uuid' },
            { name: 'tagName', type: 'varchar', length: '100' },
            { name: 'tagCategory', type: 'varchar', length: '100', isNullable: true },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_media_tags', new TableIndex({
        name: 'IDX_signage_media_tags_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_media_tags', new TableIndex({
        name: 'IDX_signage_media_tags_mediaId',
        columnNames: ['mediaId'],
      }));
      await queryRunner.createIndex('signage_media_tags', new TableIndex({
        name: 'IDX_signage_media_tags_tagName',
        columnNames: ['tagName'],
      }));
      await queryRunner.createIndex('signage_media_tags', new TableIndex({
        name: 'UQ_signage_media_tags_media_tag',
        columnNames: ['mediaId', 'tagName'],
        isUnique: true,
      }));

      await queryRunner.createForeignKey('signage_media_tags', new TableForeignKey({
        name: 'FK_signage_media_tags_media',
        columnNames: ['mediaId'],
        referencedTableName: 'signage_media',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
    }

    // ========== 5. signage_schedules ==========
    const schedulesExists = await this.tableExists(queryRunner, 'signage_schedules');
    if (!schedulesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_schedules',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'channelId', type: 'uuid', isNullable: true },
            { name: 'playlistId', type: 'uuid' },
            { name: 'daysOfWeek', type: 'int', isArray: true },
            { name: 'startTime', type: 'time' },
            { name: 'endTime', type: 'time' },
            { name: 'validFrom', type: 'date', isNullable: true },
            { name: 'validUntil', type: 'date', isNullable: true },
            { name: 'priority', type: 'int', default: 0 },
            { name: 'isActive', type: 'boolean', default: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_channelId',
        columnNames: ['channelId'],
      }));
      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_playlistId',
        columnNames: ['playlistId'],
      }));
      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_isActive',
        columnNames: ['isActive'],
      }));
      await queryRunner.createIndex('signage_schedules', new TableIndex({
        name: 'IDX_signage_schedules_priority',
        columnNames: ['priority'],
      }));

      await queryRunner.createForeignKey('signage_schedules', new TableForeignKey({
        name: 'FK_signage_schedules_playlist',
        columnNames: ['playlistId'],
        referencedTableName: 'signage_playlists',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
    }

    // ========== 6. signage_templates ==========
    const templatesExists = await this.tableExists(queryRunner, 'signage_templates');
    if (!templatesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_templates',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'layoutConfig', type: 'jsonb', default: "'{}'" },
            { name: 'category', type: 'varchar', length: '100', isNullable: true },
            { name: 'tags', type: 'text', isArray: true, default: "'{}'" },
            { name: 'thumbnailUrl', type: 'text', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
            { name: 'isPublic', type: 'boolean', default: false },
            { name: 'isSystem', type: 'boolean', default: false },
            { name: 'createdByUserId', type: 'uuid', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_templates', new TableIndex({
        name: 'IDX_signage_templates_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_templates', new TableIndex({
        name: 'IDX_signage_templates_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_templates', new TableIndex({
        name: 'IDX_signage_templates_status',
        columnNames: ['status'],
      }));
      await queryRunner.createIndex('signage_templates', new TableIndex({
        name: 'IDX_signage_templates_isPublic',
        columnNames: ['isPublic'],
      }));
      await queryRunner.createIndex('signage_templates', new TableIndex({
        name: 'IDX_signage_templates_category',
        columnNames: ['category'],
      }));
    }

    // ========== 7. signage_template_zones ==========
    const templateZonesExists = await this.tableExists(queryRunner, 'signage_template_zones');
    if (!templateZonesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_template_zones',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'templateId', type: 'uuid' },
            { name: 'name', type: 'varchar', length: '100' },
            { name: 'zoneKey', type: 'varchar', length: '50', isNullable: true },
            { name: 'zoneType', type: 'varchar', length: '30' },
            { name: 'position', type: 'jsonb' },
            { name: 'zIndex', type: 'int', default: 0 },
            { name: 'sortOrder', type: 'int', default: 0 },
            { name: 'style', type: 'jsonb', default: "'{}'" },
            { name: 'defaultPlaylistId', type: 'uuid', isNullable: true },
            { name: 'defaultMediaId', type: 'uuid', isNullable: true },
            { name: 'settings', type: 'jsonb', default: "'{}'" },
            { name: 'isActive', type: 'boolean', default: true },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_template_zones', new TableIndex({
        name: 'IDX_signage_template_zones_templateId',
        columnNames: ['templateId'],
      }));
      await queryRunner.createIndex('signage_template_zones', new TableIndex({
        name: 'IDX_signage_template_zones_zoneType',
        columnNames: ['zoneType'],
      }));

      await queryRunner.createForeignKey('signage_template_zones', new TableForeignKey({
        name: 'FK_signage_template_zones_template',
        columnNames: ['templateId'],
        referencedTableName: 'signage_templates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
    }

    // ========== 8. signage_layout_presets ==========
    const layoutPresetsExists = await this.tableExists(queryRunner, 'signage_layout_presets');
    if (!layoutPresetsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_layout_presets',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'presetData', type: 'jsonb' },
            { name: 'category', type: 'varchar', length: '100', isNullable: true },
            { name: 'tags', type: 'text', isArray: true, default: "'{}'" },
            { name: 'thumbnailUrl', type: 'text', isNullable: true },
            { name: 'isSystem', type: 'boolean', default: false },
            { name: 'isActive', type: 'boolean', default: true },
            { name: 'sortOrder', type: 'int', default: 0 },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_layout_presets', new TableIndex({
        name: 'IDX_signage_layout_presets_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_layout_presets', new TableIndex({
        name: 'IDX_signage_layout_presets_isSystem',
        columnNames: ['isSystem'],
      }));
      await queryRunner.createIndex('signage_layout_presets', new TableIndex({
        name: 'IDX_signage_layout_presets_category',
        columnNames: ['category'],
      }));
    }

    // ========== 9. signage_content_blocks ==========
    const contentBlocksExists = await this.tableExists(queryRunner, 'signage_content_blocks');
    if (!contentBlocksExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_content_blocks',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'name', type: 'varchar', length: '255' },
            { name: 'description', type: 'text', isNullable: true },
            { name: 'blockType', type: 'varchar', length: '30' },
            { name: 'content', type: 'text', isNullable: true },
            { name: 'mediaId', type: 'uuid', isNullable: true },
            { name: 'settings', type: 'jsonb', default: "'{}'" },
            { name: 'status', type: 'varchar', length: '20', default: "'active'" },
            { name: 'category', type: 'varchar', length: '100', isNullable: true },
            { name: 'tags', type: 'text', isArray: true, default: "'{}'" },
            { name: 'createdByUserId', type: 'uuid', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', default: 'now()' },
            { name: 'deletedAt', type: 'timestamp', isNullable: true },
            { name: 'version', type: 'int', default: 1 },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_content_blocks', new TableIndex({
        name: 'IDX_signage_content_blocks_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_content_blocks', new TableIndex({
        name: 'IDX_signage_content_blocks_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_content_blocks', new TableIndex({
        name: 'IDX_signage_content_blocks_blockType',
        columnNames: ['blockType'],
      }));
      await queryRunner.createIndex('signage_content_blocks', new TableIndex({
        name: 'IDX_signage_content_blocks_status',
        columnNames: ['status'],
      }));
    }

    // ========== 10. signage_playlist_shares ==========
    const playlistSharesExists = await this.tableExists(queryRunner, 'signage_playlist_shares');
    if (!playlistSharesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_playlist_shares',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'playlistId', type: 'uuid' },
            { name: 'sharedByOrganizationId', type: 'uuid' },
            { name: 'sharedWithOrganizationId', type: 'uuid' },
            { name: 'sharedByUserId', type: 'uuid', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
            { name: 'canEdit', type: 'boolean', default: false },
            { name: 'canUse', type: 'boolean', default: true },
            { name: 'canReshare', type: 'boolean', default: false },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'acceptedAt', type: 'timestamp', isNullable: true },
            { name: 'revokedAt', type: 'timestamp', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_playlist_shares', new TableIndex({
        name: 'IDX_signage_playlist_shares_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_playlist_shares', new TableIndex({
        name: 'IDX_signage_playlist_shares_playlistId',
        columnNames: ['playlistId'],
      }));
      await queryRunner.createIndex('signage_playlist_shares', new TableIndex({
        name: 'IDX_signage_playlist_shares_sharedWith',
        columnNames: ['sharedWithOrganizationId'],
      }));
      await queryRunner.createIndex('signage_playlist_shares', new TableIndex({
        name: 'IDX_signage_playlist_shares_status',
        columnNames: ['status'],
      }));
      await queryRunner.createIndex('signage_playlist_shares', new TableIndex({
        name: 'UQ_signage_playlist_shares_playlist_org',
        columnNames: ['playlistId', 'sharedWithOrganizationId'],
        isUnique: true,
      }));

      await queryRunner.createForeignKey('signage_playlist_shares', new TableForeignKey({
        name: 'FK_signage_playlist_shares_playlist',
        columnNames: ['playlistId'],
        referencedTableName: 'signage_playlists',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }));
    }

    // ========== 11. signage_ai_generation_logs ==========
    const aiLogsExists = await this.tableExists(queryRunner, 'signage_ai_generation_logs');
    if (!aiLogsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_ai_generation_logs',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'userId', type: 'uuid', isNullable: true },
            { name: 'generationType', type: 'varchar', length: '50' },
            { name: 'request', type: 'jsonb' },
            { name: 'outputMediaId', type: 'uuid', isNullable: true },
            { name: 'outputPlaylistId', type: 'uuid', isNullable: true },
            { name: 'outputUrl', type: 'text', isNullable: true },
            { name: 'outputData', type: 'jsonb', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
            { name: 'errorMessage', type: 'text', isNullable: true },
            { name: 'processingTimeMs', type: 'int', isNullable: true },
            { name: 'tokensUsed', type: 'int', isNullable: true },
            { name: 'costUsd', type: 'decimal', precision: 10, scale: 4, isNullable: true },
            { name: 'modelName', type: 'varchar', length: '100', isNullable: true },
            { name: 'modelProvider', type: 'varchar', length: '50', isNullable: true },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'completedAt', type: 'timestamp', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_ai_generation_logs', new TableIndex({
        name: 'IDX_signage_ai_generation_logs_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_ai_generation_logs', new TableIndex({
        name: 'IDX_signage_ai_generation_logs_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_ai_generation_logs', new TableIndex({
        name: 'IDX_signage_ai_generation_logs_generationType',
        columnNames: ['generationType'],
      }));
      await queryRunner.createIndex('signage_ai_generation_logs', new TableIndex({
        name: 'IDX_signage_ai_generation_logs_status',
        columnNames: ['status'],
      }));
      await queryRunner.createIndex('signage_ai_generation_logs', new TableIndex({
        name: 'IDX_signage_ai_generation_logs_createdAt',
        columnNames: ['createdAt'],
      }));
    }

    // ========== 12. signage_analytics ==========
    const analyticsExists = await this.tableExists(queryRunner, 'signage_analytics');
    if (!analyticsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signage_analytics',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
            { name: 'serviceKey', type: 'varchar', length: '50' },
            { name: 'organizationId', type: 'uuid', isNullable: true },
            { name: 'analyticsDate', type: 'date' },
            { name: 'hour', type: 'int', isNullable: true },
            { name: 'granularity', type: 'varchar', length: '20', default: "'daily'" },
            { name: 'entityType', type: 'varchar', length: '30' },
            { name: 'entityId', type: 'uuid', isNullable: true },
            { name: 'totalPlays', type: 'int', default: 0 },
            { name: 'completedPlays', type: 'int', default: 0 },
            { name: 'totalDurationSeconds', type: 'int', default: 0 },
            { name: 'uniqueChannels', type: 'int', default: 0 },
            { name: 'onlineDevices', type: 'int', default: 0 },
            { name: 'offlineDevices', type: 'int', default: 0 },
            { name: 'errorCount', type: 'int', default: 0 },
            { name: 'mediaCount', type: 'int', default: 0 },
            { name: 'playlistCount', type: 'int', default: 0 },
            { name: 'completionRate', type: 'decimal', precision: 5, scale: 2, default: 0 },
            { name: 'avgPlayDurationSeconds', type: 'decimal', precision: 10, scale: 2, default: 0 },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
            { name: 'updatedAt', type: 'timestamp', isNullable: true },
            { name: 'metadata', type: 'jsonb', default: "'{}'" },
          ],
        }),
        true,
      );

      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'IDX_signage_analytics_serviceKey',
        columnNames: ['serviceKey'],
      }));
      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'IDX_signage_analytics_organizationId',
        columnNames: ['organizationId'],
      }));
      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'IDX_signage_analytics_analyticsDate',
        columnNames: ['analyticsDate'],
      }));
      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'IDX_signage_analytics_granularity',
        columnNames: ['granularity'],
      }));
      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'IDX_signage_analytics_entity',
        columnNames: ['entityType', 'entityId'],
      }));
      await queryRunner.createIndex('signage_analytics', new TableIndex({
        name: 'UQ_signage_analytics_unique',
        columnNames: ['serviceKey', 'organizationId', 'analyticsDate', 'granularity', 'entityType', 'entityId'],
        isUnique: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order of creation (FK dependencies)
    await queryRunner.dropTable('signage_analytics', true, true, true);
    await queryRunner.dropTable('signage_ai_generation_logs', true, true, true);
    await queryRunner.dropTable('signage_playlist_shares', true, true, true);
    await queryRunner.dropTable('signage_content_blocks', true, true, true);
    await queryRunner.dropTable('signage_layout_presets', true, true, true);
    await queryRunner.dropTable('signage_template_zones', true, true, true);
    await queryRunner.dropTable('signage_templates', true, true, true);
    await queryRunner.dropTable('signage_schedules', true, true, true);
    await queryRunner.dropTable('signage_media_tags', true, true, true);
    await queryRunner.dropTable('signage_playlist_items', true, true, true);
    await queryRunner.dropTable('signage_media', true, true, true);
    await queryRunner.dropTable('signage_playlists', true, true, true);
  }

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      );
    `);
    return result[0]?.exists === true;
  }
}
