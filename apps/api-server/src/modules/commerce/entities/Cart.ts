import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from '../../../entities/User.js';
import type { CartItem } from './CartItem.js';

export interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

@Entity('carts')
@Index(['userId'], { unique: true })
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany('CartItem', 'cart', { cascade: true })
  items: CartItem[];

  @Column('jsonb', { nullable: true })
  summary: CartSummary;

  @Column({ type: 'simple-array', nullable: true })
  coupons: string[];

  @Column({ type: 'simple-array', nullable: true })
  discountCodes: string[];

  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  calculateSummary(): CartSummary {
    if (!this.items || this.items.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 0
      };
    }

    const subtotal = this.items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // TODO: Implement proper discount, shipping, and tax calculation
    const discount = 0;
    const shipping = subtotal > 50000 ? 0 : 3000; // Free shipping over 50,000 KRW
    const tax = Math.round(subtotal * 0.1); // 10% tax
    const total = subtotal + shipping + tax - discount;

    return {
      subtotal,
      discount,
      shipping,
      tax,
      total
    };
  }

  updateSummary(): void {
    this.summary = this.calculateSummary();
  }

  getTotalItems(): number {
    if (!this.items) return 0;
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isEmpty(): boolean {
    return !this.items || this.items.length === 0;
  }
}