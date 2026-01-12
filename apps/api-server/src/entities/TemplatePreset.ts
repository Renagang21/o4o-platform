import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { CustomPostType } from './CustomPostType.js';
import type { TemplatePresetConfig } from '@o4o/types';

@Entity('template_presets')
@Index(['cptSlug'])
@Index(['isActive'])
@Index(['version'])
export class TemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 100, name: 'cpt_slug' })
  cptSlug!: string;

  @Column('jsonb')
  config!: TemplatePresetConfig;

  @Column('int', { default: 1 })
  version!: number;

  @Column('simple-array', { nullable: true })
  roles?: string[];

  @Column('boolean', { default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column('uuid', { nullable: true, name: 'created_by' })
  createdBy?: string;

  @ManyToOne('CustomPostType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cpt_slug', referencedColumnName: 'slug' })
  cpt!: CustomPostType;

  /**
   * Generate preset ID for frontend use
   * Format: template_{cptSlug}_{sanitized_name}_v{version}
   */
  getPresetId(): string {
    const sanitizedName = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return `template_${this.cptSlug}_${sanitizedName}_v${this.version}`;
  }

  /**
   * Get SEO title template
   */
  getSeoTitleTemplate(): string {
    return this.config.seoMeta.titleTemplate;
  }

  /**
   * Get layout type
   */
  getLayoutType(): string {
    return this.config.layout.type;
  }

  /**
   * Validate config structure
   */
  validateConfig(): boolean {
    if (!this.config.layout || !this.config.layout.type) {
      return false;
    }
    if (!this.config.layout.main || !this.config.layout.main.blocks) {
      return false;
    }
    if (!this.config.seoMeta || !this.config.seoMeta.titleTemplate) {
      return false;
    }
    return true;
  }

  /**
   * Clone preset for versioning
   */
  clone(): Partial<TemplatePreset> {
    return {
      name: `${this.name} (Copy)`,
      description: this.description,
      cptSlug: this.cptSlug,
      config: JSON.parse(JSON.stringify(this.config)),
      version: this.version + 1,
      roles: this.roles ? [...this.roles] : undefined,
      isActive: false
    };
  }

  /**
   * Count total blocks in template
   */
  countBlocks(): number {
    let count = 0;
    const layout = this.config.layout;

    if (layout.header) count += layout.header.blocks.length;
    if (layout.main) count += layout.main.blocks.length;
    if (layout.sidebar) count += layout.sidebar.blocks.length;
    if (layout.footer) count += layout.footer.blocks.length;

    return count;
  }

  toJSON() {
    return {
      id: this.id,
      presetId: this.getPresetId(),
      name: this.name,
      description: this.description,
      cptSlug: this.cptSlug,
      config: this.config,
      version: this.version,
      roles: this.roles,
      isActive: this.isActive,
      layoutType: this.getLayoutType(),
      blockCount: this.countBlocks(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy
    };
  }
}
