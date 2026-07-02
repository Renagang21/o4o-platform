/**
 * Easy Drug Info Candidate Import Service — e약은요 raw JSONL → ProductCandidate 후보 적재
 *
 * WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
 * 선행: CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1
 *
 * 안전 경계 (이 WO 고유):
 *  - dry-run 이 기본. --apply 명시 시에만 DB write. (단 이 WO 에서 --apply 는 프로덕션 미실행.)
 *  - dry-run 은 DB write 없음. DataSource 미연결(offline) 이어도 파싱+매핑+예상건수 리포트를 낸다.
 *  - ProductMaster / ProductIdentifier / ProductDrugExtension / ProductImage /
 *    SupplierProductOffer / OrganizationProductListing 생성 안 함. ProductCandidate 만.
 *
 * 중복 기준 (WO):
 *   sourceType=external_api + identifierType=MFDS_CODE + normalizedIdentifierValue=itemSeq
 *   + rawPayload->>'sourceKind'='easy_drug_info' + deleted_at IS NULL
 *   있으면 update, 없으면 create. 같은 파일 재실행 무한중복 금지.
 *   (ProductCandidate 는 전역 UNIQUE 없음 → dedup 은 service logic.)
 */

import type { DataSource } from 'typeorm';
import {
  parseEasyDrugInfoJsonl,
  type ParsedEasyDrugRow,
} from './easy-drug-info-jsonl.parser.js';
import {
  mapEasyDrugRow,
  EASY_DRUG_SOURCE_LABEL,
  EASY_DRUG_SOURCE_KIND,
  type MappedEasyDrugCandidate,
  type EasyDrugReviewFlag,
} from './easy-drug-info-candidate.mapper.js';

export interface EasyDrugImportOptions {
  /** JSONL 텍스트 (파일 읽기는 CLI 책임) */
  text: string;
  sourceFileName: string;
  serviceKey?: string | null;
  apply: boolean; // false = dry-run (기본). true = DB write.
  dataSource?: DataSource | null; // dry-run 은 없어도 동작(offline)
  limit?: number | null; // 처리 행 제한 (샘플 실증용)
}

export interface EasyDrugImportReport {
  mode: 'dry-run' | 'apply';
  sourceFileName: string;
  sourceLabel: string;
  totalRows: number;
  processedRows: number;
  blankLines: number;
  /** dry-run: 예측 / apply: 실제 */
  counts: {
    createdExpected: number;
    updatedExpected: number;
    skipped: number;
    errored: number;
  };
  imagePresentCount: number;
  imageMissingCount: number;
  officialTextPresentCount: number;
  officialTextMissingCount: number;
  reviewFlagCounts: Record<EasyDrugReviewFlag, number>;
  errors: Array<{ lineNumber: number | null; reason: string }>;
  /** dedup 예측이 DB read 로 수행됐는지 (offline dry-run 이면 false) */
  dedupChecked: boolean;
  /** 매핑 샘플 3건 (검증용) */
  sampleMappedRows: Array<Record<string, unknown>>;
  notes: string[];
}

const EMPTY_FLAG_COUNTS = (): Record<EasyDrugReviewFlag, number> => ({
  ITEM_SEQ_MISSING: 0,
  ITEM_NAME_MISSING: 0,
  MANUFACTURER_MISSING: 0,
  IMAGE_MISSING: 0,
  OFFICIAL_TEXT_MISSING: 0,
  UPDATE_DATE_MISSING: 0,
});

