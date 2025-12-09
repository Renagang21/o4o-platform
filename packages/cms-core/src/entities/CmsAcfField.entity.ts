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
import { CmsAcfFieldGroup } from './CmsAcfFieldGroup.entity.js';

@Entity('cms_acf_fields')
@Index(['fieldGroupId', 'key'], { unique: true })
export class CmsAcfField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  fieldGroupId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentFieldId!: string | null; // For nested fields (repeater, group)

  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string; // Field name used in database

  @Column({ type: 'varchar', length: 100 })
  type!: string; // text, textarea, number, email, url, password, wysiwyg, image, file, select, checkbox, radio, true_false, link, post_object, relationship, taxonomy, user, google_map, date_picker, color_picker, message, tab, group, repeater, flexible_content, clone

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'text', nullable: true })
  defaultValue!: string | null;

  @Column({ type: 'text', nullable: true })
  placeholder!: string | null;

  @Column({ type: 'text', nullable: true })
  prepend!: string | null;

  @Column({ type: 'text', nullable: true })
  append!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  formatting!: string | null; // html, br, none

  @Column({ type: 'int', nullable: true })
  maxLength!: number | null;

  @Column({ type: 'int', nullable: true })
  rows!: number | null; // For textarea

  @Column({ type: 'jsonb', default: '[]' })
  choices!: Record<string, string>[]; // For select, checkbox, radio

  @Column({ type: 'boolean', default: false })
  allowNull!: boolean;

  @Column({ type: 'boolean', default: false })
  multiple!: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  conditionalLogic!: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  wrapper!: Record<string, any>; // width, class, id

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

  @ManyToOne(() => CmsAcfFieldGroup, (group) => group.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldGroupId' })
  fieldGroup!: CmsAcfFieldGroup;
}
