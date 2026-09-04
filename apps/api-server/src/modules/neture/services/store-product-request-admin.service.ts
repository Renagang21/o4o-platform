/**
 * Store Product Request Admin Service — store_web 후보 관리자 검토·승인 (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 * 설계: docs/investigations/IR-...-V1.md §4.2, §5(A안)
 *
 * 기존 candidate 콘솔 코어(ProductCandidateService)는 수정하지 않는다. 본 서비스는 store_web 요청
 * 전용 액션(기존 연결 / 신규 승인 / 보완 요청 / 등록 불가)만 additive 로 제공한다.
 *
 * 신규 master 승인(A안): 의약품 promotion 게이트(promoteOne, DRUG 하드코딩)를 사용하지 않고,
 *   store_web 전용 최소 ProductMaster(+선택 ProductIdentifier) 생성 경로를 별도 트랜잭션으로 구현.
 *   합성 바코드 생성 금지(WO-...-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1):
 *   바코드 없으면 barcode=NULL, 정체성=ProductMaster.id(UUID).
 *
 * 원자성: ProductMaster 생성/기존 연결 + candidate 상태 전이 + organization listing 생성을
 *   단일 dataSource.transaction 으로 처리.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import {
  inferIdentifierTypeFromBarcode,
  normalizeIdentifier,
  isGtinLike,
  sanitizeIdentifierValue,
} from '../utils/product-identifier.util.js';
import type { ProductClassification } from '../utils/product-type.util.js';
// WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
import { ensureProductLandingForMaster } from './product-landing.service.js';
import logger from '../../../utils/logger.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';

const STORE_REQUEST_SOURCE_LABEL = 'kpa-store-product-request';

/** 표준 분류 코드 → (regulatory_type, drug_category). classificationToFilter 의 역방향. */
function classificationToRegulatory(code: string | null): { regulatoryType: string; drugCategory: string | null } {
  switch (code) {
    case 'otc': return { regulatoryType: 'DRUG', drugCategory: 'otc' };
    case 'rx': return { regulatoryType: 'DRUG', drugCategory: 'rx' };
    case 'drug': return { regulatoryType: 'DRUG', drugCategory: null };
    case 'quasi': return { regulatoryType: 'QUASI_DRUG', drugCategory: null };
    case 'health_functional': return { regulatoryType: 'HEALTH_FUNCTIONAL', drugCategory: null };
    case 'medical_device': return { regulatoryType: 'MEDICAL_DEVICE', drugCategory: null };
    case 'cosmetic': return { regulatoryType: 'COSMETIC', drugCategory: null };
    case 'general': return { regulatoryType: 'GENERAL', drugCategory: null };
    default: return { regulatoryType: 'GENERAL', drugCategory: null };
  }
}

