import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CmsTemplate } from './CmsTemplate.entity.js';

@Entity('cms_template_parts')
@Index(['organizationId', 'slug'], { unique: true })
export class CmsTemplatePart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  templateId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, default: 'partial' })
  type!: string; // header, footer, sidebar, partial, component

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  content!: string; // Part content

  @Column({ type: 'jsonb', default: '{}' })
  variables!: Record<string, any>;

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

  @ManyToOne(() => CmsTemplate, (template) => template.parts, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template!: CmsTemplate | null;
}
