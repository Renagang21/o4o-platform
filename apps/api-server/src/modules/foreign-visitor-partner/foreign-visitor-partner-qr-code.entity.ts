/**
 * ForeignVisitorPartnerQrCode Entity
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * 외국인 관광객 유입 파트너별 제휴마케팅 QR. partner_id 로 ForeignVisitorPartner 에 연결.
 * 목적: 매장/파트너/캠페인 식별 + 후속 스캔 이벤트 기준점. **결제용 QR 아님**(landing/scan/수수료는 후속).
 *   - 소유 단위: organizationId + serviceKey (Boundary Policy: Store Ops = organizationId)
 *   - public URL 에는 shortCode 만 노출(partnerId 미노출). landing 본 구현은 후속 AFFILIATE-LANDING-V1.
 *
 * SSOT: docs/investigations/IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1.md (§6, §10)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Unique,
} from 'typeorm';

/** QR 템플릿 유형. V1 은 AFFILIATE_MARKETING 만. 나머지는 reserved(후속). */
export const FOREIGN_VISITOR_QR_TEMPLATE_TYPES = [
  'AFFILIATE_MARKETING',
  'STORE_GUIDE',
  'GROUP_TOUR',
  'PRODUCT_CATEGORY',
  'EVENT_COUPON',
] as const;
export type ForeignVisitorQrTemplateType = (typeof FOREIGN_VISITOR_QR_TEMPLATE_TYPES)[number];

/** V1 활성 템플릿. */
export const ACTIVE_FOREIGN_VISITOR_QR_TEMPLATE_TYPES: ForeignVisitorQrTemplateType[] = ['AFFILIATE_MARKETING'];

export const FOREIGN_VISITOR_QR_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ForeignVisitorQrStatus = (typeof FOREIGN_VISITOR_QR_STATUSES)[number];

@Entity('foreign_visitor_partner_qr_codes')
@Unique(['shortCode'])
@Index(['organizationId', 'serviceKey'])
@Index(['partnerId'])
@Index(['serviceKey', 'status'])
export class ForeignVisitorPartnerQrCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: string;

  @Column({ type: 'uuid', name: 'partner_id' })
  partnerId!: string;

  @Column({ type: 'varchar', length: 40, name: 'qr_template_type', default: 'AFFILIATE_MARKETING' })
  qrTemplateType!: ForeignVisitorQrTemplateType;

  @Column({ type: 'varchar', length: 200, name: 'qr_code_name' })
  qrCodeName!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'campaign_name' })
  campaignName?: string | null;

  /** public 진입 URL (origin + /foreign-visitor/affiliate/:shortCode). landing 본 구현은 후속. */
  @Column({ type: 'varchar', length: 500, name: 'landing_url' })
  landingUrl!: string;

  /** public 식별 코드(fvq_xxxxxxxx). partnerId 대신 URL 에 노출. */
  @Column({ type: 'varchar', length: 40, name: 'short_code' })
  shortCode!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: ForeignVisitorQrStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_to' })
  validTo?: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
