/**
 * GlycopharmContent Entity
 *
 * WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
 *
 * GlycoPharm Resource Layer — KPA kpa_contents 구조 기반.
 * Resource → Content → Store 흐름의 첫 단계.
 *
 * ContentReusablePolicy: RESTRICTED(가져가기 차단) / PLATFORM(모든 매장 허용, default)
 */

export enum GlycopharmContentReusablePolicy {
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

@Entity('glycopharm_contents')
@Index(['created_by', 'is_deleted'])
@Index(['status', 'is_deleted'])
@Index(['sub_type', 'is_deleted'])
export class GlycopharmContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  blocks: object[];

  @Column({ type: 'jsonb', default: '[]' })
  tags: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string | null;

  /** 콘텐츠 분류 — 자료실: 'resource' */
  @Column({ type: 'varchar', length: 50, nullable: true })
  sub_type: string | null;

  /** 원본 유형: upload | external | manual */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source_type: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  source_url: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  source_file_name: string | null;

  /** 활용 방식: READ | LINK | DOWNLOAD | COPY */
  @Column({ type: 'varchar', length: 20, nullable: true })
  usage_type: string | null;

  /** draft | published | private */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  author_name: string | null;

  /** 매장 자료함 가져가기 허용 정책 */
  @Column({ name: 'reusable_policy', type: 'varchar', length: 20, default: GlycopharmContentReusablePolicy.PLATFORM })
  reusable_policy: GlycopharmContentReusablePolicy;

  @Column({ type: 'int', default: 0 })
  like_count: number;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
