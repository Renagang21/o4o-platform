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
import type { Cart } from './Cart.js';

@Entity('cart_items')
@Index(['cartId'])
@Index(['productId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cartId: string;

  @ManyToOne('Cart', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column('uuid')
  productId: string;

  @Column({ type: 'varchar', nullable: true })
  productName: string;

  @Column({ type: 'varchar', nullable: true })
  productSku: string;

  @Column({ type: 'varchar', nullable: true })
  productImage: string;

  @Column({ type: 'varchar', nullable: true })
  productBrand: string;

  @Column('uuid', { nullable: true })
  variationId: string;

  @Column({ type: 'varchar', nullable: true })
  variationName: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column('int')
  quantity: number;

  // Product reference for client-side stores (stored as JSON)
  @Column('jsonb', { nullable: true })
  product: any;

  // Constraints
  @Column('int', { nullable: true })
  maxOrderQuantity: number;

  @Column('int', { nullable: true })
  stockQuantity: number;

  // Supplier info
  @Column('uuid', { nullable: true })
  supplierId: string;

  @Column({ type: 'varchar', nullable: true })
  supplierName: string;

  // Product attributes
  @Column('jsonb', { nullable: true })
  attributes: Record<string, string>;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  addedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  getTotalPrice(): number {
    return (this.unitPrice || 0) * this.quantity;
  }

  isInStock(): boolean {
    if (this.stockQuantity === null || this.stockQuantity === undefined) {
      return true; // Assume in stock if not specified
    }
    return this.stockQuantity >= this.quantity;
  }

  exceedsMaxOrder(): boolean {
    if (this.maxOrderQuantity === null || this.maxOrderQuantity === undefined) {
      return false; // No limit if not specified
    }
    return this.quantity > this.maxOrderQuantity;
  }

  hasValidationErrors(): string[] {
    const errors: string[] = [];

    if (this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!this.isInStock()) {
      errors.push(`Only ${this.stockQuantity} items available in stock`);
    }

    if (this.exceedsMaxOrder()) {
      errors.push(`Maximum order quantity is ${this.maxOrderQuantity}`);
    }

    return errors;
  }
}