import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { CustomPost } from './CustomPost.js';

export interface FieldSchema {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'image' | 'url' | 'email' | 'relation';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  showIf?: {
    field: string;
    equals: string | number | boolean;
  };
  relationType?: string; // for relation type
}

export interface FieldGroup {
  id: string;
  name: string;
  description?: string;
  fields: FieldSchema[];
  order: number;
}

/**
 * CustomPostType Entity - Unified with cms_cpt_types table
 *
 * This entity now maps to cms_cpt_types table (cms-core standard)
 * while maintaining backward compatibility with existing code.
 */
@Entity('cms_cpt_types')
@Index(['organizationId', 'slug'], { unique: true })
export class CustomPostType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Organization ID for multi-tenancy support
   * Required field - all CPTs must belong to an organization
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  singularLabel!: string;

  @Column({ type: 'varchar', length: 255 })
  pluralLabel!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string | null;

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: true })
  hasArchive!: boolean;

  @Column({ type: 'boolean', default: true })
  hierarchical!: boolean;

  @Column({ type: 'jsonb', default: '["title", "editor", "thumbnail"]' })
  supports!: string[];

  @Column({ type: 'jsonb', default: '[]' })
  taxonomies!: string[];

  @Column({ type: 'jsonb', default: '{}' })
  rewriteRules!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  capabilities!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Alias for backward compatibility
   * Maps to isActive column
   */
  get active(): boolean {
    return this.isActive;
  }
  set active(value: boolean) {
    this.isActive = value;
  }

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // Relations
  @OneToMany('CustomPost', 'postType')
  posts!: CustomPost[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
