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
import { randomUUID } from 'crypto';
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

/**
 * Preloaded read-only store (dry-run 배치용).
 *
 * 기존 product_masters / product_identifiers 전량을 메모리 인덱스로 선적재하여,
 * candidate 당 per-row DB 조회(≈수백만 round-trip)를 제거한다. write 메서드는 dry-run 전용이라 호출 금지.
 */
export class PreloadedPromotionMasterStore implements PromotionMasterStore {
  private readonly idKey = (type: string, normalized: string) => `${type} ${normalized}`;

  constructor(
    private readonly mastersByBarcode: Map<string, ExistingMaster>,
    private readonly mfdsProductIdSet: Set<string>,
    private readonly identifierIndex: Map<string, string[]>,
  ) {}

  async findMasterByBarcode(barcode: string): Promise<ExistingMaster | null> {
    return this.mastersByBarcode.get(barcode) ?? null;
  }
  async findMasterByMfdsProductId(mfdsProductId: string): Promise<{ id: string } | null> {
    return this.mfdsProductIdSet.has(mfdsProductId) ? { id: mfdsProductId } : null;
  }
  async findMasterIdsByIdentifier(
    type: IdentifierPreview['identifierType'],
    normalizedValue: string,
  ): Promise<string[]> {
    return this.identifierIndex.get(this.idKey(type, normalizedValue)) ?? [];
  }
  async createMaster(): Promise<{ id: string }> {
    throw new Error('PRELOADED_STORE_IS_READ_ONLY: createMaster 금지(dry-run)');
  }
  async createIdentifier(): Promise<void> {
    throw new Error('PRELOADED_STORE_IS_READ_ONLY: createIdentifier 금지(dry-run)');
  }
  async markCandidatePromoted(): Promise<void> {
    throw new Error('PRELOADED_STORE_IS_READ_ONLY: markCandidatePromoted 금지(dry-run)');
  }
}

export interface DryRunBatchedOptions {
  dataSource: DataSource;
  sourceBaseDate: string;
  sourceLabel: string;
  candidateSourceLabelLike?: string | null;
  pageSize?: number;
  limit?: number | null;
}

export interface DryRunBatchedResult {
  report: PromotionApplyReport;
  existingMasterCount: number;
  existingIdentifierCount: number;
  scannedCandidates: number;
  executionMs: number;
}

/**
 * 배치 dry-run: 기존 catalog 선적재 + candidate 페이지 스캔 (write 0).
 * per-candidate DB 조회 없음 — 전 outcome 을 메모리 인덱스로 판정.
 */
