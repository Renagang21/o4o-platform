/**
 * PartnerProfile Entity
 *
 * 파트너 프로필 정보 관리
 * - 사용자 ID 연결
 * - 추천 코드
 * - 파트너 유형 및 상태
 * - 소셜 링크
 * - 총 수익
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PartnerType = 'influencer' | 'affiliate' | 'brand-ambassador';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  blog?: string;
  other?: string;
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

  @Column({ type: 'varchar', length: 50 })
  partnerType!: PartnerType;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: PartnerStatus;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: SocialLinks;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  availableBalance!: number;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagramHandle?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtubeChannel?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
