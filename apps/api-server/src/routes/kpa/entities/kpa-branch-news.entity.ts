/**
 * KPA Branch News Entity
 * 분회 공지사항/뉴스
 *
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('kpa_branch_news')
@Index(['organization_id', 'is_published', 'created_at'])
export class KpaBranchNews {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'varchar', length: 50, default: 'notice' })
  category: string; // notice | event | urgent

  @Column({ type: 'varchar', length: 200, nullable: true })
  author: string | null;

  @Column({ type: 'uuid', nullable: true })
  author_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'boolean', default: true })
  is_published: boolean;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM string-based relation (CLAUDE.md §4)
  @ManyToOne('KpaOrganization')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
