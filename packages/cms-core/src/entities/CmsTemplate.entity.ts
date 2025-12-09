import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CmsTemplatePart } from './CmsTemplatePart.entity.js';

@Entity('cms_templates')
@Index(['organizationId', 'slug'], { unique: true })
export class CmsTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, default: 'page' })
  type!: string; // page, post, archive, single, custom

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  content!: string; // Template content (HTML/Handlebars/etc.)

  @Column({ type: 'varchar', length: 50, default: 'handlebars' })
  engine!: string; // handlebars, ejs, pug

  @Column({ type: 'jsonb', default: '{}' })
  variables!: Record<string, any>; // Template variables schema

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

  @OneToMany(() => CmsTemplatePart, (part) => part.template)
  parts!: CmsTemplatePart[];
}
