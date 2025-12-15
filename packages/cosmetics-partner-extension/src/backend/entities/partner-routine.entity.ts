/**
 * PartnerRoutine Entity
 *
 * 파트너 루틴 추천 관리
 * - 루틴 제목 및 설명
 * - 루틴 단계 (제품 목록)
 * - 피부 타입/고민별 필터
 * - 공개 여부
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

export interface RoutineStep {
  order: number;
  productId: string;
  description: string;
  quantity?: string;
  duration?: string;
}

@Entity('cosmetics_partner_routines')
@Index(['partnerId'])
@Index(['routineType'])
@Index(['isPublished'])
@Index(['createdAt'])
export class PartnerRoutine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 50 })
  routineType!: RoutineType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', default: [] })
  steps!: RoutineStep[];

  @Column({ type: 'simple-array', nullable: true })
  skinTypes?: string[];

  @Column({ type: 'simple-array', nullable: true })
  skinConcerns?: string[];

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Alias getter for skinConcerns (backwards compatibility)
  get concerns(): string[] {
    return this.skinConcerns || [];
  }

  set concerns(value: string[]) {
    this.skinConcerns = value;
  }
}
