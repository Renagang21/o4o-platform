import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Groupbuy Entity
 *
 * Represents organization-based groupbuy campaigns.
 * Organizations can run collective purchasing campaigns for their members.
 *
 * Example:
 * - 서울지부 공동구매: 약사회 회원 대상 의약품 할인
 * - 강남분회 공동구매: 강남 지역 약사 대상 특가 상품
 */

export enum GroupbuyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('groupbuys')
@Index(['organizationId', 'status'])
@Index(['startDate', 'endDate'])
@Index(['status', 'createdAt'])
export class Groupbuy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Organization relationship (required)
  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne('Organization')
  @JoinColumn({ name: 'organizationId' })
  organization?: any; // Type will be resolved at runtime

  // Product relationship
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne('Product')
  @JoinColumn({ name: 'productId' })
  product?: any;

  // Campaign Information
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: GroupbuyStatus, default: GroupbuyStatus.DRAFT })
  status!: GroupbuyStatus;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  groupPrice!: number; // 공동구매 가격

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  regularPrice?: number; // 정상가 (비교용)

  // Quantity Goals
  @Column({ type: 'integer' })
  minQuantity!: number; // 최소 달성 수량

  @Column({ type: 'integer', nullable: true })
  maxQuantity?: number; // 최대 수량 (선택적)

  @Column({ type: 'integer', default: 0 })
  currentQuantity!: number; // 현재 참여 수량

  @Column({ type: 'integer', default: 0 })
  participantCount!: number; // 참여 인원

  // Time Period
  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deadline?: Date; // 주문 마감 시간 (endDate보다 이를 수 있음)

  // Creator
  @Column({ type: 'uuid' })
  createdBy!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'createdBy' })
  creator?: any;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  terms?: string; // 공동구매 약관

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Check if groupbuy is currently active
   */
  isActive(): boolean {
    if (this.status !== GroupbuyStatus.ACTIVE) return false;
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * Check if minimum quantity goal is met
   */
  isGoalMet(): boolean {
    return this.currentQuantity >= this.minQuantity;
  }

  /**
   * Check if groupbuy is full (max quantity reached)
   */
  isFull(): boolean {
    if (!this.maxQuantity) return false;
    return this.currentQuantity >= this.maxQuantity;
  }

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage(): number {
    if (!this.regularPrice || this.regularPrice <= this.groupPrice) {
      return 0;
    }
    return Math.round(
      ((this.regularPrice - this.groupPrice) / this.regularPrice) * 100
    );
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(): number {
    return Math.round((this.currentQuantity / this.minQuantity) * 100);
  }

  /**
   * Check if user can join (not full and not ended)
   */
  canJoin(): boolean {
    return this.isActive() && !this.isFull();
  }

  /**
   * Increment participant count and quantity
   */
  addParticipant(quantity: number = 1): void {
    this.participantCount++;
    this.currentQuantity += quantity;
  }

  /**
   * Decrement participant count and quantity
   */
  removeParticipant(quantity: number = 1): void {
    this.participantCount = Math.max(0, this.participantCount - 1);
    this.currentQuantity = Math.max(0, this.currentQuantity - quantity);
  }

  /**
   * Mark groupbuy as completed
   */
  complete(): void {
    if (!this.isGoalMet()) {
      throw new Error('Cannot complete groupbuy: minimum quantity not met');
    }
    this.status = GroupbuyStatus.COMPLETED;
  }

  /**
   * Cancel groupbuy
   */
  cancel(): void {
    this.status = GroupbuyStatus.CANCELLED;
  }
}
