/**
 * Unit tests — WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1
 *
 * 실 DB / 실 파일 불필요. 소규모 fixture 로 승격 판정 / mapping preview / 분류 / fallback 검증.
 * GTIN fixture (gtin.ts 알고리즘 기준):
 *   valid   8801234567893 (check-digit OK)
 *   invalid 8801234567894 (check-digit FAIL)
 *   valid   8009876543217 (check-digit OK)
 */

import type { ParsedDrugRow } from '../drug-master-csv.parser.js';
import {
  runPromotionDryRun,
  mapDrugCategory,
  buildSpecification,
  MFDS_PRODUCT_ID_PREFIX,
} from '../drug-master-promotion-dryrun.service.js';

const VALID = '8801234567893';
const INVALID_CD = '8801234567894';
const VALID_B = '8009876543217';

interface RowFields {
  name?: string;
  manuf?: string;
  spec?: string;
  qty?: string;
  dosage?: string;
  pkg?: string;
  mfds?: string;
  rxOtc?: string;
  std?: string;
  insurance?: string;
  atc?: string;
  cancelled?: string;
}

function drugRow(n: number, f: RowFields): ParsedDrugRow {
  return {
    rowNumber: n,
    rawColumnCount: 22,
    record: {
      한글상품명: f.name ?? `상품${n}`,
      업체명: f.manuf ?? `제조사${n}`,
      약품규격: f.spec ?? '',
      제품총수량: f.qty ?? '',
      제형구분: f.dosage ?? '',
      포장형태: f.pkg ?? '',
      품목기준코드: f.mfds ?? '',
      품목허가일자: '',
      전문일반구분: f.rxOtc ?? '',
      대표코드: '',
      표준코드: f.std ?? '',
      '제품코드(개정후)': f.insurance ?? '',
      '일반명코드(성분명코드)': '',
      비고: '',
      취소일자: f.cancelled ?? '',
      '양도양수적용(공고)일자': '',
      양도양수종료일자: '',
      일련번호생략여부: '',
      일련번호생략사유: '',
      '국제표준코드(ATC코드)': f.atc ?? '',
      특수관리약품구분: '',
      의약품판독장비구분: '',
    },
  };
}

const OPTS = { sourceFileName: 'mfds.csv', sourceBaseDate: '2025-10-31', importBatchId: 'dryrun-test' };

