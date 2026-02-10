/**
 * GlycopharmBillingInvoice Entity
 *
 * WO-O4O-INVOICE-FINALIZATION-PHASE3D-CP1
 * WO-O4O-INVOICE-DISPATCH-PHASE3E-CP1
 *
 * 청구 스냅샷 고정 · 인보이스 초안/확정 · 발송/수령.
 * 상태: DRAFT → CONFIRMED → ARCHIVED
 * 발송 상태: NONE → SENT → RECEIVED
 * CONFIRMED 이후 금액/건수/단가 변경 불가.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 인보이스 상태 */
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'ARCHIVED';

/** 청구 기준 */
export type BillingUnit = 'consultation_action' | 'approved_request';

/** 발송 상태 */
export type DispatchStatus = 'NONE' | 'SENT' | 'RECEIVED';

/** 발송 로그 항목 */
export interface DispatchLogEntry {
  action: 'sent' | 'resent' | 'received';
  at: string;
  by: string;
  channel: 'email';
  to?: string;
  note?: string;
}

/** 스냅샷 상세 라인 */
export interface InvoiceLineSnapshot {
  date: string;
  sourceId: string | null;
  requestId: string;
  actionType: string;
  unitPrice: number;
}

@Entity({ name: 'glycopharm_billing_invoices', schema: 'public' })
@Index(['supplierId', 'pharmacyId', 'periodFrom', 'periodTo', 'unit'], { unique: true })
export class GlycopharmBillingInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 서비스 키 (고정: glycopharm) */
  @Column({ name: 'service_key', type: 'varchar', length: 50, default: "'glycopharm'" })
  serviceKey!: string;

  /** 공급자 ID */
  @Column({ name: 'supplier_id', type: 'varchar', length: 100, nullable: true })
  @Index()
  supplierId?: string;

  /** 약국 ID */
  @Column({ name: 'pharmacy_id', type: 'uuid', nullable: true })
  @Index()
  pharmacyId?: string;

  /** 청구 기간 시작 */
  @Column({ name: 'period_from', type: 'date' })
  periodFrom!: string;

  /** 청구 기간 종료 */
  @Column({ name: 'period_to', type: 'date' })
  periodTo!: string;

  /** 청구 기준 */
  @Column({ name: 'unit', type: 'varchar', length: 30 })
  unit!: BillingUnit;

  /** 단가 */
  @Column({ name: 'unit_price', type: 'int' })
  unitPrice!: number;

  /** 건수 */
  @Column({ name: 'count', type: 'int' })
  count!: number;

  /** 총 금액 */
  @Column({ name: 'amount', type: 'int' })
  amount!: number;

  /** 통화 */
  @Column({ name: 'currency', type: 'varchar', length: 3, default: "'KRW'" })
  currency!: string;

  /** 인보이스 상태 */
  @Column({ name: 'status', type: 'varchar', length: 20, default: "'DRAFT'" })
  @Index()
  status!: InvoiceStatus;

  /** 스냅샷 시점 */
  @Column({ name: 'snapshot_at', type: 'timestamptz' })
  snapshotAt!: Date;

  /** 생성자 ID */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  /** 확정자 ID */
  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy?: string;

  /** 확정 시점 */
  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  /** 상세 근거 스냅샷 (JSON) */
  @Column({ name: 'line_snapshot', type: 'jsonb', nullable: true })
  lineSnapshot?: InvoiceLineSnapshot[];

  /** 메타데이터 (변경 이력 등) */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /** 발송 상태 (Phase 3-E) */
  @Column({ name: 'dispatch_status', type: 'varchar', length: 20, default: "'NONE'" })
  dispatchStatus!: DispatchStatus;

  /** 발송 시점 */
  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt?: Date;

  /** 발송 대상 이메일 */
  @Column({ name: 'dispatched_to', type: 'varchar', length: 255, nullable: true })
  dispatchedTo?: string;

  /** 수령 확인 시점 */
  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt?: Date;

  /** 발송 이력 로그 */
  @Column({ name: 'dispatch_log', type: 'jsonb', nullable: true })
  dispatchLog?: DispatchLogEntry[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
