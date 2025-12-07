/**
 * Signage Playlist Service
 *
 * Handles CRUD operations and auto-generation for cosmetics signage playlists
 */

import { DataSource, Repository } from 'typeorm';
import { CosmeticsSignagePlaylist, PlaylistItem } from '../entities/signage-playlist.entity.js';

// ====== DTOs ======

export interface CreatePlaylistDTO {
  name: string;
  description?: string;
  items: PlaylistItem[];
  metadata?: Record<string, any>;
}

export interface UpdatePlaylistDTO {
  name?: string;
  description?: string;
  items?: PlaylistItem[];
  metadata?: Record<string, any>;
}

export interface AutoPlaylistFilters {
  brand?: string;
  category?: string;
  concerns?: string[];
  skinTypes?: string[];
  includeRoutines?: boolean;
  maxItems?: number;
}

// ====== Service ======

export class SignagePlaylistService {
  private playlistRepo: Repository<CosmeticsSignagePlaylist>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(CosmeticsSignagePlaylist);
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(dto: CreatePlaylistDTO): Promise<CosmeticsSignagePlaylist> {
    const totalDuration = dto.items.reduce((sum, item) => sum + item.duration, 0);

    const playlist = this.playlistRepo.create({
      name: dto.name,
      description: dto.description,
      items: dto.items,
      metadata: {
        ...dto.metadata,
        totalDuration,
      },
    });

    return await this.playlistRepo.save(playlist);
  }

  /**
   * Get playlist by ID
   */
  async getPlaylistById(playlistId: string): Promise<CosmeticsSignagePlaylist | null> {
    return await this.playlistRepo.findOne({
      where: { id: playlistId },
    });
  }

  /**
   * List all playlists
   */
  async listPlaylists(): Promise<CosmeticsSignagePlaylist[]> {
    return await this.playlistRepo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Update playlist
   */
  async updatePlaylist(
    playlistId: string,
    dto: UpdatePlaylistDTO
  ): Promise<CosmeticsSignagePlaylist | null> {
    const playlist = await this.playlistRepo.findOne({
      where: { id: playlistId },
    });

    if (!playlist) {
      return null;
    }

    // Update fields
    if (dto.name !== undefined) {
      playlist.name = dto.name;
    }
    if (dto.description !== undefined) {
      playlist.description = dto.description;
    }
    if (dto.items !== undefined) {
      playlist.items = dto.items;
      // Recalculate total duration
      const totalDuration = dto.items.reduce((sum, item) => sum + item.duration, 0);
      playlist.metadata = {
        ...playlist.metadata,
        totalDuration,
      };
    }
    if (dto.metadata !== undefined) {
      playlist.metadata = { ...playlist.metadata, ...dto.metadata };
    }

    return await this.playlistRepo.save(playlist);
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(playlistId: string): Promise<boolean> {
    const result = await this.playlistRepo.delete({ id: playlistId });
    return (result.affected || 0) > 0;
  }

  /**
   * Generate auto playlist based on filters
   */
  async generateAutoPlaylist(filters: AutoPlaylistFilters): Promise<PlaylistItem[]> {
    const items: PlaylistItem[] = [];
    const maxItems = filters.maxItems || 20;
    const defaultDuration = 6; // seconds

    try {
      // 1. Add brand-based products
      if (filters.brand) {
        const brandProducts = await this.getBrandProducts(filters.brand, 5);
        items.push(
          ...brandProducts.map((productId) => ({
            type: 'product' as const,
            productId,
            duration: defaultDuration,
          }))
        );
      }

      // 2. Add category-based products
      if (filters.category) {
        const categoryProducts = await this.getCategoryProducts(filters.category, 5);
        items.push(
          ...categoryProducts.map((productId) => ({
            type: 'product' as const,
            productId,
            duration: defaultDuration,
          }))
        );
      }

      // 3. Add recommended products based on concerns/skinTypes
      if (filters.concerns || filters.skinTypes) {
        const recommended = await this.getRecommendedProducts(
          filters.concerns,
          filters.skinTypes,
          5
        );
        items.push(
          ...recommended.map((productId) => ({
            type: 'product' as const,
            productId,
            duration: defaultDuration,
          }))
        );
      }

      // 4. Add routines if requested
      if (filters.includeRoutines) {
        const routines = await this.getPopularRoutines(3);
        items.push(
          ...routines.map((routineId) => ({
            type: 'routine' as const,
            routineId,
            duration: 10, // routines get longer duration
          }))
        );
      }

      // 5. Add category slide if specified
      if (filters.category) {
        items.push({
          type: 'category',
          category: filters.category,
          duration: defaultDuration,
        });
      }

      // 6. Add brand slide if specified
      if (filters.brand) {
        items.unshift({
          type: 'brand',
          brandId: filters.brand,
          duration: 8, // brands get medium duration
        });
      }

      // Limit to maxItems
      return items.slice(0, maxItems);
    } catch (error) {
      console.error('Error generating auto playlist:', error);
      return [];
    }
  }

  // ====== Helper Methods ======

  private async getBrandProducts(brandName: string, limit: number): Promise<string[]> {
    try {
      // Query products with brand filter
      // This is a simplified implementation - in production, you'd query the actual product table
      const query = `
        SELECT id FROM custom_post_types
        WHERE type = 'cosmetics_product'
        AND metadata->>'brand' = $1
        AND metadata->>'enabled' = 'true'
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const results = await this.dataSource.query(query, [brandName, limit]);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching brand products:', error);
      return [];
    }
  }

  private async getCategoryProducts(category: string, limit: number): Promise<string[]> {
    try {
      const query = `
        SELECT id FROM custom_post_types
        WHERE type = 'cosmetics_product'
        AND metadata->>'category' = $1
        AND metadata->>'enabled' = 'true'
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const results = await this.dataSource.query(query, [category, limit]);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching category products:', error);
      return [];
    }
  }

  private async getRecommendedProducts(
    concerns?: string[],
    skinTypes?: string[],
    limit: number = 5
  ): Promise<string[]> {
    try {
      // Simplified recommendation logic
      // In production, this would use the RecommendationEngineService
      let query = `
        SELECT id FROM custom_post_types
        WHERE type = 'cosmetics_product'
        AND metadata->>'enabled' = 'true'
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (concerns && concerns.length > 0) {
        query += ` AND metadata->'concerns' ?| ARRAY[$${paramIndex}]`;
        params.push(concerns);
        paramIndex++;
      }

      if (skinTypes && skinTypes.length > 0) {
        query += ` AND metadata->'skinTypes' ?| ARRAY[$${paramIndex}]`;
        params.push(skinTypes);
        paramIndex++;
      }

      query += ` ORDER BY RANDOM() LIMIT $${paramIndex}`;
      params.push(limit);

      const results = await this.dataSource.query(query, params);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching recommended products:', error);
      return [];
    }
  }

  private async getPopularRoutines(limit: number): Promise<string[]> {
    try {
      const query = `
        SELECT id FROM cosmetics_routines
        WHERE "isPublished" = true
        ORDER BY "viewCount" DESC, "recommendCount" DESC
        LIMIT $1
      `;

      const results = await this.dataSource.query(query, [limit]);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching popular routines:', error);
      return [];
    }
  }
}
