import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../entities/User.js';

/**
 * 파트너 프로필 (Partner Profile)
 *
 * 파트너 역할에 특화된 정보를 저장합니다.
 * 파트너는 제휴 마케터, 인플루언서 등을 포함합니다.
 *
 * 연결 조건:
 * - 사용자가 partner 역할로 승인되면 자동 생성
 * - User와 1:1 관계 (OneToOne)
 *
 * @see 01_schema_baseline.md
 */
@Entity('partner_profiles')
@Index(['userId'], { unique: true })
export class PartnerProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 연결된 사용자 (OneToOne)
   */
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // === 파트너 타입 ===

  /**
   * 파트너 유형
   *
   * 'affiliate' | 'influencer' | 'agency' | 'media' | 'etc'
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerType?: string;

  /**
   * 플랫폼
   *
   * 'youtube' | 'instagram' | 'blog' | 'facebook' | 'tiktok' | 'etc'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  platform?: string;

  /**
   * 채널 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  channelUrl?: string;

  /**
   * 팔로워/구독자 수
   */
  @Column({ type: 'integer', nullable: true })
  followerCount?: number;

  // === 기업/개인 정보 ===

  /**
   * 사업자 여부
   */
  @Column({ type: 'boolean', default: false })
  isBusiness?: boolean;

  /**
   * 회사명 (사업자인 경우)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  companyName?: string;

  /**
   * 사업자등록번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId?: string;

  // === 연락처 ===

  /**
   * 연락용 이메일
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  /**
   * 연락용 전화번호
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  // === 정산 정보 ===

  /**
   * 은행명
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  /**
   * 계좌번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  accountNumber?: string;

  /**
   * 예금주
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolder?: string;

  // === 커미션 정책 (기본값) ===

  /**
   * 기본 커미션율 (%)
   *
   * 개별 상품 커미션 정책이 없는 경우 사용
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  defaultCommissionRate?: number;

  /**
   * 커미션 정산 주기
   *
   * 'daily' | 'weekly' | 'monthly'
   */
  @Column({ type: 'varchar', length: 50, nullable: true, default: 'monthly' })
  settlementCycle?: string;

  // === 통계/KPI (읽기 전용) ===

  /**
   * 총 추천 건수
   */
  @Column({ type: 'integer', default: 0 })
  totalReferrals?: number;

  /**
   * 총 전환 건수
   */
  @Column({ type: 'integer', default: 0 })
  totalConversions?: number;

  /**
   * 전환율 (%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate?: number;

  // === 메타데이터 ===

  /**
   * 추가 메타데이터 (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성 시각
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정 시각
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods

  /**
   * 프로필 완성도 체크 (0-100)
   */
  getCompletionRate(): number {
    const requiredFields = [
      this.partnerType,
      this.platform,
      this.channelUrl,
      this.followerCount,
      this.contactEmail,
      this.contactPhone,
      this.bankName,
      this.accountNumber,
      this.accountHolder,
    ];

    const filledCount = requiredFields.filter((field) => !!field).length;
    return Math.round((filledCount / requiredFields.length) * 100);
  }

  /**
   * 정산 정보 완성 여부
   */
  hasCompleteSettlementInfo(): boolean {
    return !!(this.bankName && this.accountNumber && this.accountHolder);
  }

  /**
   * 채널 정보 완성 여부
   */
  hasCompleteChannelInfo(): boolean {
    return !!(this.platform && this.channelUrl && this.followerCount);
  }

  /**
   * 전환율 업데이트
   */
  updateConversionRate(): void {
    if (this.totalReferrals && this.totalReferrals > 0) {
      this.conversionRate = Number(((this.totalConversions || 0) / this.totalReferrals * 100).toFixed(2));
    } else {
      this.conversionRate = 0;
    }
  }
}
