/**
 * Partner Entity
 *
 * 파트너 기본 정보 및 활동 통계
 *
 * 파트너는 Seller/Supplier와 전혀 다른 제3 운영 주체로,
 * 드랍쉬핑 뿐 아니라 모든 산업(Service-Apps)의 매출 성장에 기여합니다.
 *
 * @package @o4o/partner-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PartnerLink } from './PartnerLink.entity.js';
import { PartnerClick } from './PartnerClick.entity.js';
import { PartnerConversion } from './PartnerConversion.entity.js';
import { PartnerCommission } from './PartnerCommission.entity.js';
import { PartnerSettlementBatch } from './PartnerSettlementBatch.entity.js';

/**
 * 파트너 등급
 */
export enum PartnerLevel {
  NEWBIE = 'newbie',       // 신규
  STANDARD = 'standard',   // 일반
  PRO = 'pro',             // 프로
  ELITE = 'elite',         // 엘리트
}

/**
 * 파트너 상태
 */
export enum PartnerStatus {
  PENDING = 'pending',     // 승인 대기
  ACTIVE = 'active',       // 활성
  SUSPENDED = 'suspended', // 일시 정지
  INACTIVE = 'inactive',   // 비활성
}

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 연결된 사용자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * 파트너명
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * 역할 (항상 'partner')
   */
  @Column({ type: 'varchar', length: 50, default: 'partner' })
  role!: string;

  /**
   * 프로필 이미지 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImage?: string;

  /**
   * 소셜 링크 (SNS 등)
   */
  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    blog?: string;
    tiktok?: string;
    facebook?: string;
    [key: string]: string | undefined;
  };

  /**
   * 총 클릭 수
   */
  @Column({ type: 'int', default: 0 })
  clickCount!: number;

  /**
   * 총 전환 수
   */
  @Column({ type: 'int', default: 0 })
  conversionCount!: number;

  /**
   * 총 누적 커미션
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCommission!: number;

  /**
   * 파트너 등급
   */
  @Column({
    type: 'enum',
    enum: PartnerLevel,
    default: PartnerLevel.NEWBIE,
  })
  level!: PartnerLevel;

  /**
   * 파트너 상태
   */
  @Column({
    type: 'enum',
    enum: PartnerStatus,
    default: PartnerStatus.PENDING,
  })
  status!: PartnerStatus;

  /**
   * 기본 커미션율 (%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  commissionRate!: number;

  /**
   * 은행 정보 (정산용)
   */
  @Column({ type: 'jsonb', nullable: true })
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => PartnerLink, (link) => link.partner)
  links?: PartnerLink[];

  @OneToMany(() => PartnerClick, (click) => click.partner)
  clicks?: PartnerClick[];

  @OneToMany(() => PartnerConversion, (conversion) => conversion.partner)
  conversions?: PartnerConversion[];

  @OneToMany(() => PartnerCommission, (commission) => commission.partner)
  commissions?: PartnerCommission[];

  @OneToMany(() => PartnerSettlementBatch, (batch) => batch.partner)
  settlementBatches?: PartnerSettlementBatch[];
}
