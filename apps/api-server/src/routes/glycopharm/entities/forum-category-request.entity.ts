/**
 * GlycoPharm Forum Category Request Entity (Legacy)
 * 포럼 카테고리 생성 신청 (GlycoPharm 전용 레거시)
 *
 * Renamed from ForumCategoryRequest → GlycopharmForumCategoryRequest
 * to avoid class name collision with forum-core's shared ForumCategoryRequest entity.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type GlycopharmCategoryRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('glycopharm_forum_category_requests')
export class GlycopharmForumCategoryRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status!: GlycopharmCategoryRequestStatus;

  // 신청자 정보
  @Column({ type: 'uuid' })
  requester_id!: string;

  @Column({ type: 'varchar', length: 100 })
  requester_name!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  requester_email?: string;

  // 검토자 정보
  @Column({ type: 'uuid', nullable: true })
  reviewer_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reviewer_name?: string;

  @Column({ type: 'text', nullable: true })
  review_comment?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at?: Date;

  // 승인 시 생성된 카테고리 정보
  @Column({ type: 'uuid', nullable: true })
  created_category_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_category_slug?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
