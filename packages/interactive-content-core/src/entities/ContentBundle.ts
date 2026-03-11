import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ContentBundle Entity
 *
 * 범용 콘텐츠 번들 - 다양한 도메인에서 공통으로 사용할 수 있는 콘텐츠 구조
 *
 * 사용 사례:
 * - education: 교육용 콘텐츠 (Yaksa LMS)
 * - product: 제품 정보 콘텐츠 (드랍쉬핑·화장품)
 * - campaign: 마케팅 캠페인 콘텐츠 (퀴즈/프로모션)
 * - info: 일반 정보 콘텐츠 (관광/전시형)
 * - marketing: 마케팅 콘텐츠
 */

export enum ContentBundleType {
  EDUCATION = 'education',
  PRODUCT = 'product',
  CAMPAIGN = 'campaign',
  INFO = 'info',
  MARKETING = 'marketing',
}

export interface ContentItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'quiz' | 'link' | 'file' | 'embed';
  title?: string;
  content: any;
  order: number;
  metadata?: Record<string, any>;
}

@Entity('lms_content_bundles')
@Index(['type', 'isPublished'])
@Index(['createdAt'])
export class ContentBundle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ContentBundleType,
    default: ContentBundleType.EDUCATION,
  })
  type!: ContentBundleType;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  contentItems!: ContentItem[];

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Organization scope (optional)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // Creator tracking
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Publish the content bundle
   */
  publish(): void {
    this.isPublished = true;
    this.publishedAt = new Date();
  }

  /**
   * Unpublish the content bundle
   */
  unpublish(): void {
    this.isPublished = false;
  }

  /**
   * Add a content item to the bundle
   */
  addContentItem(item: Omit<ContentItem, 'order'>): void {
    const order = this.contentItems.length;
    this.contentItems.push({ ...item, order });
  }

  /**
   * Remove a content item by id
   */
  removeContentItem(itemId: string): void {
    this.contentItems = this.contentItems.filter((item) => item.id !== itemId);
    // Re-order remaining items
    this.contentItems.forEach((item, index) => {
      item.order = index;
    });
  }

  /**
   * Reorder content items
   */
  reorderContentItems(itemIds: string[]): void {
    const itemMap = new Map(this.contentItems.map((item) => [item.id, item]));
    this.contentItems = itemIds
      .map((id, index) => {
        const item = itemMap.get(id);
        if (item) {
          item.order = index;
          return item;
        }
        return null;
      })
      .filter((item): item is ContentItem => item !== null);
  }
}
