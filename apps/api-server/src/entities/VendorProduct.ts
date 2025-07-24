import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('vendor_products')
@Index(['supplierId'])
@Index(['approvalStatus'])
@Index(['status'])
export class VendorProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  sku: string;

  @Column()
  categoryId: string;

  // 공급자 정보
  @Column('uuid')
  supplierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'supplierId' })
  supplier: User;

  // 가격 정보
  @Column('decimal', { precision: 10, scale: 2 })
  supplyPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  sellPrice: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  marginRate: number;

  // 수수료 정보
  @Column('decimal', { precision: 5, scale: 2, default: 5 })
  affiliateRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 3 })
  adminFeeRate: number;

  // 승인 정보
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  })
  approvalStatus: string;

  @Column({ default: true })
  approvalRequired: boolean;

  @Column('uuid', { nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column('text', { nullable: true })
  rejectionReason: string;

  // 재고 정보
  @Column({ default: 0 })
  stock: number;

  @Column({ default: 10 })
  lowStockThreshold: number;

  // 상태
  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'soldout'],
    default: 'draft'
  })
  status: string;

  // 이미지
  @Column('json', { nullable: true })
  images: string[];

  // 옵션
  @Column('json', { nullable: true })
  options: any;

  // 태그
  @Column('simple-array', { nullable: true })
  tags: string[];

  // 판매 통계 (가상 필드로 계산)
  @Column({ default: 0 })
  totalSales: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 가상 필드들
  get supplierProfit(): number {
    const sellPrice = Number(this.sellPrice);
    const supplyPrice = Number(this.supplyPrice);
    const affiliateCommission = sellPrice * (Number(this.affiliateRate) / 100);
    const adminCommission = sellPrice * (Number(this.adminFeeRate) / 100);
    
    return sellPrice - supplyPrice - affiliateCommission - adminCommission;
  }

  get isLowStock(): boolean {
    return this.stock > 0 && this.stock <= this.lowStockThreshold;
  }

  get isOutOfStock(): boolean {
    return this.stock === 0;
  }
}