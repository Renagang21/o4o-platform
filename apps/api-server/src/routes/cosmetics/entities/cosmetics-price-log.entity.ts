/**
 * CosmeticsPriceLog Entity
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Audit log for price changes
 * Schema: cosmetics (isolated from Core)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CosmeticsLogAction } from './cosmetics-product-log.entity.js';

@Entity({ name: 'cosmetics_price_logs', schema: 'cosmetics' })
export class CosmeticsPriceLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  action!: CosmeticsLogAction;

  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, { old: any; new: any }> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId?: string | null;

  @Column({ name: 'user_name', type: 'varchar', length: 200, nullable: true })
  userName?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}
