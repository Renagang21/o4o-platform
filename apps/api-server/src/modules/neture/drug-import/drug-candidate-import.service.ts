/**
 * Drug Candidate Import Service — 약가마스터 CSV → ProductCandidate 후보 적재 (1차 파이프라인)
 *
 * WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1
 * 선행: IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1 (결정 1~12)
 *
 * 안전 경계 (이 WO 고유):
 *  - dry-run 이 기본. --apply 명시 시에만 DB write.
 *  - dry-run 은 DB write 없음. DataSource 미연결(offline) 이어도 파싱+매핑+예상건수 리포트를 낸다.
 *  - ProductMaster / representative_products / ProductIdentifier / DrugExtension 생성 안 함.
 *  - 표준코드/품목기준코드/ATC 는 candidate rawPayload 에 보존(Core 식별자 즉시 확정 아님).
 *
 * 중복 기준: (sourceType='csv_import', standardCode, sourceBaseDate) — IR 권장.
 *  ProductCandidate 에 전역 UNIQUE 가 없으므로(후보 큐) dedup 은 service logic 으로 수행한다.
 *  표준코드는 normalizedIdentifierValue(KOREA_DRUG_CODE) 로 보존되고,
 *  sourceBaseDate 는 rawPayload.sourceBaseDate 로 보존되므로 두 값으로 기존 후보를 조회한다.
 */

import type { DataSource } from 'typeorm';
import {
  parseDrugMasterCsv,
  type DrugCsvEncoding,
} from './drug-master-csv.parser.js';
import {
  mapDrugMasterRow,
  drugSourceLabel,
  type MappedDrugCandidate,
  type DrugReviewFlag,
} from './drug-master-row.mapper.js';

export interface DrugImportOptions {
  buffer: Buffer;
  sourceFileName: string;
  sourceBaseDate: string; // '2025-10-31'
  encoding?: DrugCsvEncoding; // default cp949
  serviceKey?: string | null;
  apply: boolean; // false = dry-run (기본). true = DB write.
  dataSource?: DataSource | null; // dry-run 은 없어도 동작(offline)
  limit?: number | null; // 처리 행 제한 (샘플 실증용)
}

export interface DrugImportReport {
  mode: 'dry-run' | 'apply';
  sourceFileName: string;
  sourceBaseDate: string;
  sourceLabel: string;
  encodingUsed: 'cp949' | 'utf-8';
  headerMatches: boolean;
  totalRows: number;
  processedRows: number;
  /** dry-run: 예측 / apply: 실제 */
  counts: {
    created: number;
    updated: number;
    skipped: number;
    errored: number;
  };
  classification: {
    active: number;
    cancelled: number;
  };
  reviewFlagCounts: Record<DrugReviewFlag, number>;
  /** import batch 내 동일 품목기준코드의 distinct 업체수 > 1 그룹 수 / 관련 행 수 */
  multiManufacturer: {
    detectedGroups: number;
    rowsInMultiManufacturerGroups: number;
  };
  errors: Array<{ rowNumber: number | null; reason: string }>;
  /** dedup 예측이 DB 없이 수행됐는지 (offline dry-run) */
  dedupChecked: boolean;
  notes: string[];
}

const EMPTY_FLAG_COUNTS = (): Record<DrugReviewFlag, number> => ({
  PACKAGE_FORM_MISSING: 0,
  STANDARD_CODE_FORMAT: 0,
  MFDS_CODE_MISSING: 0,
  PRODUCT_NAME_MISSING: 0,
  MANUFACTURER_MISSING: 0,
  ENCODING_SUSPECT: 0,
  COLUMN_COUNT_MISMATCH: 0,
});

