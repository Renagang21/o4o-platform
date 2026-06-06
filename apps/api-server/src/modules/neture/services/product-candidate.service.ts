/**
 * ProductCandidateService — Product Candidate Review Queue (Phase 3)
 *
 * WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §2, §8
 *
 * 상품 후보(product_candidates) 검토 큐 service. Identifier Core(Phase 2) 를 활용해
 * 후보를 기존 ProductMaster 와 매칭하거나 분류한다.
 *
 * 안전 원칙:
 *   - 자동으로 ProductMaster 를 생성하지 않는다.
 *   - exact identifier match 라도 candidate_status 를 바로 'approved' 로 두지 않고 'matched' 로 둔다.
 *   - approveAsNewProductMaster 는 이번 WO 에서 guarded skeleton (실제 Master 생성은 후속 WO).
 *   - Boundary(CLAUDE.md §7): raw SQL 미사용, repository + parameter binding. service_key/organization_id 보유.
 */

import type { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { IsNull, ILike } from 'typeorm';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import type {
  ProductCandidateSourceType,
  ProductCandidateStatus,
  ProductCandidateMatchStatus,
} from '../entities/ProductCandidate.entity.js';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import { ProductIdentifierService } from './product-identifier.service.js';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';
// WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1
import {
  classifyProductType,
  getDefaultDrugDisplayPolicy,
  isOtcRegistrable as isOtcRegistrableClass,
  isRxClass as isRxClassFn,
} from '../utils/product-type.util.js';
import type { ProductTypeClass, ProductDrugCategory, DrugDisplayPolicy } from '../utils/product-type.util.js';

/**
 * 후보 분류 결과 (표시/검토용 — 판매/노출 권한을 여는 로직 아님). F3.
 *  - basis 'matched_master': matchedProductMaster 의 regulatoryType + drugCategory 기준
 *  - basis 'inferred': matched master 없음 → candidate rawPayload 추론 (확정 아님)
 */
export interface CandidateClassification {
  productTypeClass: ProductTypeClass;
  drugCategory: ProductDrugCategory | null;
  displayPolicy: DrugDisplayPolicy;
  isOtcRegistrable: boolean;
  isRxClass: boolean;
  basis: 'matched_master' | 'inferred';
}

export type ProductCandidateWithClassification = ProductCandidate & { classification: CandidateClassification };

export interface CreateCandidateInput {
  serviceKey?: string | null;
  organizationId?: string | null;
  sourceType: ProductCandidateSourceType;
  sourceId?: string | null;
  sourceLabel?: string | null;
  submittedBy?: string | null;
  identifierType?: ProductIdentifierType | null;
  identifierValue?: string | null;
  candidateName?: string | null;
  candidateBrand?: string | null;
  candidateManufacturer?: string | null;
  candidateCategory?: string | null;
  candidateSpec?: string | null;
  candidateUnit?: string | null;
  candidateImageUrl?: string | null;
  candidatePrice?: number | string | null;
  rawPayload?: Record<string, unknown> | null;
}

export interface FindCandidatesFilter {
  candidateStatus?: ProductCandidateStatus;
  matchStatus?: ProductCandidateMatchStatus;
  sourceType?: ProductCandidateSourceType;
  serviceKey?: string;
  organizationId?: string;
  /** operator scope: null = cross-service(platform admin), 배열 = 제한 */
  scopeServiceKeys?: string[] | null;
  page?: number;
  limit?: number;
}

export interface MatchOutcome {
  matchStatus: ProductCandidateMatchStatus;
  matchedProductMasterId: string | null;
  matchedIdentifierId: string | null;
  confidenceScore: string | null;
}

export class ProductCandidateService {
  private readonly repo: Repository<ProductCandidate>;
  private readonly masterRepo: Repository<ProductMaster>;
  private readonly identifierService: ProductIdentifierService;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProductCandidate);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.identifierService = new ProductIdentifierService(dataSource);
  }

  /** 후보 생성 (status=pending, match_status=unmatched). 매칭은 별도 호출. */
  async createCandidate(input: CreateCandidateInput): Promise<ProductCandidate> {
    const normalized =
      input.identifierType && input.identifierValue
        ? normalizeIdentifier(input.identifierType, input.identifierValue)
        : null;

    const entity = this.repo.create({
      serviceKey: input.serviceKey ?? null,
      organizationId: input.organizationId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      sourceLabel: input.sourceLabel ?? null,
      submittedBy: input.submittedBy ?? null,
      candidateStatus: 'pending',
      matchStatus: 'unmatched',
      identifierType: input.identifierType ?? null,
      identifierValue: input.identifierValue ?? null,
      normalizedIdentifierValue: normalized,
      candidateName: input.candidateName ?? null,
      candidateBrand: input.candidateBrand ?? null,
      candidateManufacturer: input.candidateManufacturer ?? null,
      candidateCategory: input.candidateCategory ?? null,
      candidateSpec: input.candidateSpec ?? null,
      candidateUnit: input.candidateUnit ?? null,
      candidateImageUrl: input.candidateImageUrl ?? null,
      candidatePrice: input.candidatePrice != null ? String(input.candidatePrice) : null,
      rawPayload: input.rawPayload ?? null,
    });
    return this.repo.save(entity);
  }

  /** 후보 생성 + 즉시 매칭 시도 (자동 승격은 하지 않음). */
  async createCandidateFromIdentifier(input: CreateCandidateInput): Promise<ProductCandidate> {
    const created = await this.createCandidate(input);
    return this.matchCandidate(created.id);
  }

  async getCandidate(id: string): Promise<ProductCandidate | null> {
    return this.repo.findOne({ where: { id, deletedAt: IsNull() } });
  }

  /**
   * 후보 목록/단건에 분류(classification)를 부착한다 (F3 — 표시/검토용).
   *
   * matchedProductMaster 가 있으면 그 regulatoryType + drugCategory 로 분류(basis=matched_master),
   * 없으면 candidate rawPayload 로 추론(basis=inferred). matched 의 master 는 batch 로 1회 조회(N+1 회피).
   * ProductMaster/Candidate 를 변경하지 않는다 (읽기만).
   */
  async withClassification(items: ProductCandidate[]): Promise<ProductCandidateWithClassification[]> {
    const masterIds = [...new Set(items.map((c) => c.matchedProductMasterId).filter((v): v is string => !!v))];
    const masterMap = new Map<string, { regulatoryType: string | null; drugCategory: string | null }>();
    if (masterIds.length > 0) {
      const rows: Array<{ id: string; regulatory_type: string | null; drug_category: string | null }> =
        await this.dataSource.query(
          `SELECT id, regulatory_type, drug_category FROM product_masters WHERE id = ANY($1)`,
          [masterIds],
        );
      for (const r of rows) masterMap.set(r.id, { regulatoryType: r.regulatory_type, drugCategory: r.drug_category });
    }

    return items.map((c) => {
      const master = c.matchedProductMasterId ? masterMap.get(c.matchedProductMasterId) : undefined;
      let productTypeClass: ProductTypeClass;
      let drugCategory: ProductDrugCategory | null;
      let basis: 'matched_master' | 'inferred';
      if (master) {
        productTypeClass = classifyProductType({ regulatoryType: master.regulatoryType, drugCategory: master.drugCategory });
        drugCategory = (master.drugCategory as ProductDrugCategory | null) ?? null;
        basis = 'matched_master';
      } else {
        productTypeClass = classifyProductType({ rawPayload: c.rawPayload });
        drugCategory = null;
        basis = 'inferred';
      }
      const classification: CandidateClassification = {
        productTypeClass,
        drugCategory,
        displayPolicy: getDefaultDrugDisplayPolicy(productTypeClass),
        isOtcRegistrable: isOtcRegistrableClass(productTypeClass),
        isRxClass: isRxClassFn(productTypeClass),
        basis,
      };
      return Object.assign(c, { classification });
    });
  }

  async findCandidates(filter: FindCandidatesFilter): Promise<{ items: ProductCandidate[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

    const where: FindOptionsWhere<ProductCandidate> = { deletedAt: IsNull() };
    if (filter.candidateStatus) where.candidateStatus = filter.candidateStatus;
    if (filter.matchStatus) where.matchStatus = filter.matchStatus;
    if (filter.sourceType) where.sourceType = filter.sourceType;
    if (filter.organizationId) where.organizationId = filter.organizationId;
    if (filter.serviceKey) where.serviceKey = filter.serviceKey;

    // operator scope 제한: scopeServiceKeys 가 배열이면 해당 service_key 만 (service_key 명시 필터가 우선)
    const useScope =
      filter.scopeServiceKeys != null && filter.scopeServiceKeys.length > 0 && !filter.serviceKey;

    const qb = this.repo
      .createQueryBuilder('pc')
      .where(where)
      .orderBy('pc.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (useScope) {
      qb.andWhere('(pc.service_key = ANY(:keys) OR pc.service_key IS NULL)', {
        keys: filter.scopeServiceKeys,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Identifier Core 기반 매칭 시도. ProductMaster 를 생성하지 않으며 자동 승격하지 않는다.
   *
   * 순서:
   *   1. (type, normalized) identifier 검색
   *   2. normalized identifier 검색 (type 무관)
   *   3. product_masters.barcode fallback
   *   4. name + brand/manufacturer 유사(ILIKE) 검색
   *   5. 없음 → no_match / 충돌(복수 master) → conflict
   */
  async matchCandidate(candidateId: string): Promise<ProductCandidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

    const outcome = await this.computeMatch(candidate);

    candidate.matchStatus = outcome.matchStatus;
    candidate.matchedProductMasterId = outcome.matchedProductMasterId;
    candidate.matchedIdentifierId = outcome.matchedIdentifierId;
    candidate.confidenceScore = outcome.confidenceScore;
    // exact/manual 매칭이어도 candidate_status 는 'matched' 까지만 (자동 승인 금지)
    if (
      outcome.matchStatus === 'exact_identifier_match' ||
      outcome.matchStatus === 'possible_identifier_match'
    ) {
      candidate.candidateStatus = 'matched';
    } else if (candidate.candidateStatus === 'pending') {
      candidate.candidateStatus = 'reviewing';
    }
    return this.repo.save(candidate);
  }

  private async computeMatch(candidate: ProductCandidate): Promise<MatchOutcome> {
    const type = candidate.identifierType as ProductIdentifierType | null;
    const normalized =
      candidate.normalizedIdentifierValue ||
      (type && candidate.identifierValue ? normalizeIdentifier(type, candidate.identifierValue) : null);

    // 1. (type, value) identifier 검색
    if (type && candidate.identifierValue) {
      const hits = await this.identifierService.findByIdentifier(type, candidate.identifierValue);
      const outcome = this.outcomeFromIdentifierHits(hits, 'exact_identifier_match', '1.0000');
      if (outcome) return outcome;
    }

    // 2. normalized identifier 검색 (type 무관)
    if (normalized) {
      const hits = await this.identifierService.findByNormalizedValue(normalized);
      const outcome = this.outcomeFromIdentifierHits(hits, 'possible_identifier_match', '0.8000');
      if (outcome) return outcome;
    }

    // 3. product_masters.barcode fallback
    if (normalized) {
      const masters = await this.masterRepo.find({ where: { barcode: normalized }, take: 2 });
      if (masters.length === 1) {
        return {
          matchStatus: 'possible_identifier_match',
          matchedProductMasterId: masters[0].id,
          matchedIdentifierId: null,
          confidenceScore: '0.7000',
        };
      }
      if (masters.length > 1) {
        return { matchStatus: 'conflict', matchedProductMasterId: null, matchedIdentifierId: null, confidenceScore: null };
      }
    }

    // 4. name + brand/manufacturer 유사 검색
    if (candidate.candidateName && candidate.candidateName.trim()) {
      const where: FindOptionsWhere<ProductMaster> = { name: ILike(`%${candidate.candidateName.trim()}%`) };
      const masters = await this.masterRepo.find({ where, take: 2 });
      if (masters.length >= 1) {
        return {
          matchStatus: 'possible_text_match',
          matchedProductMasterId: masters.length === 1 ? masters[0].id : null,
          matchedIdentifierId: null,
          confidenceScore: '0.4000',
        };
      }
    }

    return { matchStatus: 'no_match', matchedProductMasterId: null, matchedIdentifierId: null, confidenceScore: null };
  }

  /** identifier 검색 결과를 distinct master 기준으로 outcome 으로 변환. 없음 → null, 복수 master → conflict. */
  private outcomeFromIdentifierHits(
    hits: { productMasterId: string; id: string }[],
    matchStatus: ProductCandidateMatchStatus,
    confidence: string,
  ): MatchOutcome | null {
    if (hits.length === 0) return null;
    const distinctMasters = [...new Set(hits.map((h) => h.productMasterId))];
    if (distinctMasters.length > 1) {
      return { matchStatus: 'conflict', matchedProductMasterId: null, matchedIdentifierId: null, confidenceScore: null };
    }
    return {
      matchStatus,
      matchedProductMasterId: distinctMasters[0],
      matchedIdentifierId: hits[0].id,
      confidenceScore: confidence,
    };
  }

  /** 운영자 수동 매칭. 기존 Master 와 연결만 한다 (Master 생성 없음). */
  async manuallyMatchCandidate(
    candidateId: string,
    productMasterId: string,
    reviewedBy?: string | null,
  ): Promise<ProductCandidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    const master = await this.masterRepo.findOne({ where: { id: productMasterId } });
    if (!master) throw new Error('PRODUCT_MASTER_NOT_FOUND');

    candidate.matchedProductMasterId = master.id;
    candidate.matchedIdentifierId = null;
    candidate.matchStatus = 'manually_matched';
    candidate.candidateStatus = 'matched';
    candidate.confidenceScore = '1.0000';
    candidate.reviewedBy = reviewedBy ?? null;
    candidate.reviewedAt = new Date();
    return this.repo.save(candidate);
  }

  async rejectCandidate(candidateId: string, reason?: string, reviewedBy?: string | null): Promise<ProductCandidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    candidate.candidateStatus = 'rejected';
    candidate.reviewNote = reason ?? candidate.reviewNote;
    candidate.reviewedBy = reviewedBy ?? null;
    candidate.reviewedAt = new Date();
    return this.repo.save(candidate);
  }

  async archiveCandidate(candidateId: string, reviewedBy?: string | null): Promise<ProductCandidate> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    candidate.candidateStatus = 'archived';
    candidate.reviewedBy = reviewedBy ?? null;
    candidate.reviewedAt = new Date();
    return this.repo.save(candidate);
  }

  /**
   * 매칭된 candidate 를 약국/매장 활용 상품으로 연결.
   *
   * WO-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1
   *
   * 이미 매칭된 ProductMaster 를 기준으로 StoreProductProfile + OrganizationProductListing 을
   * idempotent upsert 한다. ProductMaster/ProductIdentifier/SupplierProductOffer 를 생성하지 않으며,
   * offer 없이 master-only listing 으로 추가한다 (canonical: store-product-library master 등록).
   *
   * - 중복(organization + master)은 ON CONFLICT DO NOTHING + lookup 으로 멱등 처리.
   * - candidate_status='linked', reviewedBy/reviewedAt 기록, rawPayload.link 에 결과 적재.
   */
  async linkCandidateToOrganizationListing(
    candidateId: string,
    input: {
      organizationId: string;
      serviceKey: string;
      storeId?: string | null;
      displayName?: string | null;
      displayDescription?: string | null;
      note?: string | null;
      reviewedBy?: string | null;
    },
  ): Promise<{
    candidate: ProductCandidate;
    storeProductProfile: Record<string, unknown> | null;
    organizationProductListing: Record<string, unknown> | null;
    alreadyExisted: boolean;
  }> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    if (candidate.candidateStatus === 'rejected' || candidate.candidateStatus === 'archived') {
      throw new Error('CANDIDATE_NOT_LINKABLE');
    }
    if (!candidate.matchedProductMasterId) throw new Error('CANDIDATE_NOT_MATCHED');
    if (!input.organizationId) throw new Error('ORGANIZATION_ID_REQUIRED');
    if (!input.serviceKey) throw new Error('SERVICE_KEY_REQUIRED');

    const masterId = candidate.matchedProductMasterId;
    const masterRows: Array<{ id: string; name: string | null }> = await this.dataSource.query(
      `SELECT id, name FROM product_masters WHERE id = $1`,
      [masterId],
    );
    if (masterRows.length === 0) throw new Error('PRODUCT_MASTER_NOT_FOUND');
    const masterName = masterRows[0].name;

    // ── StoreProductProfile upsert (UNIQUE org+master) ──
    const displayName = input.displayName || candidate.candidateName || masterName || null;
    const description = input.displayDescription ?? null;
    let profileCreated = true;
    let profileRows: Record<string, unknown>[] = await this.dataSource.query(
      `INSERT INTO store_product_profiles
        (id, organization_id, master_id, display_name, description, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (organization_id, master_id) DO NOTHING
       RETURNING *`,
      [input.organizationId, masterId, displayName, description],
    );
    if (profileRows.length === 0) {
      profileCreated = false;
      profileRows = await this.dataSource.query(
        `SELECT * FROM store_product_profiles WHERE organization_id = $1 AND master_id = $2 LIMIT 1`,
        [input.organizationId, masterId],
      );
    }

    // ── OrganizationProductListing upsert (master-only, offer_id NULL) ──
    let listingCreated = true;
    let listingRows: Record<string, unknown>[] = await this.dataSource.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id, is_active, price, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $3, $2, NULL, true, NULL, NOW(), NOW())
       ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING
       RETURNING *`,
      [input.organizationId, masterId, input.serviceKey],
    );
    if (listingRows.length === 0) {
      listingCreated = false;
      listingRows = await this.dataSource.query(
        `SELECT * FROM organization_product_listings
         WHERE organization_id = $1 AND service_key = $3 AND master_id = $2 AND offer_id IS NULL
         LIMIT 1`,
        [input.organizationId, masterId, input.serviceKey],
      );
    }

    const alreadyExisted = !listingCreated && !profileCreated;

    // ── candidate 갱신 ──
    candidate.candidateStatus = 'linked';
    candidate.reviewedBy = input.reviewedBy ?? candidate.reviewedBy ?? null;
    candidate.reviewedAt = new Date();
    if (input.note) candidate.reviewNote = input.note;
    candidate.rawPayload = {
      ...(candidate.rawPayload ?? {}),
      link: {
        organizationId: input.organizationId,
        serviceKey: input.serviceKey,
        storeId: input.storeId ?? null,
        masterId,
        listingId: (listingRows[0] as { id?: string })?.id ?? null,
        profileId: (profileRows[0] as { id?: string })?.id ?? null,
        listingCreated,
        profileCreated,
      },
    };
    const saved = await this.repo.save(candidate);

    return {
      candidate: saved,
      storeProductProfile: profileRows[0] ?? null,
      organizationProductListing: listingRows[0] ?? null,
      alreadyExisted,
    };
  }

  /**
   * 매칭된 ProductMaster 의 drug_category 를 운영자가 refine (F4).
   *
   * WO-O4O-OPERATOR-PRODUCT-DRUG-CATEGORY-REFINE-UX-F4-V1
   *
   * 분류/검토 정보 변경일 뿐 판매/노출 권한 변경 아님. ProductMaster 신규 생성·regulatoryType 변경 없음.
   * regulatoryType 충돌 가드: 의약품(DRUG)만 otc/rx/drug_unspecified, 의약외품(QUASI)도 quasi_drug 허용.
   */
  async refineCandidateDrugCategory(
    candidateId: string,
    input: { drugCategory: ProductDrugCategory | null; note?: string | null; reviewedBy?: string | null },
  ): Promise<{
    candidate: ProductCandidateWithClassification;
    classification: CandidateClassification;
    productMaster: { id: string; name: string; regulatoryType: string; drugCategory: ProductDrugCategory | null };
  }> {
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    if (candidate.candidateStatus === 'rejected' || candidate.candidateStatus === 'archived') {
      throw new Error('CANDIDATE_NOT_REFINABLE');
    }
    if (!candidate.matchedProductMasterId) throw new Error('CANDIDATE_NOT_MATCHED');

    const target = input.drugCategory;
    const ALLOWED: (ProductDrugCategory | null)[] = ['otc', 'rx', 'quasi_drug', 'drug_unspecified', null];
    if (!ALLOWED.includes(target)) throw new Error('INVALID_DRUG_CATEGORY');

    const master = await this.masterRepo.findOne({ where: { id: candidate.matchedProductMasterId } });
    if (!master) throw new Error('PRODUCT_MASTER_NOT_FOUND');

    // regulatoryType 충돌 가드 (영문 코드 + 한글 별칭 모두 수용). regulatoryType 자체는 변경하지 않는다.
    const reg = (master.regulatoryType ?? '').trim();
    const isDrug = ['DRUG', '의약품'].includes(reg);
    const isQuasi = ['QUASI_DRUG', '의약외품'].includes(reg);
    if (target === 'otc' || target === 'rx' || target === 'drug_unspecified') {
      if (!isDrug) throw new Error('DRUG_CATEGORY_REGULATORY_CONFLICT');
    } else if (target === 'quasi_drug') {
      if (!isDrug && !isQuasi) throw new Error('DRUG_CATEGORY_REGULATORY_CONFLICT');
    }
    // target === null 은 항상 허용 (분류 초기화)

    const prev = master.drugCategory ?? null;
    master.drugCategory = target;
    await this.masterRepo.save(master);

    const refineNote = `[drug-category-refine] ${prev ?? '∅'} → ${target ?? 'null'} by operator${input.note ? ` | ${input.note}` : ''}`;
    candidate.reviewNote = refineNote;
    candidate.reviewedBy = input.reviewedBy ?? candidate.reviewedBy ?? null;
    candidate.reviewedAt = new Date();
    await this.repo.save(candidate);

    const [enriched] = await this.withClassification([candidate]);
    return {
      candidate: enriched,
      classification: enriched.classification,
      productMaster: {
        id: master.id,
        name: master.name,
        regulatoryType: master.regulatoryType,
        drugCategory: master.drugCategory ?? null,
      },
    };
  }

  /**
   * 신규 ProductMaster 승격 — guarded skeleton.
   *
   * 이번 WO 에서는 실제 ProductMaster 생성을 하지 않는다 (미검증 데이터의 SSOT 오염 방지).
   * barcode 검증/MFDS regulatory/Identifier Core 동기화를 동반한 정식 승격은 후속 WO 로 분리한다.
   */
  async approveAsNewProductMaster(_candidateId: string): Promise<never> {
    throw new Error('NOT_IMPLEMENTED: approveAsNewProductMaster 는 후속 WO 에서 구현됩니다. 현재는 manual-match 만 지원합니다.');
  }
}
