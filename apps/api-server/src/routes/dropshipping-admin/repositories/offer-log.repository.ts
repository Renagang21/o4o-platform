/**
 * Offer Log Repository
 *
 * DS-3: Data access layer for dropshipping_offer_logs table
 * - Audit log creation
 * - Log retrieval for admin views
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { DataSource } from 'typeorm';

/**
 * Log action types as defined in DS-1
 */
export type OfferLogAction =
  | 'create'
  | 'update'
  | 'status_change'
  | 'price_change'
  | 'delete'
  | 'restore';

/**
 * Log entry interface
 */
export interface OfferLog {
  id: string;
  entity_type: 'supplier_catalog_item' | 'seller_offer' | 'offer_policy';
  entity_id: string;
  action: OfferLogAction;
  actor_id?: string;
  actor_type?: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * Create log DTO
 */
export interface CreateOfferLogDto {
  entity_type: 'supplier_catalog_item' | 'seller_offer' | 'offer_policy';
  entity_id: string;
  action: OfferLogAction;
  actor_id?: string;
  actor_type?: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * List logs query DTO
 */
export interface ListOfferLogsQueryDto {
  entity_type?: 'supplier_catalog_item' | 'seller_offer' | 'offer_policy';
  entity_id?: string;
  action?: OfferLogAction;
  actor_id?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated logs response
 */
export interface PaginatedOfferLogsDto {
  items: OfferLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class OfferLogRepository {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a new audit log entry
   */
  async create(data: CreateOfferLogDto): Promise<OfferLog> {
    const result = await this.dataSource.query(
      `INSERT INTO dropshipping_offer_logs (
        entity_type, entity_id, action, actor_id, actor_type,
        previous_data, new_data, reason, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.entity_type,
        data.entity_id,
        data.action,
        data.actor_id || null,
        data.actor_type || null,
        data.previous_data ? JSON.stringify(data.previous_data) : null,
        data.new_data ? JSON.stringify(data.new_data) : null,
        data.reason || null,
        data.ip_address || null,
        data.user_agent || null,
      ]
    );
    return this.mapToDto(result[0]);
  }

  /**
   * Find logs with pagination and filters
   */
  async findAll(query: ListOfferLogsQueryDto): Promise<PaginatedOfferLogsDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.entity_type) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(query.entity_type);
    }

    if (query.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(query.entity_id);
    }

    if (query.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(query.action);
    }

    if (query.actor_id) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(query.actor_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM dropshipping_offer_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Data query
    const dataParams = [...params, limit, offset];
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_offer_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      dataParams
    );

    return {
      items: rows.map(this.mapToDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find logs for a specific entity
   */
  async findByEntity(
    entityType: 'supplier_catalog_item' | 'seller_offer' | 'offer_policy',
    entityId: string,
    limit: number = 50
  ): Promise<OfferLog[]> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_offer_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [entityType, entityId, limit]
    );
    return rows.map(this.mapToDto);
  }

  /**
   * Find a single log by ID
   */
  async findById(id: string): Promise<OfferLog | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_offer_logs WHERE id = $1`,
      [id]
    );
    return rows[0] ? this.mapToDto(rows[0]) : null;
  }

  /**
   * Map raw database row to DTO
   */
  private mapToDto(row: Record<string, unknown>): OfferLog {
    return {
      id: row.id as string,
      entity_type: row.entity_type as 'supplier_catalog_item' | 'seller_offer' | 'offer_policy',
      entity_id: row.entity_id as string,
      action: row.action as OfferLogAction,
      actor_id: row.actor_id as string | undefined,
      actor_type: row.actor_type as string | undefined,
      previous_data: row.previous_data as Record<string, unknown> | undefined,
      new_data: row.new_data as Record<string, unknown> | undefined,
      reason: row.reason as string | undefined,
      ip_address: row.ip_address as string | undefined,
      user_agent: row.user_agent as string | undefined,
      created_at: new Date(row.created_at as string),
    };
  }
}
