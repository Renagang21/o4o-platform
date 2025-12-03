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
import { User } from './User.js';

/**
 * 공급자 프로필 (Supplier Profile)
 *
 * 공급자 역할에 특화된 정보를 저장합니다.
 *
 * 연결 조건:
 * - 사용자가 supplier 역할로 승인되면 자동 생성
 * - User와 1:1 관계 (OneToOne)
 *
 * @see 01_schema_baseline.md
 */
@Entity('supplier_profiles')
@Index(['userId'], { unique: true })
export class SupplierProfile {
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

  // === 기업 정보 ===

  /**
   * 회사명
   */
  @Column({ type: 'varchar', length: 200 })
  companyName!: string;

  /**
   * 사업자등록번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId?: string;

  /**
   * 사업자등록증 정보 (JSON)
   *
   * { registrationNumber, issueDate, ceoName, address, businessType, ... }
   */
  @Column({ type: 'jsonb', nullable: true })
  businessRegistration?: Record<string, any>;

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

  /**
   * 사업장 주소
   */
  @Column({ type: 'text', nullable: true })
  businessAddress?: string;

  // === 은행 정보 (정산용) ===

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

  // === 출고지 정보 ===

  /**
   * 출고지명
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  warehouseName?: string;

  /**
   * 출고지 주소
   */
  @Column({ type: 'text', nullable: true })
  warehouseAddress?: string;

  /**
   * 출고지 연락처
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  warehousePhone?: string;

  // === 정책/설정 ===

  /**
   * 기본 배송비
   */
  @Column({ type: 'integer', nullable: true, default: 0 })
  defaultShippingFee?: number;

  /**
   * 무료 배송 기준 금액
   */
  @Column({ type: 'integer', nullable: true })
  freeShippingThreshold?: number;

  /**
   * 반품/교환 주소
   */
  @Column({ type: 'text', nullable: true })
  returnAddress?: string;

  /**
   * 반품/교환 정책 (텍스트)
   */
  @Column({ type: 'text', nullable: true })
  returnPolicy?: string;

  // === 메타데이터 ===

  /**
   * 추가 메타데이터 (JSON)
   *
   * 향후 확장용 필드
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
   *
   * 필수 필드가 채워진 비율을 계산합니다.
   */
  getCompletionRate(): number {
    const requiredFields = [
      this.companyName,
      this.taxId,
      this.businessEmail,
      this.businessPhone,
      this.businessAddress,
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
   * 출고지 정보 완성 여부
   */
  hasCompleteWarehouseInfo(): boolean {
    return !!(this.warehouseName && this.warehouseAddress && this.warehousePhone);
  }
}
