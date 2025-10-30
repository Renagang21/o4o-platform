import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { User } from '../User.js';
import type { FundingProject } from './FundingProject.js';
import type { BackerReward } from './BackerReward.js';
import type { PaymentMethod, PaymentStatus, BackingStatus } from '../../types/crowdfunding-types.js';

@Entity('funding_backings')
@Index(['projectId', 'backerId'])
@Index(['status'])
export class FundingBacking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identifiers
  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne('FundingProject', 'backings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: FundingProject;

  @Column({ type: 'uuid' })
  backerId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'backerId' })
  backer: User;

  // Amount
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency: string;

  // Payment
  @Column({ type: 'varchar', length: 20 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentId: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  // Status
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: BackingStatus;

  // Anonymous
  @Column({ type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string;

  // Message
  @Column({ type: 'text', nullable: true })
  backerMessage: string;

  @Column({ type: 'boolean', default: false })
  isMessagePublic: boolean;

  // Cancellation
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  // Relations
  @OneToMany('BackerReward', 'backing')
  rewards!: BackerReward[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}