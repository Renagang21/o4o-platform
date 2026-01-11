/**
 * Glycopharm Order Entity
 *
 * ============================================================================
 * ⚠️ LEGACY TABLE (READ-ONLY) - Phase 9-A Frozen
 * ============================================================================
 *
 * This table is intentionally kept for historical data preservation.
 * Order creation via GlycoPharm is PERMANENTLY DISABLED (Phase 5-A).
 *
 * DO NOT:
 * - Create new records in this table
 * - Add new references to this entity
 * - Reuse this structure for new services
 * - Remove this table (historical data must be preserved)
 *
 * WHY THIS FAILED:
 * - Independent order structure bypassed E-commerce Core
 * - Caused reporting/settlement inconsistencies
 * - Made platform-wide order management impossible
 *
 * CORRECT PATTERN:
 * All new services must use checkoutService.createOrder() with OrderType.
 * See: CLAUDE.md §7, §20, §21
 *
 * @see docs/_platform/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md
 * @deprecated Phase 5-A - Use E-commerce Core instead
 * ============================================================================
 *
 * Original: H8-2 주문/결제 API v1 Implementation
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { GlycopharmPharmacy } from './glycopharm-pharmacy.entity.js';
import type { GlycopharmOrderItem } from './glycopharm-order-item.entity.js';

export type GlycopharmOrderStatus = 'CREATED' | 'PAID' | 'FAILED';

@Entity({ name: 'glycopharm_orders', schema: 'public' })
export class GlycopharmOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pharmacy_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'CREATED' })
  status!: GlycopharmOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_phone?: string;

  @Column({ type: 'text', nullable: true })
  shipping_address?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_method?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_id?: string;

  @Column({ type: 'text', nullable: true })
  failure_reason?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @ManyToOne('GlycopharmPharmacy')
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: GlycopharmPharmacy;

  @OneToMany('GlycopharmOrderItem', 'order', { cascade: true })
  items?: GlycopharmOrderItem[];
}
