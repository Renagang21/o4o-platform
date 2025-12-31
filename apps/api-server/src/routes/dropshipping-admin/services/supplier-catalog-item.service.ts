/**
 * Supplier Catalog Item Service
 *
 * DS-3: Business logic for SupplierCatalogItem
 * - State transition validation (DS-1 rules)
 * - Audit logging for all changes
 *
 * State Model (DS-1):
 *   draft → pending → approved → retired
 *                  → rejected → draft
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { DataSource } from 'typeorm';
import { SupplierCatalogItemRepository } from '../repositories/supplier-catalog-item.repository.js';
import { OfferLogRepository, CreateOfferLogDto } from '../repositories/offer-log.repository.js';
import {
  SupplierCatalogItemStatus,
  CreateSupplierCatalogItemDto,
  UpdateSupplierCatalogItemDto,
  ChangeSupplierCatalogItemStatusDto,
  ListSupplierCatalogItemsQueryDto,
  SupplierCatalogItemResponseDto,
  PaginatedSupplierCatalogItemsDto,
} from '../dto/supplier-catalog-item.dto.js';

/**
 * DS-1 State Transition Rules for SupplierCatalogItem
 */
const ALLOWED_TRANSITIONS: Record<SupplierCatalogItemStatus, SupplierCatalogItemStatus[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  approved: ['retired'],
  rejected: ['draft'],
  retired: [],
};

export interface ServiceContext {
  userId?: string;
  userType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SupplierCatalogItemService {
  private repository: SupplierCatalogItemRepository;
  private logRepository: OfferLogRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new SupplierCatalogItemRepository(dataSource);
    this.logRepository = new OfferLogRepository(dataSource);
  }

  /**
   * List all supplier catalog items
   */
  async list(query: ListSupplierCatalogItemsQueryDto): Promise<PaginatedSupplierCatalogItemsDto> {
    return this.repository.findAll(query);
  }

  /**
   * Get a single item by ID
   */
  async getById(id: string): Promise<SupplierCatalogItemResponseDto | null> {
    return this.repository.findById(id);
  }

  /**
   * Create a new supplier catalog item
   */
  async create(
    data: CreateSupplierCatalogItemDto,
    context: ServiceContext
  ): Promise<SupplierCatalogItemResponseDto> {
    // Check for duplicate (same supplier + external_product_ref)
    if (data.external_product_ref) {
      const existing = await this.repository.findBySupplierAndRef(
        data.supplier_id,
        data.external_product_ref
      );
      if (existing) {
        throw new Error(
          `Catalog item with external_product_ref '${data.external_product_ref}' already exists for this supplier`
        );
      }
    }

    const item = await this.repository.create(data);

    // Audit log
    await this.logRepository.create({
      entity_type: 'supplier_catalog_item',
      entity_id: item.id,
      action: 'create',
      actor_id: context.userId,
      actor_type: context.userType,
      new_data: item as unknown as Record<string, unknown>,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return item;
  }

  /**
   * Update an existing item
   */
  async update(
    id: string,
    data: UpdateSupplierCatalogItemDto,
    context: ServiceContext
  ): Promise<SupplierCatalogItemResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Supplier catalog item not found: ${id}`);
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error(`Failed to update supplier catalog item: ${id}`);
    }

    // Audit log
    await this.logRepository.create({
      entity_type: 'supplier_catalog_item',
      entity_id: id,
      action: 'update',
      actor_id: context.userId,
      actor_type: context.userType,
      previous_data: existing as unknown as Record<string, unknown>,
      new_data: updated as unknown as Record<string, unknown>,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return updated;
  }

  /**
   * Change item status with DS-1 state transition validation
   */
  async changeStatus(
    id: string,
    dto: ChangeSupplierCatalogItemStatusDto,
    context: ServiceContext
  ): Promise<SupplierCatalogItemResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Supplier catalog item not found: ${id}`);
    }

    // Validate state transition (DS-1 rule)
    const allowedTargets = ALLOWED_TRANSITIONS[existing.status];
    if (!allowedTargets.includes(dto.status)) {
      throw new Error(
        `Invalid status transition: ${existing.status} → ${dto.status}. ` +
          `Allowed transitions from '${existing.status}': [${allowedTargets.join(', ')}]`
      );
    }

    const updated = await this.repository.updateStatus(id, dto.status);
    if (!updated) {
      throw new Error(`Failed to update status for supplier catalog item: ${id}`);
    }

    // Audit log with reason
    await this.logRepository.create({
      entity_type: 'supplier_catalog_item',
      entity_id: id,
      action: 'status_change',
      actor_id: context.userId,
      actor_type: context.userType,
      previous_data: { status: existing.status },
      new_data: { status: dto.status, reason: dto.reason },
      reason: dto.reason,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return updated;
  }

  /**
   * Soft delete an item
   */
  async delete(id: string, context: ServiceContext): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Supplier catalog item not found: ${id}`);
    }

    const success = await this.repository.softDelete(id);
    if (!success) {
      throw new Error(`Failed to delete supplier catalog item: ${id}`);
    }

    // Audit log
    await this.logRepository.create({
      entity_type: 'supplier_catalog_item',
      entity_id: id,
      action: 'delete',
      actor_id: context.userId,
      actor_type: context.userType,
      previous_data: existing as unknown as Record<string, unknown>,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });
  }

  /**
   * Get audit logs for an item
   */
  async getLogs(id: string, limit: number = 50) {
    return this.logRepository.findByEntity('supplier_catalog_item', id, limit);
  }

  /**
   * Validate if a status transition is allowed
   */
  isTransitionAllowed(
    currentStatus: SupplierCatalogItemStatus,
    targetStatus: SupplierCatalogItemStatus
  ): boolean {
    return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * Get allowed transitions for a status
   */
  getAllowedTransitions(status: SupplierCatalogItemStatus): SupplierCatalogItemStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
