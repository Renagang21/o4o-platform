/**
 * KpaWorkingContent Entity
 * 내 공간 복사본 (Copy-to-Store)
 *
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * 원본 KpaContent를 매장(Store) 사용자 공간으로 복사한 독립 사본.
 * 복사 후 원본과 완전히 분리 — sync 없음.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpa_working_contents')
@Index(['owner_id'])
@Index(['source_content_id'])
export class KpaWorkingContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 복사 원본 Content ID (참조용, FK 미설정 — 원본 삭제 후에도 유지)
   */
  @Column({ type: 'uuid' })
  source_content_id: string;

  /**
   * 복사한 사용자 ID (매장 운영자)
   */
  @Column({ type: 'uuid' })
  owner_id: string;

  /**
   * 복사 시점 원본 제목 (스냅샷)
   */
  @Column({ type: 'varchar', length: 300 })
  title: string;

  /**
   * 편집 중인 블록 (원본 blocks를 복사 후 독립 수정 가능)
   */
  @Column({ type: 'jsonb', default: '[]' })
  edited_blocks: object[];

  @Column({ type: 'jsonb', default: '[]' })
  tags: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