export interface StoreRequestDuplicate {
  id: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  matchType: 'barcode' | 'name_manufacturer';
}

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
   * (role-prefix 형식: 'kpa'/'glycopharm'/'neture'/'cosmetics')가 스코프에 포함될 때만 허용한다
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
   * 신규 ProductMaster 승인 (store_web 전용, A안). drug promotion 게이트 미사용.
   * 중복 재검사(바코드 / 상품명+제조사) → 존재 시 CONFLICT(기존 연결 유도).
   * ProductMaster(+선택 Identifier) 생성 + 매장 listing + candidate_status='approved_new_master'. 단일 TX.
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

    const classificationCode = (candidate.candidateCategory
      || (candidate.rawPayload?.classification as string | undefined)
      || 'general') as ProductClassification;
    const { regulatoryType, drugCategory } = classificationToRegulatory(classificationCode);
    // Rx 신규 상품은 매장 요청 대상이 아니다 (매장 listing 불가 정책과 일관).
    if (regulatoryType === 'DRUG' && drugCategory === 'rx') throw new Error('RX_NEW_MASTER_BLOCKED');

    // 중복 재검사 (TX 밖 read — 확정은 barcode UNIQUE 로도 방어)
    const dups = await this.findDuplicates(candidateId);
    if (dups.length > 0) {
      const err = new Error('DUPLICATE_MASTER_EXISTS') as Error & { duplicates?: StoreRequestDuplicate[] };
      err.duplicates = dups;
      throw err;
    }

    // 바코드 정규화 (있을 때만)
    const rawBarcode = candidate.identifierValue ? sanitizeIdentifierValue(candidate.identifierValue) : '';
    const idType = rawBarcode ? inferIdentifierTypeFromBarcode(rawBarcode) : null;
    const normalized = rawBarcode && idType ? normalizeIdentifier(idType as any, rawBarcode) : '';
    // product_masters.barcode 는 GTIN(8~14자리)만. 그 외는 NULL (합성 금지) — 식별자로만 보관.
    const masterBarcode = rawBarcode && isGtinLike(rawBarcode) ? rawBarcode : null;

    const name = (candidate.candidateName ?? '').trim() || '(이름 미상)';
    const manufacturer = (candidate.candidateManufacturer ?? '').trim() || '미상';
    const specParts = [candidate.candidateSpec, candidate.candidateUnit].map((s) => (s ?? '').trim()).filter(Boolean);
    const specification = specParts.length > 0 ? specParts.join(' ') : null;

    const result = await this.dataSource.transaction(async (m) => {
      // TX 내 바코드 재확인 (동시 생성 방어)
      if (masterBarcode) {
        const clash: Array<{ id: string }> = await m.query(
          `SELECT id FROM product_masters WHERE barcode = $1 LIMIT 1`, [masterBarcode],
        );
        if (clash.length > 0) {
          const err = new Error('DUPLICATE_MASTER_EXISTS') as Error & { duplicates?: StoreRequestDuplicate[] };
          err.duplicates = [{ id: clash[0].id, name: null, barcode: masterBarcode, manufacturerName: null, matchType: 'barcode' }];
          throw err;
        }
      }

      // ProductMaster 생성 (store_web: is_mfds_verified=false, mfds_* NULL, 정체성=UUID)
      const masterRows: Array<{ id: string }> = await m.query(
        `INSERT INTO product_masters
           (id, barcode, regulatory_type, drug_category, regulatory_name, name, manufacturer_name,
            specification, is_mfds_verified, status, tags, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false, 'ACTIVE', '[]'::jsonb, NOW(), NOW())
         RETURNING id`,
        [masterBarcode, regulatoryType, drugCategory, name, name, manufacturer, specification],
      );
      const masterId = masterRows[0].id;

      // ProductIdentifier (바코드가 있을 때만; primary = master.barcode mirror 여부)
      let identifierCreated = false;
      if (rawBarcode && idType) {
        await m.query(
          `INSERT INTO product_identifiers
             (id, product_master_id, identifier_type, identifier_value, normalized_value,
              source_type, source_label, is_primary, verification_status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'store_web_request', $5, $6, 'pharmacy_provided', NOW(), NOW())`,
          [masterId, idType, candidate.identifierValue, normalized || rawBarcode, STORE_REQUEST_SOURCE_LABEL, masterBarcode !== null],
        );
        identifierCreated = true;
      }

      // 매장 listing + profile
      const { listingId } = await this.upsertOrganizationListing(m, {
        organizationId: candidate.organizationId!,
        serviceKey,
        masterId,
        displayName: name,
      });

      // candidate 상태 전이
      await m.query(
        `UPDATE product_candidates
           SET matched_product_master_id = $2, candidate_status = 'approved_new_master',
               reviewed_by = $3, reviewed_at = NOW(),
               raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $4::jsonb, updated_at = NOW()
         WHERE id = $1`,
        [candidateId, masterId, input.reviewedBy ?? null,
         JSON.stringify({ approval: { kind: 'new_master', masterId, listingId, identifierCreated, note: input.note ?? null } })],
      );

      logger.info(`[StoreRequestAdmin] approved new master candidate=${candidateId} -> master=${masterId} listing=${listingId} id=${identifierCreated}`);
      return {
        masterId, listingId, identifierCreated, candidateStatus: 'approved_new_master',
        submittedBy: candidate.submittedBy, serviceKey: candidate.serviceKey,
        organizationId: candidate.organizationId, productName: candidate.candidateName,
      };
    });

    // WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
    //   신규 master 는 대표 QR 진입점(Landing)을 갖는다. TX **커밋 후** 발급한다 —
    //   승인이 롤백되면 이 줄에 도달하지 않으므로 orphan Landing 이 남지 않는다. 멱등·best-effort.
    if (result.masterId) {
      await ensureProductLandingForMaster(this.dataSource, result.masterId, 'store-request-new-master');
    }
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
