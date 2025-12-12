/**
 * PartnerRoutine Entity
 *
 * 파트너 루틴 관리
 * - 스킨케어 루틴 구성
 * - 피부 타입/고민별 추천
 * - 제품 조합 추천
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type RoutineType = 'morning' | 'evening' | 'weekly' | 'special';
export type RoutineVisibility = 'public' | 'followers' | 'private';

export interface RoutineStep {
  order: number;
  productId: string;
  productName?: string;
  stepName: string;
  description?: string;
  duration?: number;
  tips?: string;
}

@Entity('cosmetics_partner_routines')
@Index(['partnerId'])
@Index(['routineType'])
@Index(['visibility'])
@Index(['isPublished'])
export class PartnerRoutine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20 })
  routineType!: RoutineType;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility!: RoutineVisibility;

  @Column({ type: 'simple-array', nullable: true })
  skinTypes?: string[];

  @Column({ type: 'simple-array', nullable: true })
  skinConcerns?: string[];

  @Column({ type: 'jsonb', default: [] })
  steps!: RoutineStep[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'int', default: 0 })
  saveCount!: number;

  @Column({ type: 'int', default: 0 })
  conversionCount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;
}
