/**
 * Product Entity (Stub)
 *
 * This is a minimal stub entity to satisfy TypeScript compilation.
 * The actual product management has been moved to ecommerce-core package.
 * This stub is maintained for backward compatibility with legacy services.
 *
 * @deprecated Use @o4o/ecommerce-core entities for new development
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

@Entity('products')
@Index(['status'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'recommended_price' })
  recommendedPrice!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT
  })
  status!: ProductStatus;

  @Column({ type: 'uuid', nullable: true, name: 'supplier_id' })
  supplierId?: string;

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'json', nullable: true, name: 'commission_policy' })
  commissionPolicy?: {
    type: 'rate' | 'fixed';
    value: number;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Get the main product image
   */
  getMainImage(): string | null {
    if (this.images && this.images.length > 0) {
      return this.images[0];
    }
    return null;
  }

  /**
   * Get commission policy for this product
   * Used by CommissionCalculator service
   */
  getCommissionPolicy(): { type: 'rate' | 'fixed'; value: number } | null {
    return this.commissionPolicy || null;
  }
}