describe('drug-master promotion dry-run', () => {
  test('1. active row 는 eligible 로 판정된다', () => {
    const r = runPromotionDryRun([drugRow(1, { std: VALID, mfds: '111', rxOtc: '일반' })], OPTS);
    expect(r.activeRows).toBe(1);
    expect(r.cancelledRows).toBe(0);
    expect(r.eligibleRows).toBe(1);
    expect(r.wouldCreateProductMaster).toBe(1);
    expect(r.dbWrites).toBe(0);
  });

  test('2. cancelled row 는 제외된다', () => {
    const r = runPromotionDryRun([drugRow(1, { std: VALID, cancelled: '20250101' })], OPTS);
    expect(r.cancelledRows).toBe(1);
    expect(r.eligibleRows).toBe(0);
    expect(r.wouldCreateProductMaster).toBe(0);
    expect(r.sampleCancelledRows).toHaveLength(1);
    expect(r.sampleCancelledRows[0].reason).toBe('cancelled');
  });

  test('3. 표준코드 형식(13자리 숫자) 검증 — 결측/형식이상 제외', () => {
    const rows = [
      drugRow(1, { std: '' }), // 결측
      drugRow(2, { std: '123' }), // 형식이상
      drugRow(3, { std: 'ABCDEFGHIJKLM' }), // 형식이상(숫자 아님)
    ];
    const r = runPromotionDryRun(rows, OPTS);
    expect(r.missingStandardCode).toBe(1);
    expect(r.invalidStandardCodeFormat).toBe(2);
    expect(r.eligibleRows).toBe(0);
  });

  test('4. GTIN check-digit 실패 row 는 제외되고 별도 집계된다', () => {
    const rows = [
      drugRow(1, { std: VALID }), // 통과
      drugRow(2, { std: INVALID_CD }), // check-digit fail (형식은 통과)
    ];
    const r = runPromotionDryRun(rows, OPTS);
    expect(r.invalidStandardCodeFormat).toBe(0); // 형식은 둘 다 통과
    expect(r.invalidStandardCodeCheckDigit).toBe(1);
    expect(r.eligibleRows).toBe(1);
    expect(r.sampleSkippedInvalidCheckDigitRows).toHaveLength(1);
    expect(r.sampleSkippedInvalidCheckDigitRows[0].gtinError).toMatch(/check digit/i);
  });

  test('5. mfdsProductId preview = HIRA:DRUG_MASTER:{표준코드}, barcode = 표준코드', () => {
    const r = runPromotionDryRun([drugRow(1, { std: VALID, mfds: '111', rxOtc: '전문' })], OPTS);
    const m = r.sampleEligibleRows[0].master;
    expect(m.barcode).toBe(VALID);
    expect(m.mfdsProductId).toBe(`${MFDS_PRODUCT_ID_PREFIX}${VALID}`);
    expect(m.regulatoryType).toBe('DRUG');
    expect(m.mfdsPermitNumber).toBeNull();
    expect(m.isMfdsVerified).toBe(true);
    expect(m.tags).toContain('import:hira-drug-master');
  });

  test('6. KOREA_DRUG_CODE primary identifier + 보조 identifier preview', () => {
    const r = runPromotionDryRun(
      [drugRow(1, { std: VALID, mfds: '111', insurance: '650012345', atc: 'A10BA02' })],
      OPTS,
    );
    const ids = r.sampleEligibleRows[0].identifiers;
    const primary = ids.find((i) => i.isPrimary);
    expect(primary?.identifierType).toBe('KOREA_DRUG_CODE');
    expect(primary?.identifierValue).toBe(VALID);
    expect(ids.map((i) => i.identifierType).sort()).toEqual(
      ['ATC_CODE', 'KOREA_DRUG_CODE', 'KOREA_INSURANCE_CODE', 'MFDS_CODE'].sort(),
    );
    // 오직 하나만 primary
    expect(ids.filter((i) => i.isPrimary)).toHaveLength(1);
    // 집계 반영
    expect(r.wouldCreatePrimaryKoreaDrugCodeIdentifier).toBe(1);
    expect(r.wouldCreateMfdsCodeIdentifier).toBe(1);
    expect(r.wouldCreateKoreaInsuranceCodeIdentifier).toBe(1);
    expect(r.wouldCreateAtcCodeIdentifier).toBe(1);
  });

  test('7. 전문/일반구분 → drugCategory 매핑', () => {
    expect(mapDrugCategory('전문의약품')).toBe('rx');
    expect(mapDrugCategory('일반의약품')).toBe('otc');
    expect(mapDrugCategory('')).toBe('drug_unspecified');
    expect(mapDrugCategory(null)).toBe('drug_unspecified');

    const r = runPromotionDryRun(
      [
        drugRow(1, { std: VALID, rxOtc: '전문' }),
        drugRow(2, { std: VALID_B, rxOtc: '일반' }),
      ],
      OPTS,
    );
    expect(r.rxCount).toBe(1);
    expect(r.otcCount).toBe(1);
    expect(r.drugUnspecifiedCount).toBe(0);
  });

  test('8. specification fallback — 포장형태 결측 시 나머지로 합성', () => {
    // 순수 함수
    expect(buildSpecification('500mg', '60정', '정제', '병')).toBe('500mg / 60정 / 정제 / 병');
    expect(buildSpecification('500mg', '60정', '정제', null)).toBe('500mg / 60정 / 정제');
    expect(buildSpecification(null, null, null, null)).toBeNull();

    // 집계: 포장형태 없지만 나머지 있음 → fallback used, empty 아님
    const r = runPromotionDryRun(
      [
        drugRow(1, { std: VALID, spec: '500mg', qty: '60정', dosage: '정제' }), // pkg 결측
        drugRow(2, { std: VALID_B }), // 전부 결측 → specification empty
      ],
      OPTS,
    );
    expect(r.packageFormMissingCount).toBe(2);
    expect(r.specificationFallbackUsedCount).toBe(1);
    expect(r.specificationEmptyCount).toBe(1);
  });

  test('부가: 파일 내부 표준코드 중복 + 그룹 분포', () => {
    const rows = [
      drugRow(1, { std: VALID, mfds: '111', manuf: 'A' }),
      drugRow(2, { std: VALID_B, mfds: '111', manuf: 'B' }), // 같은 mfds 다른 표준코드/제조사
      drugRow(3, { std: VALID, mfds: '222', manuf: 'A' }), // 표준코드 VALID 중복
    ];
    const r = runPromotionDryRun(rows, OPTS);
    expect(r.distinctStandardCode).toBe(2);
    expect(r.duplicateStandardCodeInFile).toBe(1); // VALID 2회
    expect(r.duplicateMfdsProductIdPreview).toBe(1);
    expect(r.distinctMfdsCode).toBe(2);
    expect(r.multiPackageMfdsCodeCount).toBe(1); // mfds 111 = 2 표준코드
    expect(r.multiManufacturerMfdsCodeCount).toBe(1); // mfds 111 = A,B
    expect(r.maxStandardCodesPerMfdsCode).toBe(2);
  });
});
