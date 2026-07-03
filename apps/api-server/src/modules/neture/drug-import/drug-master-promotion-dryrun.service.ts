/**
 * Drug Master Promotion Dry-run Service (PURE, DB 무관)
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1
 * 선행: CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1
 *
 * 목적:
 *   약가마스터 CSV row 를 확정된 승격 정책(CHECK §2~§9)에 따라 ProductMaster/ProductIdentifier 로
 *   "승격했을 때"의 예상 건수와 제외 사유를 **실 DB write 0** 으로 산출한다.
 *
 * 정책(확정):
 *   - ProductMaster 1건 = 표준코드 1건 = SKU.
 *   - V1 승격 대상 = active(취소일자 공란) + 표준코드 GTIN check-digit 통과 row.
 *   - barcode = 표준코드, mfdsProductId = HIRA:DRUG_MASTER:{표준코드},
 *     regulatoryType = DRUG, drugCategory = 전문→rx/일반→otc/그외→drug_unspecified,
 *     mfdsPermitNumber = null, specification = 규격+수량+제형+포장 fallback.
 *   - identifier: KOREA_DRUG_CODE(primary)=표준코드, MFDS_CODE=품목기준코드,
 *     KOREA_INSURANCE_CODE=제품코드(개정후), ATC_CODE=국제표준코드(ATC코드).
 *   - 대표상품(representative_products) 자동생성 하지 않음. 다제조사/다포장 그룹 flag 만 산출.
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 * 입력은 이미 파싱된 배열(약가마스터 ParsedDrugRow[]) 이다. validateGtin(gtin.ts) 만 재사용.
 */

import { validateGtin } from '../../../utils/gtin.js';
import type { ParsedDrugRow } from './drug-master-csv.parser.js';
import type { ProductDrugCategory } from '../utils/product-type.util.js';

/** 표준코드 형식: 13자리 숫자 (CHECK §1.4 — 형식 검증. check-digit 는 validateGtin 별도) */
const STANDARD_CODE_PATTERN = /^\d{13}$/;

/** mfdsProductId 네임스페이스 prefix (CHECK §4.1) */
export const MFDS_PRODUCT_ID_PREFIX = 'HIRA:DRUG_MASTER:';

/** sample 배열 상한 (report 경량화 — 초과분은 truncated 카운트로 표기, 무음 절단 금지) */
const SAMPLE_CAP = 10;

/** row 제외 사유 (승격 불가 분류) */
export type PromotionSkipReason =
  | 'cancelled' // 취소일자 존재
  | 'missing_standard_code' // 표준코드 결측
  | 'invalid_standard_code_format' // 13자리 숫자 아님
  | 'invalid_standard_code_check_digit' // 형식통과 but GTIN check-digit fail
  | 'missing_required'; // 한글상품명/업체명 결측 (NOT NULL 위반)

/** eligible row 의 ProductMaster 생성 미리보기 (write 아님) */
export interface MasterPreview {
  barcode: string;
  regulatoryType: 'DRUG';
  drugCategory: ProductDrugCategory;
  regulatoryName: string;
  name: string;
  manufacturerName: string;
  mfdsPermitNumber: null;
  mfdsProductId: string;
  specification: string | null;
  isMfdsVerified: true;
  mfdsSyncedAt: string;
  representativeProductId: null;
  tags: string[];
}

/** eligible row 의 ProductIdentifier 생성 미리보기 목록 (write 아님) */
export interface IdentifierPreview {
  identifierType: 'KOREA_DRUG_CODE' | 'MFDS_CODE' | 'KOREA_INSURANCE_CODE' | 'ATC_CODE';
  identifierValue: string;
  isPrimary: boolean;
  verificationStatus: 'imported';
  country: 'KR';
  metadata: {
    sourceDataset: 'HIRA_DRUG_MASTER';
    sourceBaseDate: string;
    rowNumber: number;
    importBatchId: string;
  };
}

export interface EligibleRowPreview {
  rowNumber: number;
  standardCode: string;
  mfdsCode: string | null;
  master: MasterPreview;
  identifiers: IdentifierPreview[];
}

