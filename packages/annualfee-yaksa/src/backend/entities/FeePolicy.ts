import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * PharmacistTypeRule
 * 약사 유형별 회비 규칙
 */
export interface PharmacistTypeRule {
  type: string;           // working, owner, hospital, public, industry, retired, other
  adjustmentType: 'fixed' | 'percentage';
  adjustmentValue: number; // 금액 또는 비율
  description?: string;
}

/**
 * OfficialRoleRule
 * 직책별 회비 규칙
 */
export interface OfficialRoleRule {
  role: string;           // president, vice_president, etc.
  adjustmentType: 'fixed' | 'percentage' | 'exempt';
  adjustmentValue: number;
  description?: string;
}

/**
 * ExemptionRule
 * 감면 규칙
 */
export interface ExemptionRule {
  category: string;       // senior, honorary, inactive, newMember, earlyPayment
  condition: {
    ageThreshold?: number;      // 고령 감면 기준 나이
    categoryMatch?: string[];   // 회원 카테고리 매칭
    joinDateWithin?: number;    // 입회 N개월 이내
    paymentBefore?: string;     // MM-DD 형식 (조기납부)
  };
  adjustmentType: 'fixed' | 'percentage' | 'full_exempt';
  adjustmentValue: number;
  description?: string;
}

/**
 * OrganizationRule
 * 조직별 추가 회비 규칙
 */
export interface OrganizationRule {
  organizationId?: string;      // 특정 조직 (null이면 조직 유형 기준)
  organizationType?: 'national' | 'division' | 'branch';
  componentType: 'base' | 'division_fee' | 'branch_fee';
  amount: number;
  description?: string;
}

/**
 * FeePolicy Entity
 *
 * 연회비 정책 정의
 * 연도별로 회비 계산 규칙을 관리
 */
@Entity('yaksa_fee_policies')
@Index(['year'], { unique: true })
@Index(['isActive'])
export class FeePolicy {
  /**
   * 정책 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 정책명
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * 적용 연도
   */
  @Column({ type: 'integer', unique: true })
  year!: number;

  /**
   * 기본 회비 금액 (원)
   *
   * 본회비 기본 금액
   */
  @Column({ type: 'integer' })
  baseAmount!: number;

  /**
   * 지부비 기본 금액 (원)
   */
  @Column({ type: 'integer', default: 0 })
  divisionFeeAmount!: number;

  /**
   * 분회비 기본 금액 (원)
   */
  @Column({ type: 'integer', default: 0 })
  branchFeeAmount!: number;

  /**
   * 약사 유형별 규칙
   */
  @Column({ type: 'jsonb', nullable: true })
  pharmacistTypeRules?: PharmacistTypeRule[];

  /**
   * 직책별 규칙
   */
  @Column({ type: 'jsonb', nullable: true })
  officialRoleRules?: OfficialRoleRule[];

  /**
   * 감면 규칙
   */
  @Column({ type: 'jsonb', nullable: true })
  exemptionRules?: ExemptionRule[];

  /**
   * 조직별 추가 규칙
   */
  @Column({ type: 'jsonb', nullable: true })
  organizationRules?: OrganizationRule[];

  /**
   * 납부 기한 (매년 이 날짜까지)
   *
   * MM-DD 형식 (예: "03-31")
   */
  @Column({ type: 'varchar', length: 10, default: '03-31' })
  dueDate!: string;

  /**
   * 조기 납부 기한
   *
   * MM-DD 형식 (예: "01-31")
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  earlyPaymentDate?: string;

  /**
   * 정책 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

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
   * 총 기본 회비 계산
   */
  getTotalBaseAmount(): number {
    return this.baseAmount + this.divisionFeeAmount + this.branchFeeAmount;
  }

  /**
   * 납부 기한 Date 객체 반환
   */
  getDueDateForYear(): Date {
    const [month, day] = this.dueDate.split('-').map(Number);
    return new Date(this.year, month - 1, day);
  }

  /**
   * 조기 납부 기한 Date 객체 반환
   */
  getEarlyPaymentDateForYear(): Date | null {
    if (!this.earlyPaymentDate) return null;
    const [month, day] = this.earlyPaymentDate.split('-').map(Number);
    return new Date(this.year, month - 1, day);
  }
}
