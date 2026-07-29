/**
 * ForeignVisitorPartnerQrCodeService
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * 파트너별 제휴마케팅 QR CRUD — (organizationId, serviceKey) 스코프. partnerId 소유권은 라우트가 선검증.
 * shortCode/landingUrl 은 서버 생성(public URL 에 partnerId 미노출). V1 템플릿=AFFILIATE_MARKETING.
 */
import { randomBytes } from 'crypto';
import type { DataSource, Repository } from 'typeorm';
// WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1: 공개 도메인 SSOT
import { getServiceOrigin } from '../../config/service-catalog.js';
import {
  ForeignVisitorPartnerQrCode,
  type ForeignVisitorQrStatus,
} from './foreign-visitor-partner-qr-code.entity.js';

/**
 * WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1 (범위 A):
 *   기존에는 서비스별 public origin 을 이 파일에 하드코딩했고 cosmetics 가
 *   `https://cosmetics.neture.co.kr` (비-canonical) 로 박혀 있었다. landing_url 은 생성 후 불변이라
 *   잘못된 도메인이 QR 에 영구히 각인된다.
 *   → 도메인 출처를 service-catalog SSOT 단일화 (POP QR 의
 *     HOTFIX-O4O-STORE-POP-PUBLIC-DOMAIN-CANONICAL-FIX-V1 과 동일 정책).
 *
 * store-owner serviceKey(role prefix) → service-catalog key 매핑.
 */
const QR_SERVICE_TO_CATALOG_KEY: Record<string, string> = {
  kpa: 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
};

/**
 * 제휴 QR landing(`/foreign-visitor/affiliate/:shortCode`) 을 **실제로 라우팅하는** 서비스.
 *
 * landing 화면과 파트너·QR 관리 화면은 현재 KPA-Society 에만 존재한다
 * (GlycoPharm / K-Cosmetics 는 `sales-channels/foreign-visitor` 구독 진입 화면만 보유).
 * 다른 서비스로 QR 을 발급하면 불변 landing_url 이 404 로 각인되므로 발급 자체를 막는다.
 * (죽은 URL 을 살리는 redirect·중복 landing 을 만들지 않는다 — canonical landing 1개 유지.)
 */
export const AFFILIATE_LANDING_SERVICE_KEYS = ['kpa'] as const;

export function hasAffiliateLanding(serviceKey: string): boolean {
  return (AFFILIATE_LANDING_SERVICE_KEYS as readonly string[]).includes(serviceKey);
}

export function buildAffiliateLandingUrl(serviceKey: string, shortCode: string): string {
  const catalogKey = QR_SERVICE_TO_CATALOG_KEY[serviceKey];
  const origin = (catalogKey && getServiceOrigin(catalogKey)) || 'https://kpa-society.co.kr';
  return `${origin}/foreign-visitor/affiliate/${shortCode}`;
}

