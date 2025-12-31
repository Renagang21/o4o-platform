/**
 * Seller Offer Service
 *
 * DS-3: Business logic for SellerOffer
 * - State transition validation (DS-1 rules)
 * - Audit logging for all changes
 *
 * State Model (DS-1):
 *   draft → pending → active → paused → retired
 *                          ↔
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */

import { DataSource } from 'typeorm';
import { SellerOfferRepository } from '../repositories/seller-offer.repository.js';
import { SupplierCatalogItemRepository } from '../repositories/supplier-catalog-item.repository.js';
import { OfferLogRepository } from '../repositories/offer-log.repository.js';
import {
  SellerOfferStatus,
  CreateSellerOfferDto,
  UpdateSellerOfferDto,
  ChangeSellerOfferStatusDto,
  ListSellerOffersQueryDto,
  SellerOfferResponseDto,
  PaginatedSellerOffersDto,
} from '../dto/seller-offer.dto.js';

/**
 * DS-1 State Transition Rules for SellerOffer
 */
const ALLOWED_TRANSITIONS: Record<SellerOfferStatus, SellerOfferStatus[]> = {
  draft: ['pending'],
  pending: ['active', 'draft'], // Can reject back to draft
  active: ['paused', 'retired'],
  paused: ['active', 'retired'],
  retired: [],
};

export interface ServiceContext {
  userId?: string;
  userType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SellerOfferService {
  private repository: SellerOfferRepository;
  private catalogRepository: SupplierCatalogItemRepository;
  private logRepository: OfferLogRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new SellerOfferRepository(dataSource);
    this.catalogRepository = new SupplierCatalogItemRepository(dataSource);
    this.logRepository = new OfferLogRepository(dataSource);
  }

  /**
   * List all seller offers
   */
  async list(query: ListSellerOffersQueryDto): Promise<PaginatedSellerOffersDto> {
    return this.repository.findAll(query);
  }

  /**
   * Get a single offer by ID
   */
  async getById(id: string): Promise<SellerOfferResponseDto | null> {
    return this.repository.findById(id);
  }

  /**
   * Create a new seller offer
   */
  async create(
    data: CreateSellerOfferDto,
    context: ServiceContext
  ): Promise<SellerOfferResponseDto> {
    // Check for duplicate (same seller + catalog item)
    const existing = await this.repository.findBySellerAndCatalogItem(
      data.seller_id,
      data.supplier_catalog_item_id
    );
    if (existing) {
      throw new Error(
        `Seller already has an offer for this catalog item. Existing offer ID: ${existing.id}`
      );
    }

    // Verify catalog item exists and is approved
    const catalogItem = await this.catalogRepository.findById(data.supplier_catalog_item_id);
    if (!catalogItem) {
      throw new Error(`Supplier catalog item not found: ${data.supplier_catalog_item_id}`);
    }
    if (catalogItem.status !== 'approved') {
      throw new Error(
        `Cannot create offer for non-approved catalog item. Current status: ${catalogItem.status}`
      );
    }

    // Validate pricing
    if (data.offer_price < data.cost_price) {
      throw new Error(`Offer price (${data.offer_price}) cannot be less than cost price (${data.cost_price})`);
    }

    const offer = await this.repository.create(data);

    // Audit log
    await this.logRepository.create({
      entity_type: 'seller_offer',
      entity_id: offer.id,
      action: 'create',
      actor_id: context.userId,
      actor_type: context.userType,
      new_data: offer as unknown as Record<string, unknown>,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
    });

    return offer;
  }

  /**
   * Update an existing offer
   */
  async update(
    id: string,
    data: UpdateSellerOfferDto,
    context: ServiceContext
  ): Promise<SellerOfferResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Seller offer not found: ${id}`);
    }

    // Validate pricing if price fields are being updated
    const newOfferPrice = data.offer_price ?? existing.offer_price;
    const newCostPrice = data.cost_price ?? existing.cost_price;
    if (newOfferPrice < newCostPrice) {
      throw new Error(
        `Offer price (${newOfferPrice}) cannot be less than cost price (${newCostPrice})`
      );
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new Error(`Failed to update seller offer: ${id}`);
    }

    // Check if price changed for special logging
    const priceChanged =
      data.offer_price !== undefined && data.offer_price !== existing.offer_price;

    // Audit log
    await this.logRepository.create({
      entity_type: 'seller_offer',
      entity_id: id,
      action: priceChanged ? 'price_change' : 'update',
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
   * Change offer status with DS-1 state transition validation
   */
  async changeStatus(
    id: string,
    dto: ChangeSellerOfferStatusDto,
    context: ServiceContext
  ): Promise<SellerOfferResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Seller offer not found: ${id}`);
    }

    // Validate state transition (DS-1 rule)
    const allowedTargets = ALLOWED_TRANSITIONS[existing.status];
    if (!allowedTargets.includes(dto.status)) {
      throw new Error(
        `Invalid status transition: ${existing.status} → ${dto.status}. ` +
          `Allowed transitions from '${existing.status}': [${allowedTargets.join(', ')}]`
      );
    }

    // Set activated_at when transitioning to 'active' for the first time
    const activatedAt =
      dto.status === 'active' && !existing.activated_at ? new Date() : undefined;

    const updated = await this.repository.updateStatus(id, dto.status, activatedAt);
    if (!updated) {
      throw new Error(`Failed to update status for seller offer: ${id}`);
    }

    // Audit log with reason
    await this.logRepository.create({
      entity_type: 'seller_offer',
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
   * Soft delete an offer
   */
  async delete(id: string, context: ServiceContext): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Seller offer not found: ${id}`);
    }

    // Prevent deletion of active offers
    if (existing.status === 'active') {
      throw new Error(
        `Cannot delete an active offer. Please pause or retire it first. Current status: ${existing.status}`
      );
    }

    const success = await this.repository.softDelete(id);
    if (!success) {
      throw new Error(`Failed to delete seller offer: ${id}`);
    }

    // Audit log
    await this.logRepository.create({
      entity_type: 'seller_offer',
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
   * Get audit logs for an offer
   */
  async getLogs(id: string, limit: number = 50) {
    return this.logRepository.findByEntity('seller_offer', id, limit);
  }

  /**
   * Increment view count (for analytics)
   */
  async incrementView(id: string): Promise<void> {
    await this.repository.incrementStat(id, 'view_count');
  }

  /**
   * Increment cart add count (for analytics)
   */
  async incrementCartAdd(id: string): Promise<void> {
    await this.repository.incrementStat(id, 'cart_add_count');
  }

  /**
   * Validate if a status transition is allowed
   */
  isTransitionAllowed(
    currentStatus: SellerOfferStatus,
    targetStatus: SellerOfferStatus
  ): boolean {
    return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * Get allowed transitions for a status
   */
  getAllowedTransitions(status: SellerOfferStatus): SellerOfferStatus[] {
    return ALLOWED_TRANSITIONS[status] ?? [];
  }
}
