/**
 * OperatorMultilingualProductContentGroup Entity
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1
 *
 * Operator-authored multilingual product marketing content ORIGINAL (HUB blueprint).
 *
 * This is the operator-side counterpart of StoreMultilingualProductContentGroup.
 * Mirrors the operator_qr_templates pattern: operator originals are service-scoped,
 * organization-less, and carry no store product target. The store binds a concrete
 * target (local/listing) only when it imports (= copies) the original into its own
 * store_multilingual_product_content_groups row (source_type='operator_hub').
 *
 * Like the store side, pages are independent locale marketing versions, not literal
 * translations, and no fixed content taxonomy (feature/use/how-to/caution) is imposed.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OperatorMultilingualProductContentAuthorRole = 'operator';
export type OperatorMultilingualProductContentStatus = 'draft' | 'published' | 'archived';

@Entity({ name: 'operator_multilingual_product_content_groups' })
@Index('IDX_operator_multilingual_product_content_groups_hub_query', ['serviceKey', 'authorRole', 'status'])
@Index('IDX_operator_multilingual_product_content_groups_service_updated', ['serviceKey', 'updatedAt'])
export class OperatorMultilingualProductContentGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  /** Server-forced 'operator' (HUB original is never store-bound). */
  @Column({ name: 'author_role', type: 'varchar', length: 30, default: 'operator' })
  authorRole!: OperatorMultilingualProductContentAuthorRole;

  /**
   * Free key for future variants such as default/tour/event without hardcoding
   * content-type taxonomy in O4O. V1 uses 'default'.
   */
  @Column({ name: 'content_key', type: 'varchar', length: 80, default: 'default' })
  contentKey!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'default_locale', type: 'varchar', length: 10, default: 'ko' })
  defaultLocale!: string;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: OperatorMultilingualProductContentStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
