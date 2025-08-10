import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrderItem } from './OrderItem';
import { VendorProduct } from './VendorProduct';

@Entity('vendor_order_items')
export class VendorOrderItem extends OrderItem {
  // 공급자 정보
  @Column('uuid')
  supplierId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  supplyPrice: number;

  // 수익 분배 정보
  @Column('decimal', { precision: 10, scale: 2 })
  supplierProfit: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  affiliateCommission: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  adminCommission: number;

  // 판매자 정보 (옵션)
  @Column('uuid', { nullable: true })
  vendorId: string;

  // 관계 설정
  @ManyToOne(() => VendorProduct)
  @JoinColumn({ name: 'productId' })
  vendorProduct: VendorProduct;

  // Compatibility fields
  get cost(): number {
    return this.supplyPrice;
  }

  get vendorProfit(): number {
    return this.supplierProfit;
  }

  get platformCommission(): number {
    return this.adminCommission || 0;
  }

  get vendor(): string {
    return this.vendorId;
  }
}