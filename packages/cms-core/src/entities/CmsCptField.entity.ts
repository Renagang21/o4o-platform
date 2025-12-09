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
import { CmsCptType } from './CmsCptType.entity.js';

@Entity('cms_cpt_fields')
@Index(['cptTypeId', 'key'], { unique: true })
export class CmsCptField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  cptTypeId!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string; // Field key/name

  @Column({ type: 'varchar', length: 255 })
  label!: string; // Display label

  @Column({ type: 'varchar', length: 100 })
  type!: string; // text, textarea, number, select, checkbox, radio, date, file, relation, etc.

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  defaultValue!: string | null;

  @Column({ type: 'text', nullable: true })
  placeholder!: string | null;

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ type: 'boolean', default: true })
  isSearchable!: boolean;

  @Column({ type: 'boolean', default: false })
  isUnique!: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  validation!: Record<string, any>; // Validation rules

  @Column({ type: 'jsonb', default: '{}' })
  options!: Record<string, any>; // Field-specific options (e.g., select choices)

  @Column({ type: 'jsonb', default: '{}' })
  conditionalLogic!: Record<string, any>; // Conditional display rules

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

  @ManyToOne(() => CmsCptType, (cptType) => cptType.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cptTypeId' })
  cptType!: CmsCptType;
}
