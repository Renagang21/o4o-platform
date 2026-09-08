/**
 * StoreBlogSettings Entity — Blog Identity Meta
 *
 * WO-O4O-KPA-STORE-BLOG-META-V1
 *
 * 매장 Blog 의 identity (이름·소개·대표 이미지·기본 템플릿) 메타.
 * - storefront_config 와 책임 혼합 금지: 본 entity 는 Blog 정체성만 담당
 * - storeId UNIQUE — 매장당 1개 settings row
 * - serviceKey 인덱스로 multi-service 환경에서 분리
 * - blogName/description/heroImage 는 nullable — fallback 흐름에서 store info 로 대체
 * - defaultTemplate 은 'professional' default; 향후 유료 template 추가 가능 (varchar)
 *
 * Pattern: store-blog-post.entity.ts 와 동일 (varchar status, snake_case columns).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_blog_settings' })
@Index('idx_store_blog_settings_service_key', ['serviceKey'])
export class StoreBlogSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid', unique: true })
  storeId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  @Column({ name: 'blog_name', type: 'varchar', length: 200, nullable: true })
  blogName?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'hero_image', type: 'varchar', length: 500, nullable: true })
  heroImage?: string | null;

  @Column({ name: 'default_template', type: 'varchar', length: 50, default: 'professional' })
  defaultTemplate!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
