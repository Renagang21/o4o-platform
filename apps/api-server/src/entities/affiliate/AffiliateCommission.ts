import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { AffiliateUser } from './AffiliateUser';
import { AffiliateConversion } from './AffiliateConversion';

@Entity('affiliate_commissions')
@Index(['affiliateUserId', 'status'])
@Index(['conversionId'], { unique: true })
@Index(['orderId'])
@Index(['created_at'])
export class AffiliateCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  affiliateUserId: string;

  @ManyToOne(() => AffiliateUser)
  @JoinColumn({ name: 'affiliateUserId' })
  affiliateUser: AffiliateUser;

  @Column({ type: 'uuid' })
  conversionId: string;

  @ManyToOne(() => AffiliateConversion)
  @JoinColumn({ name: 'conversionId' })
  conversion: AffiliateConversion;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'paid';

  @Column({ type: 'varchar', length: 100, nullable: true })
  orderId: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string;

  @Column({ type: 'uuid', nullable: true })
  payoutId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    orderDetails?: any;
    productInfo?: any;
    customData?: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}