export interface QrWriteInput {
  qrCodeName: string;
  campaignName?: string | null;
  language?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  status?: ForeignVisitorQrStatus;
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class ForeignVisitorPartnerQrCodeService {
  private repo: Repository<ForeignVisitorPartnerQrCode>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ForeignVisitorPartnerQrCode);
  }

  /** 파트너 스코프 목록. */
  async listByPartner(params: {
    organizationId: string;
    serviceKey: string;
    partnerId: string;
    status?: ForeignVisitorQrStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ForeignVisitorPartnerQrCode[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const qb = this.repo
      .createQueryBuilder('q')
      .where('q.organizationId = :organizationId', { organizationId: params.organizationId })
      .andWhere('q.serviceKey = :serviceKey', { serviceKey: params.serviceKey })
      .andWhere('q.partnerId = :partnerId', { partnerId: params.partnerId });
    if (params.status) qb.andWhere('q.status = :status', { status: params.status });
    if (params.search && params.search.trim()) {
      qb.andWhere('(q.qrCodeName ILIKE :s OR q.campaignName ILIKE :s)', { s: `%${params.search.trim()}%` });
    }
    qb.orderBy('q.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /** 단건(스코프 검증). */
  async getById(organizationId: string, serviceKey: string, qrCodeId: string): Promise<ForeignVisitorPartnerQrCode | null> {
    return this.repo.findOne({ where: { id: qrCodeId, organizationId, serviceKey } });
  }

  /**
   * WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1:
   * public landing 용 shortCode 해석(인증 없음). 활성(ACTIVE)이고 유효기간 내일 때만 반환.
   *   - 비활성/미존재/유효기간 밖 → null (라우트가 404).
   *   - scan event 미기록(no-op) · partnerId 미노출은 라우트 책임.
   * shortCode 는 전역 UNIQUE 이므로 serviceKey 없이 식별 가능.
   */
  async resolvePublicByShortCode(
    shortCode: string,
    now: Date = new Date(),
  ): Promise<ForeignVisitorPartnerQrCode | null> {
    const qr = await this.repo.findOne({ where: { shortCode } });
    if (!qr || qr.status !== 'ACTIVE') return null;
    if (qr.validFrom && qr.validFrom.getTime() > now.getTime()) return null;
    if (qr.validTo && qr.validTo.getTime() < now.getTime()) return null;
    return qr;
  }

  /** 생성 — shortCode/landingUrl 서버 생성, 템플릿 AFFILIATE_MARKETING 고정. */
  async create(
    organizationId: string,
    serviceKey: string,
    partnerId: string,
    input: QrWriteInput,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartnerQrCode> {
    // shortCode 유니크 재시도
    let shortCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `fvq_${randomBytes(4).toString('hex')}`;
      const exists = await this.repo.findOne({ where: { shortCode: candidate } });
      if (!exists) { shortCode = candidate; break; }
    }
    if (!shortCode) throw new Error('shortCode 생성에 실패했습니다.');

    const entity = this.repo.create({
      organizationId,
      serviceKey,
      partnerId,
      qrTemplateType: 'AFFILIATE_MARKETING',
      qrCodeName: input.qrCodeName,
      campaignName: input.campaignName ?? null,
      language: input.language ?? null,
      landingUrl: buildAffiliateLandingUrl(serviceKey, shortCode),
      shortCode,
      validFrom: parseDate(input.validFrom),
      validTo: parseDate(input.validTo),
      status: input.status ?? 'ACTIVE',
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null,
    });
    return this.repo.save(entity);
  }

  /** 부분 수정 (shortCode/landingUrl 불변). */
  async update(
    organizationId: string,
    serviceKey: string,
    qrCodeId: string,
    input: Partial<QrWriteInput>,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartnerQrCode | null> {
    const existing = await this.getById(organizationId, serviceKey, qrCodeId);
    if (!existing) return null;
    if (input.qrCodeName !== undefined) existing.qrCodeName = input.qrCodeName;
    if (input.campaignName !== undefined) existing.campaignName = input.campaignName;
    if (input.language !== undefined) existing.language = input.language;
    if (input.validFrom !== undefined) existing.validFrom = parseDate(input.validFrom);
    if (input.validTo !== undefined) existing.validTo = parseDate(input.validTo);
    if (input.status !== undefined) existing.status = input.status;
    existing.updatedBy = actorUserId ?? existing.updatedBy ?? null;
    return this.repo.save(existing);
  }

  /** 상태 변경. */
  async setStatus(
    organizationId: string,
    serviceKey: string,
    qrCodeId: string,
    status: ForeignVisitorQrStatus,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartnerQrCode | null> {
    const existing = await this.getById(organizationId, serviceKey, qrCodeId);
    if (!existing) return null;
    existing.status = status;
    existing.updatedBy = actorUserId ?? existing.updatedBy ?? null;
    return this.repo.save(existing);
  }
}
