/**
 * SellerDisplay Entity
 *
 * 매장 진열 정보 관리
 * - 제품별 진열 위치
 * - 페이스 수
 * - 진열 품질 평가
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type DisplayLocation = 'entrance' | 'counter' | 'shelf_a' | 'shelf_b' | 'window' | 'promotion';
export type FacingQuality = 'excellent' | 'good' | 'average' | 'poor';

@Entity('cosmetics_seller_displays')
@Index(['sellerId', 'productId'], { unique: true })
@Index(['sellerId'])
@Index(['location'])
export class SellerDisplay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  sellerId!: string;

  @Column({ type: 'varchar', length: 255 })
  productId!: string;

  @Column({ type: 'varchar', length: 50 })
  location!: DisplayLocation;

  @Column({ type: 'int', default: 1 })
  faceCount!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  facingQuality?: FacingQuality;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
