import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FundingBacking } from './FundingBacking';
import { FundingReward } from './FundingReward';

@Entity('backer_rewards')
@Index(['backingId'])
export class BackerReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  backingId: string;

  @ManyToOne(() => FundingBacking, backing => backing.rewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'backingId' })
  backing: FundingBacking;

  @Column({ type: 'uuid' })
  rewardId: string;

  @ManyToOne(() => FundingReward, reward => reward.backerRewards)
  @JoinColumn({ name: 'rewardId' })
  reward: FundingReward;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'simple-json', nullable: true })
  selectedOptions: any;

  @Column({ type: 'simple-json', nullable: true })
  shippingAddress: any;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shippingRegion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice?: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trackingNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}