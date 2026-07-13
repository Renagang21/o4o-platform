/**
 * SharedProductDescriptionService — O4O 공용 상품설명 후보 풀 / canonical 대표 설명
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * - ProductMaster 기준 후보 저장/조회.
 * - canonical 대표 설명은 **(master_id, description_type, 언어) 당 1개** (WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1).
 *   setCanonical 은 transaction 으로 **같은 언어의** 기존 canonical 만 강등한다(ko canonical 이 있어도 zh 승격 가능).
 * - soft delete 우선. product_ai_contents 는 건드리지 않는다.
 */

import type { DataSource, Repository } from 'typeorm';
import { SharedProductDescription } from '../entities/SharedProductDescription.entity.js';

// ── bulk canonical eligibility — 단일 소스(서비스 + Job 공유). repo 미의존(raw ds.query). ──
// WO-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1

/** eligibility 판정식 dry-run (write 0). */
export async function bulkCanonicalDryRunQuery(
  dataSource: DataSource,
  sourceType = 'mfds_easy_drug',
): Promise<BulkCanonicalDryRun> {
  const base: Array<Record<string, string>> = await dataSource.query(
    `WITH nr AS (
       SELECT spd.id, spd.master_id, spd.content
         FROM shared_product_descriptions spd
        WHERE spd.source_type = $1 AND spd.status='needs_review' AND spd.deleted_at IS NULL
     ),
     per_master AS (SELECT master_id, count(*) AS cnt FROM nr GROUP BY master_id)
     SELECT
       (SELECT count(*)::text FROM nr) AS total,
       (SELECT count(*)::text FROM nr WHERE content IS NULL OR btrim(content)='') AS empty_content,
       (SELECT count(*)::text FROM per_master WHERE cnt>1) AS ambiguous_masters,
       (SELECT count(DISTINCT c.master_id)::text FROM shared_product_descriptions c
          WHERE c.status='canonical' AND c.deleted_at IS NULL
            AND c.master_id IN (SELECT master_id FROM nr)) AS existing_canonical,
       (SELECT count(*)::text FROM nr
          JOIN product_masters pm ON pm.id = nr.master_id
          LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
         WHERE (rp.metadata->'reviewFlags'->>'multiManufacturer')::bool IS TRUE) AS multi_manufacturer`,
    [sourceType],
  );
  const r = base[0] ?? {};
  const total = parseInt(r.total ?? '0', 10);
  const excludedEmptyContent = parseInt(r.empty_content ?? '0', 10);
  const excludedAmbiguous = parseInt(r.ambiguous_masters ?? '0', 10);
  const excludedExistingCanonical = parseInt(r.existing_canonical ?? '0', 10);
  const excludedMultiManufacturer = parseInt(r.multi_manufacturer ?? '0', 10);
  const eligibleForBulkCanonical =
    total - excludedEmptyContent - excludedExistingCanonical - excludedMultiManufacturer;

  const sampleEligible: Array<{ id: string; masterName: string | null; mfdsCode: string | null }> =
    await dataSource.query(
      `SELECT spd.id, pm.name AS "masterName", rp.metadata->'sourceIdentifiers'->>'mfdsCode' AS "mfdsCode"
         FROM shared_product_descriptions spd
         JOIN product_masters pm ON pm.id = spd.master_id
         LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
        WHERE spd.source_type=$1 AND spd.status='needs_review' AND spd.deleted_at IS NULL
          AND btrim(coalesce(spd.content,''))<>''
          AND (rp.metadata->'reviewFlags'->>'multiManufacturer')::bool IS NOT TRUE
          AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions c
                           WHERE c.master_id=spd.master_id AND c.status='canonical' AND c.deleted_at IS NULL)
        ORDER BY spd.updated_at DESC LIMIT 10`,
      [sourceType],
    );

  return {
    sourceType,
    totalNeedsReview: total,
    eligibleForBulkCanonical,
    excludedExistingCanonical,
    excludedMultiManufacturer,
    excludedEmptyContent,
    excludedAmbiguous,
    sampleEligible,
  };
}

