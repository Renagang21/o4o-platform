import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FormSubmission } from './FormSubmission.js';
import type { User } from './User.js';
import type { FormField, FormSettings, FormNotification, FormConfirmation, FormStyling } from '../types/index.js';

@Entity('forms')
@Index(['name'])
@Index(['status'])
@Index(['createdBy'])
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  fields: FormField[];

  @Column({ type: 'jsonb' })
  settings: FormSettings;

  @Column({ type: 'jsonb', default: [] })
  notifications: FormNotification[];

  @Column({ type: 'jsonb', default: [] })
  confirmations: FormConfirmation[];

  @Column({ type: 'jsonb', nullable: true })
  styling: FormStyling;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  })
  status: 'active' | 'inactive' | 'draft';

  @Column({ type: 'varchar' })
  createdBy: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'integer', default: 0 })
  submissionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSubmission: Date;

  // Relations
  @OneToMany('FormSubmission', 'form')
  submissions!: FormSubmission[];

  // Computed fields
  @Column({ type: 'jsonb', nullable: true })
  fieldIndex: Record<string, number>; // Map field names to indices for quick lookup

  // WO-O4O-DEAD-SHORTCODE-RESIDUE-AND-PERMISSION-CONTRACT-FINAL-CLOSURE-V1:
  //   `shortcode` ([form name="…"]) 컬럼 제거 — parser/renderer 0 · 프론트 read 0 · 운영 forms 테이블 부재.

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional metadata
}