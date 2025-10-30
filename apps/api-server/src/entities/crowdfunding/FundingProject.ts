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
import type { FundingReward } from './FundingReward.js';
import type { FundingBacking } from './FundingBacking.js';
import type { FundingUpdate } from './FundingUpdate.js';
import type { FundingStatus, FundingCategory } from '../../types/crowdfunding-types.js';

@Entity('funding_projects')
@Index(['status', 'endDate'])
@Index(['creatorId'])
@Index(['category'])
export class FundingProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  shortDescription: string;

  @Column({ type: 'varchar', length: 50 })
  category: FundingCategory;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Creator
  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'varchar', length: 255 })
  creatorName: string;

  @Column({ type: 'text', nullable: true })
  creatorDescription: string;

  // Funding Details
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minimumAmount: number;

  // Timeline
  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date;

  // Statistics
  @Column({ type: 'int', default: 0 })
  backerCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'int', default: 0 })
  updateCount: number;

  // Status
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: FundingStatus;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false })
  isStaffPick: boolean;

  // Media
  @Column({ type: 'varchar', length: 500, nullable: true })
  mainImage: string;

  @Column({ type: 'simple-json', nullable: true })
  images: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string;

  // Content
  @Column({ type: 'text' })
  story: string;

  @Column({ type: 'text', nullable: true })
  risks: string;

  // Settings
  @Column({ type: 'boolean', default: true })
  allowComments: boolean;

  @Column({ type: 'boolean', default: false })
  allowAnonymousBacking: boolean;

  @Column({ type: 'boolean', default: true })
  showBackerList: boolean;

  // Approval
  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  approvedBy: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  // Relations
  @OneToMany('FundingReward', 'project')
  rewards!: FundingReward[];

  @OneToMany('FundingBacking', 'project')
  backings!: FundingBacking[];

  @OneToMany('FundingUpdate', 'project')
  updates!: FundingUpdate[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}