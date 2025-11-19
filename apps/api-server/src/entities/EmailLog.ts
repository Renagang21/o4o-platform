import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('email_logs')
@Index(['status', 'createdAt'])
@Index(['recipient'])
export class EmailLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  recipient!: string;

  @Column({ type: 'varchar', nullable: true })
  sender?: string;

  @Column({ type: 'varchar' })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ type: 'text', nullable: true })
  htmlBody?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'failed', 'bounced', 'complained'],
    default: 'pending'
  })
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  messageId?: string;

  @Column({ type: 'varchar', nullable: true })
  provider?: string;

  @Column({ type: 'json', nullable: true })
  response?: any;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date;

  @Column({ type: 'json', nullable: true })
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;

  @Column({ type: 'varchar', nullable: true })
  emailType?: string; // welcome, reset-password, order-confirmation, etc.

  @Column({ type: 'integer', nullable: true })
  userId?: number;

  @Column({ type: 'varchar', nullable: true })
  orderId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}