export class EasyDrugInfoCandidateImportService {
  async run(opts: EasyDrugImportOptions): Promise<EasyDrugImportReport> {
    const mode: 'dry-run' | 'apply' = opts.apply ? 'apply' : 'dry-run';
    const notes: string[] = [];

    const parsed = parseEasyDrugInfoJsonl(opts.text);

    const report: EasyDrugImportReport = {
      mode,
      sourceFileName: opts.sourceFileName,
      sourceLabel: EASY_DRUG_SOURCE_LABEL,
      totalRows: parsed.rows.length,
      processedRows: 0,
      blankLines: parsed.blankLines,
      counts: { createdExpected: 0, updatedExpected: 0, skipped: 0, errored: 0 },
      imagePresentCount: 0,
      imageMissingCount: 0,
      officialTextPresentCount: 0,
      officialTextMissingCount: 0,
      reviewFlagCounts: EMPTY_FLAG_COUNTS(),
      errors: parsed.errors.map((e) => ({ lineNumber: e.lineNumber, reason: e.reason })),
      dedupChecked: false,
      sampleMappedRows: [],
      notes,
    };

    const rows: ParsedEasyDrugRow[] =
      opts.limit != null ? parsed.rows.slice(0, opts.limit) : parsed.rows;

    // 1) 매핑
    const mapped: MappedEasyDrugCandidate[] = [];
    for (const r of rows) {
      try {
        const m = mapEasyDrugRow(r, { serviceKey: opts.serviceKey ?? null });
        mapped.push(m);
        for (const f of m.reviewFlags) report.reviewFlagCounts[f] += 1;
        if (m.hasImage) report.imagePresentCount += 1;
        else report.imageMissingCount += 1;
        if (m.hasOfficialText) report.officialTextPresentCount += 1;
        else report.officialTextMissingCount += 1;
      } catch (e) {
        report.errors.push({ lineNumber: r.lineNumber, reason: `MAP_ERROR: ${(e as Error).message}` });
        report.counts.errored += 1;
      }
    }
    report.processedRows = mapped.length;

    // sampleMappedRows 3건
    report.sampleMappedRows = mapped.slice(0, 3).map((m) => ({
      identifierType: m.candidateInput.identifierType,
      identifierValue: m.candidateInput.identifierValue,
      normalizedIdentifierValue: m.candidateInput.normalizedIdentifierValue,
      candidateName: m.candidateInput.candidateName,
      candidateManufacturer: m.candidateInput.candidateManufacturer,
      candidateCategory: m.candidateInput.candidateCategory,
      candidateImageUrl: m.candidateInput.candidateImageUrl,
      sourceType: m.candidateInput.sourceType,
      sourceLabel: m.candidateInput.sourceLabel,
      reviewFlags: m.reviewFlags,
      officialConsumerTextKeys: Object.keys(
        (m.candidateInput.rawPayload.officialConsumerText as Record<string, unknown>) ?? {},
      ),
    }));

    // 2) dedup 예측 / apply
    const canUseDb = !!opts.dataSource && (opts.dataSource.isInitialized ?? false);
    if (mode === 'apply') {
      if (!canUseDb) throw new Error('APPLY_REQUIRES_INITIALIZED_DATASOURCE');
      await this.applyRows(opts.dataSource!, mapped, report);
      report.dedupChecked = true;
    } else if (canUseDb) {
      await this.predictWithDb(opts.dataSource!, mapped, report);
      report.dedupChecked = true;
    } else {
      this.predictOffline(mapped, report);
      report.dedupChecked = false;
      notes.push(
        'DB 미연결 — dry-run 예측은 파일 내부 dedup 만 반영(기존 DB 후보와의 update 예측 제외). createdExpected 는 상한값.',
      );
    }

    return report;
  }

  /** dedup 키: itemSeq 없으면 식별 불가(null) → skip 분류 */
  private dedupKeyOf(m: MappedEasyDrugCandidate): string | null {
    const norm = m.dedupKey.normalizedIdentifierValue;
    if (!norm) return null;
    return `${m.dedupKey.sourceType}::${m.dedupKey.identifierType}::${norm}::${m.dedupKey.sourceKind}`;
  }

