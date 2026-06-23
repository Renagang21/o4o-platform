/**
 * StoreVideo Entity — Store Video (QR 전용) Channel
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * Store Production Material 에 "동영상(video)" 유형을 추가한다. QR-code 로 연결되는
 * 외부 동영상 URL 콘텐츠를 운영자 → HUB → 매장 흐름으로 관리한다.
 *
 * store_pops 패턴 1:1 mirror — author_role 로 운영자 게시 vs 매장 사본 분리. POP 과 달리
 * 본문(content)이 아니라 외부 동영상 URL(video_url) 을 보관하며, excerpt 대신 description 사용.
 *
 * 범위 제약 (WO 고정):
 *   - 디지털 사이니지와 연결하지 않음 (QR 전용 콘텐츠).
 *   - O4O 자체 동영상 저장/스트리밍 없음 — 외부 URL(YouTube/Vimeo 등) 등록만.
 *   - KPA 전용 — GlycoPharm/K-Cosmetics/Neture 공통화는 후속(별도 IR).
 *
 * Pattern: store-pop.entity.ts (Blog → POP → Video 동일 패턴 라인).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StoreVideoStatus = 'draft' | 'published' | 'archived';

/**
 * 동영상 작성자 역할 — Operator HUB 게시 vs Store 사본 구분 (POP 과 동일 정책).
 *   - 'operator': 운영자가 매장 HUB 에 게시한 동영상 (운영자 → HUB → 매장 흐름)
 *   - 'store'   : 매장 경영자가 HUB 에서 가져온 자기 매장 사본
 *
 * 'supplier' 는 타입에 포함되지 않으며 DB CHECK 제약으로도 차단됨.
 */
export type StoreVideoAuthorRole = 'operator' | 'store';

@Entity({ name: 'store_videos' })
@Index(['storeId', 'status'])
@Index(['storeId', 'slug'], { unique: true })
@Index(['storeId', 'publishedAt'])
// HUB query 최적화 — service_key + author_role + status 복합 조건
@Index('IDX_store_videos_hub_query', ['serviceKey', 'authorRole', 'status'])
export class StoreVideo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 매장 ID — author_role 에 따라 NULL 허용 여부가 결정된다 (store_pops 패턴 mirror).
   *   - author_role='store'    : storeId NOT NULL (HUB 에서 가져온 매장 사본)
   *   - author_role='operator' : storeId NULL (운영자 HUB 원본 — 특정 매장 무귀속)
   */
  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId!: string | null;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  @Column({ name: 'author_role', type: 'varchar', length: 30, default: 'store' })
  authorRole!: StoreVideoAuthorRole;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 외부 동영상 URL (YouTube/Vimeo 등). O4O 자체 저장/스트리밍 없음.
   * embed 변환은 frontend 에서 최소 수준으로 처리.
   */
  @Column({ name: 'video_url', type: 'varchar', length: 1000 })
  videoUrl!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: StoreVideoStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  /**
   * 가져오기(=복사) 출처 추적용 — 매장 사본이 어떤 운영자 원본에서 왔는지.
   * 단 복사 후 원본 수정/삭제는 사본에 영향을 주지 않는다 (독립 복사).
   */
  @Column({ name: 'copied_from_id', type: 'uuid', nullable: true })
  copiedFromId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
