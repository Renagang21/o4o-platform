import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cms_views')
@Index(['organizationId', 'slug'], { unique: true })
export class CmsView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, default: 'list' })
  type!: string; // list, grid, detail, custom

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true })
  templateId!: string | null; // Reference to template

  @Column({ type: 'varchar', length: 255, nullable: true })
  cptType!: string | null; // Target CPT type

  @Column({ type: 'jsonb', default: '{}' })
  query!: Record<string, any>; // Query parameters for data fetching

  @Column({ type: 'jsonb', default: '{}' })
  layout!: Record<string, any>; // Layout configuration

  @Column({ type: 'jsonb', default: '{}' })
  filters!: Record<string, any>; // Available filters

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
}
