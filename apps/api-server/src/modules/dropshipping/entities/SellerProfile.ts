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
 * 판매자 프로필 (Seller Profile)
 *
 * 판매자 역할에 특화된 정보를 저장합니다.
 *
 * 연결 조건:
 * - 사용자가 seller 역할로 승인되면 자동 생성
 * - User와 1:1 관계 (OneToOne)
 *
 * @see 01_schema_baseline.md
 */
@Entity('seller_profiles')
@Index(['userId'], { unique: true })
export class SellerProfile {
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

  // === 판매 채널 정보 ===

  /**
   * 스토어명
   */
  @Column({ type: 'varchar', length: 200 })
  storeName!: string;

  /**
   * 스토어 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  storeUrl?: string;

  /**
   * 판매 채널
   *
   * 'smartstore' | 'coupang' | 'gmarket' | 'auction' | 'etc'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  salesChannel?: string;

  // === 기업 정보 ===

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
   * 사업자 이메일
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  businessEmail?: string;

  /**
   * 사업자 전화번호
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  businessPhone?: string;

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

  // === 배송/반품 정책 ===

  /**
   * 기본 배송지 주소
   */
  @Column({ type: 'text', nullable: true })
  defaultShippingAddress?: string;

  /**
   * 반품/교환 주소
   */
  @Column({ type: 'text', nullable: true })
  returnAddress?: string;

  /**
   * 반품/교환 정책
   */
  @Column({ type: 'text', nullable: true })
  returnPolicy?: string;

  // === 통계/KPI (읽기 전용) ===

  /**
   * 총 판매 건수
   */
  @Column({ type: 'integer', default: 0 })
  totalSales?: number;

  /**
   * 월 평균 판매 건수
   */
  @Column({ type: 'integer', default: 0 })
  avgMonthlySales?: number;

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
      this.storeName,
      this.storeUrl,
      this.salesChannel,
      this.businessEmail,
      this.businessPhone,
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
    return !!(this.storeName && this.storeUrl && this.salesChannel);
  }
}
