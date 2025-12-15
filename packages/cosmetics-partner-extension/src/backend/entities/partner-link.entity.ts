/**
 * PartnerLink Entity
 *
 * 파트너 추천 링크 관리
 * - URL 슬러그
 * - 링크 유형
 * - 타겟 ID (제품, 루틴 등)
 * - 클릭/전환 추적
 * - 수익 정보
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LinkType = 'product' | 'routine' | 'collection' | 'campaign';

@Entity('cosmetics_partner_links')
@Index(['partnerId'])
@Index(['urlSlug'], { unique: true })
@Index(['linkType'])
@Index(['targetId'])
@Index(['isActive'])
export class PartnerLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  urlSlug!: string;

  @Column({ type: 'varchar', length: 50 })
  linkType!: LinkType;

  @Column({ type: 'varchar', length: 255 })
  targetId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  targetUrl?: string;

  @Column({ type: 'int', default: 0 })
  totalClicks!: number;

  @Column({ type: 'int', default: 0 })
  clickCount!: number;

  @Column({ type: 'int', default: 0 })
  conversions!: number;

  @Column({ type: 'int', default: 0 })
  conversionCount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionRate!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Alias getter for urlSlug (backwards compatibility)
  get slug(): string {
    return this.urlSlug;
  }

  set slug(value: string) {
    this.urlSlug = value;
  }
}
