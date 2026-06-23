/**
 * ForeignVisitorPartnerQrScanEvent Entity
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1
 *
 * 제휴 QR(shortCode) public landing 익명 스캔 이벤트.
 *   - 개인정보 최소화: IP 원문/이름/전화/이메일/계정 미수집. ip/userAgent 는 hash 만(sha256).
 *   - partner/QR 기준 유입 추적용. 방문확인/구매전환/수수료와 무관(후속).
 *   - resolve 성공(ACTIVE+유효기간 내) 시에만 기록. unknown/inactive/expired 는 미기록.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('foreign_visitor_partner_qr_scan_events')
@Index(['qrCodeId', 'createdAt'])
@Index(['partnerId', 'createdAt'])
@Index(['organizationId', 'serviceKey', 'createdAt'])
@Index(['shortCode'])
export class ForeignVisitorPartnerQrScanEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_key' })
  serviceKey!: string;

  @Column({ type: 'uuid', name: 'partner_id' })
  partnerId!: string;

  @Column({ type: 'uuid', name: 'qr_code_id' })
  qrCodeId!: string;

  @Column({ type: 'varchar', length: 40, name: 'short_code' })
  shortCode!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'campaign_name' })
  campaignName?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language?: string | null;

  /** landing 경로(예: /foreign-visitor/affiliate/:shortCode). 쿼리스트링/개인식별 미포함. */
  @Column({ type: 'varchar', length: 300, nullable: true, name: 'landing_path' })
  landingPath?: string | null;

  /** referrer(유입 출처) — 절단 저장. 개인식별 미포함. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer?: string | null;

  /** sha256(salt + client IP) — IP 원문 저장 금지. dedupe/봇 완화용. */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_hash' })
  ipHash?: string | null;

  /** sha256(userAgent) — UA 원문 대신 hash. */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'user_agent_hash' })
  userAgentHash?: string | null;

  /** UA 요약(절단, 최대 160자) — 가독성용 최소 정보. 개인식별 미포함. */
  @Column({ type: 'varchar', length: 160, nullable: true, name: 'user_agent_summary' })
  userAgentSummary?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
