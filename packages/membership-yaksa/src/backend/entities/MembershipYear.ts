import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Member } from './Member.js';

/**
 * MembershipYear Entity
 *
 * 연회비 납부 이력 관리
 * 각 회원의 연도별 회비 납부 상태를 추적
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-kim",
 *   year: 2025,
 *   paid: true,
 *   paidAt: "2025-01-15T10:30:00Z",
 *   amount: 50000,
 *   paymentMethod: "card"
 * }
 * ```
 */
@Entity('yaksa_membership_years')
@Index(['memberId'])
@Index(['year'])
@Index(['paid'])
@Index(['memberId', 'year'], { unique: true })
export class MembershipYear {
  /**
   * 납부 이력 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 회원 관계
   */
  @ManyToOne('Member', (member: Member) => member.membershipYears, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  /**
   * 연도 (YYYY)
   */
  @Column({ type: 'integer' })
  year!: number;

  /**
   * 납부 완료 여부
   */
  @Column({ type: 'boolean', default: false })
  paid!: boolean;

  /**
   * 납부일시
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 납부 금액 (원)
   */
  @Column({ type: 'integer', nullable: true })
  amount?: number;

  /**
   * 결제 수단
   *
   * 예: card, bank_transfer, cash
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  /**
   * 결제 트랜잭션 ID
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string;

  /**
   * 영수증 URL
   */
  @Column({ type: 'text', nullable: true })
  receiptUrl?: string;

  /**
   * 확장 메타데이터 (JSON)
   *
   * @example
   * ```typescript
   * {
   *   "discountApplied": true,
   *   "discountReason": "조기납부 할인",
   *   "originalAmount": 60000,
   *   "discountAmount": 10000
   * }
   * ```
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
   * 납부 기한이 지났는지 확인
   */
  isOverdue(): boolean {
    if (this.paid) return false;

    const now = new Date();
    const deadline = new Date(this.year, 2, 31); // 매년 3월 31일까지

    return now > deadline;
  }

  /**
   * 납부 처리
   */
  markAsPaid(amount: number, paymentMethod: string, transactionId?: string): void {
    this.paid = true;
    this.paidAt = new Date();
    this.amount = amount;
    this.paymentMethod = paymentMethod;
    if (transactionId) {
      this.transactionId = transactionId;
    }
  }
}
