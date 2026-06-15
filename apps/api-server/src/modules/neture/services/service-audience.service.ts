import type { DataSource, Repository } from 'typeorm';
import { ServiceAudiencePolicy } from '../entities/index.js';
import { O4O_SERVICES, getServiceName } from '../../../config/service-catalog.js';
import logger from '../../../utils/logger.js';

/**
 * ServiceAudienceService
 *
 * WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
 *
 * 서비스별 "약국 대상 서비스 여부" 정책의 조회/수정 + 후속 gate 용 helper.
 * 본 WO 는 정책 저장/조회까지만 — gate 실제 적용은 WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1.
 */

// row 부재 시 fallback — 레거시 하드코딩(offer.service.ts PHARMACY_ALLOWED_SERVICE_KEYS)과 동일.
// 본 정책 테이블이 이를 대체하며, seed 미적용/신규 서비스에 대한 안전 기본값으로만 사용한다.
const DEFAULT_PHARMACY_SERVICE_KEYS: readonly string[] = ['glycopharm', 'kpa-society'];

export interface ServiceAudiencePolicyDto {
  serviceKey: string;
  serviceName: string;
  isPharmacyTargetService: boolean;
  note: string | null;
  updatedAt: string | null;
  /** DB row 존재 여부 (false = fallback 기본값 표시 중) */
  persisted: boolean;
}

export class ServiceAudienceService {
  private repo: Repository<ServiceAudiencePolicy>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(ServiceAudiencePolicy);
  }

  /** 카탈로그 전 서비스 + 저장된 정책 병합 목록 (admin 화면용) */
  async list(): Promise<ServiceAudiencePolicyDto[]> {
    const rows = await this.repo.find();
    const rowMap = new Map(rows.map((r) => [r.serviceKey, r]));

    // 카탈로그에 없는 serviceKey 가 DB 에 있으면 함께 노출 (방어)
    const keys = new Set<string>([...O4O_SERVICES.map((s) => s.key), ...rows.map((r) => r.serviceKey)]);

    return Array.from(keys)
      .sort()
      .map((serviceKey) => {
        const row = rowMap.get(serviceKey);
        return {
          serviceKey,
          serviceName: getServiceName(serviceKey),
          isPharmacyTargetService: row ? row.isPharmacyTargetService : DEFAULT_PHARMACY_SERVICE_KEYS.includes(serviceKey),
          note: row?.note ?? null,
          updatedAt: row ? row.updatedAt.toISOString() : null,
          persisted: !!row,
        };
      });
  }

  /** 단건 조회 (없으면 fallback 기본값 DTO) */
  async get(serviceKey: string): Promise<ServiceAudiencePolicyDto> {
    const row = await this.repo.findOne({ where: { serviceKey } });
    return {
      serviceKey,
      serviceName: getServiceName(serviceKey),
      isPharmacyTargetService: row ? row.isPharmacyTargetService : DEFAULT_PHARMACY_SERVICE_KEYS.includes(serviceKey),
      note: row?.note ?? null,
      updatedAt: row ? row.updatedAt.toISOString() : null,
      persisted: !!row,
    };
  }

  /** upsert (admin) */
  async upsert(
    serviceKey: string,
    input: { isPharmacyTargetService?: boolean; note?: string | null },
    updatedBy: string | null,
  ) {
    const key = (serviceKey || '').trim();
    if (!key) return { success: false as const, error: 'INVALID_SERVICE_KEY' };

    let row = await this.repo.findOne({ where: { serviceKey: key } });
    if (!row) {
      row = this.repo.create({ serviceKey: key, isPharmacyTargetService: DEFAULT_PHARMACY_SERVICE_KEYS.includes(key) });
    }
    if (typeof input.isPharmacyTargetService === 'boolean') {
      row.isPharmacyTargetService = input.isPharmacyTargetService;
    }
    if (input.note !== undefined) {
      const trimmed = typeof input.note === 'string' ? input.note.trim() : '';
      row.note = trimmed.length > 0 ? trimmed : null;
    }
    row.updatedBy = updatedBy;
    await this.repo.save(row);

    logger.info(`[ServiceAudience] upsert ${key} isPharmacyTarget=${row.isPharmacyTargetService}`);
    return { success: true as const, data: await this.get(key) };
  }

  /**
   * 후속 gate 용 helper — 해당 서비스가 약국 대상인지.
   * (WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1 에서 의약품 서비스 연결 판정에 사용 예정)
   * row 부재 시 레거시 기본값으로 fallback → 안전.
   */
  async isPharmacyAudienceService(serviceKey: string): Promise<boolean> {
    const row = await this.repo.findOne({ where: { serviceKey } });
    if (row) return row.isPharmacyTargetService;
    return DEFAULT_PHARMACY_SERVICE_KEYS.includes(serviceKey);
  }

  /**
   * 전 정책을 1회 조회해 동기 resolver 반환 (여러 serviceKey/offer 일괄 gate 용).
   * row 부재 serviceKey 는 레거시 기본값으로 fallback.
   * WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1
   */
  async getPharmacyAudienceResolver(): Promise<(serviceKey: string) => boolean> {
    const rows = await this.repo.find();
    const map = new Map(rows.map((r) => [r.serviceKey, r.isPharmacyTargetService]));
    return (serviceKey: string) =>
      map.has(serviceKey) ? !!map.get(serviceKey) : DEFAULT_PHARMACY_SERVICE_KEYS.includes(serviceKey);
  }
}
