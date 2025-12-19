/**
 * ExpenseRecord Entity
 *
 * 지출 단일 기록 (단식)
 *
 * === Scope Fixation ===
 * - 차변/대변 ❌
 * - 거래처 코드 ❌
 * - 계정과목 트리 ❌
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 지출 카테고리 (1 Depth 고정)
 *
 * === 확장 금지 ===
 * 이 카테고리는 "사무실 운영비"만 포함한다.
 * 수입/회비/예산 카테고리를 추가하면 안 된다.
 */
export enum ExpenseCategory {
  /** 접대비/회의비 */
  ENTERTAINMENT = 'ENTERTAINMENT',
  /** 일반관리비 */
  GENERAL_ADMIN = 'GENERAL_ADMIN',
  /** 소모품/잡비 */
  SUPPLIES = 'SUPPLIES',
  /** 임원 업무비 */
  OFFICER_EXPENSE = 'OFFICER_EXPENSE',
  /** 기타 */
  MISC = 'MISC',
}

/**
 * 결제 방법
 */
export enum PaymentMethod {
  /** 카드 */
  CARD = 'CARD',
  /** 계좌이체 */
  TRANSFER = 'TRANSFER',
  /** 현금 */
  CASH = 'CASH',
}

@Entity('yaksa_expense_record')
@Index(['organizationId', 'expenseDate'])
@Index(['organizationId', 'category'])
export class ExpenseRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (지부/분회)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 지출 일자
   */
  @Column({ type: 'date' })
  expenseDate!: Date;

  /**
   * 지출 금액 (원 단위)
   */
  @Column({ type: 'int' })
  amount!: number;

  /**
   * 카테고리 (1 Depth)
   */
  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.MISC,
  })
  category!: ExpenseCategory;

  /**
   * 설명 (한 줄)
   */
  @Column({ type: 'varchar', length: 500 })
  description!: string;

  /**
   * 결제 방법
   */
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  paymentMethod!: PaymentMethod;

  /**
   * 관련인 (선택)
   * 예: "김약사", "지부 임원 회의 참석자"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  relatedPerson?: string;

  /**
   * 증빙 이미지 URL (선택)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptImageUrl?: string;

  /**
   * 생성자 ID
   */
  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
