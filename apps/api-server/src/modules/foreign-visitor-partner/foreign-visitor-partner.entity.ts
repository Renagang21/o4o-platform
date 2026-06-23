/**
 * ForeignVisitorPartner Entity
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1
 *
 * 외국인 관광객 "유입 파트너" 마스터 — 매장(조직)별 여행사/가이드/호텔/인솔자/코디네이터 관리.
 * 목적: 파트너 QR 발급(후속) 전에 "이 매장에 어떤 유입 파트너가 있는가"를 관리.
 *
 * ⚠️ 도메인 경계: Neture 의 공급자/판매자 B2B 제휴(NetureSellerPartnerContract, partner-recruitment,
 *   partner-commission, seller recruitment)와 **완전히 별개**다. 테이블/네임스페이스를 공유하지 않는다.
 *   - 소유 단위: organizationId + serviceKey (Boundary Policy: Store Ops = organizationId)
 *   - 결제/커미션 정산과 무관(O4O 결제 없음). 수수료는 POS/매장/수기 기준 별도(후속).
 *
 * SSOT: docs/investigations/IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1.md (§10, §14)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/** 유입 파트너 유형. (B2B 공급/판매 파트너와 무관) */
export const FOREIGN_VISITOR_PARTNER_TYPES = [
  'TRAVEL_AGENCY',
  'GUIDE',
  'HOTEL',
  'BUS_OPERATOR',
  'MEDICAL_TOUR_COORDINATOR',
  'OTHER',
] as const;
export type ForeignVisitorPartnerType = (typeof FOREIGN_VISITOR_PARTNER_TYPES)[number];

/** 파트너 상태. V1 은 승인 workflow 없이 ACTIVE/INACTIVE 만. (PENDING/APPROVED/REJECTED 제외) */
export const FOREIGN_VISITOR_PARTNER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ForeignVisitorPartnerStatus = (typeof FOREIGN_VISITOR_PARTNER_STATUSES)[number];

@Entity('foreign_visitor_partners')
@Index(['organizationId', 'serviceKey'])
@Index(['serviceKey', 'status'])
@Index(['partnerType'])
export class ForeignVisitorPartner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** store_owner role-prefix 축 ('kpa' | 'glycopharm' | 'cosmetics'). /me/check 와 동일 키. */
  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: string;

  /** Store Ops Boundary — 소유 매장(조직). */
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 40, name: 'partner_type' })
  partnerType!: ForeignVisitorPartnerType;

  @Column({ type: 'varchar', length: 200, name: 'partner_name' })
  partnerName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_name' })
  contactName?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'contact_phone' })
  contactPhone?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'contact_email' })
  contactEmail?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: ForeignVisitorPartnerStatus;

  @Column({ type: 'text', nullable: true })
  memo?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /** soft delete — V1 은 hard delete 미제공(상태 INACTIVE 권장). 행 삭제 시에만 사용. */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
