/**
 * KpaContent Entity
 * KPA Society 콘텐츠 정리 허브
 *
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: reusable_policy 추가
 *
 * 기존 kpa_branch_docs (파일 저장소 구조)를 대체하는
 * Block 기반 콘텐츠 구조.
 */

/**
 * 콘텐츠 재사용 허용 정책 — 매장 운영자가 자신의 "내 자료함"으로 가져올 수 있는지 결정.
 * LMS 의 CourseReusablePolicy 와 동일 enum 체계.
 *
 *   RESTRICTED : 가져가기 차단 (제작자 명시적 차단)
 *   PLATFORM   : 모든 매장 가져갈 수 있음 (default)
 *
 * (ORGANIZATION 값은 향후 확장용 — varchar(20) 스키마는 호환)
 */
export enum ContentReusablePolicy {
  RESTRICTED = 'restricted',
  PLATFORM = 'platform',
}

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

  /**
   * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1
   * 매장 자료함 가져가기 허용 정책. default 'platform'.
   */
  @Column({ name: 'reusable_policy', type: 'varchar', length: 20, default: ContentReusablePolicy.PLATFORM })
  reusable_policy: ContentReusablePolicy;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
