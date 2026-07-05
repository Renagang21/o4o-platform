/**
 * Medical Device Standard-Code Streaming Dry-Run Service
 * — 의료기기 표준코드별 제품정보 raw JSONL(전량 2.66M / 2.56GB) → Gate A dry-run 집계 (streaming)
 *
 * WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1
 *
 * 왜 별도 경로인가:
 *   기존 `MedicalDeviceStandardCodeCandidateImportService.run()` 은 raw 전체를 문자열(text)로 받아
 *   `parseMedicalDeviceJsonl(text)` 로 전량 배열화한다. 전량 raw(2.56GB)는 Node 문자열 한계
 *   (~512MB, V8 max string length)를 넘겨 readFileSync/split 단계에서 실패한다.
 *   → 파일 입력을 readline streaming 으로 바꾸고, 원본 row/매핑결과 전체를 메모리에 보관하지 않는다.
 *
 * 재사용(정책 불변):
 *   - 파서: `parseMedicalDeviceLine` (동일 언랩/필드 규칙)
 *   - 매퍼: `mapMedicalDeviceItem` (동일 identifierType/GTIN check-digit/reviewFlags/rowSignature)
 *   - dedup: rowSignature (UDIDI 단독 dedup 금지 — 충돌행 보존)
 *   - 교차행: UDI_DI_DUP_CONFLICT(같은 정규화 UDIDI + 다른 rowSignature),
 *            MULTI_UDI_PER_PERMIT(같은 PERMIT + 다중 UDIDI)
 *
 * 경계:
 *   - **dry-run 전용**. DB write / apply / ProductCandidate·Master·Identifier 생성 없음.
 *   - 원본 row 전체 미보관. dedup/conflict 판정에 필요한 최소 signature/대표값(Set/Map)만 보관.
 *   - 20k 표본에서 비streaming offline dry-run 과 지표가 일치해야 한다(회귀 기준).
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { parseMedicalDeviceLine } from './medical-device-standard-code-jsonl.parser.js';
import {
  mapMedicalDeviceItem,
  MDS_SOURCE_LABEL,
  MDS_REVIEW_FLAGS,
  type MedicalDeviceReviewFlag,
} from './medical-device-standard-code-candidate.mapper.js';

export interface MedicalDeviceStreamingDryRunReport {
  mode: 'dry-run';
  streaming: true;
  sourceFileName: string;
  sourceLabel: string;
  /** 성공 파싱된 row 수 (blank/invalid 제외) */
  totalRows: number;
  /** 매핑 성공 row 수 (= totalRows - mapErrored) */
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
  /** offline dedup 예측(파일 내 rowSignature dedup 만) — createdExpected 는 상한값 */
  counts: { createdExpected: number; updatedExpected: number; skipped: number; errored: number };
  nameTruncatedCount: number;
  candidateNameMissing: number;
  manufacturerMissing: number;
  distinctPermitCount: number;
  dupConflictKeyCount: number;
  dupConflictRowCount: number;
  multiUdiPermitCount: number;
  reviewFlagCounts: Record<MedicalDeviceReviewFlag, number>;
  errors: Array<{ lineNumber: number | null; reason: string }>;
  dedupChecked: false;
  sampleMappedRows: Array<Record<string, unknown>>;
  notes: string[];
}

export interface StreamingDryRunOptions {
  sourceFileName: string;
  serviceKey?: string | null;
  /** 진행 로그 콜백(기본 없음). CLI 에서 stderr 로 출력. */
  onProgress?: (processed: number) => void;
  /** 진행 로그 간격(기본 100,000) */
  progressEvery?: number;
  /** 오류 샘플 상한(무한 누적 방지, 기본 50) */
  maxErrorSamples?: number;
}

const EMPTY_FLAG_COUNTS = (): Record<MedicalDeviceReviewFlag, number> => {
  const o = {} as Record<MedicalDeviceReviewFlag, number>;
  for (const f of MDS_REVIEW_FLAGS) o[f] = 0;
  return o;
};

/** 정규화 UDIDI 별 교차행 상태 (원본 row 미보관 — firstSig 만) */
interface UdiAgg {
  firstSig: string;
  conflict: boolean;
  rows: number;
}
/** PERMIT 별 교차행 상태 (distinct UDIDI ≥2 판정 — firstUdi 만) */
interface PermitAgg {
  firstUdi: string | null;
  multi: boolean;
  rows: number;
}

