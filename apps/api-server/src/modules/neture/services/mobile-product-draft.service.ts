/**
 * MobileProductDraftService — Mobile Product Draft (Phase 4)
 *
 * WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §8
 *
 * 모바일 수집 draft 의 생성/수정/제출/보관/후보전환을 담당한다.
 * draft → product_candidates 전환은 Phase 3 ProductCandidateService 를 사용한다.
 *
 * 안전 원칙:
 *   - ProductMaster 를 직접 생성하지 않는다.
 *   - ProductIdentifier 를 직접 생성하지 않는다.
 *   - ProductCandidate.approveAsNewProductMaster 를 호출하지 않는다.
 *   - 모바일은 "수집"만 — 확정은 웹/운영자 검토 큐에서.
 */

import type { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { IsNull } from 'typeorm';
import { MobileProductDraft } from '../entities/MobileProductDraft.entity.js';
import type {
  MobileProductDraftStatus,
  MobileProductDraftSourceApp,
} from '../entities/MobileProductDraft.entity.js';
import { ProductCandidateService } from './product-candidate.service.js';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';

export interface CreateDraftInput {
  serviceKey?: string | null;
  organizationId?: string | null;
  storeId?: string | null;
  submittedBy?: string | null;
  sourceApp?: MobileProductDraftSourceApp | null;
  identifierType?: string | null;
  identifierValue?: string | null;
  capturedName?: string | null;
  capturedBrand?: string | null;
  capturedManufacturer?: string | null;
  capturedCategory?: string | null;
  capturedSpec?: string | null;
  capturedUnit?: string | null;
  capturedPrice?: number | string | null;
  capturedCurrency?: string | null;
  thumbnailImageUrl?: string | null;
  imageUrls?: string[] | null;
  memo?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

export type UpdateDraftInput = Partial<CreateDraftInput>;

export interface ListDraftsFilter {
  submittedBy?: string;
  serviceKey?: string;
  organizationId?: string;
  storeId?: string;
  draftStatus?: MobileProductDraftStatus;
  page?: number;
  limit?: number;
}

function computeNormalized(type?: string | null, value?: string | null): string | null {
  if (!type || !value) return null;
  return normalizeIdentifier(type as ProductIdentifierType, value);
}

export class MobileProductDraftService {
  private readonly repo: Repository<MobileProductDraft>;
  private readonly candidateService: ProductCandidateService;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(MobileProductDraft);
    this.candidateService = new ProductCandidateService(dataSource);
  }

  async createDraft(input: CreateDraftInput): Promise<MobileProductDraft> {
    const entity = this.repo.create({
      serviceKey: input.serviceKey ?? null,
      organizationId: input.organizationId ?? null,
      storeId: input.storeId ?? null,
      submittedBy: input.submittedBy ?? null,
      sourceApp: input.sourceApp ?? null,
      draftStatus: 'draft',
      identifierType: input.identifierType ?? null,
      identifierValue: input.identifierValue ?? null,
      normalizedIdentifierValue: computeNormalized(input.identifierType, input.identifierValue),
      capturedName: input.capturedName ?? null,
      capturedBrand: input.capturedBrand ?? null,
      capturedManufacturer: input.capturedManufacturer ?? null,
      capturedCategory: input.capturedCategory ?? null,
      capturedSpec: input.capturedSpec ?? null,
      capturedUnit: input.capturedUnit ?? null,
      capturedPrice: input.capturedPrice != null ? String(input.capturedPrice) : null,
      capturedCurrency: input.capturedCurrency ?? null,
      thumbnailImageUrl: input.thumbnailImageUrl ?? null,
      imageUrls: input.imageUrls ?? null,
      memo: input.memo ?? null,
      rawPayload: input.rawPayload ?? null,
    });
    return this.repo.save(entity);
  }

  /** 본인(submittedBy) draft 만 조회. ownerId 미지정 시 소유 제한 없음(운영자용). */
  async getDraft(draftId: string, ownerId?: string | null): Promise<MobileProductDraft | null> {
    const where: FindOptionsWhere<MobileProductDraft> = { id: draftId, deletedAt: IsNull() };
    if (ownerId) where.submittedBy = ownerId;
    return this.repo.findOne({ where });
  }

  async updateDraft(draftId: string, input: UpdateDraftInput, ownerId?: string | null): Promise<MobileProductDraft> {
    const draft = await this.getDraft(draftId, ownerId);
    if (!draft) throw new Error('DRAFT_NOT_FOUND');
    if (draft.draftStatus !== 'draft' && draft.draftStatus !== 'submitted') {
      throw new Error('DRAFT_NOT_EDITABLE');
    }

    const assignable: (keyof CreateDraftInput)[] = [
      'serviceKey', 'organizationId', 'storeId', 'sourceApp',
      'identifierType', 'identifierValue',
      'capturedName', 'capturedBrand', 'capturedManufacturer', 'capturedCategory',
      'capturedSpec', 'capturedUnit', 'capturedCurrency',
      'thumbnailImageUrl', 'imageUrls', 'memo', 'rawPayload',
    ];
    const target = draft as unknown as Record<string, unknown>;
    for (const key of assignable) {
      if (input[key] !== undefined) {
        target[key] = input[key];
      }
    }
    if (input.capturedPrice !== undefined) {
      draft.capturedPrice = input.capturedPrice != null ? String(input.capturedPrice) : null;
    }
    if (input.identifierType !== undefined || input.identifierValue !== undefined) {
      draft.normalizedIdentifierValue = computeNormalized(draft.identifierType, draft.identifierValue);
    }
    return this.repo.save(draft);
  }

  async submitDraft(draftId: string, ownerId?: string | null): Promise<MobileProductDraft> {
    const draft = await this.getDraft(draftId, ownerId);
    if (!draft) throw new Error('DRAFT_NOT_FOUND');
    if (draft.draftStatus !== 'draft') throw new Error('DRAFT_NOT_SUBMITTABLE');
    draft.draftStatus = 'submitted';
    draft.submittedAt = new Date();
    return this.repo.save(draft);
  }

  async listDrafts(filter: ListDraftsFilter): Promise<{ items: MobileProductDraft[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

    const where: FindOptionsWhere<MobileProductDraft> = { deletedAt: IsNull() };
    if (filter.submittedBy) where.submittedBy = filter.submittedBy;
    if (filter.serviceKey) where.serviceKey = filter.serviceKey;
    if (filter.organizationId) where.organizationId = filter.organizationId;
    if (filter.storeId) where.storeId = filter.storeId;
    if (filter.draftStatus) where.draftStatus = filter.draftStatus;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async archiveDraft(draftId: string, ownerId?: string | null): Promise<MobileProductDraft> {
    const draft = await this.getDraft(draftId, ownerId);
    if (!draft) throw new Error('DRAFT_NOT_FOUND');
    draft.draftStatus = 'archived';
    draft.archivedAt = new Date();
    return this.repo.save(draft);
  }

  /**
   * draft → product_candidates 전환.
   *
   * ProductMaster/ProductIdentifier 를 생성하지 않고, ProductCandidateService 로 후보를 만든다.
   * 이미 전환된 draft(candidate_created)는 기존 candidate_id 를 반환(idempotent).
   */
  async convertDraftToCandidate(draftId: string, ownerId?: string | null): Promise<MobileProductDraft> {
    const draft = await this.getDraft(draftId, ownerId);
    if (!draft) throw new Error('DRAFT_NOT_FOUND');
    if (draft.candidateId && draft.draftStatus === 'candidate_created') return draft;
    if (draft.draftStatus !== 'draft' && draft.draftStatus !== 'submitted') {
      throw new Error('DRAFT_NOT_CONVERTIBLE');
    }

    const candidate = await this.candidateService.createCandidate({
      serviceKey: draft.serviceKey,
      organizationId: draft.organizationId,
      sourceType: 'mobile_draft',
      sourceId: draft.id,
      sourceLabel: draft.sourceApp ?? 'mobile_app',
      submittedBy: draft.submittedBy,
      identifierType: (draft.identifierType as ProductIdentifierType | null) ?? null,
      identifierValue: draft.identifierValue,
      candidateName: draft.capturedName,
      candidateBrand: draft.capturedBrand,
      candidateManufacturer: draft.capturedManufacturer,
      candidateCategory: draft.capturedCategory,
      candidateSpec: draft.capturedSpec,
      candidateUnit: draft.capturedUnit,
      candidateImageUrl: draft.thumbnailImageUrl,
      candidatePrice: draft.capturedPrice,
      rawPayload: {
        mobileDraftId: draft.id,
        storeId: draft.storeId,
        sourceApp: draft.sourceApp,
        capturedCurrency: draft.capturedCurrency,
        memo: draft.memo,
        imageUrls: draft.imageUrls,
        ...(draft.rawPayload ?? {}),
      },
    });

    // 식별자가 있으면 매칭 시도 (자동 승격은 하지 않음)
    if (candidate.identifierType && candidate.identifierValue) {
      try {
        await this.candidateService.matchCandidate(candidate.id);
      } catch {
        // 매칭 실패는 전환 자체를 막지 않는다 (best-effort)
      }
    }

    draft.candidateId = candidate.id;
    draft.draftStatus = 'candidate_created';
    draft.convertedAt = new Date();
    return this.repo.save(draft);
  }

  async convertDraftsToCandidates(draftIds: string[], ownerId?: string | null): Promise<MobileProductDraft[]> {
    const results: MobileProductDraft[] = [];
    for (const id of draftIds) {
      results.push(await this.convertDraftToCandidate(id, ownerId));
    }
    return results;
  }
}
