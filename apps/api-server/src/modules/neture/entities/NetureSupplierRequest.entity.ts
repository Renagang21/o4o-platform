/**
 * NetureSupplierRequest Entity
 *
 * Work Order: WO-NETURE-SUPPLIER-REQUEST-API-V1
 *
 * 판매자가 공급자에게 보내는 신청 (Seller → Supplier)
 * 공급자가 승인/거절 결정
 *
 * 상태 전이:
 * - pending → approved
 * - pending → rejected
 * - 그 외 전이 ❌
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupplierRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('neture_supplier_requests')
export class NetureSupplierRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 공급자 정보 (신청 수신자)
  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'supplier_name', nullable: true })
  supplierName: string;

  // 판매자 정보 (신청 발신자)
  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_name' })
  sellerName: string;

  @Column({ name: 'seller_email', nullable: true })
  sellerEmail: string;

  @Column({ name: 'seller_phone', nullable: true })
  sellerPhone: string;

  @Column({ name: 'seller_store_url', type: 'text', nullable: true })
  sellerStoreUrl: string;

  // 서비스 정보 (GlycoPharm, K-Cosmetics 등)
  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'service_name' })
  serviceName: string;

  // 제품 정보
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'product_category', nullable: true })
  productCategory: string;

  @Column({ name: 'product_purpose', nullable: true })
  productPurpose: string; // CATALOG, APPLICATION, ACTIVE_SALES

  // 신청 상태
  @Column({
    type: 'enum',
    enum: SupplierRequestStatus,
    default: SupplierRequestStatus.PENDING,
  })
  status: SupplierRequestStatus;

  // 결정 정보
  @Column({ name: 'decided_by', nullable: true })
  decidedBy: string; // supplierId who made the decision

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt: Date;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string;

  // 메타데이터
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