export interface SkippedRowSample {
  rowNumber: number;
  reason: PromotionSkipReason;
  standardCode: string | null;
  gtinError: string | null;
  name: string | null;
  manufacturer: string | null;
}

export interface DrugPromotionDryRunReport {
  mode: 'dry-run';
  sourceFileName: string;
  sourceBaseDate: string;
  sourceLabel: string;
  importBatchId: string;
  dbWrites: 0;

  // ── 전체 판정 ──
  totalRows: number;
  activeRows: number;
  cancelledRows: number;
  missingStandardCode: number;
  invalidStandardCodeFormat: number;
  invalidStandardCodeCheckDigit: number; // ★ 이번 dry-run 핵심 실측
  missingRequired: number;
  eligibleRows: number;

  // ── 생성 예상 ──
  wouldCreateProductMaster: number;
  wouldCreatePrimaryKoreaDrugCodeIdentifier: number;
  wouldCreateMfdsCodeIdentifier: number;
  wouldCreateKoreaInsuranceCodeIdentifier: number;
  wouldCreateAtcCodeIdentifier: number;

  // ── drugCategory 분포 (eligible 기준) ──
  rxCount: number;
  otcCount: number;
  drugUnspecifiedCount: number;

  // ── specification / package ──
  packageFormMissingCount: number; // eligible 중 포장형태 결측
  specificationFallbackUsedCount: number; // 포장형태 결측이나 나머지로 합성
  specificationEmptyCount: number; // eligible 중 specification 전부 결측

  // ── 그룹핑 (품목기준코드 기준, eligible) ──
  distinctStandardCode: number;
  distinctMfdsCode: number;
  multiPackageMfdsCodeCount: number; // 표준코드 2개 이상 묶인 품목기준코드
  multiManufacturerMfdsCodeCount: number; // 업체명 2개 이상 묶인 품목기준코드
  maxStandardCodesPerMfdsCode: number;
  manufacturerCountDistribution: Record<string, number>; // 업체수 → 품목기준코드 수
  standardCodeCountDistribution: Record<string, number>; // 표준코드수 → 품목기준코드 수

  // ── 파일 내부 충돌 ──
  duplicateStandardCodeInFile: number; // eligible 표준코드가 2회 이상 등장
  duplicateMfdsProductIdPreview: number; // HIRA:...{표준코드} 중복 (= 표준코드 중복)
  standardCodeToMultipleRows: number; // 표준코드가 복수 row(active/cancel 혼재 포함) 매핑

  // ── sample ──
  sampleEligibleRows: EligibleRowPreview[];
  sampleSkippedInvalidCheckDigitRows: SkippedRowSample[];
  sampleCancelledRows: SkippedRowSample[];
  sampleMultiManufacturerGroups: Array<{ mfdsCode: string; manufacturers: string[]; standardCodeCount: number }>;
  sampleTruncated: {
    eligible: boolean;
    invalidCheckDigit: boolean;
    cancelled: boolean;
    multiManufacturerGroups: boolean;
  };

  notes: string[];
}

export interface DryRunOptions {
  sourceFileName: string;
  sourceBaseDate: string; // '2025-10-31'
  importBatchId: string; // 'dryrun-<sourceBaseDate>' 등 (Date.now 미사용 — 결정론적)
}

