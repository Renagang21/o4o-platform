/**
 * StorePlaylistRepository — Store Playlist 데이터 접근 계층
 *
 * WO-O4O-SIGNAGE-KPA-PHASE1-MODERNIZATION-V1
 *
 * raw SQL을 캡슐화하여 Controller에서 SQL을 직접 사용하지 않도록 함.
 * 단순 CRUD는 TypeORM Repository 사용, 복잡한 쿼리(UNION, FOR UPDATE)는
 * raw SQL을 repository 내부에서 유지.
 */

import { DataSource, Repository } from 'typeorm';
import { StorePlaylist } from '../../kpa/entities/store-playlist.entity.js';
import { StorePlaylistItem } from '../../kpa/entities/store-playlist-item.entity.js';
import { AssetCopyService } from '@o4o/asset-copy-core';

// ─── Response DTOs (camelCase API contract) ─────────

export interface PlaylistDto {
  id: string;
  name: string;
  playlistType: string;
  publishStatus: string;
  isActive: boolean;
  sourcePlaylistId: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  forcedCount: number;
}

export interface PlaylistCreateDto {
  id: string;
  name: string;
  playlistType: string;
  publishStatus: string;
  isActive: boolean;
  createdAt: Date;
}

export interface PlaylistUpdateDto {
  id: string;
  name: string;
  playlistType: string;
  publishStatus: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface PlaylistItemDto {
  id: string;
  snapshotId: string | null;
  displayOrder: number;
  isForced: boolean;
  isLocked: boolean;
  forcedStartAt: Date | null;
  forcedEndAt: Date | null;
  createdAt: Date;
  title?: string;
  contentJson?: unknown;
  assetType?: string;
}

export interface PublicPlaylistDto {
  id: string;
  name: string;
  playlistType: string;
  organizationId: string;
  items: PlaylistItemDto[];
}

// ─── Repository ─────────────────────────────────────

export class StorePlaylistRepository {
  private playlistRepo: Repository<StorePlaylist>;
  private itemRepo: Repository<StorePlaylistItem>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(StorePlaylist);
    this.itemRepo = dataSource.getRepository(StorePlaylistItem);
  }

  // ═══════════════════════════════════════════════════
  // PUBLIC (no auth)
  // ═══════════════════════════════════════════════════

