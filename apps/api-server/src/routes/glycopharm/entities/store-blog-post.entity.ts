/**
 * StoreBlogPost Entity — Store Blog Channel
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 매장별 독립 블로그 채널. ecommerce-core / platform-core 변경 없음.
 * Pattern: customer-request.entity.ts (varchar status, snake_case columns)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StoreBlogPostStatus = 'draft' | 'published' | 'archived';

@Entity({ name: 'store_blog_posts' })
@Index(['storeId', 'status'])
@Index(['storeId', 'slug'], { unique: true })
@Index(['storeId', 'publishedAt'])
export class StoreBlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: StoreBlogPostStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
