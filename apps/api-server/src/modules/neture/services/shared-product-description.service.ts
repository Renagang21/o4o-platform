/**
 * SharedProductDescriptionService — O4O 공용 상품설명 후보 풀 / canonical 대표 설명
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * - ProductMaster 기준 후보 저장/조회.
 * - canonical 대표 설명은 master 당 1개 (setCanonical 은 transaction 으로 기존 canonical 강등).
 * - soft delete 우선. product_ai_contents 는 건드리지 않는다.
 */

import type { DataSource, Repository } from 'typeorm';
import { SharedProductDescription } from '../entities/SharedProductDescription.entity.js';
import type {
  SharedProductDescriptionSourceType,
  SharedProductDescriptionStatus,
} from '../entities/SharedProductDescription.entity.js';

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

  /** master 의 canonical 대표 설명 (없으면 null) */
  async getCanonical(masterId: string): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { masterId, status: 'canonical' } });
  }

  async getById(id: string): Promise<SharedProductDescription | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** 후보 생성 (기본 status='candidate') */
  async createCandidate(input: CreateCandidateInput): Promise<SharedProductDescription> {
    const entity = this.repo.create({
      masterId: input.masterId,
      content: input.content,
      summary: input.summary ?? null,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId ?? null,
      language: input.language ?? 'ko',
      qualityScore:
        input.qualityScore === undefined || input.qualityScore === null
          ? null
          : String(input.qualityScore),
      status: input.status ?? 'candidate',
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    });
    return this.repo.save(entity);
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

      // 기존 canonical 강등 (대상 자신 제외)
      await repo
        .createQueryBuilder()
        .update(SharedProductDescription)
        .set({ status: 'candidate', updatedBy: actorId ?? null })
        .where('master_id = :masterId', { masterId: target.masterId })
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
      const content = (row.consumer_detail_description ?? '').trim();
      const summary = (row.consumer_short_description ?? '').trim();
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
      const content = (row.content ?? '').trim();
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
      const content = sections
        .filter(([, v]) => v && v.trim())
        .map(([label, v]) => `<p><strong>${label}</strong><br/>${(v as string).trim()}</p>`)
        .join('\n');

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
}