  /** offline dry-run: 파일 내부 중복만 보고 createdExpected/skipped 예측 */
  private predictOffline(mapped: MappedEasyDrugCandidate[], report: EasyDrugImportReport): void {
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = this.dedupKeyOf(m);
      if (key == null) {
        report.counts.skipped += 1; // itemSeq 결측 → 식별 불가
        continue;
      }
      if (seen.has(key)) {
        report.counts.skipped += 1; // 동일 파일 내 중복
      } else {
        seen.add(key);
        report.counts.createdExpected += 1;
      }
    }
  }

  /** dry-run with DB: 기존 후보 존재 → updatedExpected, 없으면 createdExpected (파일 내부 중복은 skipped) */
  private async predictWithDb(
    ds: DataSource,
    mapped: MappedEasyDrugCandidate[],
    report: EasyDrugImportReport,
  ): Promise<void> {
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = this.dedupKeyOf(m);
      if (key == null) {
        report.counts.skipped += 1;
        continue;
      }
      if (seen.has(key)) {
        report.counts.skipped += 1;
        continue;
      }
      seen.add(key);
      const exists = await this.findExisting(ds, m);
      if (exists) report.counts.updatedExpected += 1;
      else report.counts.createdExpected += 1;
    }
  }

  /**
   * 기존 후보 조회 (WO dedup 기준):
   *   source_type='external_api' + identifier_type='MFDS_CODE'
   *   + normalized_identifier_value=itemSeq + raw_payload->>'sourceKind'='easy_drug_info'
   *   + deleted_at IS NULL
   */
  private async findExisting(
    ds: DataSource,
    m: MappedEasyDrugCandidate,
  ): Promise<{ id: string } | null> {
    const norm = m.dedupKey.normalizedIdentifierValue;
    if (!norm) return null;
    const rows: Array<{ id: string }> = await ds.query(
      `SELECT id FROM product_candidates
        WHERE source_type = 'external_api'
          AND identifier_type = 'MFDS_CODE'
          AND normalized_identifier_value = $1
          AND raw_payload->>'sourceKind' = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [norm, EASY_DRUG_SOURCE_KIND],
    );
    return rows[0] ?? null;
  }

  /**
   * --apply: 실제 DB write. created/updated/skipped/errored 카운트.
   *
   * ⚠️ 이 WO 에서는 프로덕션 DB 에 실행하지 않는다(안전 경계). 구현만 둔다.
   *    write 는 product_candidates INSERT/UPDATE 만 — ProductMaster/Identifier/Extension/Image 미생성.
   */
  private async applyRows(
    ds: DataSource,
    mapped: MappedEasyDrugCandidate[],
    report: EasyDrugImportReport,
  ): Promise<void> {
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = this.dedupKeyOf(m);
      if (key == null) {
        report.counts.skipped += 1;
        continue;
      }
      if (seen.has(key)) {
        report.counts.skipped += 1;
        continue;
      }
      seen.add(key);
      const ci = m.candidateInput;
      try {
        const existing = await this.findExisting(ds, m);
        if (existing) {
          await ds.query(
            `UPDATE product_candidates
               SET candidate_name = $2,
                   candidate_manufacturer = $3,
                   candidate_category = $4,
                   candidate_spec = $5,
                   candidate_unit = $6,
                   candidate_image_url = $7,
                   raw_payload = $8::jsonb,
                   source_label = $9,
                   updated_at = NOW()
             WHERE id = $1`,
            [
              existing.id,
              ci.candidateName,
              ci.candidateManufacturer,
              ci.candidateCategory,
              ci.candidateSpec,
              ci.candidateUnit,
              ci.candidateImageUrl,
              JSON.stringify(ci.rawPayload),
              ci.sourceLabel,
            ],
          );
          report.counts.updatedExpected += 1;
        } else {
          await ds.query(
            `INSERT INTO product_candidates
               (id, service_key, source_type, source_label, candidate_status, match_status,
                identifier_type, identifier_value, normalized_identifier_value,
                candidate_name, candidate_manufacturer, candidate_category,
                candidate_spec, candidate_unit, candidate_image_url,
                raw_payload, created_at, updated_at)
             VALUES
               (gen_random_uuid(), $1, 'external_api', $2, 'pending', 'unmatched',
                $3, $4, $5,
                $6, $7, $8,
                $9, $10, $11,
                $12::jsonb, NOW(), NOW())`,
            [
              ci.serviceKey,
              ci.sourceLabel,
              ci.identifierType,
              ci.identifierValue,
              ci.normalizedIdentifierValue,
              ci.candidateName,
              ci.candidateManufacturer,
              ci.candidateCategory,
              ci.candidateSpec,
              ci.candidateUnit,
              ci.candidateImageUrl,
              JSON.stringify(ci.rawPayload),
            ],
          );
          report.counts.createdExpected += 1;
        }
      } catch (e) {
        report.errors.push({ lineNumber: null, reason: `APPLY_ERROR: ${(e as Error).message}` });
        report.counts.errored += 1;
      }
    }
  }
}
