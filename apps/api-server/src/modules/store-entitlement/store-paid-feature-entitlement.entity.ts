/**
 * StorePaidFeatureEntitlement Entity
 * WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
 *
 * 매장(조직)별 유료 기능 이용권. 결제 이전 단계의 "이용권/메뉴 오픈 기준" SSOT.
 * - 소유 단위: organizationId + serviceKey (Boundary Policy: Store Ops = organizationId)
 * - 결제(Toss)와 분리: 이 엔티티 자체는 결제 정보를 담지 않는다. 결제 성공 후처리(후속 WO)가
 *   이 이용권을 ACTIVE 로 생성/연장한다.
 *
 * SSOT: docs/investigations/IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md (§4.1, §5)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * 유료 기능 플랜 코드.
 * - FOREIGN_VISITOR_SALES_SUPPORT: V1 활성 (외국인 여행객 판매지원)
 * - MARKETPLACE_LISTING_SUPPORT / SALES_CHANNEL_GROWTH_BUNDLE: reserved only (V1 미구현)
 */
export const STORE_PAID_FEATURE_PLAN_CODES = [
  'FOREIGN_VISITOR_SALES_SUPPORT',
  'MARKETPLACE_LISTING_SUPPORT',
  'SALES_CHANNEL_GROWTH_BUNDLE',
] as const;
export type StorePaidFeaturePlanCode = (typeof STORE_PAID_FEATURE_PLAN_CODES)[number];

/** V1 에서 실제 활성/판매하는 플랜 (그 외는 reserved). */
export const ACTIVE_STORE_PAID_FEATURE_PLAN_CODES: StorePaidFeaturePlanCode[] = [
  'FOREIGN_VISITOR_SALES_SUPPORT',
];

/** 이용권 상태. V1 은 부분취소/환불 없이 단순 상태만 관리. */
export type StorePaidFeatureEntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELED';

@Entity('store_paid_feature_entitlements')
@Unique(['organizationId', 'serviceKey', 'planCode'])
@Index(['organizationId', 'serviceKey'])
@Index(['serviceKey', 'planCode', 'status'])
export class StorePaidFeatureEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: string; // 'neture' | 'glycopharm' | 'kpa-society' | 'k-cosmetics' | ...

  @Column({ type: 'varchar', length: 100, name: 'plan_code' })
  planCode!: StorePaidFeaturePlanCode;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: StorePaidFeatureEntitlementStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'starts_at' })
  startsAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'ends_at' })
  endsAt?: Date | null;

  /** 이용권 발급 출처(예: 'manual', 'toss-payment:<paymentId>'). 결제 연동은 후속 WO. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
