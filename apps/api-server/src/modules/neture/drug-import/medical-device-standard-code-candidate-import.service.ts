/**
 * Medical Device Standard-Code Candidate Import Service
 * — 의료기기 표준코드별 제품정보 raw JSONL → ProductCandidate 후보 적재
 *
 * WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1
 *
 * 안전 경계 (이 WO 고유):
 *  - dry-run 이 기본. --apply 명시 + env gate 시에만 DB write. (이 WO 에서 --apply 는 프로덕션 미실행.)
 *  - dry-run 은 DB write 없음. DataSource 미연결(offline) 이어도 파싱+매핑+예상건수 리포트.
 *  - ProductMaster / ProductIdentifier / SupplierProductOffer / OrganizationProductListing /
 *    StoreLocalProduct 생성 안 함. ProductCandidate 만.
 *
 * 중복(idempotency) 기준:
 *   source_type=external_api + source_label=MFDS_MEDICAL_DEVICE_STANDARD_CODE
 *   + raw_payload->>'sourceKind'='medical_device_standard_code'
 *   + raw_payload->>'sourceRowSignature'=<sig> + deleted_at IS NULL
 *   → UDIDI 단독이 아니라 rowSignature 로 dedup(같은 UDIDI 다른 제품=충돌행은 별도 후보로 보존).
 */

import type { DataSource } from 'typeorm';
import { parseMedicalDeviceJsonl, type ParsedMedicalDeviceRow } from './medical-device-standard-code-jsonl.parser.js';
import {
  mapMedicalDeviceRow,
  MDS_SOURCE_LABEL,
  MDS_SOURCE_KIND,
  MDS_REVIEW_FLAGS,
  type MappedMedicalDeviceCandidate,
  type MedicalDeviceReviewFlag,
} from './medical-device-standard-code-candidate.mapper.js';

export interface MedicalDeviceImportOptions {
  text: string;
  sourceFileName: string;
  serviceKey?: string | null;
  apply: boolean;
  dataSource?: DataSource | null;
  limit?: number | null;
}

export interface MedicalDeviceImportReport {
  mode: 'dry-run' | 'apply';
  sourceFileName: string;
  sourceLabel: string;
  totalRows: number;
  processedRows: number;
  blankLines: number;
  invalidJsonLines: number;
  identifierTypeCounts: { GTIN: number; UDI_DI: number; null: number };
  formatCounts: {
    gtin14CheckPass: number;
    gtin13: number;
    checkDigitFail: number;
    hibccNonGtin: number;
    missing: number;
  };
  counts: { createdExpected: number; updatedExpected: number; skipped: number; errored: number };
  nameTruncatedCount: number;
  candidateNameMissing: number;
  manufacturerMissing: number;
  dupConflictKeyCount: number;
  dupConflictRowCount: number;
  multiUdiPermitCount: number;
  reviewFlagCounts: Record<MedicalDeviceReviewFlag, number>;
  errors: Array<{ lineNumber: number | null; reason: string }>;
  dedupChecked: boolean;
  sampleMappedRows: Array<Record<string, unknown>>;
  notes: string[];
}

const EMPTY_FLAG_COUNTS = (): Record<MedicalDeviceReviewFlag, number> => {
  const o = {} as Record<MedicalDeviceReviewFlag, number>;
  for (const f of MDS_REVIEW_FLAGS) o[f] = 0;
  return o;
};

