import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CmsAcfField } from './CmsAcfField.entity.js';

@Entity('cms_acf_field_groups')
@Index(['organizationId', 'key'], { unique: true })
export class CmsAcfFieldGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string; // Unique key for the group

  @Column({ type: 'varchar', length: 255 })
  title!: string; // Display title

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  location!: Record<string, any>[]; // Location rules (where to show)

  @Column({ type: 'varchar', length: 50, default: 'normal' })
  position!: string; // normal, side, acf_after_title

  @Column({ type: 'varchar', length: 50, default: 'default' })
  style!: string; // default, seamless

  @Column({ type: 'varchar', length: 50, default: 'default' })
  labelPlacement!: string; // top, left

  @Column({ type: 'varchar', length: 50, default: 'default' })
  instructionPlacement!: string; // label, field

  @Column({ type: 'boolean', default: true })
  hideOnScreen!: boolean;

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

  @OneToMany(() => CmsAcfField, (field) => field.fieldGroup)
  fields!: CmsAcfField[];
}
