import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import type { SignageTemplateZone } from './SignageTemplateZone.entity.js';

/**
 * SignageTemplate Entity
 *
 * Defines layout templates for signage displays.
 * - Multi-zone layout support
 * - Responsive configuration
 * - Template categorization
 */
@Entity('signage_templates')
@Index(['serviceKey', 'organizationId'])
@Index(['status'])
@Index(['isPublic'])
@Index(['category'])
export class SignageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Multi-tenant Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  // ========== Basic Info ==========
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ========== Layout Configuration ==========
  @Column({ type: 'jsonb', default: '{}' })
  layoutConfig!: {
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait';
    backgroundColor?: string;
    backgroundImage?: string;
  };

  // ========== Categorization ==========
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null; // e.g., 'pharmacy', 'retail', 'restaurant'

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  // ========== Thumbnail ==========
  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  // ========== Status & Visibility ==========
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: 'active' | 'inactive' | 'draft';

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean; // Available for all organizations in service

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean; // Platform-provided template

  // ========== Ownership ==========
  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  // ========== Versioning ==========
  @VersionColumn()
  version!: number;

  // ========== Relations (string-based for ESM) ==========
  @OneToMany('SignageTemplateZone', 'template')
  zones!: SignageTemplateZone[];
}
