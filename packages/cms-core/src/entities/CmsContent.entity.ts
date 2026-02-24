/**
 * CmsContent Entity
 *
 * WO-P2-IMPLEMENT-CONTENT: Core content entity for multi-service content management
 *
 * Scope hierarchy:
 * - Global: organizationId=null, serviceKey=null (platform-wide)
 * - Service: organizationId=null, serviceKey='glycopharm' (service-wide)
 * - Organization: organizationId='uuid', serviceKey=null or 'kpa' (org-specific)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Content types for different use cases
export type ContentType = 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event';

// Content lifecycle states
// WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: added 'pending' for approval workflow
export type ContentStatus = 'draft' | 'pending' | 'published' | 'archived';

// WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: Author role and visibility scope
export type ContentAuthorRole = 'admin' | 'service_admin' | 'supplier' | 'community';
export type ContentVisibilityScope = 'platform' | 'service' | 'organization';

@Entity('cms_contents')
@Index(['serviceKey', 'organizationId', 'status'])
@Index(['type', 'status'])
@Index(['status', 'publishedAt'])
@Index(['serviceKey', 'visibilityScope', 'authorRole', 'status'])
export class CmsContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Scope (whose content is this?) ===
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null; // null = platform-wide

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  serviceKey!: string | null; // 'glycopharm', 'kpa', 'glucoseview', null = global

  // === Type (what kind of content?) ===
  @Column({ type: 'varchar', length: 50 })
  type!: ContentType;

  // === Content (the actual data) ===
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null; // Short description/subtitle

  @Column({ type: 'text', nullable: true })
  body!: string | null; // Full content body (if needed)

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null; // Featured image

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl!: string | null; // Click destination URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  linkText!: string | null; // Link button text

  // === Status (lifecycle management) ===
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: ContentStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null; // Auto-unpublish date

  // === Display (presentation settings) ===
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean; // Stick to top

  @Column({ type: 'boolean', default: false })
  isOperatorPicked!: boolean; // Operator's choice (featured)

  // === Metadata (extensible data) ===
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>; // Background color, icon, etc.

  // === Visibility (WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1) ===
  @Column({ type: 'varchar', length: 20, default: 'admin' })
  authorRole!: ContentAuthorRole; // Who created: admin, service_admin, supplier, community

  @Column({ type: 'varchar', length: 20, default: 'platform' })
  visibilityScope!: ContentVisibilityScope; // Where visible: platform, service, organization

  // === Audit ===
  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
