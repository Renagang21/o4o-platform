import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { AffiliateUser } from './AffiliateUser';

@Entity('affiliate_notifications')
@Index(['affiliateUserId', 'read'])
@Index(['created_at'])
@Index(['type'])
export class AffiliateNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  affiliateUserId: string;

  @ManyToOne(() => AffiliateUser)
  @JoinColumn({ name: 'affiliateUserId' })
  affiliateUser: AffiliateUser;

  @Column({ type: 'varchar', length: 50 })
  type: 'click' | 'conversion' | 'commission_approved' | 'commission_rejected' | 
        'payout_processed' | 'payout_failed' | 'milestone' | 'alert' | 'info';

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: {
    amount?: number;
    orderId?: string;
    commissionId?: string;
    payoutId?: string;
    clickCount?: number;
    conversionCount?: number;
    metadata?: any;
  };

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'low' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actionText: string;

  @CreateDateColumn()
  createdAt: Date;
}