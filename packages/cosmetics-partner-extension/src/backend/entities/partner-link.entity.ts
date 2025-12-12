/**
 * PartnerLink Entity
 *
 * 파트너 추천 링크 관리
 * - 상품/캠페인/루틴별 고유 링크
 * - 클릭/전환 추적
 * - 수익 계산
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LinkType = 'product' | 'campaign' | 'routine' | 'brand';
export type LinkStatus = 'active' | 'inactive' | 'expired';

@Entity('cosmetics_partner_links')
@Index(['partnerId'])
@Index(['urlSlug'], { unique: true })
@Index(['linkType'])
@Index(['status'])
@Index(['targetId', 'linkType'])
export class PartnerLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  urlSlug!: string;

  @Column({ type: 'varchar', length: 20 })
  linkType!: LinkType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  customCommissionRate?: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: LinkStatus;

  @Column({ type: 'int', default: 0 })
  totalClicks!: number;

  @Column({ type: 'int', default: 0 })
  uniqueClicks!: number;

  @Column({ type: 'int', default: 0 })
  conversions!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
