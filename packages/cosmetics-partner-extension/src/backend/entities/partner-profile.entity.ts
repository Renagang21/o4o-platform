/**
 * PartnerProfile Entity
 *
 * 파트너/인플루언서 프로필 관리
 * - 파트너 기본 정보
 * - 추천 코드
 * - 소셜 링크
 * - 파트너 유형/상태
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PartnerType = 'influencer' | 'store_partner' | 'affiliate' | 'reseller';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  blog?: string;
  website?: string;
}

@Entity('cosmetics_partner_profiles')
@Index(['userId'], { unique: true })
@Index(['referralCode'], { unique: true })
@Index(['partnerType'])
@Index(['status'])
export class PartnerProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  referralCode!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  introduction?: string;

  @Column({ type: 'varchar', length: 20 })
  partnerType!: PartnerType;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: PartnerStatus;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: SocialLinks;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  defaultCommissionRate!: number;

  @Column({ type: 'int', default: 0 })
  totalFollowers!: number;

  @Column({ type: 'int', default: 0 })
  totalConversions!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedBy?: string;
}