/** eligibility 와 **동일 WHERE** 로 set-based UPDATE 승격. 멱등(canonical 재실행 제외). */
export async function bulkCanonicalApplyQuery(
  dataSource: DataSource,
  sourceType: string,
  actorId: string | null,
): Promise<number> {
  const rows: Array<{ applied: string }> = await dataSource.query(
    `WITH upd AS (
       UPDATE shared_product_descriptions spd
          SET status='canonical', curated_at=NOW(), curated_by=$2, updated_by=$2, updated_at=NOW()
         FROM product_masters pm
         LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
        WHERE spd.master_id = pm.id
          AND spd.source_type = $1 AND spd.status='needs_review' AND spd.deleted_at IS NULL
          AND btrim(coalesce(spd.content,'')) <> ''
          AND (rp.metadata->'reviewFlags'->>'multiManufacturer')::bool IS NOT TRUE
          AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions c
                           WHERE c.master_id = spd.master_id AND c.status='canonical' AND c.deleted_at IS NULL)
        RETURNING spd.id
     )
     SELECT count(*)::text AS applied FROM upd`,
    [sourceType, actorId],
  );
  return parseInt(rows[0]?.applied ?? '0', 10);
}
import type {
  SharedProductDescriptionSourceType,
  SharedProductDescriptionStatus,
  SharedProductDescriptionType,
} from '../entities/SharedProductDescription.entity.js';
import { DEFAULT_SHARED_PRODUCT_DESCRIPTION_TYPE } from '../entities/SharedProductDescription.entity.js';
import { sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

/**
 * WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1
 * 화장품 ProductMaster 에 O4O 공통(비-supplier) STORE 설명서를 신규 생성/승격하려 할 때 던진다.
 * 정책(O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1 §5): 화장품은 O4O 가 직접 제작하지 않고 공급자·브랜드가 제작한다.
 * 컨트롤러는 이 에러를 잡아 500 이 아니라 도메인 오류(403)로 매핑한다.
 */
export class CosmeticDescriptionBlockedError extends Error {
  readonly code = 'COSMETIC_O4O_DESCRIPTION_BLOCKED';
  constructor(
    message = '화장품 상품의 공통 설명서는 O4O에서 직접 제작하지 않습니다. 공급자 또는 브랜드 콘텐츠 경로를 이용해 주세요.',
  ) {
    super(message);
    this.name = 'CosmeticDescriptionBlockedError';
  }
}

export interface CreateCandidateInput {
  masterId: string;
  content: string;
  summary?: string | null;
  sourceType: SharedProductDescriptionSourceType;
  sourceRefId?: string | null;
  language?: string | null;
  qualityScore?: string | number | null;
  createdBy?: string | null;
  /** 생성 직후 상태 (기본 candidate). canonical 은 setCanonical 경유 권장 */
  status?: SharedProductDescriptionStatus;
  /** 설명서 유형 (기본 STORE) — WO-...-DESCRIPTION-TYPE-IMPLEMENTATION-V1 */
  descriptionType?: SharedProductDescriptionType;
  /** 작성 주체 공급자 SSOT — WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1 (nullable, 기존 경로 무영향) */
  createdBySupplierId?: string | null;
  /** 검수요청 시각 — 공급자가 needs_review 로 제출한 시점에만 세팅 */
  submittedAt?: Date | null;
}

/** WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1: seed 가능 소스 */
export type SharedProductDescriptionSeedSource = 'supplier' | 'ai' | 'drug_extension';

export const SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES: SharedProductDescriptionSeedSource[] = [
  'supplier',
  'ai',
  'drug_extension',
];

export interface SeedSourceResult {
  created: number;
  skipped: number;
}

export interface SeedResult {
  masterId: string;
  created: number;
  skipped: number;
  sources: {
    supplier?: SeedSourceResult;
    ai?: SeedSourceResult;
    drugExtension?: SeedSourceResult;
  };
}

export class SharedProductDescriptionService {
  private repo: Repository<SharedProductDescription>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(SharedProductDescription);
  }

  /** master 의 후보 목록 (soft-deleted 제외). 기본적으로 hidden/deprecated 포함 — UI 에서 필터 */
  async listByMaster(masterId: string): Promise<SharedProductDescription[]> {
    return this.repo.find({
      where: { masterId },
      order: { status: 'ASC', updatedAt: 'DESC' },
    });
  }

  /**
   * master 의 canonical 대표 설명 (없으면 null).
   * WO-...-DESCRIPTION-TYPE-IMPLEMENTATION-V1: descriptionType 기본값 STORE (기존 화면 회귀 방지).
   */
  async getCanonical(
    masterId: string,
    descriptionType: SharedProductDescriptionType = DEFAULT_SHARED_PRODUCT_DESCRIPTION_TYPE,
  ): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { masterId, status: 'canonical', descriptionType } });
  }

  async getById(id: string): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1
   * ProductMaster 가 화장품인지 판정한다. 실제 ProductMaster 필드 기준(문자열/상품명 추정 아님):
   *   - regulatory_type = 'COSMETIC' (상품 등록 시 카테고리 매핑으로 설정), 또는
   *   - category_id → product_categories.slug='cosmetics' (자기 또는 부모 카테고리).
   * 화장품 canonical 생성 흐름은 현재 없으나(정책 일치), generic write 경로의 가드 gap 을 닫는다.
   */
  private async isCosmeticMaster(masterId: string): Promise<boolean> {
    const rows: Array<{ rt: string | null; slug: string | null; parent_slug: string | null }> =
      await this.dataSource.query(
        `SELECT pm.regulatory_type AS rt, pc.slug AS slug, ppc.slug AS parent_slug
           FROM product_masters pm
           LEFT JOIN product_categories pc  ON pc.id = pm.category_id
           LEFT JOIN product_categories ppc ON ppc.id = pc.parent_id
          WHERE pm.id = $1
          LIMIT 1`,
        [masterId],
      );
    const r = rows[0];
    if (!r) return false;
    return r.rt === 'COSMETIC' || r.slug === 'cosmetics' || r.parent_slug === 'cosmetics';
  }

  /**
   * 후보 생성 (기본 status='candidate')
   *
   * WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2:
   * content/summary 는 저장 전 backend sanitizer(jsdom+DOMPurify)로 정화한다 (1차 방어선).
   * sanitize 후 content 가 비면 빈 candidate 를 만들지 않고 에러를 던진다.
   * (seed 경로는 sanitize 결과가 빈 경우 createCandidate 호출 전에 skip 하므로 여기 도달하지 않는다.)
   */
  async createCandidate(input: CreateCandidateInput): Promise<SharedProductDescription> {
    // WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1:
    //   화장품에는 O4O 공통(비-supplier) 설명서 신규 생성을 차단한다. 공급자(source_type='supplier')
    //   경로는 브랜드·공급자 제작이므로 그대로 허용한다.
    if (input.sourceType !== 'supplier' && (await this.isCosmeticMaster(input.masterId))) {
      throw new CosmeticDescriptionBlockedError();
    }
    const content = sanitizeDescriptionHtml(input.content);
    if (!content) {
      throw new Error('content is empty after sanitization');
    }
    const summary =
      input.summary === undefined || input.summary === null
        ? null
        : sanitizeDescriptionHtml(input.summary) || null;
    const entity = this.repo.create({
      masterId: input.masterId,
      content,
      summary,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId ?? null,
      language: input.language ?? 'ko',
      qualityScore:
        input.qualityScore === undefined || input.qualityScore === null
          ? null
          : String(input.qualityScore),
      status: input.status ?? 'candidate',
      descriptionType: input.descriptionType ?? DEFAULT_SHARED_PRODUCT_DESCRIPTION_TYPE,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
      createdBySupplierId: input.createdBySupplierId ?? null,
      submittedAt: input.submittedAt ?? null,
    });
    return this.repo.save(entity);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
  //   공급자(ACTIVE) 가 자기 상품의 STORE 설명서 초안을 작성/저장한다.
  //   - description_type=STORE, source_type=supplier, created_by_supplier_id=작성 공급자.
  //   - source_ref_id=원천 offer id(추적/AUTO-CREDIT fallback).
  //   - status: draft(임시저장, submitted_at=null) 또는 needs_review(검수요청, submitted_at=now).
  //   - canonical 은 절대 생성하지 않는다(운영자 검수 큐 경유).
  //   - 공급자당 (master, STORE, language) 단일 작업행 유지: 기존 draft/needs_review 행이 있으면 갱신(upsert).
  // ──────────────────────────────────────────────────────────────────────────
  async upsertSupplierStoreDraft(input: {
    masterId: string;
    supplierId: string;
    createdBy: string;
    offerId?: string | null;
    content: string;
    summary?: string | null;
    language?: string | null;
    submit: boolean;
  }): Promise<SharedProductDescription> {
    const content = sanitizeDescriptionHtml(input.content);
    if (!content) {
      throw new Error('content is empty after sanitization');
    }
    const summary =
      input.summary === undefined || input.summary === null
        ? null
        : sanitizeDescriptionHtml(input.summary) || null;
    const language = input.language ?? 'ko';
    const status: SharedProductDescriptionStatus = input.submit ? 'needs_review' : 'draft';
    const submittedAt = input.submit ? new Date() : null;

    // 공급자 본인의 기존 작업행(draft/needs_review, 같은 master/type/language) 재사용 — 중복 검수행 방지.
    const existing = await this.repo
      .createQueryBuilder('spd')
      .where('spd.master_id = :masterId', { masterId: input.masterId })
      .andWhere('spd.created_by_supplier_id = :supplierId', { supplierId: input.supplierId })
      .andWhere('spd.description_type = :type', { type: 'STORE' })
      .andWhere(`COALESCE(spd.language, 'ko') = COALESCE(:language, 'ko')`, { language })
      .andWhere('spd.status IN (:...statuses)', { statuses: ['draft', 'needs_review'] })
      .andWhere('spd.deleted_at IS NULL')
      .orderBy('spd.updated_at', 'DESC')
      .getOne();

    if (existing) {
      existing.content = content;
      existing.summary = summary;
      existing.status = status;
      existing.sourceType = 'supplier';
      existing.language = language;
      existing.sourceRefId = input.offerId ?? existing.sourceRefId ?? null;
      existing.updatedBy = input.createdBy;
      // submitted_at: 검수요청 시점에만 세팅. 재-임시저장(draft)로 되돌리면 다시 null.
      existing.submittedAt = submittedAt;
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      masterId: input.masterId,
      content,
      summary,
      sourceType: 'supplier',
      sourceRefId: input.offerId ?? null,
      language,
      status,
      descriptionType: 'STORE',
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdBySupplierId: input.supplierId,
      submittedAt,
    });
    return this.repo.save(entity);
  }

  /** 공급자 본인의 STORE 설명서 작업행 목록 (draft/needs_review/canonical). read-only. */
  async listSupplierStoreDrafts(
    supplierId: string,
    masterId?: string,
  ): Promise<Array<Pick<SharedProductDescription, 'id' | 'masterId' | 'descriptionType' | 'language' | 'status' | 'summary' | 'content' | 'submittedAt' | 'updatedAt'>>> {
    const qb = this.repo
      .createQueryBuilder('spd')
      .where('spd.created_by_supplier_id = :supplierId', { supplierId })
      .andWhere('spd.description_type = :type', { type: 'STORE' })
      .andWhere('spd.deleted_at IS NULL')
      .orderBy('spd.updated_at', 'DESC');
    if (masterId) qb.andWhere('spd.master_id = :masterId', { masterId });
    const rows = await qb.getMany();
    return rows.map((d) => ({
      id: d.id,
      masterId: d.masterId,
      descriptionType: d.descriptionType,
      language: d.language,
      status: d.status,
      summary: d.summary,
      content: d.content,
      submittedAt: d.submittedAt,
      updatedAt: d.updatedAt,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 운영자 최소 검수 큐 (공급자 STORE 설명서 전용). read-only + approve/reject 는 setCanonical/setStatus 재사용.
  //   source_type='supplier' AND description_type='STORE' 로 한정. 작성자/공급자/제출일시 노출.
  // ──────────────────────────────────────────────────────────────────────────
  async listSupplierStoreReview(params: {
    status?: string; // needs_review(기본) | draft | canonical | all
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SupplierStoreReviewRow[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const where: string[] = [
      'spd.deleted_at IS NULL',
      `spd.source_type = 'supplier'`,
      `spd.description_type = 'STORE'`,
    ];
    const args: unknown[] = [];
    let p = 1;

    const status = params.status && params.status.trim() ? params.status.trim() : 'needs_review';
    if (status !== 'all') {
      where.push(`spd.status = $${p++}`);
      args.push(status);
    }
    if (params.q && params.q.trim()) {
      const like = `%${params.q.trim()}%`;
      where.push(`(pm.name ILIKE $${p} OR o.name ILIKE $${p} OR ns.slug ILIKE $${p})`);
      args.push(like);
      p++;
    }
    const whereSql = where.join(' AND ');

    const fromSql = `
      FROM shared_product_descriptions spd
      JOIN product_masters pm ON pm.id = spd.master_id
      LEFT JOIN neture_suppliers ns ON ns.id = spd.created_by_supplier_id
      LEFT JOIN organizations o ON o.id = ns.organization_id
      LEFT JOIN users u ON u.id = spd.created_by
     WHERE ${whereSql}`;

    const countRows: Array<{ c: string }> = await this.dataSource.query(
      `SELECT count(*)::text AS c ${fromSql}`,
      args,
    );
    const total = parseInt(countRows[0]?.c ?? '0', 10);

    const items: SupplierStoreReviewRow[] = await this.dataSource.query(
      `SELECT spd.id, spd.master_id AS "masterId", spd.status, spd.language,
              spd.summary, LEFT(spd.content, 160) AS "contentPreview",
              spd.submitted_at AS "submittedAt", spd.created_at AS "createdAt", spd.updated_at AS "updatedAt",
              spd.created_by AS "createdBy", spd.created_by_supplier_id AS "supplierId",
              pm.name AS "masterName", pm.manufacturer_name AS "manufacturerName", pm.barcode,
              COALESCE(o.name, ns.slug) AS "supplierName",
              u.name AS "authorName", u.email AS "authorEmail"
         ${fromSql}
        ORDER BY (CASE spd.status WHEN 'needs_review' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END),
                 COALESCE(spd.submitted_at, spd.updated_at) DESC
        LIMIT ${limit} OFFSET ${offset}`,
      args,
    );
    return { items, total };
  }

  /** 검수 큐 상세 — full content 미리보기. supplier/STORE 로 한정. read-only. */
  async getSupplierStoreReviewDetail(id: string): Promise<SupplierStoreReviewDetail | null> {
    const rows: Array<SupplierStoreReviewDetail> = await this.dataSource.query(
      `SELECT spd.id, spd.master_id AS "masterId", spd.status, spd.language,
              spd.content, spd.summary, spd.source_ref_id AS "sourceRefId",
              spd.submitted_at AS "submittedAt", spd.created_at AS "createdAt", spd.updated_at AS "updatedAt",
              spd.curated_by AS "curatedBy", spd.curated_at AS "curatedAt",
              spd.created_by AS "createdBy", spd.created_by_supplier_id AS "supplierId",
              pm.name AS "masterName", pm.manufacturer_name AS "manufacturerName", pm.barcode,
              COALESCE(o.name, ns.slug) AS "supplierName",
              u.name AS "authorName", u.email AS "authorEmail"
         FROM shared_product_descriptions spd
         JOIN product_masters pm ON pm.id = spd.master_id
         LEFT JOIN neture_suppliers ns ON ns.id = spd.created_by_supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         LEFT JOIN users u ON u.id = spd.created_by
        WHERE spd.id = $1 AND spd.deleted_at IS NULL
          AND spd.source_type = 'supplier' AND spd.description_type = 'STORE'
        LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * 선택 row 를 canonical 로 승격. 같은 master 의 기존 canonical 은 candidate 로 강등.
   * transaction 으로 partial-unique 충돌 없이 1개/master 보장.
   */
  async setCanonical(id: string, actorId?: string | null): Promise<SharedProductDescription> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SharedProductDescription);
      const target = await repo.findOne({ where: { id } });
      if (!target) {
        throw new Error('SharedProductDescription not found');
      }
      if (target.deletedAt) {
        throw new Error('Cannot set a deleted description as canonical');
      }
      // WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1:
      //   화장품 비-supplier 설명서의 canonical 승격 차단(2차 방어). supplier 는 허용.
      if (target.sourceType !== 'supplier' && (await this.isCosmeticMaster(target.masterId))) {
        throw new CosmeticDescriptionBlockedError();
      }

      // 기존 canonical 강등 (대상 자신 제외) — 같은 description_type + **같은 언어**만 강등.
      // WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1: canonical 유일성 =
      //   (master_id, description_type, COALESCE(language,'ko')) 당 1개. 다른 언어/타입 canonical 은
      //   건드리지 않는다(ko canonical 이 있어도 zh 를 canonical 로 승격 가능).
      await repo
        .createQueryBuilder()
        .update(SharedProductDescription)
        .set({ status: 'candidate', updatedBy: actorId ?? null })
        .where('master_id = :masterId', { masterId: target.masterId })
        .andWhere('description_type = :descriptionType', { descriptionType: target.descriptionType })
        .andWhere(`COALESCE(language, 'ko') = COALESCE(:language, 'ko')`, { language: target.language ?? 'ko' })
        .andWhere('status = :status', { status: 'canonical' })
        .andWhere('id != :id', { id })
        .andWhere('deleted_at IS NULL')
        .execute();

      target.status = 'canonical';
      target.curatedBy = actorId ?? null;
      target.curatedAt = new Date();
      target.updatedBy = actorId ?? null;
      return repo.save(target);
    });
  }

  /** 상태 변경 (hidden / needs_review / deprecated / candidate). canonical 승격은 setCanonical 사용 */
  async setStatus(
    id: string,
    status: Exclude<SharedProductDescriptionStatus, 'canonical'>,
    actorId?: string | null,
  ): Promise<SharedProductDescription> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new Error('SharedProductDescription not found');
    }
    entity.status = status;
    entity.updatedBy = actorId ?? null;
    return this.repo.save(entity);
  }

  /** soft delete */
  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WO-O4O-PRODUCT-DESCRIPTION-CANDIDATE-SEED-V1
  // 기존 설명 소스를 masterId 단위로 공용 후보(candidate)로 흡수.
  // - 후보 생성까지만 (canonical 자동 승격 없음 — ADMIN-CURATION 후속).
  // - 중복 방지: (master_id, source_type, source_ref_id) 기존 row 있으면 skip
  //   (canonical/hidden/deprecated 포함 — 덮어쓰지/되살리지 않음).
  // - 대량 백필 아님: 호출 1건당 masterId 1개.
  // ──────────────────────────────────────────────────────────────────────────

  /** (master_id, source_type, source_ref_id) 가 이미 존재하는가 (soft-deleted 제외) */
  private async existsBySourceRef(
    masterId: string,
    sourceType: SharedProductDescriptionSourceType,
    sourceRefId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { masterId, sourceType, sourceRefId } });
    return count > 0;
  }

  /** masterId 단위 통합 seed */
  async seedFromExistingSources(
    masterId: string,
    actorId?: string | null,
    sources: SharedProductDescriptionSeedSource[] = SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES,
  ): Promise<SeedResult> {
    const result: SeedResult = { masterId, created: 0, skipped: 0, sources: {} };

    if (sources.includes('supplier')) {
      result.sources.supplier = await this.seedFromSupplierOffers(masterId, actorId);
    }
    if (sources.includes('ai')) {
      result.sources.ai = await this.seedFromProductAiContents(masterId, actorId);
    }
    if (sources.includes('drug_extension')) {
      result.sources.drugExtension = await this.seedFromDrugExtension(masterId, actorId);
    }

    for (const s of Object.values(result.sources)) {
      if (s) {
        result.created += s.created;
        result.skipped += s.skipped;
      }
    }
    return result;
  }

  /** SupplierProductOffer 설명 → supplier 후보 (offer 당 1건, consumer_detail 우선) */
  async seedFromSupplierOffers(masterId: string, actorId?: string | null): Promise<SeedSourceResult> {
    const rows: Array<{
      id: string;
      consumer_detail_description: string | null;
      consumer_short_description: string | null;
    }> = await this.dataSource.query(
      `SELECT id, consumer_detail_description, consumer_short_description
       FROM supplier_product_offers
       WHERE master_id = $1`,
      [masterId],
    );

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      // WO-O4O-...-SANITIZE-ON-WRITE-V2: source 원본은 수정하지 않고, candidate 저장값만 sanitize.
      const content = sanitizeDescriptionHtml(row.consumer_detail_description);
      const summary = sanitizeDescriptionHtml(row.consumer_short_description);
      if (!content && !summary) {
        skipped++;
        continue;
      }
      if (await this.existsBySourceRef(masterId, 'supplier', row.id)) {
        skipped++;
        continue;
      }
      await this.createCandidate({
        masterId,
        content: content || summary,
        summary: summary || null,
        sourceType: 'supplier',
        sourceRefId: row.id,
        status: 'candidate',
        createdBy: actorId,
      });
      created++;
    }
    return { created, skipped };
  }

  /** product_ai_contents(product_description) → ai 후보 (노출 아님, 후보로만) */
  async seedFromProductAiContents(masterId: string, actorId?: string | null): Promise<SeedSourceResult> {
    const rows: Array<{ id: string; content: string | null }> = await this.dataSource.query(
      `SELECT id, content
       FROM product_ai_contents
       WHERE product_id = $1 AND content_type = 'product_description'`,
      [masterId],
    );

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      // WO-O4O-...-SANITIZE-ON-WRITE-V2: product_ai_contents 원본은 수정하지 않고, candidate 저장값만 sanitize.
      const content = sanitizeDescriptionHtml(row.content);
      if (!content) {
        skipped++;
        continue;
      }
      if (await this.existsBySourceRef(masterId, 'ai', row.id)) {
        skipped++;
        continue;
      }
      await this.createCandidate({
        masterId,
        content,
        sourceType: 'ai',
        sourceRefId: row.id,
        status: 'candidate',
        createdBy: actorId,
      });
      created++;
    }
    return { created, skipped };
  }

  /** ProductDrugExtension 구조화 텍스트 → drug_extension 후보 (법적 리스크 → needs_review) */
  async seedFromDrugExtension(masterId: string, actorId?: string | null): Promise<SeedSourceResult> {
    const rows: Array<{
      id: string;
      efficacy_text: string | null;
      dosage_text: string | null;
      caution_text: string | null;
      storage_text: string | null;
      contraindication_text: string | null;
      ingredient_summary: string | null;
    }> = await this.dataSource.query(
      `SELECT id, efficacy_text, dosage_text, caution_text, storage_text,
              contraindication_text, ingredient_summary
       FROM product_drug_extensions
       WHERE product_master_id = $1`,
      [masterId],
    );

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const sections: Array<[string, string | null]> = [
        ['성분', row.ingredient_summary],
        ['효능·효과', row.efficacy_text],
        ['용법·용량', row.dosage_text],
        ['사용상 주의사항', row.caution_text],
        ['금기', row.contraindication_text],
        ['저장방법', row.storage_text],
      ];
      const builtContent = sections
        .filter(([, v]) => v && v.trim())
        .map(([label, v]) => `<p><strong>${label}</strong><br/>${(v as string).trim()}</p>`)
        .join('\n');
      // WO-O4O-...-SANITIZE-ON-WRITE-V2: drug_extension 원본은 수정하지 않고, 조합한 candidate 저장값만 sanitize.
      const content = sanitizeDescriptionHtml(builtContent);

      if (!content) {
        skipped++;
        continue;
      }
      if (await this.existsBySourceRef(masterId, 'drug_extension', row.id)) {
        skipped++;
        continue;
      }
      await this.createCandidate({
        masterId,
        content,
        sourceType: 'drug_extension',
        sourceRefId: row.id,
        status: 'needs_review', // 법적 표현 검수 필요 → 자동 candidate/canonical 금지
        createdBy: actorId,
      });
      created++;
    }
    return { created, skipped };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1
  // master 횡단 검토 목록/상세 + bulk canonical dry-run (read-only). setCanonical 은 위 재사용.
  // ──────────────────────────────────────────────────────────────────────────

  /** 검토 목록/검색 (master/representative join). read-only, 서버 페이지네이션. */
  async listForReview(params: {
    status?: string; // needs_review | canonical | candidate | hidden | deprecated | all
    sourceType?: string;
    regulatoryType?: string; // DRUG | MEDICAL_DEVICE | HEALTH_FUNCTIONAL_FOOD | QUASI_DRUG ...
    language?: string; // ko | en ...
    q?: string;
    multiManufacturer?: boolean;
    multiName?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: ReviewListRow[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const where: string[] = ['spd.deleted_at IS NULL'];
    const args: unknown[] = [];
    let p = 1;

    if (params.status && params.status !== 'all') {
      where.push(`spd.status = $${p++}`);
      args.push(params.status);
    }
    if (params.sourceType && params.sourceType !== 'all') {
      where.push(`spd.source_type = $${p++}`);
      args.push(params.sourceType);
    }
    if (params.regulatoryType && params.regulatoryType !== 'all') {
      where.push(`pm.regulatory_type = $${p++}`);
      args.push(params.regulatoryType);
    }
    if (params.language && params.language !== 'all') {
      where.push(`spd.language = $${p++}`);
      args.push(params.language);
    }
    if (params.multiManufacturer === true) where.push(`(rp.metadata->'reviewFlags'->>'multiManufacturer')::bool IS TRUE`);
    if (params.multiName === true) where.push(`(rp.metadata->'reviewFlags'->>'multiName')::bool IS TRUE`);
    if (params.q && params.q.trim()) {
      const like = `%${params.q.trim()}%`;
      where.push(
        `(pm.name ILIKE $${p} OR pm.barcode ILIKE $${p} OR rp.display_name ILIKE $${p} OR rp.metadata->'sourceIdentifiers'->>'mfdsCode' ILIKE $${p})`,
      );
      args.push(like);
      p++;
    }
    const whereSql = where.join(' AND ');

    const countRows: Array<{ c: string }> = await this.dataSource.query(
      `SELECT count(*)::text AS c
         FROM shared_product_descriptions spd
         JOIN product_masters pm ON pm.id = spd.master_id
         LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
        WHERE ${whereSql}`,
      args,
    );
    const total = parseInt(countRows[0]?.c ?? '0', 10);

    const rows: ReviewListRow[] = await this.dataSource.query(
      `SELECT spd.id, spd.master_id AS "masterId", spd.source_type AS "sourceType", spd.status,
              spd.description_type AS "descriptionType",
              spd.language, spd.quality_score::float8 AS "qualityScore", spd.summary,
              LEFT(spd.content, 140) AS "contentPreview",
              spd.created_at AS "createdAt", spd.updated_at AS "updatedAt",
              pm.name AS "masterName", pm.regulatory_name AS "regulatoryName",
              pm.regulatory_type AS "regulatoryType", pm.manufacturer_name AS "manufacturerName", pm.barcode,
              rp.id AS "representativeId", rp.display_name AS "representativeName",
              rp.metadata->'sourceIdentifiers'->>'mfdsCode' AS "mfdsCode",
              (rp.metadata->'reviewFlags'->>'multiManufacturer')::bool AS "multiManufacturer",
              (rp.metadata->'reviewFlags'->>'multiName')::bool AS "multiName",
              (rp.thumbnail_image_id IS NOT NULL) AS "hasRepresentativeImage"
         FROM shared_product_descriptions spd
         JOIN product_masters pm ON pm.id = spd.master_id
         LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
        WHERE ${whereSql}
        ORDER BY (CASE spd.status
                    WHEN 'needs_review' THEN 0
                    WHEN 'candidate' THEN 1
                    WHEN 'canonical' THEN 2
                    ELSE 3 END),
                 spd.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      args,
    );
    return { items: rows, total };
  }

  /** 검토 상세 (master/representative/identifier 요약 + content). read-only. */
  async getReviewDetail(id: string): Promise<ReviewDetail | null> {
    const rows: Array<Record<string, unknown>> = await this.dataSource.query(
      `SELECT spd.id, spd.master_id AS "masterId", spd.source_type AS "sourceType", spd.status,
              spd.description_type AS "descriptionType",
              spd.content, spd.summary, spd.language, spd.source_ref_id AS "sourceRefId",
              spd.curated_by AS "curatedBy", spd.curated_at AS "curatedAt",
              spd.created_at AS "createdAt", spd.updated_at AS "updatedAt",
              pm.name AS "masterName", pm.regulatory_name AS "regulatoryName",
              pm.manufacturer_name AS "manufacturerName", pm.barcode, pm.specification,
              pm.mfds_product_id AS "mfdsProductId", pm.drug_category AS "drugCategory",
              rp.id AS "representativeId", rp.display_name AS "representativeName",
              rp.metadata->'sourceIdentifiers'->>'mfdsCode' AS "mfdsCode",
              rp.metadata->'reviewFlags' AS "reviewFlags",
              rp.thumbnail_image_id AS "thumbnailImageId"
         FROM shared_product_descriptions spd
         JOIN product_masters pm ON pm.id = spd.master_id
         LEFT JOIN representative_products rp ON rp.id = pm.representative_product_id
        WHERE spd.id = $1 AND spd.deleted_at IS NULL
        LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    const detail = rows[0] as unknown as ReviewDetail;

    // identifier 요약 (master 의 식별자)
    detail.identifiers = await this.dataSource.query(
      `SELECT identifier_type AS "identifierType", identifier_value AS "identifierValue", is_primary AS "isPrimary"
         FROM product_identifiers
        WHERE product_master_id = $1 AND deleted_at IS NULL
        ORDER BY is_primary DESC, identifier_type ASC`,
      [detail.masterId],
    );

    // 대표 썸네일 URL
    if (detail.thumbnailImageId) {
      const img: Array<{ image_url: string }> = await this.dataSource.query(
        `SELECT image_url FROM product_images WHERE id = $1 LIMIT 1`,
        [detail.thumbnailImageId],
      );
      detail.thumbnailUrl = img[0]?.image_url ?? null;
    } else {
      detail.thumbnailUrl = null;
    }
    return detail;
  }

  /**
   * bulk canonical 후보 dry-run (write 0).
   * eligible = source_type + status=needs_review + master당 1개 + content 비어있지 않음
   *            + 기존 canonical 없음 + 다제조사 아님.
   */
  async bulkCanonicalDryRun(sourceType = 'mfds_easy_drug'): Promise<BulkCanonicalDryRun> {
    return bulkCanonicalDryRunQuery(this.dataSource, sourceType);
  }

  /**
   * bulk canonical apply — dry-run 과 **동일 eligibility**(bulkCanonicalApplyQuery, 단일 소스)로
   * set-based UPDATE 승격. WO-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1.
   * 멱등(canonical 재실행 제외). ambiguous=0 전제 → master당 canonical 1개 partial-unique 만족.
   */
  async bulkCanonicalApply(params: {
    apply: boolean;
    actorId?: string | null;
    sourceType?: string;
  }): Promise<{ mode: 'dry-run' | 'apply'; eligible: number; applied: number }> {
    const sourceType = params.sourceType ?? 'mfds_easy_drug';
    const dry = await bulkCanonicalDryRunQuery(this.dataSource, sourceType);
    if (!params.apply) {
      return { mode: 'dry-run', eligible: dry.eligibleForBulkCanonical, applied: 0 };
    }
    const applied = await bulkCanonicalApplyQuery(this.dataSource, sourceType, params.actorId ?? null);
    return { mode: 'apply', eligible: dry.eligibleForBulkCanonical, applied };
  }
}

export interface ReviewListRow {
  id: string;
  masterId: string;
  sourceType: string;
  status: string;
  descriptionType: string;
  language: string | null;
  qualityScore: number | null;
  summary: string | null;
  contentPreview: string | null;
  createdAt: string;
  updatedAt: string;
  masterName: string | null;
  regulatoryName: string | null;
  regulatoryType: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  representativeId: string | null;
  representativeName: string | null;
  mfdsCode: string | null;
  multiManufacturer: boolean | null;
  multiName: boolean | null;
  hasRepresentativeImage: boolean;
}

export interface ReviewDetail {
  id: string;
  masterId: string;
  sourceType: string;
  status: string;
  descriptionType: string;
  content: string;
  summary: string | null;
  language: string | null;
  sourceRefId: string | null;
  curatedBy: string | null;
  curatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  masterName: string | null;
  regulatoryName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  specification: string | null;
  mfdsProductId: string | null;
  drugCategory: string | null;
  representativeId: string | null;
  representativeName: string | null;
  mfdsCode: string | null;
  reviewFlags: Record<string, unknown> | null;
  thumbnailImageId: string | null;
  thumbnailUrl: string | null;
  identifiers: Array<{ identifierType: string; identifierValue: string; isPrimary: boolean }>;
}

// WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
export interface SupplierStoreReviewRow {
  id: string;
  masterId: string;
  status: string;
  language: string | null;
  summary: string | null;
  contentPreview: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  supplierId: string | null;
  masterName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  supplierName: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

export interface SupplierStoreReviewDetail {
  id: string;
  masterId: string;
  status: string;
  language: string | null;
  content: string;
  summary: string | null;
  sourceRefId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  curatedBy: string | null;
  curatedAt: string | null;
  createdBy: string | null;
  supplierId: string | null;
  masterName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  supplierName: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

export interface BulkCanonicalDryRun {
  sourceType: string;
  totalNeedsReview: number;
  eligibleForBulkCanonical: number;
  excludedExistingCanonical: number;
  excludedMultiManufacturer: number;
  excludedEmptyContent: number;
  excludedAmbiguous: number;
  sampleEligible: Array<{ id: string; masterName: string | null; mfdsCode: string | null }>;
}
