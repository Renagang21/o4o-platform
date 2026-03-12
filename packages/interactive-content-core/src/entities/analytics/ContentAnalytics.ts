/**
 * ContentAnalytics Entity
 *
 * WO-O4O-CONTENT-ANALYTICS
 *
 * 콘텐츠 이벤트 로그 (조회, QR 스캔, 퀴즈/설문 참여, 공유).
 * 이벤트 로그 패턴: CreateDateColumn만, FK 없음 (fire-and-forget).
 * 패턴 참조: StoreQrScanEvent
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ContentAnalyticsEventType {
  VIEW = 'view',
  QR_SCAN = 'qr_scan',
  QUIZ_SUBMIT = 'quiz_submit',
  SURVEY_SUBMIT = 'survey_submit',
  SHARE = 'share',
}

@Entity({ name: 'content_analytics' })
@Index('IDX_content_analytics_content_event', ['storeContentId', 'eventType'])
@Index('IDX_content_analytics_content_date', ['storeContentId', 'createdAt'])
@Index('IDX_content_analytics_event_date', ['eventType', 'createdAt'])
export class ContentAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_content_id', type: 'uuid' })
  storeContentId!: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: ContentAnalyticsEventType,
  })
  eventType!: ContentAnalyticsEventType;

  @Column({ name: 'visitor_id', type: 'varchar', length: 100, nullable: true })
  visitorId?: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
