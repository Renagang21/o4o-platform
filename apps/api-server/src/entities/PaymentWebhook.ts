import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum WebhookEventType {
  // 토스페이먼츠 웹훅 이벤트
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  VIRTUAL_ACCOUNT_ISSUED = 'VIRTUAL_ACCOUNT_ISSUED',
  VIRTUAL_ACCOUNT_DEPOSIT = 'VIRTUAL_ACCOUNT_DEPOSIT',
  REFUND_COMPLETED = 'REFUND_COMPLETED',

  // 기타 이벤트
  UNKNOWN = 'UNKNOWN'
}

export enum WebhookStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

@Entity('payment_webhooks')
@Index(['paymentKey'])
@Index(['orderId'])
@Index(['eventType'])
@Index(['status'])
@Index(['processed'])
@Index(['createdAt'])
export class PaymentWebhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 웹훅 이벤트 정보
  @Column({
    type: 'enum',
    enum: WebhookEventType
  })
  eventType!: WebhookEventType;

  @Column({ nullable: true })
  paymentKey?: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  transactionKey?: string;

  // 페이로드
  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  // 처리 상태
  @Column({
    type: 'enum',
    enum: WebhookStatus,
    default: WebhookStatus.RECEIVED
  })
  status!: WebhookStatus;

  @Column({ default: false })
  processed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  // 재시도
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  // 에러 정보
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'text', nullable: true })
  errorStack?: string;

  // 처리 결과
  @Column({ type: 'jsonb', nullable: true })
  processingResult?: Record<string, any>;

  // 요청 메타데이터
  @Column({ type: 'text', nullable: true })
  signature?: string; // 웹훅 서명 검증

  @Column({ nullable: true })
  sourceIp?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  // HTTP 헤더
  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  // 검증
  @Column({ default: false })
  signatureVerified!: boolean;

  // 중복 방지
  @Column({ nullable: true })
  idempotencyKey?: string;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods
  isProcessed(): boolean {
    return this.processed;
  }

  canBeRetried(): boolean {
    return !this.processed && this.retryCount < this.maxRetries;
  }

  shouldSkip(): boolean {
    return this.status === WebhookStatus.SKIPPED;
  }

  markAsProcessed(result?: Record<string, any>): void {
    this.processed = true;
    this.status = WebhookStatus.PROCESSED;
    this.processedAt = new Date();
    if (result) {
      this.processingResult = result;
    }
  }

  markAsFailed(error: Error): void {
    this.status = WebhookStatus.FAILED;
    this.errorMessage = error.message;
    this.errorStack = error.stack;
    this.retryCount += 1;
  }

  markAsSkipped(reason: string): void {
    this.status = WebhookStatus.SKIPPED;
    this.processed = true;
    this.processedAt = new Date();
    this.processingResult = { skipped: true, reason };
  }
}
