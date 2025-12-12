import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ExemptionCategory
 * 감면 유형
 */
export type ExemptionCategory =
  | 'senior'        // 고령 (70세 이상 등)
  | 'honorary'      // 명예회원
  | 'inactive'      // 휴업약사
  | 'newMember'     // 신규 입회
  | 'earlyPayment'  // 조기 납부
  | 'lmsCredit'     // 연수교육 이수 우수
  | 'executive'     // 임원 (직책에 따른 감면)
  | 'hardship'      // 경제적 어려움
  | 'special'       // 특별 감면
  | 'manual';       // 관리자 수동 처리

/**
 * ExemptionStatus
 * 감면 승인 상태
 */
export type ExemptionStatus =
  | 'pending'    // 승인 대기
  | 'approved'   // 승인됨
  | 'rejected'   // 반려됨
  | 'expired';   // 만료됨

/**
 * FeeExemption Entity
 *
 * 회비 감면 내역
 * 회원별 감면 사유 및 금액 관리
 */
@Entity('yaksa_fee_exemptions')
@Index(['memberId', 'year'])
@Index(['category'])
@Index(['status'])
@Index(['approvedAt'])
export class FeeExemption {
  /**
   * 감면 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 적용 연도
   */
  @Column({ type: 'integer' })
  year!: number;

  /**
   * 감면 유형
   */
  @Column({
    type: 'varchar',
    length: 30,
  })
  category!: ExemptionCategory;

  /**
   * 감면 방식
   *
   * - full: 전액 면제
   * - partial_rate: 비율 감면
   * - partial_amount: 정액 감면
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'partial_rate',
  })
  exemptionType!: 'full' | 'partial_rate' | 'partial_amount';

  /**
   * 감면 비율 (%)
   *
   * exemptionType이 partial_rate일 때 사용
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  exemptionRate?: number;

  /**
   * 감면 금액 (원)
   *
   * exemptionType이 partial_amount일 때 사용
   * 또는 최종 계산된 감면 금액
   */
  @Column({ type: 'integer', nullable: true })
  exemptionAmount?: number;

  /**
   * 원래 회비 금액 (감면 전)
   */
  @Column({ type: 'integer', nullable: true })
  originalAmount?: number;

  /**
   * 최종 납부 금액 (감면 후)
   */
  @Column({ type: 'integer', nullable: true })
  finalAmount?: number;

  /**
   * 감면 사유 상세
   */
  @Column({ type: 'text' })
  reason!: string;

  /**
   * 감면 승인 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: ExemptionStatus;

  /**
   * 신청일시
   */
  @Column({ type: 'timestamp', nullable: true })
  requestedAt?: Date;

  /**
   * 신청자 ID (회원 본인 또는 관리자)
   */
  @Column({ type: 'uuid', nullable: true })
  requestedBy?: string;

  /**
   * 승인일시
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  /**
   * 승인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  /**
   * 승인자 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  approvedByName?: string;

  /**
   * 반려일시
   */
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  /**
   * 반려 사유
   */
  @Column({ type: 'text', nullable: true })
  rejectedReason?: string;

  /**
   * 반려자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  rejectedBy?: string;

  /**
   * 유효 시작일
   */
  @Column({ type: 'date', nullable: true })
  validFrom?: string;

  /**
   * 유효 종료일
   */
  @Column({ type: 'date', nullable: true })
  validUntil?: string;

  /**
   * 자동 적용 여부
   *
   * 정책에 의해 자동으로 적용된 감면인지
   */
  @Column({ type: 'boolean', default: false })
  isAutoApplied!: boolean;

  /**
   * 적용된 정책 규칙 ID (참조용)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  appliedRuleId?: string;

  /**
   * 청구서 ID (연결된 청구서)
   */
  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  /**
   * 메모 (관리자용)
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * 첨부 파일 URL (증빙 서류)
   */
  @Column({ type: 'text', nullable: true })
  attachmentUrl?: string;

  /**
   * 확장 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * 승인 대기 중인지 확인
   */
  isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * 승인됨인지 확인
   */
  isApproved(): boolean {
    return this.status === 'approved';
  }

  /**
   * 감면 승인 처리
   */
  approve(approvedBy: string, approvedByName: string): void {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
    this.approvedByName = approvedByName;
  }

  /**
   * 감면 반려 처리
   */
  reject(rejectedBy: string, reason: string): void {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectedBy = rejectedBy;
    this.rejectedReason = reason;
  }

  /**
   * 감면 금액 계산
   */
  calculateExemptionAmount(originalAmount: number): number {
    this.originalAmount = originalAmount;

    if (this.exemptionType === 'full') {
      this.exemptionAmount = originalAmount;
      this.finalAmount = 0;
    } else if (this.exemptionType === 'partial_rate' && this.exemptionRate) {
      this.exemptionAmount = Math.round(originalAmount * (this.exemptionRate / 100));
      this.finalAmount = originalAmount - this.exemptionAmount;
    } else if (this.exemptionType === 'partial_amount' && this.exemptionAmount) {
      this.finalAmount = Math.max(0, originalAmount - this.exemptionAmount);
    } else {
      this.exemptionAmount = 0;
      this.finalAmount = originalAmount;
    }

    return this.exemptionAmount;
  }

  /**
   * 감면 유형 표시명
   */
  getCategoryDisplayName(): string {
    const names: Record<ExemptionCategory, string> = {
      senior: '고령 감면',
      honorary: '명예회원',
      inactive: '휴업약사',
      newMember: '신규 입회 감면',
      earlyPayment: '조기 납부 할인',
      lmsCredit: '연수교육 우수 감면',
      executive: '임원 감면',
      hardship: '경제적 어려움',
      special: '특별 감면',
      manual: '관리자 처리',
    };
    return names[this.category];
  }
}