export async function runCandidatePromotionDryRun(opts: DryRunBatchedOptions): Promise<DryRunBatchedResult> {
  const start = Date.now();
  const ds = opts.dataSource;
  const ctx: PromoteCtx = {
    apply: false,
    importBatchId: `dryrun-${opts.sourceBaseDate}`,
    sourceBaseDate: opts.sourceBaseDate,
    sourceLabel: opts.sourceLabel,
  };
  const report = emptyApplyReport(ctx);

  // 1) 기존 catalog 선적재 (2 SELECT)
  const masterRows: Array<{
    id: string; barcode: string; name: string | null; manufacturer_name: string | null;
    specification: string | null; mfds_product_id: string | null;
  }> = await ds.query(
    `SELECT id, barcode, name, manufacturer_name, specification, mfds_product_id FROM product_masters`,
  );
  const mastersByBarcode = new Map<string, ExistingMaster>();
  const mfdsProductIdSet = new Set<string>();
  for (const m of masterRows) {
    mastersByBarcode.set(m.barcode, {
      id: m.id, name: m.name, manufacturerName: m.manufacturer_name, specification: m.specification,
    });
    if (m.mfds_product_id) mfdsProductIdSet.add(m.mfds_product_id);
  }

  const idRows: Array<{ identifier_type: string; normalized_value: string; product_master_id: string }> =
    await ds.query(
      `SELECT identifier_type, normalized_value, product_master_id
         FROM product_identifiers WHERE deleted_at IS NULL`,
    );
  const identifierIndex = new Map<string, string[]>();
  for (const r of idRows) {
    const key = `${r.identifier_type} ${r.normalized_value}`;
    const arr = identifierIndex.get(key);
    if (arr) arr.push(r.product_master_id);
    else identifierIndex.set(key, [r.product_master_id]);
  }

  const store = new PreloadedPromotionMasterStore(mastersByBarcode, mfdsProductIdSet, identifierIndex);

  // 2) candidate 페이지 스캔 (keyset by id) — per-candidate DB 조회 없음
  const pageSize = opts.pageSize ?? 5000;
  const mfdsGroups = new Map<string, { std: Set<string>; manuf: Set<string> }>();
  let lastId = '00000000-0000-0000-0000-000000000000';
  let scanned = 0;
  for (;;) {
    if (opts.limit != null && scanned >= opts.limit) break;
    const take = opts.limit != null ? Math.min(pageSize, opts.limit - scanned) : pageSize;
    const rows: Array<{
      id: string; candidate_name: string | null; candidate_manufacturer: string | null;
      candidate_category: string | null; candidate_spec: string | null; candidate_unit: string | null;
      identifier_value: string | null; normalized_identifier_value: string | null;
      raw_payload: Record<string, unknown> | null;
    }> = await ds.query(
      `SELECT id, candidate_name, candidate_manufacturer, candidate_category, candidate_spec,
              candidate_unit, identifier_value, normalized_identifier_value, raw_payload
         FROM product_candidates
        WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE'
          AND candidate_status IN ('pending','reviewing','matched')
          AND deleted_at IS NULL
          ${opts.candidateSourceLabelLike ? "AND source_label LIKE $2" : ''}
          AND id > $1
        ORDER BY id ASC
        LIMIT ${take}`,
      opts.candidateSourceLabelLike ? [lastId, `%${opts.candidateSourceLabelLike}%`] : [lastId],
    );
    if (rows.length === 0) break;
    for (const c of rows) {
      const fields: PromotionFields = promotionFieldsFromCandidate({
        id: c.id,
        candidateName: c.candidate_name,
        candidateManufacturer: c.candidate_manufacturer,
        candidateCategory: c.candidate_category,
        candidateSpec: c.candidate_spec,
        candidateUnit: c.candidate_unit,
        identifierValue: c.identifier_value,
        normalizedIdentifierValue: c.normalized_identifier_value,
        rawPayload: c.raw_payload,
      });
      const outcome = await promoteOne(fields, store, ctx);
      accumulateOutcome(report, outcome, fields);
      if ((outcome.outcome === 'create' || outcome.outcome === 'link') && fields.mfdsCode && fields.standardCode) {
        let g = mfdsGroups.get(fields.mfdsCode);
        if (!g) { g = { std: new Set(), manuf: new Set() }; mfdsGroups.set(fields.mfdsCode, g); }
        g.std.add(fields.standardCode);
        if (fields.manufacturer) g.manuf.add(fields.manufacturer);
      }
      lastId = c.id;
    }
    scanned += rows.length;
    if (rows.length < take) break;
  }

  for (const g of mfdsGroups.values()) {
    if (g.std.size > 1) report.multiPackageMfdsCodeCount += 1;
    if (g.manuf.size > 1) report.multiManufacturerMfdsCodeCount += 1;
  }

  return {
    report,
    existingMasterCount: masterRows.length,
    existingIdentifierCount: idRows.length,
    scannedCandidates: scanned,
    executionMs: Date.now() - start,
  };
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
    // WO-...-LEGACY-MASTER-MATCHING-REMOVAL-V1: match_status 제거 → 등록 링크(matchedProductMasterId)
    //   + candidate_status 로만 등록 완료를 표현한다.
    await this.candidateRepo.update(
      { id: candidateId },
      {
        matchedProductMasterId: masterId,
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

/** 기존 catalog(product_masters/identifiers) 선적재 → 메모리 인덱스. */
export async function preloadCatalog(ds: DataSource): Promise<{
  mastersByBarcode: Map<string, ExistingMaster>;
  mfdsProductIdSet: Set<string>;
  identifierIndex: Map<string, string[]>;
  masterCount: number;
  identifierCount: number;
}> {
  const masterRows: Array<{
    id: string; barcode: string; name: string | null; manufacturer_name: string | null;
    specification: string | null; mfds_product_id: string | null;
  }> = await ds.query(
    `SELECT id, barcode, name, manufacturer_name, specification, mfds_product_id FROM product_masters`,
  );
  const mastersByBarcode = new Map<string, ExistingMaster>();
  const mfdsProductIdSet = new Set<string>();
  for (const m of masterRows) {
    mastersByBarcode.set(m.barcode, {
      id: m.id, name: m.name, manufacturerName: m.manufacturer_name, specification: m.specification,
    });
    if (m.mfds_product_id) mfdsProductIdSet.add(m.mfds_product_id);
  }
  const idRows: Array<{ identifier_type: string; normalized_value: string; product_master_id: string }> =
    await ds.query(
      `SELECT identifier_type, normalized_value, product_master_id
         FROM product_identifiers WHERE deleted_at IS NULL`,
    );
  const identifierIndex = new Map<string, string[]>();
  for (const r of idRows) {
    const key = `${r.identifier_type} ${r.normalized_value}`;
    const arr = identifierIndex.get(key);
    if (arr) arr.push(r.product_master_id);
    else identifierIndex.set(key, [r.product_master_id]);
  }
  return {
    mastersByBarcode, mfdsProductIdSet, identifierIndex,
    masterCount: masterRows.length, identifierCount: idRows.length,
  };
}

/**
 * Buffering apply store — 승격 write 를 청크 multi-row INSERT 로 배치화.
 *
 * per-row INSERT(≈934k round-trip)가 Job timeout 을 초과하므로:
 *   - master id 를 앱측(randomUUID) 생성 → identifier 가 참조 가능(FK 만족을 위해 flush 시 master 먼저 insert).
 *   - createMaster/createIdentifier 는 **버퍼링만**(즉시 write 아님) + 메모리 인덱스 갱신(같은 run 내 dedup/link).
 *   - maybeFlush/flush 에서 masters → identifiers → candidate 마킹 순서로 청크 INSERT/UPDATE.
 *   - read 메서드는 preloaded(기존 DB) + in-run buffered 를 함께 본다 → conflict/link 판정 유지.
 * idempotent: 기존 DB master(preload)는 link 로 판정 → 재실행 안전.
 */
interface BufferedMaster { id: string; preview: MasterPreview; }
interface BufferedIdentifier { id: string; masterId: string; preview: IdentifierPreview; }
interface BufferedCandMark { candidateId: string; masterId: string; kind: 'create' | 'link'; }

export class BufferingPromotionApplyStore implements PromotionMasterStore {
  private readonly masterBuf: BufferedMaster[] = [];
  private readonly idBuf: BufferedIdentifier[] = [];
  private readonly candBuf: BufferedCandMark[] = [];
  private readonly idKey = (t: string, n: string) => `${t} ${n}`;

  constructor(
    private readonly ds: DataSource,
    private readonly mastersByBarcode: Map<string, ExistingMaster>,
    private readonly mfdsProductIdSet: Set<string>,
    private readonly identifierIndex: Map<string, string[]>,
    private readonly flushMasterThreshold = 500,
  ) {}

  async findMasterByBarcode(barcode: string): Promise<ExistingMaster | null> {
    return this.mastersByBarcode.get(barcode) ?? null;
  }
  async findMasterByMfdsProductId(mfdsProductId: string): Promise<{ id: string } | null> {
    // 존재 여부만 의미(conflict 판정). 실제 master id 는 불필요.
    return this.mfdsProductIdSet.has(mfdsProductId) ? { id: mfdsProductId } : null;
  }
  async findMasterIdsByIdentifier(
    type: IdentifierPreview['identifierType'],
    normalizedValue: string,
  ): Promise<string[]> {
    return this.identifierIndex.get(this.idKey(type, normalizedValue)) ?? [];
  }
  async createMaster(preview: MasterPreview): Promise<{ id: string }> {
    const id = randomUUID();
    this.masterBuf.push({ id, preview });
    this.mastersByBarcode.set(preview.barcode, {
      id, name: preview.name, manufacturerName: preview.manufacturerName, specification: preview.specification,
    });
    this.mfdsProductIdSet.add(preview.mfdsProductId);
    return { id };
  }
  async createIdentifier(masterId: string, preview: IdentifierPreview): Promise<void> {
    this.idBuf.push({ id: randomUUID(), masterId, preview });
    const k = this.idKey(preview.identifierType, preview.normalizedValue);
    const a = this.identifierIndex.get(k);
    if (a) a.push(masterId);
    else this.identifierIndex.set(k, [masterId]);
  }
  async markCandidatePromoted(candidateId: string, masterId: string, kind: 'create' | 'link'): Promise<void> {
    this.candBuf.push({ candidateId, masterId, kind });
  }

  async maybeFlush(): Promise<void> {
    if (this.masterBuf.length >= this.flushMasterThreshold || this.idBuf.length >= 2000 || this.candBuf.length >= 2000) {
      await this.flush();
    }
  }

  /** 버퍼 flush: masters → identifiers → candidate 마킹 순서(FK 만족). 청크 param 한도 준수. */
  async flush(): Promise<void> {
    // 1) masters (14 param/row, chunk 500)
    await this.chunked(this.masterBuf, 500, async (chunk) => {
      const vals: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const m of chunk) {
        const v = m.preview;
        vals.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::jsonb, NOW(), NOW())`,
        );
        params.push(
          m.id, v.barcode, v.regulatoryType, v.drugCategory, v.regulatoryName, v.name, v.manufacturerName,
          null /* mfds_permit_number */, v.mfdsProductId, v.specification, true /* is_mfds_verified */,
          parseBaseDate(v.mfdsSyncedAt), null /* representative_product_id */, JSON.stringify(v.tags),
        );
      }
      await this.ds.query(
        `INSERT INTO product_masters
           (id, barcode, regulatory_type, drug_category, regulatory_name, name, manufacturer_name,
            mfds_permit_number, mfds_product_id, specification, is_mfds_verified, mfds_synced_at,
            representative_product_id, tags, created_at, updated_at)
         VALUES ${vals.join(', ')}`,
        params,
      );
    });

    // 2) identifiers (11 param/row, chunk 1000)
    await this.chunked(this.idBuf, 1000, async (chunk) => {
      const vals: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const it of chunk) {
        const v = it.preview;
        vals.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::jsonb, NOW(), NOW())`,
        );
        params.push(
          it.id, it.masterId, v.identifierType, v.identifierValue, v.normalizedValue, v.sourceType,
          `batch:${v.metadata.importBatchId}`, v.country, v.isPrimary, v.verificationStatus, JSON.stringify(v.metadata),
        );
      }
      await this.ds.query(
        `INSERT INTO product_identifiers
           (id, product_master_id, identifier_type, identifier_value, normalized_value, source_type,
            source_label, country, is_primary, verification_status, metadata, created_at, updated_at)
         VALUES ${vals.join(', ')}`,
        params,
      );
    });

    // 3) candidate 마킹 (3 param/row, chunk 1000)
    await this.chunked(this.candBuf, 1000, async (chunk) => {
      const vals: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const cm of chunk) {
        vals.push(`($${p++}::uuid, $${p++}::uuid, $${p++}::text)`);
        params.push(cm.candidateId, cm.masterId, cm.kind === 'create' ? 'approved_new_master' : 'matched');
      }
      await this.ds.query(
        `UPDATE product_candidates AS c
            SET matched_product_master_id = v.mid,
                candidate_status = v.st,
                match_status = 'exact_identifier_match',
                reviewed_at = NOW(),
                updated_at = NOW()
           FROM (VALUES ${vals.join(', ')}) AS v(cid, mid, st)
          WHERE c.id = v.cid`,
        params,
      );
    });

    this.masterBuf.length = 0;
    this.idBuf.length = 0;
    this.candBuf.length = 0;
  }

  private async chunked<T>(arr: T[], size: number, fn: (chunk: T[]) => Promise<void>): Promise<void> {
    for (let i = 0; i < arr.length; i += size) {
      const chunk = arr.slice(i, i + size);
      if (chunk.length > 0) await fn(chunk);
    }
  }
}

