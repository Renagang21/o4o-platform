/**
 * Product Promotion Core — DB port 구현 (EntityManager 기반)
 *
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.1 port
 *
 * 모든 조회·쓰기가 호출자의 EntityManager(= 같은 TX) 위에서 실행되므로
 * P2 가 하던 "TX 안 barcode 재확인" 이 별도 단계 없이 성립한다.
 * SQL 은 P2 approveAsNewMaster 의 INSERT/UPDATE 형태를 그대로 옮긴 것이다 (parameter binding · §7 Guard 2).
 */

import type { EntityManager } from 'typeorm';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import {
  identifierKey,
  type NormalizedIdentifier,
  type PromotionCandidateState,
  type PromotionMasterFields,
  type PromotionMasterRef,
  type PromotionStore,
} from './product-promotion.types.js';

interface MasterRow {
  id: string;
  name: string | null;
  barcode: string | null;
  manufacturer_name: string | null;
  specification: string | null;
  regulatory_type: string | null;
  drug_category: string | null;
}

const MASTER_COLUMNS = 'id, name, barcode, manufacturer_name, specification, regulatory_type, drug_category';

function toRef(r: MasterRow): PromotionMasterRef {
  return {
    id: r.id,
    name: r.name,
    barcode: r.barcode,
    manufacturerName: r.manufacturer_name,
    specification: r.specification,
    regulatoryType: r.regulatory_type,
    drugCategory: r.drug_category,
  };
}

export class DbPromotionStore implements PromotionStore {
  constructor(private readonly m: EntityManager) {}

  async loadCandidateState(candidateId: string): Promise<PromotionCandidateState | null> {
    const rows: Array<{ candidate_status: string; matched_product_master_id: string | null }> = await this.m.query(
      `SELECT candidate_status, matched_product_master_id
         FROM product_candidates WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [candidateId],
    );
    if (rows.length === 0) return null;
    return { candidateStatus: rows[0].candidate_status, matchedProductMasterId: rows[0].matched_product_master_id };
  }

  async findMastersByBarcode(barcode: string): Promise<PromotionMasterRef[]> {
    const rows: MasterRow[] = await this.m.query(
      `SELECT ${MASTER_COLUMNS} FROM product_masters WHERE barcode = $1 LIMIT 5`,
      [barcode],
    );
    return rows.map(toRef);
  }

  async findMastersByIdentifier(type: ProductIdentifierType, normalized: string): Promise<PromotionMasterRef[]> {
    const rows: MasterRow[] = await this.m.query(
      `SELECT DISTINCT ${MASTER_COLUMNS.split(', ').map((c) => `pm.${c}`).join(', ')}
         FROM product_identifiers pi
         JOIN product_masters pm ON pm.id = pi.product_master_id
        WHERE pi.identifier_type = $1 AND pi.normalized_value = $2 AND pi.deleted_at IS NULL
        LIMIT 5`,
      [type, normalized],
    );
    return rows.map(toRef);
  }

  async findMastersByNameManufacturer(name: string, manufacturerName: string): Promise<PromotionMasterRef[]> {
    const rows: MasterRow[] = await this.m.query(
      `SELECT ${MASTER_COLUMNS} FROM product_masters
        WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND LOWER(TRIM(manufacturer_name)) = LOWER(TRIM($2))
        LIMIT 5`,
      [name, manufacturerName],
    );
    return rows.map(toRef);
  }

  async findIdentifierKeysOfMaster(masterId: string): Promise<Set<string>> {
    const rows: Array<{ identifier_type: string; normalized_value: string }> = await this.m.query(
      `SELECT identifier_type, normalized_value FROM product_identifiers
        WHERE product_master_id = $1 AND deleted_at IS NULL`,
      [masterId],
    );
    return new Set(rows.map((r) => identifierKey(r.identifier_type, r.normalized_value)));
  }

  async createMaster(f: PromotionMasterFields): Promise<string> {
    // is_mfds_verified=false 명시 · regulatory_name=metadata.regulatoryName ?? name · 정체성=UUID (P2 와 동일)
    // optional metadata(category_id · brand_id · origin_country) 는 create INSERT 에서만 쓴다 — link 시 UPDATE 없음
    const meta = f.metadata ?? {};
    const regulatoryName = (meta.regulatoryName ?? '').trim() || f.name.trim();
    const rows: Array<{ id: string }> = await this.m.query(
      `INSERT INTO product_masters
         (id, barcode, regulatory_type, drug_category, regulatory_name, name, manufacturer_name,
          specification, category_id, brand_id, origin_country, is_mfds_verified, status, tags, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 'ACTIVE', '[]'::jsonb, NOW(), NOW())
       RETURNING id`,
      [
        f.barcode, f.regulatoryType, f.drugCategory, regulatoryName, f.name.trim(), f.manufacturerName.trim(), f.specification,
        meta.categoryId ?? null, meta.brandId ?? null, meta.originCountry ?? null,
      ],
    );
    return rows[0].id;
  }

  async createIdentifier(masterId: string, id: NormalizedIdentifier): Promise<void> {
    await this.m.query(
      `INSERT INTO product_identifiers
         (id, product_master_id, identifier_type, identifier_value, normalized_value,
          source_type, source_label, is_primary, verification_status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [masterId, id.type, id.value, id.normalized, id.sourceType, id.sourceLabel, id.isPrimary, id.verificationStatus],
    );
  }

  async updateCandidate(
    candidateId: string,
    patch: { matchedProductMasterId: string; candidateStatus: 'approved_new_master' | 'matched'; reviewedBy: string | null; approval: Record<string, unknown> },
  ): Promise<void> {
    await this.m.query(
      `UPDATE product_candidates
         SET matched_product_master_id = $2, candidate_status = $3,
             reviewed_by = $4, reviewed_at = NOW(),
             raw_payload = COALESCE(raw_payload, '{}'::jsonb) || $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [candidateId, patch.matchedProductMasterId, patch.candidateStatus, patch.reviewedBy, JSON.stringify({ approval: patch.approval })],
    );
  }
}