export class DrugCandidateImportService {
  /**
   * 파이프라인 실행. dry-run 기본. --apply 일 때만 DB write.
   */
  async run(opts: DrugImportOptions): Promise<DrugImportReport> {
    const encoding: DrugCsvEncoding = opts.encoding ?? 'cp949';
    const mode: 'dry-run' | 'apply' = opts.apply ? 'apply' : 'dry-run';
    const sourceLabel = drugSourceLabel(opts.sourceFileName, opts.sourceBaseDate);
    const notes: string[] = [];

    const parsed = parseDrugMasterCsv(opts.buffer, encoding);

    const report: DrugImportReport = {
      mode,
      sourceFileName: opts.sourceFileName,
      sourceBaseDate: opts.sourceBaseDate,
      sourceLabel,
      encodingUsed: parsed.encodingUsed,
      headerMatches: parsed.headerMatches,
      totalRows: parsed.rows.length,
      processedRows: 0,
      counts: { created: 0, updated: 0, skipped: 0, errored: 0 },
      classification: { active: 0, cancelled: 0 },
      reviewFlagCounts: EMPTY_FLAG_COUNTS(),
      multiManufacturer: { detectedGroups: 0, rowsInMultiManufacturerGroups: 0 },
      errors: [...parsed.errors],
      dedupChecked: false,
      notes,
    };

    // 행 제한 (샘플 실증용)
    const rows = opts.limit != null ? parsed.rows.slice(0, opts.limit) : parsed.rows;

    // 1) 매핑
    const mapped: MappedDrugCandidate[] = [];
    for (const r of rows) {
      try {
        const m = mapDrugMasterRow(r.record, r.rawColumnCount, {
          serviceKey: opts.serviceKey ?? null,
          sourceFileName: opts.sourceFileName,
          sourceBaseDate: opts.sourceBaseDate,
          rowNumber: r.rowNumber,
        });
        mapped.push(m);
        for (const f of m.reviewFlags) report.reviewFlagCounts[f] += 1;
        if (m.isCancelled) report.classification.cancelled += 1;
        else report.classification.active += 1;
      } catch (e) {
        report.errors.push({ rowNumber: r.rowNumber, reason: `MAP_ERROR: ${(e as Error).message}` });
        report.counts.errored += 1;
      }
    }
    report.processedRows = mapped.length;

    // 2) multi-manufacturer 감지 (import batch 내 동일 품목기준코드 → distinct 업체)
    const groupToManufacturers = new Map<string, Set<string>>();
    const groupToRowCount = new Map<string, number>();
    for (const m of mapped) {
      const gk = m.groupKey;
      if (!gk) continue;
      const mf = m.candidateInput.candidateManufacturer;
      if (!groupToManufacturers.has(gk)) groupToManufacturers.set(gk, new Set());
      if (mf) groupToManufacturers.get(gk)!.add(mf);
      groupToRowCount.set(gk, (groupToRowCount.get(gk) ?? 0) + 1);
    }
    const multiManufacturerGroups = new Set<string>();
    for (const [gk, set] of groupToManufacturers) {
      if (set.size > 1) multiManufacturerGroups.add(gk);
    }
    report.multiManufacturer.detectedGroups = multiManufacturerGroups.size;
    report.multiManufacturer.rowsInMultiManufacturerGroups = [...multiManufacturerGroups].reduce(
      (sum, gk) => sum + (groupToRowCount.get(gk) ?? 0),
      0,
    );

    // multiManufacturerDetected / manufacturerCount 를 각 후보 metadata(rawPayload) 에 주입
    for (const m of mapped) {
      const gk = m.groupKey;
      const count = gk ? groupToManufacturers.get(gk)?.size ?? 0 : 0;
      m.candidateInput.rawPayload.manufacturerCount = count;
      m.candidateInput.rawPayload.multiManufacturerDetected = gk ? multiManufacturerGroups.has(gk) : false;
    }

    // 3) dedup 예측 / apply
    const canUseDb = !!opts.dataSource && (opts.dataSource.isInitialized ?? false);
    if (mode === 'apply') {
      if (!canUseDb) throw new Error('APPLY_REQUIRES_INITIALIZED_DATASOURCE');
      await this.applyRows(opts.dataSource!, mapped, report);
      report.dedupChecked = true;
    } else {
      // dry-run: DB 가 있으면 dedup 예측을 정확히, 없으면 offline(전부 created 가정) 으로.
      if (canUseDb) {
        await this.predictWithDb(opts.dataSource!, mapped, report);
        report.dedupChecked = true;
      } else {
        this.predictOffline(mapped, report);
        report.dedupChecked = false;
        notes.push(
          'DB 미연결 — dry-run 예측은 파일 내부 dedup 만 반영(기존 DB 후보와의 update 예측 제외). created 는 상한값.',
        );
      }
    }

    return report;
  }

  /** 표준코드 형식이상(식별자 없음) 행은 dedup 키가 약하므로 skip 으로 분류 */
  private dedupKeyOf(m: MappedDrugCandidate): string | null {
    const sc = m.dedupKey.standardCode;
    if (!sc) return null;
    return `${m.dedupKey.sourceType}::${sc}::${m.dedupKey.sourceBaseDate}`;
  }

