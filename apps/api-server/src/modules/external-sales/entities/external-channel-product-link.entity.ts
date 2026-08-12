/**
 * ExternalChannelProductLink Entity
 * WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1
 *
 * 외부 판매 채널(네이버 스마트스토어 · 쿠팡) 연동 **상태**만 저장한다.
 * 상품명·가격·이미지·상세는 저장하지 않는다 — 읽을 때 O4O 원장에서 가져온다.
 * 별도 판매상품 원장을 만들지 않는다는 것이 이 설계의 핵심 제약이다.
 *
 * migration: 20270306000000-CreateExternalChannelProductLinks
 *
 * 관계는 문자열 참조를 쓰지 않고 **id 컬럼만** 둔다 (CLAUDE.md §2 ESM 규칙 준수 +
 * 이 테이블은 조인 대상이지 소유자가 아니므로 역참조를 만들 이유가 없다).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/** 지원 채널 — DB CHECK 제약과 1:1 유지 */
export type ExternalChannelCode = 'NAVER' | 'COUPANG';

/** 동기화 상태 — DB CHECK 제약과 1:1 유지 */
export type ExternalSyncStatus =
  /** 판매 조건만 입력됐고 외부 채널에는 아직 보내지 않음 */
  | 'NOT_LINKED'
  /** 전송 진행 중 */
  | 'PENDING'
  /** 외부 채널에 등록 완료 (external_channel_product_id 필수) */
  | 'LINKED'
  /** 마지막 시도 실패 — last_error 참조 */
  | 'FAILED'
  /** 연동 해제됨 (외부 등록은 내려갔고 이력은 남긴다) */
  | 'UNLINKED';

/**
 * 채널별 판매 조건 — O4O 에 원천이 없어 매장이 입력해야 하는 값.
 *
 * jsonb 로 두는 이유: 이 항목 집합이 **채널마다 다르다.** 네이버 형태로 컬럼을 굳히면
 * 쿠팡에서 다시 깨진다. 또 이 값들은 상품 데이터가 아니라 판매 조건이므로
 * ProductMaster(전 서비스 공용)에 넣으면 오염된다.
 */
export interface ExternalChannelInput {
  /** 네이버 리프 카테고리 ID (O4O 카테고리와 체계가 다르다) */
  leafCategoryId?: string | null;
  stockQuantity?: number | null;
  deliveryFeeType?: string | null;
  baseDeliveryFee?: number | null;
  returnDeliveryFee?: number | null;
  exchangeDeliveryFee?: number | null;
  releaseAddressId?: number | null;
  refundAddressId?: number | null;
  afterServiceTelephoneNumber?: string | null;
  afterServiceGuideContent?: string | null;
  productInfoProvidedNotice?: Record<string, unknown> | null;
}

@Entity('external_channel_product_links')
@Unique('UQ_ecpl_org_master_channel', ['organizationId', 'masterId', 'channelCode'])
@Index('IDX_ecpl_org_channel', ['organizationId', 'channelCode'])
export class ExternalChannelProductLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 매장 (Store Ops 경계 — Boundary Policy: organizationId) */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** O4O 상품 참조 (복제 아님) */
  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  /** 매장 진열 참조. 진열이 내려가도 외부 등록은 남을 수 있어 nullable. */
  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId: string | null;

  @Column({ name: 'channel_code', type: 'varchar', length: 32 })
  channelCode: ExternalChannelCode;

  /**
   * 네이버 원상품번호. 조회·수정 키가 아니다 (그건 channelProductId).
   * 두 번호가 서로 다른 값이라 **둘 다** 저장한다.
   */
  @Column({ name: 'external_origin_product_id', type: 'varchar', length: 64, nullable: true })
  externalOriginProductId: string | null;

  /** 네이버 채널상품번호 — 조회·수정·삭제에 쓰는 키 */
  @Column({ name: 'external_channel_product_id', type: 'varchar', length: 64, nullable: true })
  externalChannelProductId: string | null;

  @Column({ name: 'channel_input', type: 'jsonb', nullable: true })
  channelInput: ExternalChannelInput | null;

  @Column({ name: 'sync_status', type: 'varchar', length: 24, default: 'NOT_LINKED' })
  syncStatus: ExternalSyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
