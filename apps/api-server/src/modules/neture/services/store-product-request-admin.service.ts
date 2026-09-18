/**
 * Store Product Request Admin Service — store_web 후보 관리자 검토·승인 (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 * 설계: docs/investigations/IR-...-V1.md §4.2, §5(A안)
 *
 * 기존 candidate 콘솔 코어(ProductCandidateService)는 수정하지 않는다. 본 서비스는 store_web 요청
 * 전용 액션(기존 연결 / 신규 승인 / 보완 요청 / 등록 불가)만 additive 로 제공한다.
 *
 * 신규 master 승인: WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 부터
 *   소스 중립 Promotion Core(`ProductPromotionCore.promoteWithin`) 로 위임한다.
 *   - Plan 생성·에러 매핑은 store_web Adapter(`promotion/adapters/store-web-promotion.adapter.ts`)
 *   - 매장 listing/profile · 알림은 Store 도메인(여기) 에 남긴다
 *   - 합성 바코드/이름/제조사 생성 금지: 바코드 없으면 barcode=NULL(정체성=UUID), 이름·제조사 없으면 CANDIDATE_FIELD_MISSING
 *
 * 원자성: Core 승격(Master+Identifier+candidate 전이) + organization listing 생성을
 *   **이 서비스가 여는** 단일 dataSource.transaction 으로 처리한다 (§2.2 (a) — `promote()` 는 쓰지 않는다).
 *   link / conflict / hold 는 Adapter 가 throw → 롤백 → candidate 불변.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import { sanitizeIdentifierValue } from '../utils/product-identifier.util.js';
import logger from '../../../utils/logger.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { ProductPromotionCore } from '../promotion/product-promotion-core.service.js';
import {
  STORE_REQUEST_SOURCE_LABEL,
  assertStoreWebCreate,
  buildStoreWebPromotionPlan,
} from '../promotion/adapters/store-web-promotion.adapter.js';

// 컨트롤러가 이 모듈에서 import 한다 — 정의는 Adapter 로 이동, 여기서는 re-export 로 계약 유지
export type { StoreRequestDuplicate } from '../promotion/adapters/store-web-promotion.adapter.js';
import type { StoreRequestDuplicate } from '../promotion/adapters/store-web-promotion.adapter.js';

/** 액션 결과 — 컨트롤러가 커밋 후 제출자 알림에 사용할 필드 포함 */
export interface StoreRequestActionResult {
  masterId?: string;
  listingId?: string | null;
  candidateStatus: string;
  submittedBy: string | null;
  serviceKey: string | null;
  organizationId: string | null;
  productName: string | null;
}

