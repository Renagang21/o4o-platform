/**
 * StoreBlogPost Entity — Store Blog Channel
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 매장별 독립 블로그 채널. ecommerce-core / platform-core 변경 없음.
 * Pattern: customer-request.entity.ts (varchar status, snake_case columns)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StoreBlogPostStatus = 'draft' | 'published' | 'archived';

/**
 * Blog 작성자 역할 — Operator HUB 게시 vs Store 직접 작성 구분.
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-V1 Phase 2-1 (2026-05-23):
 *   - 'operator': 운영자가 매장 HUB 에 게시한 블로그 (운영자 → HUB → 매장 흐름)
 *   - 'store'   : 매장 경영자가 자기 매장에 직접 작성한 블로그
 *
 * 'supplier' 는 타입에 포함되지 않으며 DB CHECK 제약으로도 차단됨.
 * Canonical: 공급자는 O4O 내부 Producer 가 아니다.
 */
export type StoreBlogPostAuthorRole = 'operator' | 'store';

@Entity({ name: 'store_blog_posts' })
@Index(['storeId', 'status'])
@Index(['storeId', 'slug'], { unique: true })
@Index(['storeId', 'publishedAt'])
// WO-O4O-OPERATOR-BLOG-PUBLISHING-V1 Phase 2-1:
//   HUB query 최적화 — service_key + author_role + status 복합 조건
@Index('IDX_store_blog_posts_hub_query', ['serviceKey', 'authorRole', 'status'])
export class StoreBlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 매장 ID — author_role 에 따라 NULL 허용 여부가 결정된다.
   *
   * WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1 (2026-05-24):
   *   - author_role='store' : storeId NOT NULL (매장 직접 작성 — 한 매장에 귀속)
   *   - author_role='operator' : storeId NULL (운영자 HUB 원본 — 특정 매장 무귀속)
   *
   * DB CHECK 제약 (CHK_store_blog_posts_author_role_store_id) 으로 schema 레벨 정합 보장:
   *   (author_role='operator' AND store_id IS NULL)
   *   OR (author_role='store' AND store_id IS NOT NULL)
   */
  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId!: string | null;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  /**
   * 작성자 역할 — Operator HUB 게시 vs Store 직접 작성.
   * WO-O4O-OPERATOR-BLOG-PUBLISHING-V1 Phase 2-1 (2026-05-23).
   *
   * 신규 row 기본값: 'store' (매장 경영자 직접 작성).
   * 운영자 HUB 게시 흐름 (Phase 2-2) 에서 'operator' 명시적 저장.
   *
   * DB CHECK 제약: author_role IN ('operator', 'store') — 'supplier' 금지.
   * Phase 2-1 에서는 schema 만 추가하며 queryBlog 실 구현은 별도 진행.
   */
  @Column({ name: 'author_role', type: 'varchar', length: 30, default: 'store' })
  authorRole!: StoreBlogPostAuthorRole;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: StoreBlogPostStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
