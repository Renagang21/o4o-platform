/**
 * NetureProductLog Entity
 *
 * Phase D-1: Neture API Server 골격 구축
 * Schema: neture (isolated from Core)
 *
 * 상품 변경 감사 로그
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Log Action Type
 */
export enum NetureLogAction {
  CREATE = 'create',
  UPDATE = 'update',
  STATUS_CHANGE = 'status_change',
  PRICE_CHANGE = 'price_change',
  DELETE = 'delete',
}

@Entity({ name: 'neture_product_logs', schema: 'neture' })
export class NetureProductLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  @Index()
  action!: NetureLogAction;

  @Column({ type: 'jsonb', nullable: true })
  before?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // user_id는 참조만 (Core FK 제약 금지)
  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