function clean(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/** 전문일반구분 → drugCategory (CHECK §7) */
export function mapDrugCategory(rxOtc: string | null): ProductDrugCategory {
  const v = (rxOtc ?? '').trim();
  if (v.includes('전문')) return 'rx';
  if (v.includes('일반')) return 'otc';
  return 'drug_unspecified';
}

/** specification 합성 (CHECK §6). 포장형태 결측이면 나머지로. 전부 결측이면 null. */
export function buildSpecification(
  spec: string | null,
  totalQuantity: string | null,
  dosageForm: string | null,
  packageForm: string | null,
): string | null {
  const parts = [spec, totalQuantity, dosageForm, packageForm].filter((p): p is string => p != null);
  return parts.length === 0 ? null : parts.join(' / ');
}

/** sourceLabel (파일 stem + 기준일) */
export function promotionSourceLabel(sourceFileName: string, sourceBaseDate: string): string {
  const stem = sourceFileName.replace(/\.[^.]+$/, '');
  const label = stem.includes(sourceBaseDate) ? stem : `${stem}_${sourceBaseDate}`;
  return label.slice(0, 128);
}

function emptyReport(opts: DryRunOptions, totalRows: number): DrugPromotionDryRunReport {
  return {
    mode: 'dry-run',
    sourceFileName: opts.sourceFileName,
    sourceBaseDate: opts.sourceBaseDate,
    sourceLabel: promotionSourceLabel(opts.sourceFileName, opts.sourceBaseDate),
    importBatchId: opts.importBatchId,
    dbWrites: 0,
    totalRows,
    activeRows: 0,
    cancelledRows: 0,
    missingStandardCode: 0,
    invalidStandardCodeFormat: 0,
    invalidStandardCodeCheckDigit: 0,
    missingRequired: 0,
    eligibleRows: 0,
    wouldCreateProductMaster: 0,
    wouldCreatePrimaryKoreaDrugCodeIdentifier: 0,
    wouldCreateMfdsCodeIdentifier: 0,
    wouldCreateKoreaInsuranceCodeIdentifier: 0,
    wouldCreateAtcCodeIdentifier: 0,
    rxCount: 0,
    otcCount: 0,
    drugUnspecifiedCount: 0,
    packageFormMissingCount: 0,
    specificationFallbackUsedCount: 0,
    specificationEmptyCount: 0,
    distinctStandardCode: 0,
    distinctMfdsCode: 0,
    multiPackageMfdsCodeCount: 0,
    multiManufacturerMfdsCodeCount: 0,
    maxStandardCodesPerMfdsCode: 0,
    manufacturerCountDistribution: {},
    standardCodeCountDistribution: {},
    duplicateStandardCodeInFile: 0,
    duplicateMfdsProductIdPreview: 0,
    standardCodeToMultipleRows: 0,
    sampleEligibleRows: [],
    sampleSkippedInvalidCheckDigitRows: [],
    sampleCancelledRows: [],
    sampleMultiManufacturerGroups: [],
    sampleTruncated: {
      eligible: false,
      invalidCheckDigit: false,
      cancelled: false,
      multiManufacturerGroups: false,
    },
    notes: [],
  };
}

/**
 * 승격 dry-run 판정. write 없음.
 */
export function runPromotionDryRun(
  rows: ParsedDrugRow[],
  opts: DryRunOptions,
): DrugPromotionDryRunReport {
  const report = emptyReport(opts, rows.length);
  const sourceLabel = report.sourceLabel;

  // eligible 표준코드 → 등장 횟수 (파일 내 중복 감지)
  const standardCodeSeen = new Map<string, number>();
  // 표준코드(형식통과분, active/cancel 무관) → 등장 row 수 (standardCodeToMultipleRows)
  const standardCodeAnyRow = new Map<string, number>();
  // 품목기준코드 그룹 (eligible 기준)
  const mfdsGroups = new Map<string, { standardCodes: Set<string>; manufacturers: Set<string> }>();

  for (const r of rows) {
    const rec = r.record;
    const productName = clean(rec['한글상품명']);
    const manufacturer = clean(rec['업체명']);
    const spec = clean(rec['약품규격']);
    const totalQuantity = clean(rec['제품총수량']);
    const dosageForm = clean(rec['제형구분']);
    const packageForm = clean(rec['포장형태']);
    const mfdsCode = clean(rec['품목기준코드']);
    const rxOtc = clean(rec['전문일반구분']);
    const standardCode = clean(rec['표준코드']);
    const productCodeRevised = clean(rec['제품코드(개정후)']);
    const atcCode = clean(rec['국제표준코드(ATC코드)']);
    const cancelledAt = clean(rec['취소일자']);
    const isCancelled = cancelledAt != null;

    if (isCancelled) report.cancelledRows += 1;
    else report.activeRows += 1;

    // 표준코드가 형식통과면 any-row 카운트 (active/cancel 혼재 매핑 감지용)
    if (standardCode != null && STANDARD_CODE_PATTERN.test(standardCode)) {
      standardCodeAnyRow.set(standardCode, (standardCodeAnyRow.get(standardCode) ?? 0) + 1);
    }

    // ── 제외 사유 판정 (우선순위: cancelled → 표준코드 결측 → 형식 → check-digit → 필수필드) ──
    if (isCancelled) {
      pushSample(report.sampleCancelledRows, {
        rowNumber: r.rowNumber, reason: 'cancelled', standardCode, gtinError: null, name: productName, manufacturer,
      }, () => { report.sampleTruncated.cancelled = true; });
      continue;
    }
    if (standardCode == null) {
      report.missingStandardCode += 1;
      continue;
    }
    if (!STANDARD_CODE_PATTERN.test(standardCode)) {
      report.invalidStandardCodeFormat += 1;
      continue;
    }
    const gtinError = validateGtin(standardCode);
    if (gtinError != null) {
      report.invalidStandardCodeCheckDigit += 1;
      pushSample(report.sampleSkippedInvalidCheckDigitRows, {
        rowNumber: r.rowNumber, reason: 'invalid_standard_code_check_digit', standardCode, gtinError, name: productName, manufacturer,
      }, () => { report.sampleTruncated.invalidCheckDigit = true; });
      continue;
    }
    if (productName == null || manufacturer == null) {
      report.missingRequired += 1;
      continue;
    }

    // ── eligible ──
    report.eligibleRows += 1;
    report.wouldCreateProductMaster += 1;

    // 파일 내부 표준코드 중복
    standardCodeSeen.set(standardCode, (standardCodeSeen.get(standardCode) ?? 0) + 1);

    // drugCategory
    const drugCategory = mapDrugCategory(rxOtc);
    if (drugCategory === 'rx') report.rxCount += 1;
    else if (drugCategory === 'otc') report.otcCount += 1;
    else report.drugUnspecifiedCount += 1;

    // specification
    const specification = buildSpecification(spec, totalQuantity, dosageForm, packageForm);
    if (packageForm == null) {
      report.packageFormMissingCount += 1;
      if (specification != null) report.specificationFallbackUsedCount += 1;
    }
    if (specification == null) report.specificationEmptyCount += 1;

    // identifier 생성 예상
    report.wouldCreatePrimaryKoreaDrugCodeIdentifier += 1;
    if (mfdsCode != null) report.wouldCreateMfdsCodeIdentifier += 1;
    if (productCodeRevised != null) report.wouldCreateKoreaInsuranceCodeIdentifier += 1;
    if (atcCode != null) report.wouldCreateAtcCodeIdentifier += 1;

    // 품목기준코드 그룹 누적 (eligible)
    if (mfdsCode != null) {
      let g = mfdsGroups.get(mfdsCode);
      if (!g) { g = { standardCodes: new Set(), manufacturers: new Set() }; mfdsGroups.set(mfdsCode, g); }
      g.standardCodes.add(standardCode);
      if (manufacturer) g.manufacturers.add(manufacturer);
    }

    // sample eligible preview
    if (report.sampleEligibleRows.length < SAMPLE_CAP) {
      report.sampleEligibleRows.push(
        buildEligiblePreview(r.rowNumber, standardCode, mfdsCode, productCodeRevised, atcCode, {
          drugCategory, productName, manufacturer, specification, sourceBaseDate: opts.sourceBaseDate,
          sourceLabel, importBatchId: opts.importBatchId,
        }),
      );
    } else {
      report.sampleTruncated.eligible = true;
    }
  }

  // ── 파일 내부 표준코드 중복 집계 ──
  for (const cnt of standardCodeSeen.values()) {
    if (cnt > 1) report.duplicateStandardCodeInFile += 1;
  }
  // mfdsProductId = HIRA:...{표준코드} → 표준코드 중복과 1:1
  report.duplicateMfdsProductIdPreview = report.duplicateStandardCodeInFile;
  for (const cnt of standardCodeAnyRow.values()) {
    if (cnt > 1) report.standardCodeToMultipleRows += 1;
  }
  report.distinctStandardCode = standardCodeSeen.size;

  // ── 품목기준코드 그룹 분포 ──
  report.distinctMfdsCode = mfdsGroups.size;
  let maxStd = 0;
  for (const g of mfdsGroups.values()) {
    const stdN = g.standardCodes.size;
    const mfN = g.manufacturers.size;
    if (stdN > maxStd) maxStd = stdN;
    if (stdN > 1) report.multiPackageMfdsCodeCount += 1;
    if (mfN > 1) {
      report.multiManufacturerMfdsCodeCount += 1;
    }
    const stdKey = String(stdN);
    report.standardCodeCountDistribution[stdKey] = (report.standardCodeCountDistribution[stdKey] ?? 0) + 1;
    const mfKey = String(mfN);
    report.manufacturerCountDistribution[mfKey] = (report.manufacturerCountDistribution[mfKey] ?? 0) + 1;
  }
  report.maxStandardCodesPerMfdsCode = maxStd;

  // ── multi-manufacturer 그룹 sample ──
  let multiMfCount = 0;
  for (const [mfdsCode, g] of mfdsGroups) {
    if (g.manufacturers.size <= 1) continue;
    multiMfCount += 1;
    if (report.sampleMultiManufacturerGroups.length < SAMPLE_CAP) {
      report.sampleMultiManufacturerGroups.push({
        mfdsCode,
        manufacturers: [...g.manufacturers],
        standardCodeCount: g.standardCodes.size,
      });
    } else {
      report.sampleTruncated.multiManufacturerGroups = true;
    }
  }
  void multiMfCount;

  report.notes.push(
    'dry-run: DB write 0. ProductMaster/ProductIdentifier/DrugExtension/Image/SharedProductDescription 미생성.',
    'invalidStandardCodeCheckDigit = validateGtin(gtin.ts) 실패 수 — barcode=표준코드 정책 확정의 핵심 지표.',
    '기존 DB Master 충돌(link/conflict)은 이번 dry-run 범위 아님(파일 내부 판정만).',
    `sample 상한 ${SAMPLE_CAP}건 — 초과분은 sampleTruncated 로 표기(무음 절단 없음).`,
  );

  return report;
}

function buildEligiblePreview(
  rowNumber: number,
  standardCode: string,
  mfdsCode: string | null,
  productCodeRevised: string | null,
  atcCode: string | null,
  ctx: {
    drugCategory: ProductDrugCategory;
    productName: string;
    manufacturer: string;
    specification: string | null;
    sourceBaseDate: string;
    sourceLabel: string;
    importBatchId: string;
  },
): EligibleRowPreview {
  const meta = (v: string) => ({
    identifierValue: v,
    verificationStatus: 'imported' as const,
    country: 'KR' as const,
    metadata: {
      sourceDataset: 'HIRA_DRUG_MASTER' as const,
      sourceBaseDate: ctx.sourceBaseDate,
      rowNumber,
      importBatchId: ctx.importBatchId,
    },
  });
  const identifiers: IdentifierPreview[] = [
    { identifierType: 'KOREA_DRUG_CODE', isPrimary: true, ...meta(standardCode) },
  ];
  if (mfdsCode != null) identifiers.push({ identifierType: 'MFDS_CODE', isPrimary: false, ...meta(mfdsCode) });
  if (productCodeRevised != null) identifiers.push({ identifierType: 'KOREA_INSURANCE_CODE', isPrimary: false, ...meta(productCodeRevised) });
  if (atcCode != null) identifiers.push({ identifierType: 'ATC_CODE', isPrimary: false, ...meta(atcCode) });

  return {
    rowNumber,
    standardCode,
    mfdsCode,
    master: {
      barcode: standardCode,
      regulatoryType: 'DRUG',
      drugCategory: ctx.drugCategory,
      regulatoryName: ctx.productName,
      name: ctx.productName,
      manufacturerName: ctx.manufacturer,
      mfdsPermitNumber: null,
      mfdsProductId: `${MFDS_PRODUCT_ID_PREFIX}${standardCode}`,
      specification: ctx.specification,
      isMfdsVerified: true,
      mfdsSyncedAt: ctx.sourceBaseDate,
      representativeProductId: null,
      tags: ['import:hira-drug-master', `src:${ctx.sourceLabel}`],
    },
    identifiers,
  };
}

function pushSample<T>(arr: T[], item: T, onTruncate: () => void): void {
  if (arr.length < SAMPLE_CAP) arr.push(item);
  else onTruncate();
}
