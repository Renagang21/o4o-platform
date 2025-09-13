import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('email_logs')
@Index(['status', 'createdAt'])
@Index(['recipient'])
export class EmailLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  recipient!: string;

  @Column({ nullable: true })
  sender?: string;

  @Column()
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

  @Column({ nullable: true })
  messageId?: string;

  @Column({ nullable: true })
  provider?: string;

  @Column({ type: 'json', nullable: true })
  response?: any;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  openedAt?: Date;

  @Column({ nullable: true })
  clickedAt?: Date;

  @Column({ type: 'json', nullable: true })
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;

  @Column({ nullable: true })
  emailType?: string; // welcome, reset-password, order-confirmation, etc.

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}