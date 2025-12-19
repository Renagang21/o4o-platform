/**
 * MonthlyClose Entity
 *
 * 월별 마감 상태
 *
 * === 규칙 ===
 * - isClosed = true이면 해당 월 Expense 수정/삭제 ❌
 * - reopenMonth() 기능 없음 (재오픈 불가)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('yaksa_monthly_close')
@Unique(['organizationId', 'yearMonth'])
@Index(['organizationId', 'yearMonth'])
export class MonthlyClose {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (지부/분회)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 마감 대상 월 (YYYY-MM)
   * 예: "2024-12"
   */
  @Column({ type: 'varchar', length: 7 })
  yearMonth!: string;

  /**
   * 마감 여부
   */
  @Column({ type: 'boolean', default: false })
  isClosed!: boolean;

  /**
   * 마감 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;

  /**
   * 마감 처리자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  closedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