export class MedicalDeviceStandardCodeStreamingDryRunService {
  /**
   * 파일 경로를 readline 으로 streaming 처리. 파일 전체를 문자열로 올리지 않는다.
   */
  async runFromFile(
    filePath: string,
    opts: StreamingDryRunOptions,
  ): Promise<MedicalDeviceStreamingDryRunReport> {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity, // \r\n 을 한 줄로
    });
    let report: MedicalDeviceStreamingDryRunReport;
    try {
      report = await this.runFromLines(rl, opts);
    } finally {
      rl.close();
    }
    // split(/\r?\n/) 기반 비streaming 파서와 blankLines 정합: 파일이 개행으로 끝나면
    // readline 은 마지막 빈 세그먼트를 방출하지 않지만 split 은 trailing '' 를 만든다 → +1 보정.
    if (this.endsWithNewline(filePath)) report.blankLines += 1;
    return report;
  }

  /** 파일 마지막 바이트가 개행(\n)인지 — 전체를 읽지 않고 1바이트만 확인 */
  private endsWithNewline(filePath: string): boolean {
    const size = fs.statSync(filePath).size;
    if (size === 0) return false;
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(1);
      fs.readSync(fd, buf, 0, 1, size - 1);
      return buf[0] === 0x0a; // '\n'
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * 라인 async iterable 을 순차 집계(테스트/파일 공용). 원본 row 배열을 만들지 않는다.
   */
  async runFromLines(
    lines: AsyncIterable<string>,
    opts: StreamingDryRunOptions,
  ): Promise<MedicalDeviceStreamingDryRunReport> {
    const progressEvery = opts.progressEvery ?? 100_000;
    const maxErrorSamples = opts.maxErrorSamples ?? 50;

    const report: MedicalDeviceStreamingDryRunReport = {
      mode: 'dry-run',
      streaming: true,
      sourceFileName: opts.sourceFileName,
      sourceLabel: MDS_SOURCE_LABEL,
      totalRows: 0,
      processedRows: 0,
      blankLines: 0,
      invalidJsonLines: 0,
      identifierTypeCounts: { GTIN: 0, UDI_DI: 0, null: 0 },
      formatCounts: { gtin14CheckPass: 0, gtin13: 0, checkDigitFail: 0, hibccNonGtin: 0, missing: 0 },
      counts: { createdExpected: 0, updatedExpected: 0, skipped: 0, errored: 0 },
      nameTruncatedCount: 0,
      candidateNameMissing: 0,
      manufacturerMissing: 0,
      distinctPermitCount: 0,
      dupConflictKeyCount: 0,
      dupConflictRowCount: 0,
      multiUdiPermitCount: 0,
      reviewFlagCounts: EMPTY_FLAG_COUNTS(),
      errors: [],
      dedupChecked: false,
      sampleMappedRows: [],
      notes: [],
    };

    // 최소 보관 구조 (원본 row 대신 signature/대표값만)
    const seenSig = new Set<string>(); // 전역 rowSignature dedup
    const udiAgg = new Map<string, UdiAgg>(); // 정규화 UDIDI → 충돌 판정
    const permitAgg = new Map<string, PermitAgg>(); // PERMIT → multi-UDI 판정

    let lineNumber = 0;
    let processed = 0; // 진행 로그용 (매핑 성공 수)

    for await (const raw of lines) {
      lineNumber += 1;

      if (raw.trim().length === 0) {
        report.blankLines += 1;
        continue;
      }

      // 1) 파싱
      let parsed;
      try {
        parsed = parseMedicalDeviceLine(raw, lineNumber);
      } catch (e) {
        report.invalidJsonLines += 1;
        if (report.errors.length < maxErrorSamples) {
          report.errors.push({ lineNumber, reason: `JSON_PARSE_ERROR: ${(e as Error).message}` });
        }
        continue;
      }
      report.totalRows += 1;

      // 2) 매핑 (단건, 순수)
      let m;
      try {
        m = mapMedicalDeviceItem(parsed.item, {
          serviceKey: opts.serviceKey ?? null,
          collectedAt: parsed.fetchedAt,
        });
      } catch (e) {
        report.counts.errored += 1;
        if (report.errors.length < maxErrorSamples) {
          report.errors.push({ lineNumber, reason: `MAP_ERROR: ${(e as Error).message}` });
        }
        continue;
      }
      report.processedRows += 1;
      processed += 1;

      // 3) 단건 지표
      const ci = m.candidateInput;
      if (ci.identifierType === 'GTIN') report.identifierTypeCounts.GTIN += 1;
      else if (ci.identifierType === 'UDI_DI') report.identifierTypeCounts.UDI_DI += 1;
      else report.identifierTypeCounts.null += 1;

      if (ci.candidateName == null) report.candidateNameMissing += 1;
      if (ci.candidateManufacturer == null) report.manufacturerMissing += 1;
      if (m.nameTruncated) report.nameTruncatedCount += 1;

      for (const f of m.reviewFlags) report.reviewFlagCounts[f] += 1;
      if (m.reviewFlags.includes('UDI_DI_GTIN14_CHECKDIGIT_PASS')) report.formatCounts.gtin14CheckPass += 1;
      if (m.reviewFlags.includes('UDI_DI_GTIN13')) report.formatCounts.gtin13 += 1;
      if (m.reviewFlags.includes('UDI_DI_GTIN_CHECKDIGIT_FAIL')) report.formatCounts.checkDigitFail += 1;
      if (m.reviewFlags.includes('UDI_DI_NON_GTIN')) report.formatCounts.hibccNonGtin += 1;
      if (m.reviewFlags.includes('UDI_DI_MISSING')) report.formatCounts.missing += 1;

      // 4) offline dedup 예측 (rowSignature)
      const sig = m.dedupKey.rowSignature;
      if (seenSig.has(sig)) report.counts.skipped += 1;
      else {
        seenSig.add(sig);
        report.counts.createdExpected += 1;
      }

      // 5) 교차행 누적 (원본 미보관 — 대표값만)
      const udi = m.conflictKeyUdi;
      if (udi) {
        const e = udiAgg.get(udi);
        if (e === undefined) {
          udiAgg.set(udi, { firstSig: sig, conflict: false, rows: 1 });
        } else {
          e.rows += 1;
          if (!e.conflict && sig !== e.firstSig) e.conflict = true;
        }
      }
      if (m.permitNo) {
        const e = permitAgg.get(m.permitNo);
        if (e === undefined) {
          permitAgg.set(m.permitNo, { firstUdi: udi ?? null, multi: false, rows: 1 });
        } else {
          e.rows += 1;
          if (udi) {
            if (e.firstUdi === null) e.firstUdi = udi;
            else if (!e.multi && udi !== e.firstUdi) e.multi = true;
          }
        }
      }

      // 6) 샘플 3건
      if (report.sampleMappedRows.length < 3) {
        report.sampleMappedRows.push({
          identifierType: ci.identifierType,
          identifierValue: ci.identifierValue,
          normalizedIdentifierValue: ci.normalizedIdentifierValue,
          matchStatus: ci.matchStatus,
          candidateName: ci.candidateName,
          candidateManufacturer: ci.candidateManufacturer,
          candidateCategory: ci.candidateCategory,
          candidateSpec: ci.candidateSpec,
          reviewFlags: m.reviewFlags,
        });
      }

      if (processed % progressEvery === 0) opts.onProgress?.(processed);
    }

    // 7) 교차행 확정 (전량 통과 후)
    let dupKeys = 0;
    let dupRows = 0;
    for (const e of udiAgg.values()) {
      if (e.conflict) {
        dupKeys += 1;
        dupRows += e.rows;
      }
    }
    report.dupConflictKeyCount = dupKeys;
    report.dupConflictRowCount = dupRows;
    // 충돌행에는 UDI_DI_DUP_CONFLICT 플래그가 부착되므로 카운트에 반영(비streaming 과 동일)
    report.reviewFlagCounts.UDI_DI_DUP_CONFLICT += dupRows;

    let multiPermits = 0;
    let multiPermitRows = 0;
    for (const e of permitAgg.values()) {
      if (e.multi) {
        multiPermits += 1;
        multiPermitRows += e.rows;
      }
    }
    report.multiUdiPermitCount = multiPermits;
    report.distinctPermitCount = permitAgg.size;
    // multi permit 소속 행에 MULTI_UDI_PER_PERMIT 부착 → 카운트 반영
    report.reviewFlagCounts.MULTI_UDI_PER_PERMIT += multiPermitRows;

    report.notes.push(
      'streaming dry-run(readline) — 원본 row 전체 미보관, signature/UDIDI/PERMIT 대표값만 집계. DB write 0.',
    );
    report.notes.push(
      'DB 미연결 — createdExpected 는 파일 내 rowSignature dedup 상한값(기존 DB 후보 update 예측 제외).',
    );
    report.notes.push(
      '허가 상태(active/inactive) 미조인 — 전건 STATUS_UNCHECKED. Gate B 승격 시 별도 status map 필요.',
    );

    return report;
  }
}
