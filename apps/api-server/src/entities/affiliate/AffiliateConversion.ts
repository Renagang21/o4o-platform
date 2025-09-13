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
import { User } from '../User';
import { Order } from '../Order';

@Entity('affiliate_conversions')
@Index(['affiliateUserId', 'created_at'])
@Index(['status'])
@Index(['orderId'])
export class AffiliateConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  affiliateUserId: string;

  @ManyToOne(() => AffiliateUser, affiliateUser => affiliateUser.conversions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliateUserId' })
  affiliateUser: AffiliateUser;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', length: 100 })
  sessionId: string;

  @Column({ type: 'varchar', length: 50, default: 'sale' })
  conversionType: 'sale' | 'signup' | 'subscription' | 'custom';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'paid';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    productIds?: string[];
    couponCode?: string;
    paymentMethod?: string;
    source?: string;
    customData?: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReferenceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}