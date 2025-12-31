/**
 * Supplier Catalog Item Repository
 *
 * DS-3: Data access layer for dropshipping_supplier_catalog_items table
 * - Simple CRUD operations
 * - No state transition logic (handled by Service)
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { DataSource } from 'typeorm';
import {
  SupplierCatalogItemStatus,
  ListSupplierCatalogItemsQueryDto,
  SupplierCatalogItemResponseDto,
  PaginatedSupplierCatalogItemsDto,
  CreateSupplierCatalogItemDto,
  UpdateSupplierCatalogItemDto,
} from '../dto/supplier-catalog-item.dto.js';

export class SupplierCatalogItemRepository {
  constructor(private dataSource: DataSource) {}

  /**
   * Find all supplier catalog items with pagination and filters
   */
  async findAll(
    query: ListSupplierCatalogItemsQueryDto
  ): Promise<PaginatedSupplierCatalogItemsDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.supplier_id) {
      conditions.push(`supplier_id = $${paramIndex++}`);
      params.push(query.supplier_id);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(query.is_active);
    }

    if (query.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(query.category);
    }

    if (query.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Sorting
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedSortFields = ['name', 'base_price', 'created_at', 'updated_at', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Count query
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM dropshipping_supplier_catalog_items WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Data query
    const dataParams = [...params, limit, offset];
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_supplier_catalog_items
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
   * Find a single item by ID
   */
  async findById(id: string): Promise<SupplierCatalogItemResponseDto | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_supplier_catalog_items WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] ? this.mapToDto(rows[0]) : null;
  }

  /**
   * Find by supplier_id and external_product_ref (for duplicate check)
   */
  async findBySupplierAndRef(
    supplierId: string,
    externalProductRef: string
  ): Promise<SupplierCatalogItemResponseDto | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM dropshipping_supplier_catalog_items
       WHERE supplier_id = $1 AND external_product_ref = $2 AND deleted_at IS NULL`,
      [supplierId, externalProductRef]
    );
    return rows[0] ? this.mapToDto(rows[0]) : null;
  }

  /**
   * Create a new supplier catalog item
   */
  async create(data: CreateSupplierCatalogItemDto): Promise<SupplierCatalogItemResponseDto> {
    const result = await this.dataSource.query(
      `INSERT INTO dropshipping_supplier_catalog_items (
        supplier_id, external_product_ref, name, description, short_description,
        sku, barcode, base_price, currency, weight, dimensions, category, tags,
        images, thumbnail_image, specifications, status, is_active,
        minimum_order_quantity, maximum_order_quantity, lead_time_days,
        inventory_count, low_stock_threshold, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        'draft', true, $17, $18, $19, $20, $21, $22
      ) RETURNING *`,
      [
        data.supplier_id,
        data.external_product_ref || null,
        data.name,
        data.description || null,
        data.short_description || null,
        data.sku || null,
        data.barcode || null,
        data.base_price,
        data.currency || 'KRW',
        data.weight || null,
        data.dimensions ? JSON.stringify(data.dimensions) : null,
        data.category || null,
        data.tags || null,
        data.images ? JSON.stringify(data.images) : null,
        data.thumbnail_image || null,
        data.specifications ? JSON.stringify(data.specifications) : null,
        data.minimum_order_quantity || 1,
        data.maximum_order_quantity || null,
        data.lead_time_days || 7,
        data.inventory_count || 0,
        data.low_stock_threshold || 10,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return this.mapToDto(result[0]);
  }

  /**
   * Update an existing item
   */
  async update(
    id: string,
    data: UpdateSupplierCatalogItemDto
  ): Promise<SupplierCatalogItemResponseDto | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    const fieldMap: Record<string, keyof UpdateSupplierCatalogItemDto> = {
      name: 'name',
      description: 'description',
      short_description: 'short_description',
      sku: 'sku',
      barcode: 'barcode',
      base_price: 'base_price',
      currency: 'currency',
      weight: 'weight',
      category: 'category',
      thumbnail_image: 'thumbnail_image',
      is_active: 'is_active',
      minimum_order_quantity: 'minimum_order_quantity',
      maximum_order_quantity: 'maximum_order_quantity',
      lead_time_days: 'lead_time_days',
      inventory_count: 'inventory_count',
      low_stock_threshold: 'low_stock_threshold',
    };

    for (const [column, field] of Object.entries(fieldMap)) {
      if (data[field] !== undefined) {
        updates.push(`${column} = $${paramIndex++}`);
        params.push(data[field]);
      }
    }

    // JSON fields
    if (data.dimensions !== undefined) {
      updates.push(`dimensions = $${paramIndex++}`);
      params.push(JSON.stringify(data.dimensions));
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.images !== undefined) {
      updates.push(`images = $${paramIndex++}`);
      params.push(JSON.stringify(data.images));
    }
    if (data.specifications !== undefined) {
      updates.push(`specifications = $${paramIndex++}`);
      params.push(JSON.stringify(data.specifications));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await this.dataSource.query(
      `UPDATE dropshipping_supplier_catalog_items
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
    status: SupplierCatalogItemStatus
  ): Promise<SupplierCatalogItemResponseDto | null> {
    const result = await this.dataSource.query(
      `UPDATE dropshipping_supplier_catalog_items
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [status, id]
    );
    return result[0] ? this.mapToDto(result[0]) : null;
  }

  /**
   * Soft delete an item
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE dropshipping_supplier_catalog_items
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result[1] > 0;
  }

  /**
   * Map raw database row to DTO
   */
  private mapToDto(row: Record<string, unknown>): SupplierCatalogItemResponseDto {
    return {
      id: row.id as string,
      supplier_id: row.supplier_id as string,
      external_product_ref: row.external_product_ref as string | undefined,
      name: row.name as string,
      description: row.description as string | undefined,
      short_description: row.short_description as string | undefined,
      sku: row.sku as string | undefined,
      barcode: row.barcode as string | undefined,
      base_price: parseFloat(row.base_price as string),
      currency: row.currency as string,
      weight: row.weight ? parseFloat(row.weight as string) : undefined,
      dimensions: row.dimensions as Record<string, unknown> | undefined,
      category: row.category as string | undefined,
      tags: row.tags as string[] | undefined,
      images: row.images as Record<string, unknown>[] | undefined,
      thumbnail_image: row.thumbnail_image as string | undefined,
      specifications: row.specifications as Record<string, unknown> | undefined,
      status: row.status as SupplierCatalogItemStatus,
      is_active: row.is_active as boolean,
      minimum_order_quantity: row.minimum_order_quantity as number,
      maximum_order_quantity: row.maximum_order_quantity as number | undefined,
      lead_time_days: row.lead_time_days as number,
      inventory_count: row.inventory_count as number,
      low_stock_threshold: row.low_stock_threshold as number | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }
}
