/**
 * Seller Content Metric Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * 판매자 콘텐츠 성과 지표
 * 노출, 클릭, QR 스캔 등 측정
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Metric Type
 */
export type SellerMetricType =
  | 'impression'    // 노출
  | 'click'         // 클릭
  | 'qr_scan'       // QR 스캔
  | 'video_start'   // 영상 시작
  | 'video_complete'// 영상 완료
  | 'conversion';   // 전환 (향후)

/**
 * Seller Content Metric Entity
 *
 * @description 콘텐츠 성과 지표 (일별 집계)
 * @schema signage_seller
 */
@Entity({ name: 'seller_content_metrics', schema: 'signage_seller' })
@Index(['organizationId', 'contentId', 'date'])
@Index(['organizationId', 'campaignId', 'date'])
@Index(['organizationId', 'partnerId', 'date'])
@Index(['date', 'metricType'])
export class SellerContentMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (Multi-tenant)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 콘텐츠 ID (SellerContent 참조)
   */
  @Column({ type: 'uuid' })
  @Index()
  contentId!: string;

  /**
   * 캠페인 ID (denormalized for query)
   */
  @Column({ type: 'uuid', nullable: true })
  campaignId!: string | null;

  /**
   * 파트너 ID (denormalized for query)
   */
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 매장 ID (Clone된 Store)
   */
  @Column({ type: 'uuid', nullable: true })
  storeId!: string | null;

  /**
   * 집계 날짜 (일별)
   */
  @Column({ type: 'date' })
  @Index()
  date!: string;

  /**
   * 지표 유형
   */
  @Column({ type: 'varchar', length: 30 })
  metricType!: SellerMetricType;

  /**
   * 노출 수
   */
  @Column({ type: 'int', default: 0 })
  impressions!: number;

  /**
   * 클릭 수
   */
  @Column({ type: 'int', default: 0 })
  clicks!: number;

  /**
   * QR 스캔 수
   */
  @Column({ type: 'int', default: 0 })
  qrScans!: number;

  /**
   * 영상 시작 수
   */
  @Column({ type: 'int', default: 0 })
  videoStarts!: number;

  /**
   * 영상 완료 수
   */
  @Column({ type: 'int', default: 0 })
  videoCompletes!: number;

  /**
   * 총 노출 시간 (초)
   */
  @Column({ type: 'int', default: 0 })
  totalDurationSeconds!: number;

  /**
   * 추가 지표 데이터
   */
  @Column({ type: 'jsonb', default: {} })
  additionalMetrics!: Record<string, number>;

  /**
   * 생성일시
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

/**
 * Seller Metric Event Entity
 *
 * @description 개별 이벤트 로그 (실시간 기록용)
 * @schema signage_seller
 */
@Entity({ name: 'seller_metric_events', schema: 'signage_seller' })
@Index(['organizationId', 'contentId', 'createdAt'])
@Index(['createdAt'])
export class SellerMetricEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (Multi-tenant)
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 콘텐츠 ID
   */
  @Column({ type: 'uuid' })
  contentId!: string;

  /**
   * 캠페인 ID
   */
  @Column({ type: 'uuid', nullable: true })
  campaignId!: string | null;

  /**
   * 파트너 ID
   */
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 매장 ID
   */
  @Column({ type: 'uuid', nullable: true })
  storeId!: string | null;

  /**
   * 플레이어 ID
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  playerId!: string | null;

  /**
   * 이벤트 유형
   */
  @Column({ type: 'varchar', length: 30 })
  eventType!: SellerMetricType;

  /**
   * 이벤트 값 (duration 등)
   */
  @Column({ type: 'int', default: 1 })
  eventValue!: number;

  /**
   * 이벤트 메타데이터
   */
  @Column({ type: 'jsonb', default: {} })
  eventMetadata!: Record<string, unknown>;

  /**
   * 생성일시
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
