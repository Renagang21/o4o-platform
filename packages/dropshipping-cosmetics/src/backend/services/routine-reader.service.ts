/**
 * Routine Reader Service (Read-Only)
 *
 * Provides read-only access to PartnerRoutine data from cosmetics-partner-extension.
 * Core cannot import Extension, so we query the table directly.
 *
 * This is a cross-boundary read pattern - Core can READ Extension data but cannot WRITE.
 * All CRUD operations are handled by cosmetics-partner-extension.
 *
 * @see Phase 7-Y: Routine Entity Consolidation
 */

import { DataSource } from 'typeorm';

/**
 * Read-only interface matching PartnerRoutine structure
 */
export interface ReadOnlyRoutine {
  id: string;
  partnerId: string;
  title: string;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  description?: string;
  steps: RoutineStep[];
  skinTypes: string[];
  skinConcerns: string[];
  viewCount: number;
  likeCount: number;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface RoutineStep {
  order: number;
  productId: string;
  description: string;
  quantity?: string;
  duration?: string;
}

export interface RoutineFilters {
  skinType?: string[];
  concerns?: string[];
  timeOfUse?: string;
  partnerId?: string;
  isPublished?: boolean;
}

/**
 * Read-only service for accessing PartnerRoutine data
 *
 * WARNING: This service is READ-ONLY.
 * All create/update/delete operations must go through cosmetics-partner-extension.
 */
export class RoutineReaderService {
  private readonly tableName = 'cosmetics_partner_routines';

  constructor(private dataSource: DataSource) {}

  /**
   * Get published routines with optional filters
   */
  async getPublishedRoutines(
    filters: RoutineFilters = {}
  ): Promise<ReadOnlyRoutine[]> {
    try {
      let query = `
        SELECT
          id, "partnerId", title, "routineType", description,
          steps, "skinTypes", "skinConcerns",
          "viewCount", "likeCount", "thumbnailUrl", metadata,
          "isPublished", "createdAt", "updatedAt", "publishedAt"
        FROM ${this.tableName}
        WHERE "isPublished" = true
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Filter by skin type (any match)
      if (filters.skinType && filters.skinType.length > 0) {
        query += ` AND "skinTypes" && $${paramIndex}::text[]`;
        params.push(filters.skinType);
        paramIndex++;
      }

      // Filter by concerns (any match)
      if (filters.concerns && filters.concerns.length > 0) {
        query += ` AND "skinConcerns" && $${paramIndex}::text[]`;
        params.push(filters.concerns);
        paramIndex++;
      }

      // Filter by routine type (time of use)
      if (filters.timeOfUse) {
        query += ` AND "routineType" = $${paramIndex}`;
        params.push(filters.timeOfUse);
        paramIndex++;
      }

      // Filter by partner
      if (filters.partnerId) {
        query += ` AND "partnerId" = $${paramIndex}`;
        params.push(filters.partnerId);
        paramIndex++;
      }

      query += ' ORDER BY "viewCount" DESC, "createdAt" DESC';

      const results = await this.dataSource.query(query, params);
      return this.mapResults(results);
    } catch (error) {
      console.error('[RoutineReader] Error fetching published routines:', error);
      return [];
    }
  }

  /**
   * Find routines by product ID
   */
  async findRoutinesByProduct(productId: string): Promise<ReadOnlyRoutine[]> {
    try {
      // Query using JSONB contains operator for steps array
      const query = `
        SELECT
          id, "partnerId", title, "routineType", description,
          steps, "skinTypes", "skinConcerns",
          "viewCount", "likeCount", "thumbnailUrl", metadata,
          "isPublished", "createdAt", "updatedAt", "publishedAt"
        FROM ${this.tableName}
        WHERE "isPublished" = true
          AND steps::text LIKE $1
        ORDER BY "viewCount" DESC
      `;

      const results = await this.dataSource.query(query, [`%${productId}%`]);
      return this.mapResults(results);
    } catch (error) {
      console.error('[RoutineReader] Error finding routines by product:', error);
      return [];
    }
  }

  /**
   * Get a single routine by ID (public/published only)
   */
  async getPublishedRoutineById(id: string): Promise<ReadOnlyRoutine | null> {
    try {
      const query = `
        SELECT
          id, "partnerId", title, "routineType", description,
          steps, "skinTypes", "skinConcerns",
          "viewCount", "likeCount", "thumbnailUrl", metadata,
          "isPublished", "createdAt", "updatedAt", "publishedAt"
        FROM ${this.tableName}
        WHERE id = $1 AND "isPublished" = true
      `;

      const results = await this.dataSource.query(query, [id]);
      const mapped = this.mapResults(results);
      return mapped[0] || null;
    } catch (error) {
      console.error('[RoutineReader] Error fetching routine by ID:', error);
      return null;
    }
  }

  /**
   * Map raw DB results to ReadOnlyRoutine interface
   */
  private mapResults(results: any[]): ReadOnlyRoutine[] {
    return results.map((row) => ({
      id: row.id,
      partnerId: row.partnerId,
      title: row.title,
      routineType: row.routineType,
      description: row.description,
      steps: Array.isArray(row.steps) ? row.steps : [],
      skinTypes: this.parseArrayField(row.skinTypes),
      skinConcerns: this.parseArrayField(row.skinConcerns),
      viewCount: row.viewCount || 0,
      likeCount: row.likeCount || 0,
      thumbnailUrl: row.thumbnailUrl,
      metadata: row.metadata || {},
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
    }));
  }

  /**
   * Parse PostgreSQL array or simple-array field
   */
  private parseArrayField(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      // Handle PostgreSQL array format or comma-separated
      if (value.startsWith('{') && value.endsWith('}')) {
        return value.slice(1, -1).split(',').filter(Boolean);
      }
      return value.split(',').filter(Boolean);
    }
    return [];
  }
}

export default RoutineReaderService;
