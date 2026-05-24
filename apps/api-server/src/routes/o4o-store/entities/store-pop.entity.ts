/**
 * StorePop Entity — Store POP Channel
 *
 * WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 Backend Foundation (2026-05-24)
 *
 * Store Menu Canonical 의 POP 항목 운영자 → HUB → 매장 흐름 entity.
 * Blog 의 store_blog_posts 패턴 mirror — author_role 로 운영자 게시 vs 매장 직접 작성 분리.
 *
 * 선행 IR (IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1) 의 Option C 채택 근거:
 *   - kpa_store_contents 의 기존 정책 (Workspace A / visibility_scope='organization' /
 *     organization_id NOT NULL / share_status 흐름 폐기) 와 운영자 POP HUB 진열 흐름이
 *     entity 의 4 개 제약 모두에서 충돌. 별도 entity 신설이 정합 가장 자연스러움.
 *   - Blog 의 store_blog_posts 가 별도 entity 인 이유 (full content + author_role +
 *     status + publishedAt) 와 동일 — POP 도 같은 복잡도.
 *
 * Pattern: store-blog-post.entity.ts (Phase 2-1 schema 동일 패턴).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StorePopStatus = 'draft' | 'published' | 'archived';

/**
 * POP 작성자 역할 — Operator HUB 게시 vs Store 직접 작성 구분.
 * WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 (2026-05-24):
 *   - 'operator': 운영자가 매장 HUB 에 게시한 POP (운영자 → HUB → 매장 흐름)
 *   - 'store'   : 매장 경영자가 자기 매장에 직접 작성한 POP
 *
 * 'supplier' 는 타입에 포함되지 않으며 DB CHECK 제약으로도 차단됨.
 * Canonical: 공급자는 O4O 내부 Producer 가 아니다.
 */
export type StorePopAuthorRole = 'operator' | 'store';

@Entity({ name: 'store_pops' })
@Index(['storeId', 'status'])
@Index(['storeId', 'slug'], { unique: true })
@Index(['storeId', 'publishedAt'])
// HUB query 최적화 — service_key + author_role + status 복합 조건
@Index('IDX_store_pops_hub_query', ['serviceKey', 'authorRole', 'status'])
export class StorePop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 매장 ID — author_role 에 따라 NULL 허용 여부가 결정된다.
   *
   *   - author_role='store'    : storeId NOT NULL (매장 직접 작성 — 한 매장에 귀속)
   *   - author_role='operator' : storeId NULL (운영자 HUB 원본 — 특정 매장 무귀속)
   *
   * DB CHECK 제약 (CHK_store_pops_author_role_store_id) 으로 schema 레벨 정합 보장:
   *   (author_role='operator' AND store_id IS NULL)
   *   OR (author_role='store' AND store_id IS NOT NULL)
   */
  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId!: string | null;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  /**
   * 작성자 역할 — Operator HUB 게시 vs Store 직접 작성.
   *
   * 신규 row 기본값: 'store' (매장 경영자 직접 작성).
   * 운영자 HUB 게시 흐름 (Phase 2) 에서 'operator' 명시적 저장.
   *
   * DB CHECK 제약: author_role IN ('operator', 'store') — 'supplier' 금지.
   */
  @Column({ name: 'author_role', type: 'varchar', length: 30, default: 'store' })
  authorRole!: StorePopAuthorRole;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: StorePopStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
