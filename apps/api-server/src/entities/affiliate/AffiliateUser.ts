import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany
} from 'typeorm';
import { User } from '../User';
import { AffiliateClick } from './AffiliateClick';
import { AffiliateConversion } from './AffiliateConversion';

@Entity('affiliate_users')
@Index(['referralCode'], { unique: true })
@Index(['userId'])
@Index(['status'])
export class AffiliateUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  referralCode: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'suspended';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  commissionRate: number;

  @Column({ type: 'int', default: 0 })
  totalClicks: number;

  @Column({ type: 'int', default: 0 })
  totalConversions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pendingEarnings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidEarnings: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    paymentMethod?: string;
    paymentDetails?: any;
    customSettings?: any;
    notes?: string;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  lastClickAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastConversionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => AffiliateClick, click => click.affiliateUser)
  clicks: AffiliateClick[];

  @OneToMany(() => AffiliateConversion, conversion => conversion.affiliateUser)
  conversions: AffiliateConversion[];
}