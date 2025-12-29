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

export enum ShortcodeCategory {
  CONTENT = 'content',
  MEDIA = 'media',
  SOCIAL = 'social',
  ECOMMERCE = 'ecommerce',
  FORM = 'form',
  LAYOUT = 'layout',
  WIDGET = 'widget',
  UTILITY = 'utility'
}

export enum ShortcodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

export interface ShortcodeAttribute {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'url';
  required: boolean;
  default?: any;
  description: string;
  options?: string[]; // for select type
}

export interface ShortcodeExample {
  title: string;
  code: string;
  description?: string;
  preview?: string;
}

@Entity('shortcodes')
@Index(['appId', 'status'])
@Index(['category', 'status'])
@Index(['name'])
export class Shortcode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  appId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ShortcodeCategory,
    default: ShortcodeCategory.UTILITY
  })
  category: ShortcodeCategory;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string;

  @Column({ type: 'json', nullable: true })
  attributes: ShortcodeAttribute[];

  @Column({ type: 'json', nullable: true })
  examples: ShortcodeExample[];

  @Column({ type: 'text', nullable: true })
  defaultContent: string;

  @Column({ type: 'boolean', default: false })
  selfClosing: boolean;

  @Column({
    type: 'enum',
    enum: ShortcodeStatus,
    default: ShortcodeStatus.ACTIVE
  })
  status: ShortcodeStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  documentation: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  renderFunction: string;

  @Column({ type: 'json', nullable: true })
  permissions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}