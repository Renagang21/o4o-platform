/**
 * CmsContentRecommendation Entity
 *
 * WO-CONTENT-LIST-UX-PHASE3A-V1
 *
 * 콘텐츠 추천 엔티티 (cms_content_recommendations 테이블)
 * - 사용자별 1인 1추천 (unique constraint: [content_id, user_id])
 * - forum_post_like 패턴 준수
 * - ESM 규칙: ManyToOne 관계 없음 (raw SQL로 접근)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('cms_content_recommendations')
@Unique(['contentId', 'userId'])
export class CmsContentRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'content_id', type: 'uuid' })
  @Index()
  contentId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
