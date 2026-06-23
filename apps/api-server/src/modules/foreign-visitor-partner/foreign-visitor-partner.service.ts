/**
 * ForeignVisitorPartnerService
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1
 *
 * 외국인 관광객 유입 파트너 CRUD — 전부 (organizationId, serviceKey) 스코프.
 * 소유권: 호출 라우트가 isStoreOwner 로 organizationId 를 해석해 넘긴다(client storeId 미신뢰).
 * V1: hard delete 미제공(상태 INACTIVE). soft delete 컬럼은 보존용.
 */
import type { DataSource, Repository } from 'typeorm';
import {
  ForeignVisitorPartner,
  type ForeignVisitorPartnerType,
  type ForeignVisitorPartnerStatus,
} from './foreign-visitor-partner.entity.js';

export interface ListPartnersParams {
  organizationId: string;
  serviceKey: string;
  status?: ForeignVisitorPartnerStatus;
  partnerType?: ForeignVisitorPartnerType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PartnerWriteInput {
  partnerType: ForeignVisitorPartnerType;
  partnerName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  memo?: string | null;
  status?: ForeignVisitorPartnerStatus;
}

export class ForeignVisitorPartnerService {
  private repo: Repository<ForeignVisitorPartner>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ForeignVisitorPartner);
  }

  /** (org+service) 스코프 목록 + 필터/검색/페이지네이션. */
  async list(params: ListPartnersParams): Promise<{ items: ForeignVisitorPartner[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId: params.organizationId })
      .andWhere('p.serviceKey = :serviceKey', { serviceKey: params.serviceKey });

    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.partnerType) qb.andWhere('p.partnerType = :partnerType', { partnerType: params.partnerType });
    if (params.search && params.search.trim()) {
      qb.andWhere('(p.partnerName ILIKE :q OR p.contactName ILIKE :q)', { q: `%${params.search.trim()}%` });
    }

    qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /** 단건 조회 — 스코프 밖이면 null. */
  async getById(organizationId: string, serviceKey: string, partnerId: string): Promise<ForeignVisitorPartner | null> {
    return this.repo.findOne({ where: { id: partnerId, organizationId, serviceKey } });
  }

  /** 생성 — status 기본 ACTIVE. */
  async create(
    organizationId: string,
    serviceKey: string,
    input: PartnerWriteInput,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartner> {
    const entity = this.repo.create({
      organizationId,
      serviceKey,
      partnerType: input.partnerType,
      partnerName: input.partnerName,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      memo: input.memo ?? null,
      status: input.status ?? 'ACTIVE',
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null,
    });
    return this.repo.save(entity);
  }

  /** 부분 수정 — 스코프 검증 후 전달된 필드만 갱신. 미존재 시 null. */
  async update(
    organizationId: string,
    serviceKey: string,
    partnerId: string,
    input: Partial<PartnerWriteInput>,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartner | null> {
    const existing = await this.getById(organizationId, serviceKey, partnerId);
    if (!existing) return null;

    if (input.partnerType !== undefined) existing.partnerType = input.partnerType;
    if (input.partnerName !== undefined) existing.partnerName = input.partnerName;
    if (input.contactName !== undefined) existing.contactName = input.contactName;
    if (input.contactPhone !== undefined) existing.contactPhone = input.contactPhone;
    if (input.contactEmail !== undefined) existing.contactEmail = input.contactEmail;
    if (input.memo !== undefined) existing.memo = input.memo;
    if (input.status !== undefined) existing.status = input.status;
    existing.updatedBy = actorUserId ?? existing.updatedBy ?? null;

    return this.repo.save(existing);
  }

  /** 상태 변경(ACTIVE/INACTIVE). 미존재 시 null. */
  async setStatus(
    organizationId: string,
    serviceKey: string,
    partnerId: string,
    status: ForeignVisitorPartnerStatus,
    actorUserId?: string,
  ): Promise<ForeignVisitorPartner | null> {
    const existing = await this.getById(organizationId, serviceKey, partnerId);
    if (!existing) return null;
    existing.status = status;
    existing.updatedBy = actorUserId ?? existing.updatedBy ?? null;
    return this.repo.save(existing);
  }
}
