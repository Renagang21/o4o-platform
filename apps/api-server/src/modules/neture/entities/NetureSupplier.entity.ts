import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { SupplierProductOffer } from './SupplierProductOffer.entity.js';

export enum SupplierStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REJECTED = 'REJECTED',
}

export enum ContactVisibility {
  PUBLIC = 'public',
  PARTNERS = 'partners',
  PRIVATE = 'private',
}

@Entity('neture_suppliers')
export class NetureSupplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'pricing_policy', type: 'text', nullable: true })
  pricingPolicy: string;

  @Column({ nullable: true })
  moq: string;

  @Column({ name: 'shipping_standard', type: 'text', nullable: true })
  shippingStandard: string | null;

  @Column({ name: 'shipping_island', type: 'text', nullable: true })
  shippingIsland: string | null;

  @Column({ name: 'shipping_mountain', type: 'text', nullable: true })
  shippingMountain: string | null;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_website', type: 'text', nullable: true })
  contactWebsite: string;

  @Column({ name: 'contact_kakao', type: 'text', nullable: true })
  contactKakao: string;

  @Column({ name: 'contact_email_visibility', type: 'varchar', length: 10, default: ContactVisibility.PUBLIC })
  contactEmailVisibility: ContactVisibility;

  @Column({ name: 'contact_phone_visibility', type: 'varchar', length: 10, default: ContactVisibility.PRIVATE })
  contactPhoneVisibility: ContactVisibility;

  @Column({ name: 'contact_website_visibility', type: 'varchar', length: 10, default: ContactVisibility.PUBLIC })
  contactWebsiteVisibility: ContactVisibility;

  @Column({ name: 'contact_kakao_visibility', type: 'varchar', length: 10, default: ContactVisibility.PARTNERS })
  contactKakaoVisibility: ContactVisibility;

  // === Business Profile Fields (WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1) ===

  // business_number and business_address were intentionally dropped from neture_suppliers
  // by WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 (migration 20260327000300).
  // These values now live in the organizations table — read via getOrgDataBatch().
  businessNumber: string | null;
  businessAddress: string | null;

  @Column({ name: 'representative_name', type: 'varchar', length: 100, nullable: true })
  representativeName: string | null;

  @Column({ name: 'manager_name', type: 'varchar', length: 100, nullable: true })
  managerName: string | null;

  @Column({ name: 'manager_phone', type: 'varchar', length: 50, nullable: true })
  managerPhone: string | null;

  @Column({ name: 'business_type', type: 'varchar', length: 100, nullable: true })
  businessType: string | null;

  @Column({ name: 'tax_invoice_email', type: 'varchar', length: 255, nullable: true })
  taxInvoiceEmail: string | null;

  @Column({ name: 'business_registration_document_id', type: 'uuid', nullable: true })
  businessRegistrationDocumentId: string | null;

  @Column({ name: 'settlement_bank_name', type: 'varchar', length: 100, nullable: true })
  settlementBankName: string | null;

  @Column({ name: 'settlement_account_number', type: 'varchar', length: 100, nullable: true })
  settlementAccountNumber: string | null;

  @Column({ name: 'settlement_account_holder', type: 'varchar', length: 100, nullable: true })
  settlementAccountHolder: string | null;

  @Column({ name: 'settlement_bankbook_document_id', type: 'uuid', nullable: true })
  settlementBankbookDocumentId: string | null;

  @Column({ name: 'settlement_contact_name', type: 'varchar', length: 100, nullable: true })
  settlementContactName: string | null;

  @Column({ name: 'settlement_contact_email', type: 'varchar', length: 255, nullable: true })
  settlementContactEmail: string | null;

  @Column({ name: 'business_item', type: 'varchar', length: 100, nullable: true })
  businessItem: string | null;

  // === B2B Order Condition (WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1) ===

  @Column({ name: 'min_order_amount', type: 'integer', nullable: true })
  minOrderAmount: number | null;

  @Column({ name: 'min_order_surcharge', type: 'integer', nullable: true })
  minOrderSurcharge: number | null;

  @Column({ name: 'order_condition_note', type: 'text', nullable: true })
  orderConditionNote: string | null;

  // === 배송 정책 Foundation (WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1) ===
  // 저장/조회 foundation 만 — V1 에서 checkout 배송비 계산에 사용하지 않는다.

  /** 기본 배송비 */
  @Column({ name: 'base_shipping_fee', type: 'integer', nullable: true })
  baseShippingFee: number | null;

  /** 무료배송 기준 금액 (공급자별) */
  @Column({ name: 'free_shipping_threshold', type: 'integer', nullable: true })
  freeShippingThreshold: number | null;

  /** 평균 출고 소요일 */
  @Column({ name: 'average_dispatch_days', type: 'integer', nullable: true })
  averageDispatchDays: number | null;

  /** 반품/교환 안내 */
  @Column({ name: 'return_exchange_notice', type: 'text', nullable: true })
  returnExchangeNotice: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PENDING,
  })
  status: SupplierStatus;

  /**
   * User ID linking this supplier to a user account
   * Used for authentication - when user logs in, find their supplier by user_id
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  /** WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1: 승인/거절 메타데이터 */
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string | null;

  /** WO-O4O-NETURE-ORG-DATA-MODEL-V1: Bridge to organizations table */
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @OneToMany('SupplierProductOffer', 'supplier')
  offers: SupplierProductOffer[];
}
