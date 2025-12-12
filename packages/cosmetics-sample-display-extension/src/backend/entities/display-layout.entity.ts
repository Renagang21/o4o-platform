/**
 * Display Layout Entity
 *
 * 진열 레이아웃 관리
 * - 매장별 제품 진열 위치
 * - 페이싱(Facing) 수량
 * - 진열 사진 인증
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ShelfPosition = 'eye_level' | 'top_shelf' | 'middle_shelf' | 'bottom_shelf' | 'end_cap' | 'counter' | 'window';
export type DisplayStatus = 'active' | 'inactive' | 'pending_setup' | 'needs_refill';
export type DisplayType = 'permanent' | 'promotional' | 'seasonal' | 'tester_station';

@Entity('cosmetics_display_layouts')
@Index(['storeId', 'productId'])
export class DisplayLayout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoryName?: string;

  @Column({ type: 'varchar', length: 50, default: 'eye_level' })
  shelfPosition!: ShelfPosition;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shelfSection?: string;

  @Column({ type: 'int', default: 1 })
  facingCount!: number;

  @Column({ type: 'int', nullable: true })
  shelfRow?: number;

  @Column({ type: 'int', nullable: true })
  shelfColumn?: number;

  @Column({ type: 'varchar', length: 50, default: 'permanent' })
  displayType!: DisplayType;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: DisplayStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  photoUploadedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy?: string;

  @Column({ type: 'date', nullable: true })
  displayStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  displayEndDate?: Date;

  @Column({ type: 'int', nullable: true })
  planogramOrder?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
