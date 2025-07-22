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
import { FundingProject } from './FundingProject';
import { BackerReward } from './BackerReward';

@Entity('funding_rewards')
@Index(['projectId', 'sortOrder'])
export class FundingReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => FundingProject, project => project.rewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: FundingProject;

  // Basic Info
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  earlyBirdPrice: number;

  @Column({ type: 'int', nullable: true })
  earlyBirdLimit: number;

  // Inventory
  @Column({ type: 'int', nullable: true })
  totalQuantity: number;

  @Column({ type: 'int', nullable: true })
  remainingQuantity: number;

  // Delivery
  @Column({ type: 'timestamp' })
  estimatedDeliveryDate: Date;

  @Column({ type: 'boolean', default: false })
  shippingRequired: boolean;

  @Column({ type: 'simple-json', nullable: true })
  shippingRegions: any[];

  // Media
  @Column({ type: 'simple-json', nullable: true })
  images: string[];

  // Options
  @Column({ type: 'simple-json', nullable: true })
  includesItems: any[];

  @Column({ type: 'simple-json', nullable: true })
  options: any[];

  // Status
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  // Limits
  @Column({ type: 'int', default: 1 })
  maxPerBacker: number;

  @Column({ type: 'int', nullable: true })
  minimumBackers: number;

  // Order
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Relations
  @OneToMany(() => BackerReward, backerReward => backerReward.reward)
  backerRewards: BackerReward[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}