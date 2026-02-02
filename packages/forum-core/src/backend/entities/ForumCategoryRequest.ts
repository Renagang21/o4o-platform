/**
 * ForumCategoryRequest Entity
 * 포럼 카테고리 생성 요청 (서비스 공통)
 *
 * serviceCode로 서비스별 격리
 * organizationId로 조직별 범위 필터링 (KPA Society 등)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CategoryRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('forum_category_requests')
@Index(['serviceCode', 'status'])
@Index(['serviceCode', 'organizationId', 'status'])
export class ForumCategoryRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 10, nullable: true })
  iconEmoji?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: CategoryRequestStatus;

  // 서비스 코드 (neture, glycopharm, kpa-society 등)
  @Column({ name: 'service_code', type: 'varchar', length: 50 })
  serviceCode!: string;

  // 조직 ID (KPA Society 분회/지부 등)
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  // 신청자 정보
  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId!: string;

  @Column({ name: 'requester_name', type: 'varchar', length: 100 })
  requesterName!: string;

  @Column({ name: 'requester_email', type: 'varchar', length: 200, nullable: true })
  requesterEmail?: string;

  // 검토자 정보
  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId?: string;

  @Column({ name: 'reviewer_name', type: 'varchar', length: 100, nullable: true })
  reviewerName?: string;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment?: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  // 승인 시 생성된 카테고리 정보
  @Column({ name: 'created_category_id', type: 'uuid', nullable: true })
  createdCategoryId?: string;

  @Column({ name: 'created_category_slug', type: 'varchar', length: 200, nullable: true })
  createdCategorySlug?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
