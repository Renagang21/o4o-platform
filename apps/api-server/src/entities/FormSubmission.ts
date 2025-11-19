import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Form } from './Form.js';
import type { User } from './User.js';

@Entity('form_submissions')
@Index(['formId', 'status'])
@Index(['formId', 'submittedAt'])
@Index(['userId'])
@Index(['userEmail'])
@Index(['status'])
@Index(['starred'])
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  formId: string;

  @ManyToOne('Form', 'submissions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formId' })
  form: Form;

  @Column({ type: 'varchar' })
  formName: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  // User info
  @Column({ type: 'varchar', nullable: true })
  userId: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  userEmail: string;

  @Column({ type: 'varchar', nullable: true })
  userName: string;

  @Column({ type: 'varchar' })
  ipAddress: string;

  @Column({ type: 'text' })
  userAgent: string;

  // Status
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'spam', 'trash'],
    default: 'pending'
  })
  status: 'pending' | 'approved' | 'spam' | 'trash';

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Additional info
  @Column({ type: 'text', nullable: true })
  referrer: string;

  @Column({ type: 'varchar', nullable: true })
  source: string; // Where form was embedded (page URL, etc.)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  starred: boolean;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  // Payment info
  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'refunded'],
    nullable: true
  })
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paymentAmount: number;

  @Column({ type: 'varchar', nullable: true })
  paymentId: string;

  // File uploads
  @Column({ type: 'jsonb', nullable: true })
  files: {
    fieldId: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }[];

  // Calculated values (for reports)
  @Column({ type: 'integer', nullable: true })
  completionTime: number; // Seconds to complete form

  @Column({ type: 'jsonb', nullable: true })
  fieldTimings: Record<string, number>; // Time spent on each field

  // GeoLocation
  @Column({ type: 'jsonb', nullable: true })
  geoLocation: {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  // Device info
  @Column({ type: 'varchar', nullable: true })
  deviceType: string; // desktop, tablet, mobile

  @Column({ type: 'varchar', nullable: true })
  browser: string;

  @Column({ type: 'varchar', nullable: true })
  os: string;

  // Spam detection
  @Column({ type: 'float', nullable: true })
  spamScore: number; // 0-1, higher = more likely spam

  @Column({ type: 'jsonb', nullable: true })
  spamReasons: string[];

  // Admin interaction
  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  adminNotes: {
    userId: string;
    note: string;
    timestamp: Date;
  }[];
}