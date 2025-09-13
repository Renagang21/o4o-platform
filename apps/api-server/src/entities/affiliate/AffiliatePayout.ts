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

@Entity('affiliate_payouts')
@Index(['affiliateUserId', 'status'])
@Index(['transactionId'])
@Index(['created_at'])
export class AffiliatePayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  affiliateUserId: string;

  @ManyToOne(() => AffiliateUser)
  @JoinColumn({ name: 'affiliateUserId' })
  affiliateUser: AffiliateUser;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'simple-array' })
  commissionIds: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'manual' | 'other';

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @Column({ type: 'jsonb', nullable: true })
  bankAccount: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    swiftCode?: string;
    routingNumber?: string;
    iban?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: {
    paypalEmail?: string;
    stripeAccountId?: string;
    wireDetails?: any;
    otherDetails?: any;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  fees: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  netAmount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    invoiceNumber?: string;
    taxInfo?: any;
    customData?: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}