/**
 * candidate 페이지 스캔(keyset by id) — 공통 러너. per-candidate DB 조회는 store 가 담당.
 */
async function scanCandidatesPaged(
  ds: DataSource,
  opts: { candidateSourceLabelLike?: string | null; limit?: number | null; pageSize?: number },
  onCandidate: (fields: PromotionFields) => Promise<void>,
): Promise<number> {
  const pageSize = opts.pageSize ?? 5000;
  let lastId = '00000000-0000-0000-0000-000000000000';
  let scanned = 0;
  for (;;) {
    if (opts.limit != null && scanned >= opts.limit) break;
    const take = opts.limit != null ? Math.min(pageSize, opts.limit - scanned) : pageSize;
    // raw_payload 전체(대형 jsonb)가 아닌 **필요 필드만 추출** — 대량 스캔 전송량 병목 제거.
    const rows: Array<{
      id: string; candidate_name: string | null; candidate_manufacturer: string | null;
      candidate_category: string | null; candidate_spec: string | null; candidate_unit: string | null;
      std: string | null; mfds_code: string | null; atc: string | null; insurance: string | null;
      total_qty: string | null; dosage_form: string | null; is_cancelled: string | null; row_number: string | null;
    }> = await ds.query(
      `SELECT id, candidate_name, candidate_manufacturer, candidate_category, candidate_spec, candidate_unit,
              COALESCE(raw_payload->>'standardCode', normalized_identifier_value) AS std,
              COALESCE(raw_payload->>'mfdsCode', raw_payload->'source'->>'품목기준코드') AS mfds_code,
              COALESCE(raw_payload->>'atcCode', raw_payload->'source'->>'국제표준코드(ATC코드)') AS atc,
              raw_payload->'source'->>'제품코드(개정후)' AS insurance,
              raw_payload->'source'->>'제품총수량' AS total_qty,
              raw_payload->'source'->>'제형구분' AS dosage_form,
              raw_payload->>'isCancelled' AS is_cancelled,
              raw_payload->>'rowNumber' AS row_number
         FROM product_candidates
        WHERE source_type='csv_import' AND identifier_type='KOREA_DRUG_CODE'
          AND candidate_status IN ('pending','reviewing','matched')
          AND deleted_at IS NULL
          ${opts.candidateSourceLabelLike ? 'AND source_label LIKE $2' : ''}
          AND id > $1
        ORDER BY id ASC
        LIMIT ${take}`,
      opts.candidateSourceLabelLike ? [lastId, `%${opts.candidateSourceLabelLike}%`] : [lastId],
    );
    if (rows.length === 0) break;
    for (const r of rows) {
      const fields: PromotionFields = {
        candidateId: r.id,
        rowNumber: r.row_number != null && r.row_number !== '' ? Number(r.row_number) : null,
        standardCode: leanClean(r.std),
        mfdsCode: leanClean(r.mfds_code),
        insuranceCode: leanClean(r.insurance),
        atcCode: leanClean(r.atc),
        productName: leanClean(r.candidate_name),
        manufacturer: leanClean(r.candidate_manufacturer),
        rxOtc: leanClean(r.candidate_category),
        spec: leanClean(r.candidate_spec),
        totalQuantity: leanClean(r.total_qty),
        dosageForm: leanClean(r.dosage_form),
        packageForm: leanClean(r.candidate_unit),
        isCancelled: r.is_cancelled === 'true',
      };
      await onCandidate(fields);
      lastId = r.id;
    }
    scanned += rows.length;
    if (rows.length < take) break;
  }
  return scanned;
}

