/**
 * KpaContent Entity
 * KPA Society 콘텐츠 정리 허브
 *
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * 기존 kpa_branch_docs (파일 저장소 구조)를 대체하는
 * Block 기반 콘텐츠 구조.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpa_contents')
@Index(['created_by', 'is_deleted'])
@Index(['category', 'is_deleted'])
@Index(['status', 'is_deleted'])
export class KpaContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /**
   * Block 기반 콘텐츠 구조.
   * [{ type: 'text'|'image'|'list', content?: string, url?: string, items?: string[] }]
   */
  @Column({ type: 'jsonb', default: '[]' })
  blocks: object[];

  /**
   * 다중 태그. ['약국경영', '법령', ...]
   */
  @Column({ type: 'jsonb', default: '[]' })
  tags: string[];

  /**
   * 자유 확장 카테고리 (고정 4종 제거)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string | null;

  /**
   * 원본 유형: upload | external | manual
   */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source_type: string;

  /**
   * 업로드 파일 URL 또는 외부 링크
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  source_url: string | null;

  /**
   * 원본 파일명 (upload 타입 시)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  source_file_name: string | null;

  /**
   * 활용 방식: READ | LINK | DOWNLOAD | COPY
   * WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  usage_type: string | null;

  /**
   * draft | ready
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
