import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './User.js';
import { KycDocument } from './KycDocument.js';

/**
 * 역할 신청 (Enrollment)
 *
 * 사용자가 특정 역할(supplier, seller, partner)을 신청한 이력을 저장합니다.
 *
 * 상태 전이:
 * - PENDING → APPROVED → (RoleAssignment 생성)
 * - PENDING → REJECTED
 * - PENDING → ON_HOLD → APPROVED / REJECTED
 *
 * @see 02_flows_enrollment.md
 */
@Entity('role_enrollments')
@Index(['userId'])
@Index(['role'])
@Index(['status'])
@Index(['createdAt'])
@Index(['userId', 'role', 'status'])
export class RoleEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 신청자
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * 신청 역할
   *
   * 'supplier' | 'seller' | 'partner'
   */
  @Column({ type: 'varchar', length: 50 })
  role!: string;

  /**
   * 신청 상태
   *
   * - PENDING: 검토 중
   * - APPROVED: 승인됨
   * - REJECTED: 거부됨
   * - ON_HOLD: 보류 (추가 서류 필요 등)
   */
  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD';

  /**
   * 신청 시 제출한 데이터 (JSON)
   *
   * 역할별로 필요한 필드가 다름:
   * - supplier: { companyName, taxId, businessEmail, businessPhone, businessAddress, ... }
   * - seller: { storeName, storeUrl, salesChannel, ... }
   * - partner: { partnerType, platform, channelUrl, followerCount, ... }
   */
  @Column({ type: 'jsonb', nullable: true })
  applicationData?: Record<string, any>;

  /**
   * 검토 완료 시각
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  /**
   * 검토자 (관리자)
   */
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  /**
   * 검토 의견/사유
   *
   * - 승인 시: "서류 확인 완료"
   * - 거부 시: "사업자등록증이 유효하지 않습니다"
   * - 보류 시: "추가 서류 요청 - 통장사본"
   */
  @Column({ type: 'text', nullable: true })
  reviewNote?: string;

  /**
   * 신청 생성 시각
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 신청 수정 시각
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * 첨부 서류 (KYC)
   */
  @OneToMany(() => KycDocument, (doc) => doc.enrollment)
  documents?: KycDocument[];

  // Helper methods

  /**
   * 승인 가능 여부 체크
   */
  canApprove(): boolean {
    return this.status === 'PENDING' || this.status === 'ON_HOLD';
  }

  /**
   * 거부 가능 여부 체크
   */
  canReject(): boolean {
    return this.status === 'PENDING' || this.status === 'ON_HOLD';
  }

  /**
   * 보류 가능 여부 체크
   */
  canHold(): boolean {
    return this.status === 'PENDING';
  }

  /**
   * 검토 완료 여부
   */
  isReviewed(): boolean {
    return ['APPROVED', 'REJECTED'].includes(this.status);
  }

  /**
   * 승인 처리
   */
  approve(reviewerId: string, note?: string): void {
    if (!this.canApprove()) {
      throw new Error(`Cannot approve enrollment in ${this.status} status`);
    }
    this.status = 'APPROVED';
    this.reviewedAt = new Date();
    this.reviewedBy = reviewerId;
    if (note) {
      this.reviewNote = note;
    }
  }

  /**
   * 거부 처리
   */
  reject(reviewerId: string, note: string): void {
    if (!this.canReject()) {
      throw new Error(`Cannot reject enrollment in ${this.status} status`);
    }
    this.status = 'REJECTED';
    this.reviewedAt = new Date();
    this.reviewedBy = reviewerId;
    this.reviewNote = note;
  }

  /**
   * 보류 처리
   */
  hold(reviewerId: string, note: string): void {
    if (!this.canHold()) {
      throw new Error(`Cannot hold enrollment in ${this.status} status`);
    }
    this.status = 'ON_HOLD';
    this.reviewedAt = new Date();
    this.reviewedBy = reviewerId;
    this.reviewNote = note;
  }
}
