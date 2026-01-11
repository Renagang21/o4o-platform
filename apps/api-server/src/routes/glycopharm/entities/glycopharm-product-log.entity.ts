/**
 * Glycopharm Product Log Entity
 *
 * ============================================================================
 * ⚠️ ACTIVE TABLE - GlycoPharm Domain (Phase 9-A Reviewed)
 * ============================================================================
 *
 * This table remains ACTIVE for product audit logging.
 * Unlike glycopharm_orders, this is NOT deprecated.
 *
 * The product log entity tracks:
 * - Product creation/updates
 * - Status changes
 * - Price modifications
 *
 * @see CLAUDE.md §7 for E-commerce Core rules
 * ============================================================================
 *
 * Original: Phase B-1 Glycopharm API Implementation
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { GlycopharmProduct } from './glycopharm-product.entity.js';

export type GlycopharmProductLogAction = 'create' | 'update' | 'status_change' | 'delete';

@Entity({ name: 'glycopharm_product_logs', schema: 'public' })
export class GlycopharmProductLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: GlycopharmProductLogAction;

  @Column({ type: 'jsonb', nullable: true })
  before_data?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  after_data?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid', nullable: true })
  changed_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changed_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @ManyToOne('GlycopharmProduct', 'logs')
  @JoinColumn({ name: 'product_id' })
  product?: GlycopharmProduct;
}
