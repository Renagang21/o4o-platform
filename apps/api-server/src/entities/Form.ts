import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FormSubmission } from './FormSubmission';
import { User } from './User';
import type { FormField, FormSettings, FormNotification, FormConfirmation, FormStyling } from '@o4o/types';

@Entity('forms')
@Index(['name'])
@Index(['status'])
@Index(['createdBy'])
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
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

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 0 })
  submissionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSubmission: Date;

  @OneToMany(() => FormSubmission, submission => submission.form)
  submissions: FormSubmission[];

  // Computed fields
  @Column({ type: 'jsonb', nullable: true })
  fieldIndex: Record<string, number>; // Map field names to indices for quick lookup

  @Column({ type: 'text', nullable: true })
  shortcode: string; // [form id="form-id"] or [form name="form-name"]

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional metadata
}