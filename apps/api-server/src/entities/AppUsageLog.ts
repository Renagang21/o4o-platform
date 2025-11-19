import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { App } from './App.js';

@Entity('app_usage_logs')
export class AppUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  appId!: string;

  @ManyToOne('App', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appId' })
  app!: App;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  businessId?: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string; // 'generate-text', 'generate-image', etc.

  @Column({ type: 'integer', nullable: true })
  inputTokens?: number | null;

  @Column({ type: 'integer', nullable: true })
  outputTokens?: number | null;

  @Column({ type: 'integer', nullable: true })
  durationMs?: number | null;

  @Column({ type: 'varchar', length: 20, default: 'success' })
  status!: string; // 'success', 'error', 'timeout'

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorType?: string | null; // 'AUTH', 'QUOTA', 'TIMEOUT', 'PROVIDER_DOWN'

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string | null; // 'gemini-2.5-pro', 'gpt-4', etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