  async findPublicPlaylist(id: string): Promise<{ id: string; name: string; playlistType: string; organizationId: string } | null> {
    const row = await this.playlistRepo.findOne({
      where: { id, publish_status: 'published', is_active: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      playlistType: row.playlist_type,
      organizationId: row.organization_id,
    };
  }

  /**
   * Public playlist items — merges forced content if serviceKey provided.
   * Complex UNION ALL → raw SQL encapsulated.
   */
  async findPublicPlaylistItems(playlistId: string, serviceKey?: string): Promise<PlaylistItemDto[]> {
    if (serviceKey) {
      return this.dataSource.query(
        `SELECT
           i.id,
           i.snapshot_id AS "snapshotId",
           i.display_order AS "displayOrder",
           i.is_forced AS "isForced",
           s.title,
           s.content_json AS "contentJson"
         FROM store_playlist_items i
         JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
         WHERE i.playlist_id = $1
           AND (
             i.is_forced = false
             OR (
               (i.forced_start_at IS NULL OR NOW() >= i.forced_start_at)
               AND (i.forced_end_at IS NULL OR NOW() <= i.forced_end_at)
             )
           )

         UNION ALL

         SELECT
           'forced-' || fc.id AS id,
           NULL AS "snapshotId",
           COALESCE(fp.display_order, 9999) AS "displayOrder",
           true AS "isForced",
           fc.title,
           json_build_object(
             'url', fc.video_url,
             'sourceType', fc.source_type,
             'embedId', fc.embed_id,
             'thumbnailUrl', fc.thumbnail_url
           ) AS "contentJson"
         FROM signage_forced_content fc
         LEFT JOIN signage_forced_content_positions fp
           ON fp.forced_content_id = fc.id AND fp.playlist_id = $1
         WHERE fc.service_key = $2
           AND fc.is_active = true
           AND fc.deleted_at IS NULL
           AND NOW() >= fc.start_at
           AND NOW() <= fc.end_at

         ORDER BY "displayOrder" ASC`,
        [playlistId, serviceKey],
      );
    }

    return this.dataSource.query(
      `SELECT
         i.id,
         i.snapshot_id AS "snapshotId",
         i.display_order AS "displayOrder",
         i.is_forced AS "isForced",
         s.title,
         s.content_json AS "contentJson"
       FROM store_playlist_items i
       JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
       WHERE i.playlist_id = $1
         AND (
           i.is_forced = false
           OR (
             (i.forced_start_at IS NULL OR NOW() >= i.forced_start_at)
             AND (i.forced_end_at IS NULL OR NOW() <= i.forced_end_at)
           )
         )
       ORDER BY i.display_order ASC`,
      [playlistId],
    );
  }

  // ═══════════════════════════════════════════════════
  // PLAYLIST CRUD (auth)
  // ═══════════════════════════════════════════════════

  async findPlaylistsByOrganization(organizationId: string): Promise<PlaylistDto[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT
         p.id,
         p.name,
         p.playlist_type AS "playlistType",
         p.publish_status AS "publishStatus",
         p.is_active AS "isActive",
         p.source_playlist_id AS "sourcePlaylistId",
         p.created_at AS "createdAt",
         p.updated_at AS "updatedAt",
         COALESCE(ic.item_count, 0)::int AS "itemCount",
         COALESCE(ic.forced_count, 0)::int AS "forcedCount"
       FROM store_playlists p
       LEFT JOIN (
         SELECT
           playlist_id,
           COUNT(*)::int AS item_count,
           COUNT(*) FILTER (WHERE is_forced = true)::int AS forced_count
         FROM store_playlist_items
         GROUP BY playlist_id
       ) ic ON ic.playlist_id = p.id
       WHERE p.organization_id = $1 AND p.is_active = true
       ORDER BY p.updated_at DESC`,
      [organizationId],
    );
    return rows;
  }

  async createPlaylist(
    organizationId: string,
    name: string,
    playlistType: 'SINGLE' | 'LIST',
  ): Promise<PlaylistCreateDto> {
    const entity = this.playlistRepo.create({
      organization_id: organizationId,
      name,
      playlist_type: playlistType,
    });
    const saved = await this.playlistRepo.save(entity);
    return {
      id: saved.id,
      name: saved.name,
      playlistType: saved.playlist_type,
      publishStatus: saved.publish_status,
      isActive: saved.is_active,
      createdAt: saved.created_at,
    };
  }

  async updatePlaylist(
    id: string,
    organizationId: string,
    updates: { name?: string; publishStatus?: string; isActive?: boolean },
  ): Promise<PlaylistUpdateDto | null> {
    // Build update object
    const setFields: Partial<StorePlaylist> = {};
    if (updates.name !== undefined) setFields.name = updates.name.trim();
    if (updates.publishStatus !== undefined && (updates.publishStatus === 'draft' || updates.publishStatus === 'published')) {
      setFields.publish_status = updates.publishStatus as 'draft' | 'published';
    }
    if (updates.isActive !== undefined) setFields.is_active = !!updates.isActive;

    if (Object.keys(setFields).length === 0) return null;

    const result = await this.playlistRepo
      .createQueryBuilder()
      .update()
      .set({ ...setFields, updated_at: () => 'NOW()' })
      .where('id = :id AND organization_id = :organizationId', { id, organizationId })
      .returning('id, name, playlist_type, publish_status, is_active, updated_at')
      .execute();

    if (result.raw.length === 0) return null;
    const r = result.raw[0];
    return {
      id: r.id,
      name: r.name,
      playlistType: r.playlist_type,
      publishStatus: r.publish_status,
      isActive: r.is_active,
      updatedAt: r.updated_at,
    };
  }

  async softDeletePlaylist(
    id: string,
    organizationId: string,
  ): Promise<{ id: string } | null> {
    const result = await this.playlistRepo
      .createQueryBuilder()
      .update()
      .set({ is_active: false, updated_at: () => 'NOW()' })
      .where('id = :id AND organization_id = :organizationId', { id, organizationId })
      .returning('id')
      .execute();

    if (result.raw.length === 0) return null;
    return { id: result.raw[0].id };
  }

  // ═══════════════════════════════════════════════════
  // PLAYLIST ITEMS
  // ═══════════════════════════════════════════════════

  async verifyOwnership(playlistId: string, organizationId: string): Promise<boolean> {
    const count = await this.playlistRepo.count({
      where: { id: playlistId, organization_id: organizationId, is_active: true },
    });
    return count > 0;
  }

  async verifyOwnershipWithType(
    playlistId: string,
    organizationId: string,
  ): Promise<{ id: string; playlistType: string } | null> {
    const row = await this.playlistRepo.findOne({
      where: { id: playlistId, organization_id: organizationId, is_active: true },
      select: ['id', 'playlist_type'],
    });
    if (!row) return null;
    return { id: row.id, playlistType: row.playlist_type };
  }

  /**
   * Items with snapshot details — merges forced content if serviceKey provided.
   * Raw SQL: JOIN with o4o_asset_snapshots + optional UNION with signage_forced_content.
   */
  async findPlaylistItems(playlistId: string, serviceKey?: string): Promise<PlaylistItemDto[]> {
    const realItems: PlaylistItemDto[] = await this.dataSource.query(
      `SELECT
         i.id,
         i.snapshot_id AS "snapshotId",
         i.display_order AS "displayOrder",
         i.is_forced AS "isForced",
         i.is_locked AS "isLocked",
         i.forced_start_at AS "forcedStartAt",
         i.forced_end_at AS "forcedEndAt",
         i.created_at AS "createdAt",
         s.title,
         s.content_json AS "contentJson",
         s.asset_type AS "assetType"
       FROM store_playlist_items i
       JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
       WHERE i.playlist_id = $1
       ORDER BY i.display_order ASC`,
      [playlistId],
    );

    if (!serviceKey) return realItems;

    const forcedItems: PlaylistItemDto[] = await this.dataSource.query(
      `SELECT
         'forced-' || fc.id AS id,
         NULL AS "snapshotId",
         COALESCE(fp.display_order, 9999) AS "displayOrder",
         true AS "isForced",
         true AS "isLocked",
         fc.start_at AS "forcedStartAt",
         fc.end_at AS "forcedEndAt",
         fc.created_at AS "createdAt",
         fc.title,
         json_build_object(
           'url', fc.video_url,
           'sourceType', fc.source_type,
           'embedId', fc.embed_id,
           'thumbnailUrl', fc.thumbnail_url
         ) AS "contentJson",
         'signage' AS "assetType"
       FROM signage_forced_content fc
       LEFT JOIN signage_forced_content_positions fp
         ON fp.forced_content_id = fc.id AND fp.playlist_id = $1
       WHERE fc.service_key = $2
         AND fc.is_active = true
         AND fc.deleted_at IS NULL
       ORDER BY COALESCE(fp.display_order, 9999) ASC`,
      [playlistId, serviceKey],
    );

    return [...realItems, ...forcedItems].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Add item with FOR UPDATE lock for SINGLE type enforcement.
   * Raw SQL for pessimistic lock.
   */
  async addItem(
    playlistId: string,
    snapshotId: string,
  ): Promise<{ id: string; snapshotId: string; displayOrder: number; isForced: boolean; isLocked: boolean; createdAt: Date }> {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.query(
        `SELECT id, playlist_type FROM store_playlists WHERE id = $1 FOR UPDATE`,
        [playlistId],
      );

      if (locked[0]?.playlist_type === 'SINGLE') {
        const countResult = await manager.query(
          `SELECT COUNT(*)::int AS count FROM store_playlist_items WHERE playlist_id = $1`,
          [playlistId],
        );
        if (countResult[0]?.count > 0) {
          throw Object.assign(new Error('SINGLE playlist allows only 1 item'), { statusCode: 400, code: 'SINGLE_LIMIT' });
        }
      }

      const maxOrder = await manager.query(
        `SELECT COALESCE(MAX(display_order), -1)::int + 1 AS next_order FROM store_playlist_items WHERE playlist_id = $1`,
        [playlistId],
      );

      const rows = await manager.query(
        `INSERT INTO store_playlist_items (playlist_id, snapshot_id, display_order)
         VALUES ($1, $2, $3)
         RETURNING id, snapshot_id AS "snapshotId", display_order AS "displayOrder",
                   is_forced AS "isForced", is_locked AS "isLocked", created_at AS "createdAt"`,
        [playlistId, snapshotId, maxOrder[0].next_order],
      );
      return rows[0];
    });
  }

  /**
   * Add item from library — creates/reuses snapshot via AssetCopyService then adds to playlist.
   */
  async addItemFromLibrary(
    playlistId: string,
    libraryItemId: string,
    organizationId: string,
    userId: string,
  ): Promise<{ id: string; snapshotId: string; displayOrder: number; isForced: boolean; isLocked: boolean; createdAt: Date }> {
    // Verify library item
    const libItem = await this.dataSource.query(
      `SELECT id, title, file_url, file_name, mime_type, category
       FROM store_library_items
       WHERE id = $1 AND organization_id = $2 AND is_active = true`,
      [libraryItemId, organizationId],
    );
    if (libItem.length === 0) {
      throw Object.assign(new Error('Library item not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const lib = libItem[0];

    // Create or reuse snapshot
    const assetCopyService = new AssetCopyService(this.dataSource);
    let snapshotId: string;
    try {
      const copyResult = await assetCopyService.copyResolved({
        sourceService: 'store-library',
        sourceAssetId: libraryItemId,
        assetType: 'signage',
        targetOrganizationId: organizationId,
        createdBy: userId,
        title: lib.title,
        contentJson: {
          fileUrl: lib.file_url,
          fileName: lib.file_name,
          mimeType: lib.mime_type,
          category: lib.category,
          source: 'store-library',
        },
      });
      snapshotId = copyResult.snapshot.id;
    } catch (err: any) {
      if (err.message === 'DUPLICATE_SNAPSHOT') {
        const existing = await this.dataSource.query(
          `SELECT id FROM o4o_asset_snapshots
           WHERE organization_id = $1 AND source_asset_id = $2 AND asset_type = 'signage'
           LIMIT 1`,
          [organizationId, libraryItemId],
        );
        snapshotId = existing[0].id;
      } else {
        throw err;
      }
    }

    return this.addItem(playlistId, snapshotId);
  }

  /**
   * Reorder items — handles both regular and virtual forced-* items.
   * Uses ON CONFLICT for signage_forced_content_positions.
   */
  async reorderItems(playlistId: string, order: string[]): Promise<{ reordered: number }> {
    for (let i = 0; i < order.length; i++) {
      const itemId = order[i];
      if (itemId.startsWith('forced-')) {
        const forcedContentId = itemId.substring(7);
        await this.dataSource.query(
          `INSERT INTO signage_forced_content_positions (playlist_id, forced_content_id, display_order)
           VALUES ($1, $2, $3)
           ON CONFLICT (playlist_id, forced_content_id) DO UPDATE SET display_order = $3`,
          [playlistId, forcedContentId, i],
        );
      } else {
        await this.dataSource.query(
          `UPDATE store_playlist_items SET display_order = $1, updated_at = NOW()
           WHERE id = $2 AND playlist_id = $3`,
          [i, itemId, playlistId],
        );
      }
    }
    return { reordered: order.length };
  }

  /**
   * Delete item — checks locked status first.
   */
  async deleteItem(
    playlistId: string,
    itemId: string,
  ): Promise<{ deleted: boolean; code?: string }> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playlist_id: playlistId },
      select: ['id', 'is_locked'],
    });

    if (!item) {
      throw Object.assign(new Error('Item not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (item.is_locked) {
      throw Object.assign(new Error('Forced content cannot be deleted'), { statusCode: 403, code: 'ITEM_LOCKED' });
    }

    await this.itemRepo.delete({ id: itemId, playlist_id: playlistId });
    return { deleted: true };
  }
}