  /** offline dry-run: 파일 내부 중복만 보고 created/skipped 예측 */
  private predictOffline(mapped: MappedDrugCandidate[], report: DrugImportReport): void {
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = this.dedupKeyOf(m);
      if (key == null) {
        // 표준코드 결측/형식이상 — 식별 불가 → skipped
        report.counts.skipped += 1;
        continue;
      }
      if (seen.has(key)) {
        report.counts.skipped += 1; // 동일 파일 내 중복
      } else {
        seen.add(key);
        report.counts.created += 1;
      }
    }
  }

  /** dry-run with DB: 기존 후보 존재 → updated 예측, 없으면 created 예측 (파일 내부 중복은 skipped) */
  private async predictWithDb(
    ds: DataSource,
    mapped: MappedDrugCandidate[],
    report: DrugImportReport,
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
      if (exists) report.counts.updated += 1;
      else report.counts.created += 1;
    }
  }

  /** 기존 후보 조회: source='csv_import' + KOREA_DRUG_CODE normalized=표준코드 + rawPayload.sourceBaseDate */
  private async findExisting(ds: DataSource, m: MappedDrugCandidate): Promise<{ id: string } | null> {
    const sc = m.dedupKey.standardCode;
    if (!sc) return null;
    const rows: Array<{ id: string }> = await ds.query(
      `SELECT id FROM product_candidates
        WHERE source_type = 'csv_import'
          AND identifier_type = 'KOREA_DRUG_CODE'
          AND normalized_identifier_value = $1
          AND raw_payload->>'sourceBaseDate' = $2
          AND deleted_at IS NULL
        LIMIT 1`,
      [sc, m.dedupKey.sourceBaseDate],
    );
    return rows[0] ?? null;
  }

  /**
   * --apply: 실제 DB write (배치). created/updated/skipped/errored 카운트.
   *
   * write 는 product_candidates INSERT 만 — ProductMaster/Identifier 미생성.
   *
   * 성능: 305k row 규모에서 per-row SELECT+INSERT(≈460k round-trip)는 Cloud Run Job
   *       1시간 timeout 을 초과한다. 따라서:
   *         1) 기존 dedup 키(표준코드)를 sourceBaseDate 당 **단일 SELECT** 로 선적재.
   *         2) 파일 내부 dedup + 기존 존재분(updated) skip.
   *         3) 신규분만 **청크 multi-row INSERT** (기본 500行/문). idempotent(재실행 시 기존 skip).
   *       기존 존재 row 는 값 재갱신하지 않는다(seed 목적상 불필요·고속화). 재실행 안전.
   */
  private static readonly APPLY_CHUNK = 500;

  private async applyRows(
    ds: DataSource,
    mapped: MappedDrugCandidate[],
    report: DrugImportReport,
  ): Promise<void> {
    // 1) 기존 dedup 키(표준코드) 선적재 — sourceBaseDate 당 단일 SELECT
    const baseDate = mapped.find((m) => m.dedupKey.sourceBaseDate)?.dedupKey.sourceBaseDate ?? null;
    const existing = new Set<string>();
    if (baseDate != null) {
      const rows: Array<{ normalized_identifier_value: string | null }> = await ds.query(
        `SELECT normalized_identifier_value FROM product_candidates
          WHERE source_type = 'csv_import'
            AND identifier_type = 'KOREA_DRUG_CODE'
            AND raw_payload->>'sourceBaseDate' = $1
            AND deleted_at IS NULL`,
        [baseDate],
      );
      for (const r of rows) if (r.normalized_identifier_value) existing.add(r.normalized_identifier_value);
    }

    // 2) 신규 대상 수집 (파일 내부 dedup + 기존 존재분 updated 로 skip)
    const seen = new Set<string>();
    const toInsert: MappedDrugCandidate[] = [];
    for (const m of mapped) {
      const sc = m.dedupKey.standardCode;
      if (sc == null) {
        report.counts.skipped += 1; // 표준코드 결측/형식이상
        continue;
      }
      if (seen.has(sc)) {
        report.counts.skipped += 1; // 파일 내부 중복
        continue;
      }
      seen.add(sc);
      if (existing.has(sc)) {
        report.counts.updated += 1; // 이미 존재 → write 생략(재실행 안전)
        continue;
      }
      toInsert.push(m);
    }

    // 3) 청크 multi-row INSERT
    const CHUNK = DrugCandidateImportService.APPLY_CHUNK;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      try {
        await this.insertChunk(ds, chunk);
        report.counts.created += chunk.length;
      } catch {
        // 청크 실패 시 per-row 폴백으로 불량 row 격리
        for (const m of chunk) {
          try {
            await this.insertChunk(ds, [m]);
            report.counts.created += 1;
          } catch (e) {
            report.errors.push({
              rowNumber: (m.candidateInput.rawPayload.rowNumber as number) ?? null,
              reason: `APPLY_ERROR: ${(e as Error).message}`,
            });
            report.counts.errored += 1;
          }
        }
      }
    }
  }

  /** 후보 청크 multi-row INSERT (파라미터 바인딩). */
  private async insertChunk(ds: DataSource, chunk: MappedDrugCandidate[]): Promise<void> {
    if (chunk.length === 0) return;
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const m of chunk) {
      const ci = m.candidateInput;
      valuesSql.push(
        `(gen_random_uuid(), $${p++}, 'csv_import', $${p++}, 'pending', 'unmatched', ` +
          `$${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::jsonb, NOW(), NOW())`,
      );
      params.push(
        ci.serviceKey,
        ci.sourceLabel,
        ci.identifierType,
        ci.identifierValue,
        ci.identifierValue, // normalized = 표준코드(trim)
        ci.candidateName,
        ci.candidateManufacturer,
        ci.candidateCategory,
        ci.candidateSpec,
        ci.candidateUnit,
        JSON.stringify(ci.rawPayload),
      );
    }
    await ds.query(
      `INSERT INTO product_candidates
         (id, service_key, source_type, source_label, candidate_status, match_status,
          identifier_type, identifier_value, normalized_identifier_value,
          candidate_name, candidate_manufacturer, candidate_category, candidate_spec, candidate_unit,
          raw_payload, created_at, updated_at)
       VALUES ${valuesSql.join(', ')}`,
      params,
    );
  }
}
