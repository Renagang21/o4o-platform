/**
 * Drug Master Promotion Apply — DB store + bulk orchestration (DataSource-backed)
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1
 *
 * 순수 결정 계층(drug-master-promotion-apply.service.ts)의 PromotionMasterStore port 를
 * TypeORM repository 로 구현하고, ProductCandidate 를 대량 승격하는 orchestration 을 제공한다.
 *
 * 안전:
 *   - dry-run 기본. apply 는 후보별 트랜잭션 write.
 *   - 실 apply 대상 = ProductCandidate 뿐(CSV 는 dry-run adapter 에서만).
 *   - 생성 대상 = ProductMaster + ProductIdentifier 뿐(설계 §금지 준수).
 */

import type { DataSource, EntityManager, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import { ProductIdentifier } from '../entities/ProductIdentifier.entity.js';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import {
  promoteOne,
  promotionFieldsFromCandidate,
  emptyApplyReport,
  accumulateOutcome,
} from './drug-master-promotion-apply.service.js';
import type {
  PromotionMasterStore,
  ExistingMaster,
  MasterPreview,
  IdentifierPreview,
  PromoteCtx,
  PromotionApplyReport,
  PromotionFields,
} from './drug-master-promotion-apply.service.js';

/** timestamp 파싱 (sourceBaseDate 'YYYY-MM-DD'). 실패 시 null. */
function parseBaseDate(s: string): Date | null {
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** DataSource/EntityManager 기반 store. apply 시 manager(트랜잭션) 를 주입한다. */
export class DbPromotionMasterStore implements PromotionMasterStore {
  private readonly masterRepo: Repository<ProductMaster>;
  private readonly identifierRepo: Repository<ProductIdentifier>;
  private readonly candidateRepo: Repository<ProductCandidate>;

  constructor(
    em: EntityManager | DataSource,
    private readonly sourceBaseDate: string,
  ) {
    this.masterRepo = em.getRepository(ProductMaster);
    this.identifierRepo = em.getRepository(ProductIdentifier);
    this.candidateRepo = em.getRepository(ProductCandidate);
  }

  async findMasterByBarcode(barcode: string): Promise<ExistingMaster | null> {
    const m = await this.masterRepo.findOne({ where: { barcode } });
    return m ? { id: m.id, name: m.name, manufacturerName: m.manufacturerName, specification: m.specification } : null;
  }

  async findMasterByMfdsProductId(mfdsProductId: string): Promise<{ id: string } | null> {
    const m = await this.masterRepo.findOne({ where: { mfdsProductId } });
    return m ? { id: m.id } : null;
  }

  async findMasterIdsByIdentifier(
    type: IdentifierPreview['identifierType'],
    normalizedValue: string,
  ): Promise<string[]> {
    const rows = await this.identifierRepo.find({
      where: { identifierType: type, normalizedValue, deletedAt: IsNull() },
      select: { productMasterId: true },
    });
    return [...new Set(rows.map((r) => r.productMasterId))];
  }

  async createMaster(preview: MasterPreview): Promise<{ id: string }> {
    const entity = this.masterRepo.create({
      barcode: preview.barcode,
      regulatoryType: preview.regulatoryType,
      drugCategory: preview.drugCategory,
      regulatoryName: preview.regulatoryName,
      name: preview.name,
      manufacturerName: preview.manufacturerName,
      mfdsPermitNumber: null,
      mfdsProductId: preview.mfdsProductId,
      specification: preview.specification,
      isMfdsVerified: true,
      mfdsSyncedAt: parseBaseDate(preview.mfdsSyncedAt),
      representativeProductId: null,
      tags: preview.tags,
    });
    const saved = await this.masterRepo.save(entity);
    return { id: saved.id };
  }

  async createIdentifier(masterId: string, preview: IdentifierPreview): Promise<void> {
    // idempotent: 동일 (master, type, normalized) 활성 row 있으면 재사용
    const existing = await this.identifierRepo.findOne({
      where: {
        productMasterId: masterId,
        identifierType: preview.identifierType,
        normalizedValue: preview.normalizedValue,
        deletedAt: IsNull(),
      },
    });
    if (existing) return;
    const entity = this.identifierRepo.create({
      productMasterId: masterId,
      identifierType: preview.identifierType,
      identifierValue: preview.identifierValue,
      normalizedValue: preview.normalizedValue,
      sourceType: preview.sourceType,
      sourceLabel: `batch:${preview.metadata.importBatchId}`,
      country: preview.country,
      isPrimary: preview.isPrimary,
      verificationStatus: preview.verificationStatus,
      metadata: preview.metadata,
    });
    await this.identifierRepo.save(entity);
  }

  async markCandidatePromoted(candidateId: string, masterId: string, kind: 'create' | 'link'): Promise<void> {
    await this.candidateRepo.update(
      { id: candidateId },
      {
        matchedProductMasterId: masterId,
        matchStatus: 'exact_identifier_match',
        candidateStatus: kind === 'create' ? 'approved_new_master' : 'matched',
        reviewedAt: new Date(),
      },
    );
  }
}

export interface RunCandidatePromotionOptions {
  dataSource: DataSource;
  apply: boolean;
  importBatchId: string;
  sourceBaseDate: string;
  sourceLabel: string;
  /** candidate 필터: sourceLabel LIKE (약가마스터 batch 한정). 미지정 시 KOREA_DRUG_CODE csv_import 전량 */
  candidateSourceLabelLike?: string | null;
  limit?: number | null;
}

/**
 * ProductCandidate 대량 승격 (dry-run/apply). 실 apply 는 후보별 트랜잭션.
 */
export async function runCandidatePromotion(opts: RunCandidatePromotionOptions): Promise<PromotionApplyReport> {
  const ctx: PromoteCtx = {
    apply: opts.apply,
    importBatchId: opts.importBatchId,
    sourceBaseDate: opts.sourceBaseDate,
    sourceLabel: opts.sourceLabel,
  };
  const report = emptyApplyReport(ctx);

  const candidateRepo = opts.dataSource.getRepository(ProductCandidate);
  const qb = candidateRepo
    .createQueryBuilder('c')
    .where('c.deleted_at IS NULL')
    .andWhere('c.source_type = :st', { st: 'csv_import' })
    .andWhere('c.identifier_type = :it', { it: 'KOREA_DRUG_CODE' })
    .andWhere("c.candidate_status IN ('pending','reviewing','matched')");
  if (opts.candidateSourceLabelLike) {
    qb.andWhere('c.source_label LIKE :sl', { sl: `%${opts.candidateSourceLabelLike}%` });
  }
  qb.orderBy('c.created_at', 'ASC');
  if (opts.limit != null) qb.limit(opts.limit);

  const candidates = await qb.getMany();

  // 그룹핑 분포 (eligible 기준, 품목기준코드 → 표준코드/제조사 set)
  const mfdsGroups = new Map<string, { std: Set<string>; manuf: Set<string> }>();

  for (const c of candidates) {
    const fields: PromotionFields = promotionFieldsFromCandidate(c);
    let outcome;
    if (opts.apply) {
      outcome = await opts.dataSource.transaction(async (manager) => {
        const store = new DbPromotionMasterStore(manager, opts.sourceBaseDate);
        return promoteOne(fields, store, ctx);
      });
    } else {
      const store = new DbPromotionMasterStore(opts.dataSource, opts.sourceBaseDate);
      outcome = await promoteOne(fields, store, ctx);
    }
    accumulateOutcome(report, outcome, fields);

    if ((outcome.outcome === 'create' || outcome.outcome === 'link') && fields.mfdsCode && fields.standardCode) {
      let g = mfdsGroups.get(fields.mfdsCode);
      if (!g) { g = { std: new Set(), manuf: new Set() }; mfdsGroups.set(fields.mfdsCode, g); }
      g.std.add(fields.standardCode);
      if (fields.manufacturer) g.manuf.add(fields.manufacturer);
    }
  }

  for (const g of mfdsGroups.values()) {
    if (g.std.size > 1) report.multiPackageMfdsCodeCount += 1;
    if (g.manuf.size > 1) report.multiManufacturerMfdsCodeCount += 1;
  }

  return report;
}
