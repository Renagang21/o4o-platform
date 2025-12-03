/**
 * OrderItem Entity
 * R-8-3-1: OrderItem Normalization - JSONB to Relational Entity
 *
 * Purpose:
 * - Replaces JSONB-based order items with relational entity for better query performance
 * - Enables efficient filtering/aggregation by sellerId, supplierId without JSONB parsing
 * - Maintains backward compatibility through dual-write strategy (both JSONB and entity)
 *
 * Key Features:
 * - Individual columns for all critical fields (seller, supplier, commission, pricing)
 * - Indexed columns for dashboard queries (sellerId, supplierId, sellerProductId)
 * - Immutable pricing snapshots (basePriceSnapshot, salePriceSnapshot, etc.)
 * - Commission fields stored at order creation time
 * - JSONB attributes field for flexible metadata
 *
 * Phase 3-1 Strategy:
 * - Order.items (JSONB) remains as primary source of truth
 * - OrderItem entity is dual-written for new orders
 * - Dashboard services will gradually migrate to use OrderItem relations
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Order } from './Order.js';

@Entity('order_items')
@Index('idx_order_items_order_id', ['orderId'])
@Index('idx_order_items_seller_id', ['sellerId'])
@Index('idx_order_items_supplier_id', ['supplierId'])
@Index('idx_order_items_seller_product_id', ['sellerProductId'])
@Index('idx_order_items_product_id', ['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Foreign key to Order
   * Indexed for efficient JOIN queries
   */
  @Column('uuid')
  @Index()
  orderId!: string;

  @ManyToOne(() => Order, order => order.itemsRelation, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  /**
   * Product Information
   * Snapshot of product details at order creation time
   */
  @Column('uuid')
  productId!: string;

  @Column('varchar', { length: 500 })
  productName!: string;

  @Column('varchar', { length: 100, nullable: true })
  productSku?: string;

  /**
   * Frontend Presentation Fields
   * R-8-4: Added for JSONB removal preparation
   * These fields are UI metadata for product display
   */
  @Column('varchar', { nullable: true })
  productImage?: string; // Product thumbnail URL

  @Column('varchar', { nullable: true })
  productBrand?: string; // Brand name

  @Column('varchar', { nullable: true })
  variationName?: string; // Product variation/option name (e.g., "Red, Large")

  @Column('int')
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice!: number;

  /**
   * Supplier Information
   * Indexed for SupplierDashboardService queries
   */
  @Column('uuid')
  @Index()
  supplierId!: string;

  @Column('varchar', { length: 255 })
  supplierName!: string;

  /**
   * Seller Information
   * Indexed for SellerDashboardService queries
   */
  @Column('uuid')
  @Index()
  sellerId!: string;

  @Column('varchar', { length: 255 })
  sellerName!: string;

  /**
   * Seller's Product Reference
   * Phase PD-3/PD-4: Reference to seller's product catalog
   * Indexed for seller product performance tracking
   */
  @Column('uuid', { nullable: true })
  @Index()
  sellerProductId?: string;

  /**
   * Pricing Snapshots (Immutable)
   * Captured at order creation time for audit trail
   */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  basePriceSnapshot?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  salePriceSnapshot?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  marginAmountSnapshot?: number;

  /**
   * Commission Information (Immutable)
   * Calculated and fixed at order creation time
   * Used by SellerDashboardService for commission aggregation
   */
  @Column('varchar', { length: 10, nullable: true })
  commissionType?: 'rate' | 'fixed';

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  commissionRate?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  commissionAmount?: number;

  /**
   * Flexible Metadata
   * JSONB field for product attributes, custom fields, etc.
   * Example: { "color": "red", "size": "L", "custom_field": "value" }
   */
  @Column('jsonb', { nullable: true })
  attributes?: Record<string, string>;

  /**
   * Optional Notes
   * Free-text field for item-specific notes or instructions
   */
  @Column('text', { nullable: true })
  notes?: string;

  /**
   * Audit Timestamps
   */
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Helper Methods
   */

  /**
   * Calculate total price (for validation/consistency check)
   */
  calculateTotalPrice(): number {
    return this.unitPrice * this.quantity;
  }

  /**
   * Get effective price snapshot (prefers sale price over base price)
   */
  getEffectivePriceSnapshot(): number {
    return this.salePriceSnapshot || this.basePriceSnapshot || this.unitPrice;
  }

  /**
   * Convert to legacy OrderItem interface format
   * Used for backward compatibility when returning JSONB-format responses
   */
  toLegacyFormat(): any {
    return {
      id: this.id,
      productId: this.productId,
      productName: this.productName,
      productSku: this.productSku,
      productImage: this.productImage, // R-8-4: Added presentation field
      productBrand: this.productBrand, // R-8-4: Added presentation field
      variationName: this.variationName, // R-8-4: Added presentation field
      quantity: this.quantity,
      unitPrice: parseFloat(this.unitPrice.toString()),
      totalPrice: parseFloat(this.totalPrice.toString()),
      supplierId: this.supplierId,
      supplierName: this.supplierName,
      sellerId: this.sellerId,
      sellerName: this.sellerName,
      sellerProductId: this.sellerProductId,
      basePriceSnapshot: this.basePriceSnapshot ? parseFloat(this.basePriceSnapshot.toString()) : undefined,
      salePriceSnapshot: this.salePriceSnapshot ? parseFloat(this.salePriceSnapshot.toString()) : undefined,
      marginAmountSnapshot: this.marginAmountSnapshot ? parseFloat(this.marginAmountSnapshot.toString()) : undefined,
      commissionType: this.commissionType,
      commissionRate: this.commissionRate ? parseFloat(this.commissionRate.toString()) : undefined,
      commissionAmount: this.commissionAmount ? parseFloat(this.commissionAmount.toString()) : undefined,
      attributes: this.attributes,
      notes: this.notes
    };
  }
}
