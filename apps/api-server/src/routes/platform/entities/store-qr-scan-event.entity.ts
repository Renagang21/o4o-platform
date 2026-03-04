/**
 * StoreQrScanEvent Entity
 *
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 *
 * QR 코드 스캔 이벤트 로그 (Display Domain).
 * 이벤트 로그 패턴: CreateDateColumn만, UpdateDateColumn 없음.
 * organization_id로 멀티테넌트 격리.
 * FK 없음 — qr_code_id는 논리적 참조.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_qr_scan_events' })
@Index('IDX_qr_scan_events_qr_time', ['qrCodeId', 'createdAt'])
@Index('IDX_qr_scan_events_org_time', ['organizationId', 'createdAt'])
export class StoreQrScanEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'qr_code_id', type: 'uuid' })
  qrCodeId!: string;

  @Column({ name: 'device_type', type: 'varchar', length: 20, default: 'desktop' })
  deviceType!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'text', nullable: true })
  referer?: string | null;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
