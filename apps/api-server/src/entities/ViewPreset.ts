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
import { CustomPostType } from './CustomPostType.js';
import type { ViewPresetConfig } from '@o4o/types';

@Entity('view_presets')
@Index(['cptSlug'])
@Index(['isActive'])
@Index(['version'])
export class ViewPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 100, name: 'cpt_slug' })
  cptSlug!: string;

  @Column('jsonb')
  config!: ViewPresetConfig;

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

  @ManyToOne(() => CustomPostType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cpt_slug', referencedColumnName: 'slug' })
  cpt!: CustomPostType;

  /**
   * Generate preset ID for frontend use
   * Format: view_{cptSlug}_{sanitized_name}_v{version}
   */
  getPresetId(): string {
    const sanitizedName = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return `view_${this.cptSlug}_${sanitizedName}_v${this.version}`;
  }

  /**
   * Get cache TTL from config
   */
  getCacheTTL(): number {
    return this.config.cache?.ttl || 0;
  }

  /**
   * Get cache strategy
   */
  getCacheStrategy(): string {
    return this.config.cache?.strategy || 'no-cache';
  }

  /**
   * Validate config structure
   */
  validateConfig(): boolean {
    if (!this.config.renderMode) {
      return false;
    }
    if (!this.config.fields || !Array.isArray(this.config.fields)) {
      return false;
    }
    if (!this.config.pagination) {
      return false;
    }
    return true;
  }

  /**
   * Clone preset for versioning
   */
  clone(): Partial<ViewPreset> {
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
      cacheTTL: this.getCacheTTL(),
      cacheStrategy: this.getCacheStrategy(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy
    };
  }
}