export class StoreProductRequestAdminService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * store_web 요청 후보 로드(+검증).
   *
   * sourceType/sourceLabel 로 일반 candidate·타 소스를 store request 액션에서 차단한다.
   * allowedServiceKeys(=운영자 role-prefix 스코프, null=platform admin)가 주어지면 candidate.serviceKey
   * (role-prefix 형식: 'kpa'/'neture'/'cosmetics')가 스코프에 포함될 때만 허용한다
   * (P3 service-scope hardening — 타 서비스 요청을 다른 서비스 운영자가 처리하지 못하게 차단).
   */
  private async loadStoreRequest(candidateId: string, allowedServiceKeys?: string[] | null): Promise<ProductCandidate> {
    const repo = this.dataSource.getRepository(ProductCandidate);
    const candidate = await repo.findOne({
      where: { id: candidateId, sourceType: 'store_web', sourceLabel: STORE_REQUEST_SOURCE_LABEL },
    });
    if (!candidate) throw new Error('STORE_REQUEST_NOT_FOUND');
    if (candidate.deletedAt) throw new Error('STORE_REQUEST_NOT_FOUND');
    if (allowedServiceKeys != null) {
      if (!candidate.serviceKey || !allowedServiceKeys.includes(candidate.serviceKey)) {
        throw new Error('OUT_OF_SCOPE');
      }
    }
    return candidate;
  }

  /**
   * 신규 승인 전 중복 후보 조회 (read-only). 바코드 정확일치 + (상품명 AND 제조사) 정확일치.
   * 관리자 화면에서 "기존 연결" 유도용 근거로 사용.
   */
  async findDuplicates(candidateId: string, allowedServiceKeys?: string[] | null): Promise<StoreRequestDuplicate[]> {
    const candidate = await this.loadStoreRequest(candidateId, allowedServiceKeys);
    const out: StoreRequestDuplicate[] = [];

    const barcode = candidate.identifierValue ? sanitizeIdentifierValue(candidate.identifierValue) : null;
    if (barcode) {
      const rows: Array<{ id: string; name: string; barcode: string | null; manufacturer_name: string | null }> =
        await this.dataSource.query(
          `SELECT id, name, barcode, manufacturer_name FROM product_masters WHERE barcode = $1 LIMIT 5`,
          [barcode],
        );
      for (const r of rows) out.push({ id: r.id, name: r.name, barcode: r.barcode, manufacturerName: r.manufacturer_name, matchType: 'barcode' });
    }

    const name = (candidate.candidateName ?? '').trim();
    const manuf = (candidate.candidateManufacturer ?? '').trim();
    if (name && manuf) {
      const rows: Array<{ id: string; name: string; barcode: string | null; manufacturer_name: string | null }> =
        await this.dataSource.query(
          `SELECT id, name, barcode, manufacturer_name FROM product_masters
           WHERE LOWER(name) = LOWER($1) AND LOWER(manufacturer_name) = LOWER($2) LIMIT 5`,
          [name, manuf],
        );
      for (const r of rows) {
        if (out.some((d) => d.id === r.id)) continue;
        out.push({ id: r.id, name: r.name, barcode: r.barcode, manufacturerName: r.manufacturer_name, matchType: 'name_manufacturer' });
      }
    }
    return out;
  }

  /** 매장 listing + profile upsert (단일 TX 내부). link 서비스 SQL 형태와 정합. */
  private async upsertOrganizationListing(
    m: EntityManager,
    input: { organizationId: string; serviceKey: string; masterId: string; displayName: string | null },
  ): Promise<{ listingId: string | null }> {
    // WO-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1
    //   candidate.service_key 는 **role-prefix 축**이다('kpa' / 'cosmetics' —
    //   운영자 스코프 `${sk}:operator` 구성에 쓰인다). 반면 OPL.service_key 는 canonical 축이다.
    //   여기가 두 축이 만나는 경계이므로 SSOT resolver 로 한 번만 변환한다.
    //   (로컬 매핑 테이블을 새로 만들지 않는다)
    const listingServiceKey = resolveCanonicalServiceKey(input.serviceKey);
    // store_product_profiles (UNIQUE org+master)
    await m.query(
      `INSERT INTO store_product_profiles
        (id, organization_id, master_id, display_name, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (organization_id, master_id) DO NOTHING`,
      [input.organizationId, input.masterId, input.displayName],
    );
    // organization_product_listings (master-only, offer_id NULL)
    const inserted: Array<{ id: string }> = await m.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id, is_active, price, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $3, $2, NULL, true, NULL, NOW(), NOW())
       ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING
       RETURNING id`,
      [input.organizationId, input.masterId, listingServiceKey],
    );
    if (inserted.length > 0) return { listingId: inserted[0].id };
    const existing: Array<{ id: string }> = await m.query(
      `SELECT id FROM organization_product_listings
       WHERE organization_id = $1 AND service_key = $3 AND master_id = $2 AND offer_id IS NULL LIMIT 1`,
      [input.organizationId, input.masterId, listingServiceKey],
    );
    return { listingId: existing[0]?.id ?? null };
  }

  /**
   * 기존 ProductMaster 연결. candidate.matched_product_master_id = masterId 세팅 후
   * 매장 listing/profile 생성, candidate_status='linked'. 단일 TX.
   */
  async linkToExistingMaster(
    candidateId: string,
    input: { masterId: string; reviewedBy?: string | null; note?: string | null; allowedServiceKeys?: string[] | null },
  ): Promise<StoreRequestActionResult> {
    const candidate = await this.loadStoreRequest(candidateId, input.allowedServiceKeys);
    if (!(candidate.candidateStatus === 'pending' || candidate.candidateStatus === 'reviewing')) {
      throw new Error('STATUS_NOT_REVIEWABLE');
    }
    if (!candidate.organizationId) throw new Error('CANDIDATE_ORG_MISSING');
    const serviceKey = candidate.serviceKey;
    if (!serviceKey) throw new Error('CANDIDATE_SERVICE_KEY_MISSING');

    return this.dataSource.transaction(async (m) => {
      const masterRows: Array<{ id: string; name: string; regulatory_type: string; drug_category: string | null }> =
        await m.query(`SELECT id, name, regulatory_type, drug_category FROM product_masters WHERE id = $1`, [input.masterId]);
      if (masterRows.length === 0) throw new Error('PRODUCT_MASTER_NOT_FOUND');
      // Rx 는 매장 listing 금지 (link 서비스 정책과 동일)
      if ((masterRows[0].regulatory_type === 'DRUG' || masterRows[0].regulatory_type === '의약품') && masterRows[0].drug_category === 'rx') {
        throw new Error('RX_LISTING_BLOCKED');
      }

      const displayName = candidate.candidateName || masterRows[0].name || null;
      const { listingId } = await this.upsertOrganizationListing(m, {
        organizationId: candidate.organizationId!,
        serviceKey,
        masterId: input.masterId,
        displayName,
      });

      await m.query(
        `UPDATE product_candidates
           SET matched_product_master_id = $2, candidate_status = 'linked',
               reviewed_by = $3, reviewed_at = NOW(),
               raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
         WHERE id = $1`,
        [candidateId, input.masterId, input.reviewedBy ?? null,
         JSON.stringify({ approval: { kind: 'link_existing', masterId: input.masterId, listingId, note: input.note ?? null } })],
      );

      logger.info(`[StoreRequestAdmin] linked candidate=${candidateId} -> master=${input.masterId} listing=${listingId}`);
      return {
        masterId: input.masterId, listingId, candidateStatus: 'linked',
        submittedBy: candidate.submittedBy, serviceKey: candidate.serviceKey,
        organizationId: candidate.organizationId, productName: candidate.candidateName,
      };
    });
  }

  /**
   * 신규 ProductMaster 승인 (store_web) — Promotion Core 위임.
   *
   * 흐름 (WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.2):
   *   loadStoreRequest → org/serviceKey 검사(Store 책임) → Adapter Plan
   *   → dataSource.transaction(m):
   *        core.promoteWithin(m, plan)          // Master + Identifier + candidate 전이 (같은 TX)
   *        assertStoreWebCreate(outcome)        // link/conflict/hold → throw → 롤백 (candidate 불변)
   *        upsertOrganizationListing(m, …)      // Store 도메인
   *        raw_payload.approval.listingId 보강
   *   → 커밋 후 core.afterCommit(plan, outcome) // DRUG extension(Adapter 선언 시) + Landing, best-effort
   *
   * `core.promote()` 는 사용하지 않는다 — Master 와 listing 이 다른 TX 로 갈라지면
   * DUPLICATE_MASTER_EXISTS 로 되돌릴 때 candidate 가 이미 matched 로 남는다.
   */
  async approveAsNewMaster(
    candidateId: string,
    input: { reviewedBy?: string | null; note?: string | null; allowedServiceKeys?: string[] | null },
  ): Promise<StoreRequestActionResult & { identifierCreated: boolean }> {
    const candidate = await this.loadStoreRequest(candidateId, input.allowedServiceKeys);
    if (!(candidate.candidateStatus === 'pending' || candidate.candidateStatus === 'reviewing')) {
      throw new Error('STATUS_NOT_REVIEWABLE');
    }
    if (candidate.matchedProductMasterId) throw new Error('ALREADY_LINKED');
    if (!candidate.organizationId) throw new Error('CANDIDATE_ORG_MISSING');
    const serviceKey = candidate.serviceKey;
    if (!serviceKey) throw new Error('CANDIDATE_SERVICE_KEY_MISSING');

    const plan = buildStoreWebPromotionPlan(candidate, { reviewedBy: input.reviewedBy, note: input.note });
    const core = new ProductPromotionCore(this.dataSource);

    const { result, outcome } = await this.dataSource.transaction(async (m) => {
      const outcome = await core.promoteWithin(m, plan);
      assertStoreWebCreate(outcome); // create 이외는 throw → 이 TX 전체 롤백

      // 매장 listing + profile (Store 도메인 — Core 밖)
      const { listingId } = await this.upsertOrganizationListing(m, {
        organizationId: candidate.organizationId!,
        serviceKey,
        masterId: outcome.masterId,
        displayName: plan.master.name,
      });
      // 기존 응답/감사 계약 유지: approval.listingId · identifierCreated
      await m.query(
        `UPDATE product_candidates
           SET raw_payload = jsonb_set(
                 COALESCE(raw_payload, '{}'::jsonb), '{approval}',
                 COALESCE(raw_payload -> 'approval', '{}'::jsonb) || $2::jsonb, true),
               updated_at = NOW()
         WHERE id = $1`,
        [candidateId, JSON.stringify({ listingId, identifierCreated: outcome.identifiersCreated > 0 })],
      );

      logger.info(`[StoreRequestAdmin] approved new master candidate=${candidateId} -> master=${outcome.masterId} listing=${listingId} id=${outcome.identifiersCreated}`);
      const result: StoreRequestActionResult & { identifierCreated: boolean } = {
        masterId: outcome.masterId, listingId, identifierCreated: outcome.identifiersCreated > 0,
        candidateStatus: 'approved_new_master',
        submittedBy: candidate.submittedBy, serviceKey: candidate.serviceKey,
        organizationId: candidate.organizationId, productName: candidate.candidateName,
      };
      return { result, outcome };
    });

    // 커밋 **후** 효과 (DRUG extension · Landing). 롤백 시 여기 도달하지 않으므로 orphan 이 남지 않는다.
    await core.afterCommit(plan, outcome);
    return result;
  }

  /** 보완 요청 — candidate_status='revision_requested' + 메모. 매장이 수정 재제출 시 pending 복귀(P1). */
  async requestRevision(
    candidateId: string,
    input: { note: string; reviewedBy?: string | null; allowedServiceKeys?: string[] | null },
  ): Promise<StoreRequestActionResult> {
    const candidate = await this.loadStoreRequest(candidateId, input.allowedServiceKeys);
    if (!(candidate.candidateStatus === 'pending' || candidate.candidateStatus === 'reviewing')) {
      throw new Error('STATUS_NOT_REVIEWABLE');
    }
    const note = (input.note ?? '').trim();
    if (!note) throw new Error('REVISION_NOTE_REQUIRED');
    await this.dataSource.query(
      `UPDATE product_candidates
         SET candidate_status = 'revision_requested', review_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [candidateId, note, input.reviewedBy ?? null],
    );
    logger.info(`[StoreRequestAdmin] revision requested candidate=${candidateId}`);
    return {
      candidateStatus: 'revision_requested',
      submittedBy: candidate.submittedBy, serviceKey: candidate.serviceKey,
      organizationId: candidate.organizationId, productName: candidate.candidateName,
    };
  }

  /** 등록 불가 — candidate_status='rejected' + 사유. */
  async reject(
    candidateId: string,
    input: { reason?: string | null; reviewedBy?: string | null; allowedServiceKeys?: string[] | null },
  ): Promise<StoreRequestActionResult> {
    const candidate = await this.loadStoreRequest(candidateId, input.allowedServiceKeys);
    await this.dataSource.query(
      `UPDATE product_candidates
         SET candidate_status = 'rejected', review_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [candidateId, (input.reason ?? '').trim() || null, input.reviewedBy ?? null],
    );
    logger.info(`[StoreRequestAdmin] rejected candidate=${candidateId}`);
    return {
      candidateStatus: 'rejected',
      submittedBy: candidate.submittedBy, serviceKey: candidate.serviceKey,
      organizationId: candidate.organizationId, productName: candidate.candidateName,
    };
  }
}
