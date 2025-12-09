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
import type { CmsMenu } from './CmsMenu.entity.js';

@Entity('cms_menu_items')
export class CmsMenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  menuId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId!: string | null; // For nested menu items

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 100 })
  type!: string; // custom, page, post, category, taxonomy, cpt

  @Column({ type: 'varchar', length: 500, nullable: true })
  url!: string | null; // Custom URL

  @Column({ type: 'uuid', nullable: true })
  objectId!: string | null; // Reference to post/page/category ID

  @Column({ type: 'varchar', length: 100, nullable: true })
  objectType!: string | null; // Type of referenced object

  @Column({ type: 'varchar', length: 100, nullable: true })
  target!: string | null; // _blank, _self, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  cssClasses!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'int', default: 0 })
  depth!: number; // Nesting depth

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne('CmsMenu', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu!: CmsMenu;
}