export class MedicalDeviceStandardCodeCandidateImportService {
  async run(opts: MedicalDeviceImportOptions): Promise<MedicalDeviceImportReport> {
    const mode: 'dry-run' | 'apply' = opts.apply ? 'apply' : 'dry-run';
    const notes: string[] = [];

    const parsed = parseMedicalDeviceJsonl(opts.text);

    const report: MedicalDeviceImportReport = {
      mode,
      sourceFileName: opts.sourceFileName,
      sourceLabel: MDS_SOURCE_LABEL,
      totalRows: parsed.rows.length,
      processedRows: 0,
      blankLines: parsed.blankLines,
      invalidJsonLines: parsed.errors.length,
      identifierTypeCounts: { GTIN: 0, UDI_DI: 0, null: 0 },
      formatCounts: { gtin14CheckPass: 0, gtin13: 0, checkDigitFail: 0, hibccNonGtin: 0, missing: 0 },
      counts: { createdExpected: 0, updatedExpected: 0, skipped: 0, errored: 0 },
      nameTruncatedCount: 0,
      candidateNameMissing: 0,
      manufacturerMissing: 0,
      dupConflictKeyCount: 0,
      dupConflictRowCount: 0,
      multiUdiPermitCount: 0,
      reviewFlagCounts: EMPTY_FLAG_COUNTS(),
      errors: parsed.errors.map((e) => ({ lineNumber: e.lineNumber, reason: e.reason })),
      dedupChecked: false,
      sampleMappedRows: [],
      notes,
    };

    const rows: ParsedMedicalDeviceRow[] =
      opts.limit != null ? parsed.rows.slice(0, opts.limit) : parsed.rows;

    // 1) 매핑 (단건)
    const mapped: MappedMedicalDeviceCandidate[] = [];
    for (const r of rows) {
      try {
        mapped.push(mapMedicalDeviceRow(r, { serviceKey: opts.serviceKey ?? null }));
      } catch (e) {
        report.errors.push({ lineNumber: r.lineNumber, reason: `MAP_ERROR: ${(e as Error).message}` });
        report.counts.errored += 1;
      }
    }
    report.processedRows = mapped.length;

    // 2) 교차행 계산: dup-conflict(같은 UDIDI 다른 제품) + multi-udi-per-permit
    this.annotateCrossRow(mapped, report);

    // 3) 단건 지표 집계 (교차행 플래그 부착 후)
    for (const m of mapped) {
      const t = m.candidateInput.identifierType;
      if (t === 'GTIN') report.identifierTypeCounts.GTIN += 1;
      else if (t === 'UDI_DI') report.identifierTypeCounts.UDI_DI += 1;
      else report.identifierTypeCounts.null += 1;

      if (m.candidateInput.candidateName == null) report.candidateNameMissing += 1;
      if (m.candidateInput.candidateManufacturer == null) report.manufacturerMissing += 1;
      if (m.nameTruncated) report.nameTruncatedCount += 1;

      for (const f of m.reviewFlags) report.reviewFlagCounts[f] += 1;

      if (m.reviewFlags.includes('UDI_DI_GTIN14_CHECKDIGIT_PASS')) report.formatCounts.gtin14CheckPass += 1;
      if (m.reviewFlags.includes('UDI_DI_GTIN13')) report.formatCounts.gtin13 += 1;
      if (m.reviewFlags.includes('UDI_DI_GTIN_CHECKDIGIT_FAIL')) report.formatCounts.checkDigitFail += 1;
      if (m.reviewFlags.includes('UDI_DI_NON_GTIN')) report.formatCounts.hibccNonGtin += 1;
      if (m.reviewFlags.includes('UDI_DI_MISSING')) report.formatCounts.missing += 1;
    }

    // sampleMappedRows 3건
    report.sampleMappedRows = mapped.slice(0, 3).map((m) => ({
      identifierType: m.candidateInput.identifierType,
      identifierValue: m.candidateInput.identifierValue,
      normalizedIdentifierValue: m.candidateInput.normalizedIdentifierValue,
      matchStatus: m.candidateInput.matchStatus,
      candidateName: m.candidateInput.candidateName,
      candidateManufacturer: m.candidateInput.candidateManufacturer,
      candidateCategory: m.candidateInput.candidateCategory,
      candidateSpec: m.candidateInput.candidateSpec,
      reviewFlags: m.reviewFlags,
    }));

    // 4) dedup 예측 / apply
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
        'DB 미연결 — dry-run 예측은 파일 내부 rowSignature dedup 만 반영(기존 DB 후보 update 예측 제외). createdExpected 는 상한값.',
      );
    }
    notes.push('허가 상태(active/inactive)는 이 importer 에서 join 하지 않음 — 전건 STATUS_UNCHECKED. Gate B 승격 시 별도 status map 필요.');

    return report;
  }

  /** 교차행: 같은 정규화 UDIDI 가 서로 다른 rowSignature 다수 → 충돌. 같은 PERMIT 다수 UDIDI → multi. */
  private annotateCrossRow(mapped: MappedMedicalDeviceCandidate[], report: MedicalDeviceImportReport): void {
    const udiSigs = new Map<string, Set<string>>();
    const permitUdis = new Map<string, Set<string>>();
    for (const m of mapped) {
      const udi = m.conflictKeyUdi;
      if (udi) {
        if (!udiSigs.has(udi)) udiSigs.set(udi, new Set());
        udiSigs.get(udi)!.add(m.dedupKey.rowSignature);
      }
      if (m.permitNo && udi) {
        if (!permitUdis.has(m.permitNo)) permitUdis.set(m.permitNo, new Set());
        permitUdis.get(m.permitNo)!.add(udi);
      }
    }
    const conflictUdis = new Set<string>();
    for (const [udi, sigs] of udiSigs) if (sigs.size > 1) conflictUdis.add(udi);
    const multiPermits = new Set<string>();
    for (const [permit, udis] of permitUdis) if (udis.size > 1) multiPermits.add(permit);

    report.dupConflictKeyCount = conflictUdis.size;
    report.multiUdiPermitCount = multiPermits.size;

    let dupRows = 0;
    for (const m of mapped) {
      if (m.conflictKeyUdi && conflictUdis.has(m.conflictKeyUdi)) {
        dupRows += 1;
        if (!m.reviewFlags.includes('UDI_DI_DUP_CONFLICT')) m.reviewFlags.push('UDI_DI_DUP_CONFLICT');
        m.candidateInput.matchStatus = 'conflict';
        this.pushRawFlag(m, 'UDI_DI_DUP_CONFLICT');
      }
      if (m.permitNo && multiPermits.has(m.permitNo)) {
        if (!m.reviewFlags.includes('MULTI_UDI_PER_PERMIT')) m.reviewFlags.push('MULTI_UDI_PER_PERMIT');
        this.pushRawFlag(m, 'MULTI_UDI_PER_PERMIT');
      }
    }
    report.dupConflictRowCount = dupRows;
  }

  private pushRawFlag(m: MappedMedicalDeviceCandidate, flag: MedicalDeviceReviewFlag): void {
    const rp = m.candidateInput.rawPayload as { reviewFlags?: unknown };
    if (Array.isArray(rp.reviewFlags) && !(rp.reviewFlags as string[]).includes(flag)) {
      (rp.reviewFlags as string[]).push(flag);
    }
  }

  private dedupKeyOf(m: MappedMedicalDeviceCandidate): string {
    return `${m.dedupKey.sourceLabel}::${m.dedupKey.sourceKind}::${m.dedupKey.rowSignature}`;
  }

  private predictOffline(mapped: MappedMedicalDeviceCandidate[], report: MedicalDeviceImportReport): void {
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = this.dedupKeyOf(m);
      if (seen.has(key)) report.counts.skipped += 1;
      else {
        seen.add(key);
        report.counts.createdExpected += 1;
      }
    }
  }

  private async predictWithDb(
    ds: DataSource,
    mapped: MappedMedicalDeviceCandidate[],
    report: MedicalDeviceImportReport,
  ): Promise<void> {
    const existing = await this.fetchExistingSignatures(ds);
    const seen = new Set<string>();
    for (const m of mapped) {
      const key = m.dedupKey.rowSignature;
      if (seen.has(key)) {
        report.counts.skipped += 1;
        continue;
      }
      seen.add(key);
      if (existing.has(key)) report.counts.updatedExpected += 1;
      else report.counts.createdExpected += 1;
    }
  }

  /** 이 sourceKind 의 기존 rowSignature 집합을 1회 조회(행별 SELECT 회피 → 견고·고속). */
  private async fetchExistingSignatures(ds: DataSource): Promise<Set<string>> {
    const rows: Array<{ sig: string | null }> = await ds.query(
      `SELECT raw_payload->>'sourceRowSignature' AS sig
         FROM product_candidates
        WHERE source_type = 'external_api'
          AND source_label = $1
          AND raw_payload->>'sourceKind' = $2
          AND deleted_at IS NULL`,
      [MDS_SOURCE_LABEL, MDS_SOURCE_KIND],
    );
    const s = new Set<string>();
    for (const r of rows) if (r.sig) s.add(r.sig);
    return s;
  }

  /**
   * --apply: 실제 DB write (product_candidates INSERT/UPDATE only).
   * 단일 트랜잭션 + 다중행 배치 INSERT (40k 순차 왕복 회피 → 연결 취약성 해소).
   * ⚠️ 프로덕션 실행은 사용자 "의료기기 apply 승인" + env gate(MEDICAL_DEVICE_IMPORT_ALLOW_APPLY) 후에만.
   */
  private async applyRows(
    ds: DataSource,
    mapped: MappedMedicalDeviceCandidate[],
    report: MedicalDeviceImportReport,
  ): Promise<void> {
    const existing = await this.fetchExistingSignatures(ds);
    const seen = new Set<string>();
    const toInsert: MappedMedicalDeviceCandidate[] = [];
    const toUpdate: MappedMedicalDeviceCandidate[] = [];
    for (const m of mapped) {
      const key = m.dedupKey.rowSignature;
      if (seen.has(key)) {
        report.counts.skipped += 1;
        continue;
      }
      seen.add(key);
      if (existing.has(key)) toUpdate.push(m);
      else toInsert.push(m);
    }

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const BATCH = 500;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const valuesSql: string[] = [];
        const params: unknown[] = [];
        let p = 0;
        for (const m of batch) {
          const ci = m.candidateInput;
          const ph = [
            'gen_random_uuid()',
            `$${++p}`, // service_key
            `'external_api'`,
            `$${++p}`, // source_label
            `'pending'`,
            `$${++p}`, // match_status
            `$${++p}`, // identifier_type
            `$${++p}`, // identifier_value
            `$${++p}`, // normalized_identifier_value
            `$${++p}`, // candidate_name
            `$${++p}`, // candidate_manufacturer
            `$${++p}`, // candidate_category
            `$${++p}`, // candidate_spec
            `$${++p}`, // candidate_unit
            `$${++p}`, // candidate_image_url
            `$${++p}::jsonb`, // raw_payload
            'NOW()',
            'NOW()',
          ];
          params.push(
            ci.serviceKey,
            ci.sourceLabel,
            ci.matchStatus,
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
          );
          valuesSql.push(`(${ph.join(',')})`);
        }
        await qr.query(
          `INSERT INTO product_candidates
             (id, service_key, source_type, source_label, candidate_status, match_status,
              identifier_type, identifier_value, normalized_identifier_value,
              candidate_name, candidate_manufacturer, candidate_category,
              candidate_spec, candidate_unit, candidate_image_url,
              raw_payload, created_at, updated_at)
           VALUES ${valuesSql.join(',')}`,
          params,
        );
        report.counts.createdExpected += batch.length;
      }

      for (const m of toUpdate) {
        const ci = m.candidateInput;
        await qr.query(
          `UPDATE product_candidates
             SET match_status = $2, identifier_type = $3, identifier_value = $4,
                 normalized_identifier_value = $5, candidate_name = $6,
                 candidate_manufacturer = $7, candidate_category = $8, candidate_spec = $9,
                 candidate_unit = $10, candidate_image_url = $11, raw_payload = $12::jsonb,
                 source_label = $13, updated_at = NOW()
           WHERE source_type = 'external_api' AND source_label = $13
             AND raw_payload->>'sourceKind' = $14
             AND raw_payload->>'sourceRowSignature' = $1
             AND deleted_at IS NULL`,
          [
            m.dedupKey.rowSignature,
            ci.matchStatus,
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
            ci.sourceLabel,
            MDS_SOURCE_KIND,
          ],
        );
        report.counts.updatedExpected += 1;
      }

      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      report.errors.push({ lineNumber: null, reason: `APPLY_ERROR: ${(e as Error).message}` });
      report.counts.errored += toInsert.length + toUpdate.length;
      report.counts.createdExpected = 0;
      report.counts.updatedExpected = 0;
    } finally {
      await qr.release();
    }
  }
}
