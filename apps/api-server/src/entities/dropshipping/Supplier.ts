import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  OneToMany
} from 'typeorm';
import { User } from '../User';
import { SupplierStatus, SupplierInfo } from '../../types/dropshipping';

@Entity('suppliers')
@Index(['userId'], { unique: true })
@Index(['verificationStatus'])
@Index(['created_at'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  companyName!: string;

  @Column({ type: 'varchar', length: 100 })
  businessNumber!: string;

  @Column({ type: 'text', nullable: true })
  businessLicense?: string; // URL or base64

  @Column({ type: 'text', nullable: true })
  onlineSellingLicense?: string; // URL or base64

  @Column({ type: 'varchar', length: 100 })
  contactPerson!: string;

  @Column({ type: 'varchar', length: 255 })
  contactEmail!: string;

  @Column({ type: 'varchar', length: 50 })
  contactPhone!: string;

  @Column({ type: 'json' })
  address!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Column({ type: 'json', nullable: true })
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  commissionRate!: number; // 기본 수수료율 (%)

  @Column({ 
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PENDING
  })
  verificationStatus!: SupplierStatus;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy?: string; // Admin user ID

  @Column({ type: 'text', nullable: true })
  verificationNotes?: string;

  // Statistics
  @Column({ type: 'integer', default: 0 })
  totalProducts!: number;

  @Column({ type: 'integer', default: 0 })
  activeProducts!: number;

  @Column({ type: 'integer', default: 0 })
  totalOrders!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  settings?: {
    autoProcessOrders?: boolean;
    minOrderAmount?: number;
    shippingPolicy?: string;
    returnPolicy?: string;
    businessHours?: string;
    holidayMode?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isVerified(): boolean {
    return this.verificationStatus === SupplierStatus.VERIFIED;
  }

  canSellProducts(): boolean {
    return this.isVerified() && this.isActive;
  }

  toPublicInfo(): Partial<Supplier> {
    return {
      id: this.id,
      companyName: this.companyName,
      contactPerson: this.contactPerson,
      contactEmail: this.contactEmail,
      verificationStatus: this.verificationStatus,
      totalProducts: this.totalProducts,
      activeProducts: this.activeProducts,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      isActive: this.isActive
    };
  }
}