import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import type { Product } from './Product.js';

/**
 * SellerProduct Entity
 * Phase PD-3: Dropshipping Seller Workflow
 *
 * Represents a Product that a Seller has imported into their catalog.
 * Tracks seller-specific pricing, margins, and sync policies.
 */

export enum SellerProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export type SyncPolicy = 'auto' | 'manual';

@Entity('seller_products')
@Index(['sellerId', 'productId'], { unique: true })
@Index(['sellerId', 'isActive'])
@Index(['sellerId', 'createdAt'])
export class SellerProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Seller (User with seller role)
  @Column('uuid')
  sellerId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  // Product (from Supplier)
  @Column('uuid')
  productId: string;

  @ManyToOne('Product', { nullable: false, eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  // Pricing Information
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice: number | null; // Seller's selling price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePriceSnapshot: number | null; // Snapshot of supplier price at import time

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice: number | null; // Supplier cost price (for calculation)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  profit: number | null; // Profit amount (salePrice - costPrice)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  profitMargin: number | null; // Profit margin percentage

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  marginRate: number | null; // Margin rate (0-1, e.g., 0.25 = 25%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marginAmount: number | null; // Margin amount (salePrice - basePrice)

  // Sync Policy
  @Column({ type: 'varchar', length: 20, default: 'auto' })
  syncPolicy: SyncPolicy; // 'auto' | 'manual'

  // Status
  @Column({
    type: 'varchar',
    length: 20,
    default: SellerProductStatus.ACTIVE
  })
  status: SellerProductStatus; // Product status

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Whether the product is currently being sold

  // Inventory (Seller's inventory for this product)
  @Column({ type: 'integer', default: 0, nullable: true })
  sellerInventory: number | null;

  // Supplier inventory snapshot (for auto-sync tracking)
  @Column({ type: 'integer', nullable: true })
  supplierInventorySnapshot: number | null;

  // Sales Statistics
  @Column({ type: 'integer', default: 0 })
  salesCount: number; // Number of sales

  @Column({ type: 'integer', default: 0 })
  totalSold: number; // Total quantity sold

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  addedAt: Date; // When the seller added this product

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods

  /**
   * Calculate margin amount based on sale price and base price
   */
  calculateMarginAmount(): number {
    if (this.salePrice && this.basePriceSnapshot) {
      return this.salePrice - this.basePriceSnapshot;
    }
    return 0;
  }

  /**
   * Calculate margin rate based on sale price and base price
   */
  calculateMarginRate(): number {
    if (this.salePrice && this.basePriceSnapshot && this.salePrice > 0) {
      return (this.salePrice - this.basePriceSnapshot) / this.salePrice;
    }
    return 0;
  }

  /**
   * Update pricing information
   * Recalculates margin amount and rate
   */
  updatePricing(salePrice: number, basePrice?: number): void {
    this.salePrice = salePrice;

    if (basePrice !== undefined) {
      this.basePriceSnapshot = basePrice;
    }

    if (this.basePriceSnapshot) {
      this.marginAmount = this.calculateMarginAmount();
      this.marginRate = this.calculateMarginRate();
    }
  }

  /**
   * Apply margin rate to calculate sale price
   */
  applySalePriceFromMargin(marginRate: number): void {
    if (this.basePriceSnapshot) {
      this.marginRate = marginRate;
      this.salePrice = this.basePriceSnapshot / (1 - marginRate);
      this.marginAmount = this.calculateMarginAmount();
    }
  }

  /**
   * Check if product needs price sync
   * Returns true if syncPolicy is 'auto' and supplier price changed
   */
  needsPriceSync(currentSupplierPrice: number): boolean {
    return (
      this.syncPolicy === 'auto' &&
      this.basePriceSnapshot !== null &&
      this.basePriceSnapshot !== currentSupplierPrice
    );
  }

  /**
   * Sync price with supplier's current price
   * Only applies if syncPolicy is 'auto'
   */
  syncPriceWithSupplier(currentSupplierPrice: number): void {
    if (this.syncPolicy === 'auto' && this.marginRate) {
      this.basePriceSnapshot = currentSupplierPrice;
      this.salePrice = currentSupplierPrice / (1 - this.marginRate);
      this.marginAmount = this.calculateMarginAmount();
    }
  }
}
