import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * SettlementStatus
 * 정산 상태
 */
export type SettlementStatus =
  | 'pending'     // 정산 대기
  | 'calculating' // 계산 중
  | 'confirmed'   // 확정됨
  | 'remitted'    // 송금 완료
  | 'completed';  // 완료

/**
 * SettlementDetail
 * 정산 상세 내역
 */
export interface SettlementDetail {
  invoiceCount: number;           // 청구서 수
  paidInvoiceCount: number;       // 납부 완료 청구서 수
  unpaidInvoiceCount: number;     // 미납 청구서 수
  totalInvoiceAmount: number;     // 총 청구 금액
  totalPaidAmount: number;        // 총 납부 금액
  collectionRate: number;         // 수금율 (%)
  paymentMethods: Record<string, {
    count: number;
    amount: number;
  }>;
}

/**
 * FeeSettlement Entity
 *
 * 회비 정산
 * 분회 → 지부 → 본부 단위의 월별/연간 정산 관리
 */
@Entity('yaksa_fee_settlements')
@Index(['organizationId', 'year', 'month'], { unique: true })
@Index(['status'])
@Index(['year'])
@Index(['settledAt'])
export class FeeSettlement {
  /**
   * 정산 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 조직 ID (FK → organizations.id)
   *
   * 정산 주체 (분회, 지부, 또는 본부)
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 조직 유형
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  organizationType!: 'branch' | 'division' | 'national';

  /**
   * 조직 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  organizationName?: string;

  /**
   * 정산 연도
   */
  @Column({ type: 'integer' })
  year!: number;

  /**
   * 정산 월 (1-12, null이면 연간 정산)
   */
  @Column({ type: 'integer', nullable: true })
  month?: number;

  /**
   * 소속 회원 수
   */
  @Column({ type: 'integer', default: 0 })
  memberCount!: number;

  /**
   * 총 수납액 (원)
   */
  @Column({ type: 'integer', default: 0 })
  totalCollected!: number;

  /**
   * 분회 보유액 (원)
   *
   * 분회가 보유하는 금액 (분회비)
   */
  @Column({ type: 'integer', default: 0 })
  branchShare!: number;

  /**
   * 지부 분담액 (원)
   *
   * 지부로 송금해야 하는 금액 (지부비)
   */
  @Column({ type: 'integer', default: 0 })
  divisionShare!: number;

  /**
   * 본부 분담액 (원)
   *
   * 본부로 송금해야 하는 금액 (본회비)
   */
  @Column({ type: 'integer', default: 0 })
  nationalShare!: number;

  /**
   * 상위 조직으로 송금할 금액 (원)
   */
  @Column({ type: 'integer', default: 0 })
  remittanceAmount!: number;

  /**
   * 송금 대상 조직 ID
   */
  @Column({ type: 'uuid', nullable: true })
  remitToOrganizationId?: string;

  /**
   * 정산 상세 내역
   */
  @Column({ type: 'jsonb', nullable: true })
  details?: SettlementDetail;

  /**
   * 정산 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: SettlementStatus;

  /**
   * 정산 확정일시
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  /**
   * 확정자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  confirmedBy?: string;

  /**
   * 확정자 이름
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  confirmedByName?: string;

  /**
   * 송금일시
   */
  @Column({ type: 'timestamp', nullable: true })
  remittedAt?: Date;

  /**
   * 송금 확인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  remittedBy?: string;

  /**
   * 송금 거래번호/참조번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  remittanceReference?: string;

  /**
   * 정산 완료일시
   */
  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date;

  /**
   * 메모 (관리자용)
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * 정산서 URL (PDF)
   */
  @Column({ type: 'text', nullable: true })
  settlementDocUrl?: string;

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
   * 정산 확정 가능 여부
   */
  canConfirm(): boolean {
    return this.status === 'pending' || this.status === 'calculating';
  }

  /**
   * 송금 처리 가능 여부
   */
  canRemit(): boolean {
    return this.status === 'confirmed';
  }

  /**
   * 정산 확정 처리
   */
  confirm(confirmedBy: string, confirmedByName: string): void {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    this.confirmedBy = confirmedBy;
    this.confirmedByName = confirmedByName;
  }

  /**
   * 송금 완료 처리
   */
  markAsRemitted(remittedBy: string, reference?: string): void {
    this.status = 'remitted';
    this.remittedAt = new Date();
    this.remittedBy = remittedBy;
    if (reference) {
      this.remittanceReference = reference;
    }
  }

  /**
   * 정산 완료 처리
   */
  complete(): void {
    this.status = 'completed';
    this.settledAt = new Date();
  }

  /**
   * 수금율 계산
   */
  calculateCollectionRate(): number {
    if (!this.details) return 0;
    if (this.details.totalInvoiceAmount === 0) return 0;
    return Math.round((this.details.totalPaidAmount / this.details.totalInvoiceAmount) * 10000) / 100;
  }

  /**
   * 정산 기간 표시명
   */
  getPeriodDisplayName(): string {
    if (this.month) {
      return `${this.year}년 ${this.month}월`;
    }
    return `${this.year}년 연간`;
  }
}
