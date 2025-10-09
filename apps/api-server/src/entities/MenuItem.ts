import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
  Index
} from 'typeorm';
import { Menu } from './Menu';

export enum MenuItemType {
  PAGE = 'page',
  CUSTOM = 'custom',
  CATEGORY = 'category',
  ARCHIVE = 'archive',
  POST = 'post'
}

export enum MenuItemTarget {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top'
}

export enum MenuItemDisplayMode {
  SHOW = 'show',
  HIDE = 'hide'
}

@Entity('menu_items')
@Tree('closure-table')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  menu_id: string;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({
    type: 'enum',
    enum: MenuItemType,
    default: MenuItemType.CUSTOM
  })
  type: MenuItemType;

  @Column({
    type: 'enum',
    enum: MenuItemTarget,
    default: MenuItemTarget.SELF
  })
  target: MenuItemTarget;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  css_class: string;

  @Column({ type: 'int', default: 0 })
  order_num: number;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string; // For page, post, category references

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Role-based access control fields
  @Column({
    type: 'enum',
    enum: MenuItemDisplayMode,
    default: MenuItemDisplayMode.SHOW
  })
  display_mode: MenuItemDisplayMode;

  @Column({ 
    type: 'jsonb',
    default: () => "'{\"roles\": [\"everyone\"]}'"
  })
  target_audience: {
    roles: string[]; // ['everyone', 'logged_out', 'super_admin', 'admin', etc.]
    user_ids?: string[]; // Optional: specific user IDs
  };

  @TreeChildren()
  children: MenuItem[];

  @TreeParent()
  parent: MenuItem;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}