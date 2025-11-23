/**
 * Wishlist Entity
 * R-6-5: Customer wishlist for saving favorite products
 *
 * Stores products that customers want to track or purchase later
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import type { Product } from './Product.js';

@Entity('wishlists')
@Index(['userId']) // Index for fast user lookups
@Index(['userId', 'productId'], { unique: true }) // Prevent duplicate entries
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;

  // Note to user (optional field for future expansion)
  @Column({ type: 'text', nullable: true })
  notes?: string;
}
