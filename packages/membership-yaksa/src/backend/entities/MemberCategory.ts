import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * MemberCategory Entity
 *
 * 회원 분류 (정회원, 준회원, 휴업약사 등)
 *
 * @example
 * ```typescript
 * {
 *   name: "정회원",
 *   description: "정규 면허 소지 및 활동 중인 약사",
 *   isActive: true
 * }
 * ```
 */
@Entity('yaksa_member_categories')
@Index(['name'], { unique: true })
export class MemberCategory {
  /**
   * 카테고리 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 카테고리명
   *
   * 예: 정회원, 준회원, 휴업약사, 명예회원
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  /**
   * 카테고리 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 연회비 적용 여부
   */
  @Column({ type: 'boolean', default: true })
  requiresAnnualFee!: boolean;

  /**
   * 연회비 금액 (원)
   */
  @Column({ type: 'integer', nullable: true })
  annualFeeAmount?: number;

  /**
   * 정렬 순서
   */
  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  /**
   * 확장 메타데이터 (JSON)
   *
   * @example
   * ```typescript
   * {
   *   "benefits": ["교육 할인", "보험 혜택"],
   *   "restrictions": []
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
}
