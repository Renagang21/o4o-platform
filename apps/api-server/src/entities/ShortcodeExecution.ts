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
import { Shortcode } from './Shortcode';
import { User } from './User';

export enum ExecutionStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CACHED = 'cached'
}

export enum ExecutionContext {
  POST = 'post',
  PAGE = 'page',
  WIDGET = 'widget',
  API = 'api',
  PREVIEW = 'preview',
  EMAIL = 'email'
}

@Entity('shortcode_executions')
@Index(['shortcode_id', 'createdAt'])
@Index(['user_id', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['context', 'createdAt'])
export class ShortcodeExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shortcode_id: string;

  @ManyToOne(() => Shortcode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shortcode_id' })
  shortcode: Shortcode;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  raw_content: string;

  @Column({ type: 'json', nullable: true })
  parsed_attributes: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  rendered_content: string;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.SUCCESS
  })
  status: ExecutionStatus;

  @Column({
    type: 'enum',
    enum: ExecutionContext,
    default: ExecutionContext.POST
  })
  context: ExecutionContext;

  @Column({ type: 'varchar', length: 255, nullable: true })
  context_id: string; // ID of post, page, widget, etc.

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  error_details: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  execution_time_ms: number;

  @Column({ type: 'int', nullable: true })
  memory_usage_bytes: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referer: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  from_cache: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cache_key: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}