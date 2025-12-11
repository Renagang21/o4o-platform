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

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // Relations
  @OneToMany('CustomPost', 'postType')
  posts!: CustomPost[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ============================================================================
  // Backward Compatibility Aliases
  // These getters/setters maintain compatibility with legacy code
  // ============================================================================

  /**
   * Alias for isActive (backward compatibility)
   */
  get active(): boolean {
    return this.isActive;
  }
  set active(value: boolean) {
    this.isActive = value;
  }

  /**
   * Alias for isPublic (backward compatibility)
   * Legacy field name was 'public'
   */
  get public(): boolean {
    return this.isPublic;
  }
  set public(value: boolean) {
    this.isPublic = value;
  }

  /**
   * Alias for hierarchical (backward compatibility)
   * Legacy field name was 'showInMenu'
   */
  get showInMenu(): boolean {
    return true; // Always show in menu by default
  }
  set showInMenu(_value: boolean) {
    // Stored in metadata if needed
  }

  /**
   * Menu position (backward compatibility)
   * Stored in metadata
   */
  get menuPosition(): number | undefined {
    return this.metadata?.menuPosition;
  }
  set menuPosition(value: number | undefined) {
    if (!this.metadata) this.metadata = {};
    this.metadata.menuPosition = value;
  }

  /**
   * Capability type (backward compatibility)
   * Stored in capabilities
   */
  get capabilityType(): string {
    return this.capabilities?.type || 'post';
  }
  set capabilityType(value: string) {
    if (!this.capabilities) this.capabilities = {};
    this.capabilities.type = value;
  }

  /**
   * Rewrite rules (backward compatibility)
   * Maps to rewriteRules
   */
  get rewrite(): Record<string, any> | undefined {
    return this.rewriteRules;
  }
  set rewrite(value: Record<string, any> | undefined) {
    this.rewriteRules = value || {};
  }

  /**
   * Labels (backward compatibility)
   * Stored in metadata
   */
  get labels(): any {
    return this.metadata?.labels;
  }
  set labels(value: any) {
    if (!this.metadata) this.metadata = {};
    this.metadata.labels = value;
  }
}
