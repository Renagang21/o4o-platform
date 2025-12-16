import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * View Entity
 *
 * Matches cms_views table created by cms-core/lifecycle/install.ts
 * Used for CMS view template management
 */
@Entity('cms_views')
@Index(['organizationId', 'slug'], { unique: true })
@Index(['organizationId'])
export class View {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organizationId' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, default: 'list' })
  type!: string; // list, grid, detail, custom

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'templateId' })
  templateId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cptType' })
  cptType!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  query!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  layout!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  filters!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'isActive' })
  isActive!: boolean;

  @Column({ type: 'int', default: 0, name: 'sortOrder' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;
}
