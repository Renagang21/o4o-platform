/**
 * Seller Offer Repository
 *
 * DS-3: Data access layer for dropshipping_seller_offers table
 * - Simple CRUD operations
 * - No state transition logic (handled by Service)
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { DataSource } from 'typeorm';
import {
  SellerOfferStatus,
  ListSellerOffersQueryDto,
  SellerOfferResponseDto,
  PaginatedSellerOffersDto,
  CreateSellerOfferDto,
  UpdateSellerOfferDto,
} from '../dto/seller-offer.dto.js';

export class SellerOfferRepository {
  constructor(private dataSource: DataSource) {}

  /**
   * Find all seller offers with pagination and filters
   */
  async findAll(query: ListSellerOffersQueryDto): Promise<PaginatedSellerOffersDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.seller_id) {
      conditions.push(`seller_id = $${paramIndex++}`);
      params.push(query.seller_id);
    }

    if (query.supplier_catalog_item_id) {
      conditions.push(`supplier_catalog_item_id = $${paramIndex++}`);
      params.push(query.supplier_catalog_item_id);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(query.is_active);
    }

    if (query.is_visible !== undefined) {
      conditions.push(`is_visible = $${paramIndex++}`);
      params.push(query.is_visible);
    }

    if (query.is_featured !== undefined) {
      conditions.push(`is_featured = $${paramIndex++}`);
      params.push(query.is_featured);
    }

    if (query.search) {
      conditions.push(
        `(offer_name ILIKE $${paramIndex} OR offer_description ILIKE $${paramIndex} OR seller_sku ILIKE $${paramIndex})`
      );
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Sorting
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedSortFields = [
      'offer_name',
      'offer_price',
      'profit_margin',
      'total_sold',
      'created_at',
      'updated_at',
      'status',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Count query
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM dropshipping_seller_offers WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Data query
    const dataParams = [...params, limit, offset];
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_seller_offers
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${sortOrder}
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
   * Find a single offer by ID
   */
  async findById(id: string): Promise<SellerOfferResponseDto | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_seller_offers WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] ? this.mapToDto(rows[0]) : null;
  }

  /**
   * Find by seller_id and supplier_catalog_item_id (for duplicate check)
   */
  async findBySellerAndCatalogItem(
    sellerId: string,
    catalogItemId: string
  ): Promise<SellerOfferResponseDto | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_seller_offers
       WHERE seller_id = $1 AND supplier_catalog_item_id = $2 AND deleted_at IS NULL`,
      [sellerId, catalogItemId]
    );
    return rows[0] ? this.mapToDto(rows[0]) : null;
  }

  /**
   * Create a new seller offer
   */
  async create(data: CreateSellerOfferDto): Promise<SellerOfferResponseDto> {
    // Calculate profit
    const profitAmount = data.offer_price - data.cost_price;
    const profitMargin = data.cost_price > 0 ? (profitAmount / data.offer_price) * 100 : 0;

    const result = await this.dataSource.query(
      `INSERT INTO dropshipping_seller_offers (
        seller_id, supplier_catalog_item_id, offer_name, offer_description,
        offer_price, compare_price, cost_price, profit_amount, profit_margin,
        currency, status, seller_sku, seller_tags, seller_images,
        discount_rate, sale_start_date, sale_end_date, is_featured, featured_until,
        seo_title, seo_description, slug, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *`,
      [
        data.seller_id,
        data.supplier_catalog_item_id,
        data.offer_name || null,
        data.offer_description || null,
        data.offer_price,
        data.compare_price || null,
        data.cost_price,
        profitAmount,
        profitMargin,
        data.currency || 'KRW',
        data.seller_sku || null,
        data.seller_tags || null,
        data.seller_images ? JSON.stringify(data.seller_images) : null,
        data.discount_rate || null,
        data.sale_start_date || null,
        data.sale_end_date || null,
        data.is_featured || false,
        data.featured_until || null,
        data.seo_title || null,
        data.seo_description || null,
        data.slug || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return this.mapToDto(result[0]);
  }

  /**
   * Update an existing offer
   */
  async update(id: string, data: UpdateSellerOfferDto): Promise<SellerOfferResponseDto | null> {
    // Get current data for profit calculation
    const current = await this.findById(id);
    if (!current) return null;

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    const fieldMap: Record<string, keyof UpdateSellerOfferDto> = {
      offer_name: 'offer_name',
      offer_description: 'offer_description',
      offer_price: 'offer_price',
      compare_price: 'compare_price',
      cost_price: 'cost_price',
      currency: 'currency',
      seller_sku: 'seller_sku',
      discount_rate: 'discount_rate',
      sale_start_date: 'sale_start_date',
      sale_end_date: 'sale_end_date',
      is_featured: 'is_featured',
      featured_until: 'featured_until',
      is_active: 'is_active',
      is_visible: 'is_visible',
      seo_title: 'seo_title',
      seo_description: 'seo_description',
      slug: 'slug',
    };

    for (const [column, field] of Object.entries(fieldMap)) {
      if (data[field] !== undefined) {
        updates.push(`${column} = $${paramIndex++}`);
        params.push(data[field]);
      }
    }

    // Array/JSON fields
    if (data.seller_tags !== undefined) {
      updates.push(`seller_tags = $${paramIndex++}`);
      params.push(data.seller_tags);
    }
    if (data.seller_images !== undefined) {
      updates.push(`seller_images = $${paramIndex++}`);
      params.push(JSON.stringify(data.seller_images));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    // Recalculate profit if price changed
    const newOfferPrice = data.offer_price ?? current.offer_price;
    const newCostPrice = data.cost_price ?? current.cost_price;
    if (data.offer_price !== undefined || data.cost_price !== undefined) {
      const profitAmount = newOfferPrice - newCostPrice;
      const profitMargin = newCostPrice > 0 ? (profitAmount / newOfferPrice) * 100 : 0;
      updates.push(`profit_amount = $${paramIndex++}`);
      params.push(profitAmount);
      updates.push(`profit_margin = $${paramIndex++}`);
      params.push(profitMargin);
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await this.dataSource.query(
      `UPDATE dropshipping_seller_offers
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    return result[0] ? this.mapToDto(result[0]) : null;
  }

  /**
   * Update status only (used by Service for state transitions)
   */
  async updateStatus(
    id: string,
    status: SellerOfferStatus,
    activatedAt?: Date
  ): Promise<SellerOfferResponseDto | null> {
    const query = activatedAt
      ? `UPDATE dropshipping_seller_offers
         SET status = $1, activated_at = $3, updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING *`
      : `UPDATE dropshipping_seller_offers
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING *`;

    const params = activatedAt ? [status, id, activatedAt] : [status, id];
    const result = await this.dataSource.query(query, params);
    return result[0] ? this.mapToDto(result[0]) : null;
  }

  /**
   * Soft delete an offer
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE dropshipping_seller_offers
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result[1] > 0;
  }

  /**
   * Update statistics (view_count, cart_add_count, etc.)
   */
  async incrementStat(id: string, field: 'view_count' | 'cart_add_count'): Promise<void> {
    await this.dataSource.query(
      `UPDATE dropshipping_seller_offers
       SET ${field} = ${field} + 1
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
  }

  /**
   * Map raw database row to DTO
   */
  private mapToDto(row: Record<string, unknown>): SellerOfferResponseDto {
    return {
      id: row.id as string,
      seller_id: row.seller_id as string,
      supplier_catalog_item_id: row.supplier_catalog_item_id as string,
      ecommerce_order_id: row.ecommerce_order_id as string | undefined,
      offer_name: row.offer_name as string | undefined,
      offer_description: row.offer_description as string | undefined,
      offer_price: parseFloat(row.offer_price as string),
      compare_price: row.compare_price ? parseFloat(row.compare_price as string) : undefined,
      cost_price: parseFloat(row.cost_price as string),
      profit_amount: parseFloat(row.profit_amount as string),
      profit_margin: parseFloat(row.profit_margin as string),
      currency: row.currency as string,
      status: row.status as SellerOfferStatus,
      is_active: row.is_active as boolean,
      is_visible: row.is_visible as boolean,
      seller_sku: row.seller_sku as string | undefined,
      seller_tags: row.seller_tags as string[] | undefined,
      seller_images: row.seller_images as Record<string, unknown>[] | undefined,
      discount_rate: row.discount_rate ? parseFloat(row.discount_rate as string) : undefined,
      sale_start_date: row.sale_start_date ? new Date(row.sale_start_date as string) : undefined,
      sale_end_date: row.sale_end_date ? new Date(row.sale_end_date as string) : undefined,
      is_featured: row.is_featured as boolean,
      featured_until: row.featured_until ? new Date(row.featured_until as string) : undefined,
      view_count: row.view_count as number,
      cart_add_count: row.cart_add_count as number,
      total_sold: row.total_sold as number,
      total_revenue: parseFloat(row.total_revenue as string),
      conversion_rate: parseFloat(row.conversion_rate as string),
      average_rating: parseFloat(row.average_rating as string),
      review_count: row.review_count as number,
      seo_title: row.seo_title as string | undefined,
      seo_description: row.seo_description as string | undefined,
      slug: row.slug as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
      activated_at: row.activated_at ? new Date(row.activated_at as string) : undefined,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }
}