function leanClean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/**
 * ProductCandidate 대량 승격 (dry-run/apply). **배치**.
 *   - apply=false → 배치 dry-run(runCandidatePromotionDryRun) 위임(write 0).
 *   - apply=true  → BufferingPromotionApplyStore 로 청크 multi-row INSERT. ProductMaster/Identifier 만 생성.
 */
export async function runCandidatePromotion(opts: RunCandidatePromotionOptions): Promise<PromotionApplyReport> {
  const ctx: PromoteCtx = {
    apply: opts.apply,
    importBatchId: opts.importBatchId,
    sourceBaseDate: opts.sourceBaseDate,
    sourceLabel: opts.sourceLabel,
  };

  if (!opts.apply) {
    const dr = await runCandidatePromotionDryRun({
      dataSource: opts.dataSource,
      sourceBaseDate: opts.sourceBaseDate,
      sourceLabel: opts.sourceLabel,
      candidateSourceLabelLike: opts.candidateSourceLabelLike,
      limit: opts.limit,
    });
    return dr.report;
  }

  // ── apply (batched) ──
  const report = emptyApplyReport(ctx);
  const cat = await preloadCatalog(opts.dataSource);
  const store = new BufferingPromotionApplyStore(
    opts.dataSource, cat.mastersByBarcode, cat.mfdsProductIdSet, cat.identifierIndex,
  );
  const mfdsGroups = new Map<string, { std: Set<string>; manuf: Set<string> }>();

  await scanCandidatesPaged(opts.dataSource, opts, async (fields) => {
    const outcome = await promoteOne(fields, store, ctx);
    accumulateOutcome(report, outcome, fields);
    if ((outcome.outcome === 'create' || outcome.outcome === 'link') && fields.mfdsCode && fields.standardCode) {
      let g = mfdsGroups.get(fields.mfdsCode);
      if (!g) { g = { std: new Set(), manuf: new Set() }; mfdsGroups.set(fields.mfdsCode, g); }
      g.std.add(fields.standardCode);
      if (fields.manufacturer) g.manuf.add(fields.manufacturer);
    }
    await store.maybeFlush();
  });
  await store.flush(); // 잔여 버퍼

  for (const g of mfdsGroups.values()) {
    if (g.std.size > 1) report.multiPackageMfdsCodeCount += 1;
    if (g.manuf.size > 1) report.multiManufacturerMfdsCodeCount += 1;
  }
  return report;
}
