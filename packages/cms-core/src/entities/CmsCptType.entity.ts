import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CmsCptField } from './CmsCptField.entity.js';

@Entity('cms_cpt_types')
@Index(['organizationId', 'slug'], { unique: true })
export class CmsCptType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string; // Display name

  @Column({ type: 'varchar', length: 255 })
  slug!: string; // URL-friendly identifier

  @Column({ type: 'varchar', length: 255 })
  singularLabel!: string;

  @Column({ type: 'varchar', length: 255 })
  pluralLabel!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon!: string | null; // Icon name for admin UI

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean; // Whether visible in public API

  @Column({ type: 'boolean', default: true })
  hasArchive!: boolean; // Whether has archive page

  @Column({ type: 'boolean', default: true })
  hierarchical!: boolean; // Whether supports parent-child

  @Column({ type: 'jsonb', default: '["title", "editor", "thumbnail"]' })
  supports!: string[]; // Supported features

  @Column({ type: 'jsonb', default: '[]' })
  taxonomies!: string[]; // Associated taxonomies

  @Column({ type: 'jsonb', default: '{}' })
  rewriteRules!: Record<string, any>; // URL rewrite rules

  @Column({ type: 'jsonb', default: '{}' })
  capabilities!: Record<string, any>; // Custom capabilities

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CmsCptField, (field) => field.cptType)
  fields!: CmsCptField[];
}
