/**
 * ForeignVisitorPartnerQrScanEventService
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1
 *
 * 제휴 QR 익명 스캔 이벤트 기록 + 최소 집계.
 *   - recordScan: resolve 성공 시 기록. 5분 dedupe(같은 qrCodeId+ipHash+userAgentHash).
 *   - getStatsForQr: QR 단건 통계(total/today/last).
 *   - getCountsForQrCodeIds: 목록 batch count(scanCount/lastScannedAt).
 * 개인정보 최소화: IP 원문/PII 미저장(ip_hash/userAgent hash 만).
 */
import { createHash } from 'crypto';
import type { DataSource, Repository } from 'typeorm';
import { ForeignVisitorPartnerQrScanEvent } from './foreign-visitor-partner-qr-scan-event.entity.js';

const DEDUPE_WINDOW_MINUTES = 5;
// salt: 운영 비밀(ENCRYPTION_KEY) 재사용 — IP/UA 역추적 방지. 신규 env 미추가.
const HASH_SALT = process.env.ENCRYPTION_KEY || 'fv-qr-scan-default-salt';

/** sha256(salt + value) hex. value 없으면 null. */
export function hashWithSalt(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash('sha256').update(`${HASH_SALT}:${value}`).digest('hex');
}

export interface RecordScanInput {
  organizationId: string;
  serviceKey: string;
  partnerId: string;
  qrCodeId: string;
  shortCode: string;
  campaignName?: string | null;
  language?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  userAgentSummary?: string | null;
}

export class ForeignVisitorPartnerQrScanEventService {
  private repo: Repository<ForeignVisitorPartnerQrScanEvent>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ForeignVisitorPartnerQrScanEvent);
  }

  /**
   * 스캔 1건 기록. 5분 내 동일 (qrCodeId, ipHash, userAgentHash) 중복이면 생략(recorded=false).
   *   ipHash/userAgentHash 가 모두 없으면 dedupe 없이 기록.
   * 기록은 best-effort — 호출부에서 실패해도 resolve 응답에 영향 없도록 처리.
   */
  async recordScan(input: RecordScanInput, now: Date = new Date()): Promise<{ recorded: boolean }> {
    if (input.ipHash && input.userAgentHash) {
      const since = new Date(now.getTime() - DEDUPE_WINDOW_MINUTES * 60 * 1000);
      const dup = await this.repo
        .createQueryBuilder('e')
        .where('e.qrCodeId = :qrCodeId', { qrCodeId: input.qrCodeId })
        .andWhere('e.ipHash = :ipHash', { ipHash: input.ipHash })
        .andWhere('e.userAgentHash = :userAgentHash', { userAgentHash: input.userAgentHash })
        .andWhere('e.createdAt >= :since', { since })
        .getExists();
      if (dup) return { recorded: false };
    }

    const event = this.repo.create({
      organizationId: input.organizationId,
      serviceKey: input.serviceKey,
      partnerId: input.partnerId,
      qrCodeId: input.qrCodeId,
      shortCode: input.shortCode,
      campaignName: input.campaignName ?? null,
      language: input.language ?? null,
      landingPath: input.landingPath ?? null,
      referrer: input.referrer ?? null,
      ipHash: input.ipHash ?? null,
      userAgentHash: input.userAgentHash ?? null,
      userAgentSummary: input.userAgentSummary ?? null,
    });
    await this.repo.save(event);
    return { recorded: true };
  }

  /** QR 단건 통계(스코프 검증은 라우트 책임 — 여기선 qrCodeId 기준). */
  async getStatsForQr(
    qrCodeId: string,
    now: Date = new Date(),
  ): Promise<{ qrCodeId: string; totalScans: number; todayScans: number; lastScannedAt: string | null }> {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const [total, today, lastRow] = await Promise.all([
      this.repo.count({ where: { qrCodeId } }),
      this.repo
        .createQueryBuilder('e')
        .where('e.qrCodeId = :qrCodeId', { qrCodeId })
        .andWhere('e.createdAt >= :start', { start: startOfToday })
        .getCount(),
      this.repo
        .createQueryBuilder('e')
        .select('MAX(e.createdAt)', 'last')
        .where('e.qrCodeId = :qrCodeId', { qrCodeId })
        .getRawOne<{ last: Date | null }>(),
    ]);
    return {
      qrCodeId,
      totalScans: total,
      todayScans: today,
      lastScannedAt: lastRow?.last ? new Date(lastRow.last).toISOString() : null,
    };
  }

  /** 목록 batch — qrCodeId → { scanCount, lastScannedAt }. */
  async getCountsForQrCodeIds(
    qrCodeIds: string[],
  ): Promise<Map<string, { scanCount: number; lastScannedAt: string | null }>> {
    const map = new Map<string, { scanCount: number; lastScannedAt: string | null }>();
    if (qrCodeIds.length === 0) return map;
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.qrCodeId', 'qrCodeId')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('MAX(e.createdAt)', 'last')
      .where('e.qrCodeId IN (:...ids)', { ids: qrCodeIds })
      .groupBy('e.qrCodeId')
      .getRawMany<{ qrCodeId: string; cnt: string; last: Date | null }>();
    for (const row of rows) {
      map.set(row.qrCodeId, {
        scanCount: Number(row.cnt) || 0,
        lastScannedAt: row.last ? new Date(row.last).toISOString() : null,
      });
    }
    return map;
  }
}
