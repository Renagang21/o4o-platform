/**
 * Cosmetics Store Playlist Service
 *
 * WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1
 * Business logic for store-level signage playlists
 */

import { DataSource, Repository } from 'typeorm';
import { CosmeticsStorePlaylist } from '../entities/cosmetics-store-playlist.entity.js';
import { CosmeticsStorePlaylistItem } from '../entities/cosmetics-store-playlist-item.entity.js';
import { CosmeticsStoreSummaryService } from './cosmetics-store-summary.service.js';

interface CreatePlaylistDto {
  name: string;
  items: Array<{
    assetType: string;
    referenceId: string;
    sortOrder?: number;
  }>;
}

export class CosmeticsStorePlaylistService {
  private playlistRepo: Repository<CosmeticsStorePlaylist>;
  private itemRepo: Repository<CosmeticsStorePlaylistItem>;
  private summaryService: CosmeticsStoreSummaryService;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(CosmeticsStorePlaylist);
    this.itemRepo = dataSource.getRepository(CosmeticsStorePlaylistItem);
    this.summaryService = new CosmeticsStoreSummaryService(dataSource);
  }

  /**
   * Get all playlists for a store, with items ordered by sort_order
   */
  async getPlaylistsByStoreId(storeId: string): Promise<CosmeticsStorePlaylist[]> {
    return this.playlistRepo.find({
      where: { storeId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new playlist with items
   */
  async createPlaylist(storeId: string, dto: CreatePlaylistDto): Promise<CosmeticsStorePlaylist> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const playlist = queryRunner.manager.create(CosmeticsStorePlaylist, {
        storeId,
        name: dto.name,
        isActive: true,
      });
      const savedPlaylist = await queryRunner.manager.save(playlist);

      if (dto.items.length > 0) {
        const items = dto.items.map((item, index) =>
          queryRunner.manager.create(CosmeticsStorePlaylistItem, {
            playlistId: savedPlaylist.id,
            assetType: item.assetType,
            referenceId: item.referenceId,
            sortOrder: item.sortOrder ?? index,
          }),
        );
        await queryRunner.manager.save(items);
        savedPlaylist.items = items;
      } else {
        savedPlaylist.items = [];
      }

      await queryRunner.commitTransaction();
      return savedPlaylist;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Auto-generate a default playlist from top-selling products.
   * Falls back to visible store listings if no sales data.
   */
  async generateDefaultPlaylist(storeId: string): Promise<CosmeticsStorePlaylist> {
    // Try top products first
    const topProducts = await this.summaryService.getTopProducts(storeId, 5);

    let items: Array<{ assetType: string; referenceId: string; sortOrder: number }>;

    if (topProducts.length > 0) {
      items = topProducts.map((p, i) => ({
        assetType: 'product',
        referenceId: p.productId,
        sortOrder: i,
      }));
    } else {
      // Fallback: visible store listings
      const rows = await this.dataSource.query(
        `SELECT product_id FROM cosmetics.cosmetics_store_listings
         WHERE store_id = $1 AND is_visible = true
         ORDER BY sort_order ASC
         LIMIT 5`,
        [storeId],
      );
      items = rows.map((row: any, i: number) => ({
        assetType: 'product',
        referenceId: row.product_id,
        sortOrder: i,
      }));
    }

    return this.createPlaylist(storeId, {
      name: '인기 상품 자동 편성',
      items,
    });
  }

  /**
   * Toggle a playlist's active status
   */
  async togglePlaylistActive(
    playlistId: string,
    storeId: string,
  ): Promise<{ id: string; isActive: boolean }> {
    const playlist = await this.playlistRepo.findOne({
      where: { id: playlistId, storeId },
    });

    if (!playlist) {
      throw new Error('PLAYLIST_NOT_FOUND');
    }

    playlist.isActive = !playlist.isActive;
    await this.playlistRepo.save(playlist);

    return { id: playlist.id, isActive: playlist.isActive };
  }
}
