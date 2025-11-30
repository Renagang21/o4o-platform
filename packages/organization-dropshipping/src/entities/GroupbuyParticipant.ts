import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Groupbuy } from './Groupbuy.js';

/**
 * GroupbuyParticipant Entity
 *
 * Represents a user's participation in a groupbuy campaign.
 */

export enum ParticipantStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('groupbuy_participants')
@Unique(['groupbuyId', 'userId'])
@Index(['groupbuyId', 'status'])
@Index(['userId', 'status'])
export class GroupbuyParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Groupbuy relationship
  @Column({ type: 'uuid' })
  groupbuyId!: string;

  @ManyToOne(() => Groupbuy)
  @JoinColumn({ name: 'groupbuyId' })
  groupbuy!: Groupbuy;

  // User relationship
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user?: any;

  // Participation Details
  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number; // 참여 시점의 가격

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number; // quantity * unitPrice

  @Column({ type: 'enum', enum: ParticipantStatus, default: ParticipantStatus.PENDING })
  status!: ParticipantStatus;

  // Payment Information
  @Column({ type: 'uuid', nullable: true })
  orderId?: string; // Link to Order if payment is made

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Timestamps
  @CreateDateColumn()
  joinedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Calculate total amount
   */
  calculateTotalAmount(): number {
    return this.quantity * this.unitPrice;
  }

  /**
   * Mark as confirmed
   */
  confirm(): void {
    this.status = ParticipantStatus.CONFIRMED;
  }

  /**
   * Cancel participation
   */
  cancel(): void {
    this.status = ParticipantStatus.CANCELLED;
  }

  /**
   * Mark as completed (payment successful)
   */
  complete(orderId: string): void {
    this.status = ParticipantStatus.COMPLETED;
    this.orderId = orderId;
    this.paidAt = new Date();
  }

  /**
   * Check if can be cancelled
   */
  canCancel(): boolean {
    return this.status === ParticipantStatus.PENDING ||
           this.status === ParticipantStatus.CONFIRMED;
  }
}
