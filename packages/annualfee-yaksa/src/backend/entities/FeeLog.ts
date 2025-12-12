import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * FeeLogAction
 * 회비 관련 작업 유형
 */
export type FeeLogAction =
  // 정책 관련
  | 'policy_created'
  | 'policy_updated'
  | 'policy_deleted'
  // 청구 관련
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_cancelled'
  | 'invoice_updated'
  // 납부 관련
  | 'payment_created'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_refunded'
  | 'payment_cancelled'
  // 감면 관련
  | 'exemption_requested'
  | 'exemption_approved'
  | 'exemption_rejected'
  | 'exemption_auto_applied'
  // 정산 관련
  | 'settlement_created'
  | 'settlement_confirmed'
  | 'settlement_remitted'
  | 'settlement_completed'
  // 기타
  | 'fee_calculated'
  | 'sync_to_membership_year'
  | 'batch_invoice_generated'
  | 'reminder_sent'
  | 'manual_adjustment';

/**
 * FeeLogEntityType
 * 관련 엔티티 유형
 */
export type FeeLogEntityType =
  | 'policy'
  | 'invoice'
  | 'payment'
  | 'exemption'
  | 'settlement'
  | 'member';

/**
 * FeeLog Entity
 *
 * 회비 시스템 감사 로그
 * 모든 회비 관련 변경사항 추적
 */
@Entity('yaksa_fee_logs')
@Index(['memberId'])
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['actorId'])
export class FeeLog {
  /**
   * 로그 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   *
   * 관련 회원 (없으면 null)
   */
  @Column({ type: 'uuid', nullable: true })
  memberId?: string;

  /**
   * 회원 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  memberName?: string;

  /**
   * 관련 엔티티 유형
   */
  @Column({ type: 'varchar', length: 30 })
  entityType!: FeeLogEntityType;

  /**
   * 관련 엔티티 ID
   */
  @Column({ type: 'uuid' })
  entityId!: string;

  /**
   * 작업 유형
   */
  @Column({ type: 'varchar', length: 50 })
  action!: FeeLogAction;

  /**
   * 연도 (관련 회비 연도)
   */
  @Column({ type: 'integer', nullable: true })
  year?: number;

  /**
   * 변경 전 상태
   */
  @Column({ type: 'jsonb', nullable: true })
  previousState?: Record<string, any>;

  /**
   * 변경 후 상태
   */
  @Column({ type: 'jsonb', nullable: true })
  newState?: Record<string, any>;

  /**
   * 변경된 필드 목록
   */
  @Column({ type: 'simple-array', nullable: true })
  changedFields?: string[];

  /**
   * 작업 데이터 (상세 정보)
   */
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  /**
   * 작업자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  /**
   * 작업자 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  actorName?: string;

  /**
   * 작업자 유형
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'user',
  })
  actorType!: 'user' | 'admin' | 'system' | 'batch';

  /**
   * 작업 설명 (사람이 읽을 수 있는 형태)
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * IP 주소
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  /**
   * User Agent
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * 요청 ID (API 요청 추적용)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId?: string;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  // Helper Methods

  /**
   * 작업 유형 표시명
   */
  getActionDisplayName(): string {
    const names: Record<FeeLogAction, string> = {
      // 정책
      policy_created: '정책 생성',
      policy_updated: '정책 수정',
      policy_deleted: '정책 삭제',
      // 청구
      invoice_created: '청구서 생성',
      invoice_sent: '청구서 발송',
      invoice_cancelled: '청구서 취소',
      invoice_updated: '청구서 수정',
      // 납부
      payment_created: '납부 등록',
      payment_completed: '납부 완료',
      payment_failed: '납부 실패',
      payment_refunded: '납부 환불',
      payment_cancelled: '납부 취소',
      // 감면
      exemption_requested: '감면 신청',
      exemption_approved: '감면 승인',
      exemption_rejected: '감면 반려',
      exemption_auto_applied: '감면 자동 적용',
      // 정산
      settlement_created: '정산 생성',
      settlement_confirmed: '정산 확정',
      settlement_remitted: '송금 완료',
      settlement_completed: '정산 완료',
      // 기타
      fee_calculated: '회비 계산',
      sync_to_membership_year: 'MembershipYear 동기화',
      batch_invoice_generated: '일괄 청구서 생성',
      reminder_sent: '독촉 알림 발송',
      manual_adjustment: '수동 조정',
    };
    return names[this.action] || this.action;
  }

  /**
   * 엔티티 유형 표시명
   */
  getEntityTypeDisplayName(): string {
    const names: Record<FeeLogEntityType, string> = {
      policy: '정책',
      invoice: '청구서',
      payment: '납부',
      exemption: '감면',
      settlement: '정산',
      member: '회원',
    };
    return names[this.entityType];
  }

  /**
   * 로그 요약 생성
   */
  getSummary(): string {
    const action = this.getActionDisplayName();
    const entity = this.getEntityTypeDisplayName();

    if (this.memberName) {
      return `${this.memberName} - ${entity} ${action}`;
    }
    return `${entity} ${action}`;
  }
}
