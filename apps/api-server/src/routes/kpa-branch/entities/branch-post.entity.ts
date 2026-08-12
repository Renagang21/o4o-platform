/**
 * BranchPost Entity
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 분회 홈페이지의 공지 / 자료실 글. 운영자가 쓰고 방문자가 읽는다.
 * forum(커뮤니티) 구조를 분회 축으로 재해석하지 않는다 — migration 주석 참조.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export type BranchPostCategory = 'notice' | 'resource';
export type BranchPostStatus = 'draft' | 'published';

export interface BranchPostAttachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

@Entity('branch_posts')
export class BranchPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 20, default: 'notice' })
  category: BranchPostCategory;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  attachments: BranchPostAttachment[];

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: BranchPostStatus;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ type: 'uuid' })
  author_user_id: string;

  @Column({ type: 'integer', default: 0 })
  view_count: number;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
