/**
 * Unit tests — WO-O4O-EASY-DRUG-INFO-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1
 *
 * 실 DB / 실 파일 불필요. 소규모 fixture 로 매칭 / 분포 / 중복 / 리스크 로직 검증.
 */

import type { ParsedDrugRow } from '../drug-master-csv.parser.js';
import type { ParsedEasyDrugRow } from '../easy-drug-info-jsonl.parser.js';
import { simulateEasyDrugToMasterMatch } from '../easy-drug-to-master-offline-match.simulator.js';

/** 약가마스터 fixture 행 헬퍼 */
function drugRow(
  n: number,
  fields: { mfds: string; std: string; manuf: string; cancelled?: string | null },
): ParsedDrugRow {
  return {
    rowNumber: n,
    rawColumnCount: 22,
    record: {
      한글상품명: `상품${n}`,
      업체명: fields.manuf,
      약품규격: '',
      제품총수량: '',
      제형구분: '',
      포장형태: '',
      품목기준코드: fields.mfds,
      품목허가일자: '',
      전문일반구분: '',
      대표코드: '',
      표준코드: fields.std,
      '제품코드(개정후)': '',
      '일반명코드(성분명코드)': '',
      비고: '',
      취소일자: fields.cancelled ?? '',
      '양도양수적용(공고)일자': '',
      양도양수종료일자: '',
      일련번호생략여부: '',
      일련번호생략사유: '',
      '국제표준코드(ATC코드)': '',
      특수관리약품구분: '',
      의약품판독장비구분: '',
    },
  };
}

/** e약은요 fixture 행 헬퍼 */
function easyRow(
  n: number,
  item: { itemSeq: string | null; itemName?: string; entpName?: string; itemImage?: string | null; efcy?: string | null },
): ParsedEasyDrugRow {
  return {
    lineNumber: n,
    sourceDataset: 'MFDS_EASY_DRUG_INFO',
    fetchedAt: '2026-07-02T00:00:00Z',
    pageNo: 1,
    rowIndex: n,
    item: {
      itemSeq: item.itemSeq,
      itemName: item.itemName ?? `약${n}`,
      entpName: item.entpName ?? `제조사${n}`,
      itemImage: item.itemImage ?? null,
      efcyQesitm: item.efcy ?? null,
    },
  };
}

describe('simulateEasyDrugToMasterMatch', () => {
  it('itemSeq ↔ 품목기준코드 exact 매칭 + 매칭률을 계산한다', () => {
    // 약가마스터: mfds A(표준코드 2개, 제조사 1) / B(표준코드 1개) / C(e약은요 없음)
    const drug: ParsedDrugRow[] = [
      drugRow(1, { mfds: 'A', std: '1111111111111', manuf: '가제약' }),
      drugRow(2, { mfds: 'A', std: '2222222222222', manuf: '가제약' }),
      drugRow(3, { mfds: 'B', std: '3333333333333', manuf: '나제약' }),
      drugRow(4, { mfds: 'C', std: '4444444444444', manuf: '다제약' }),
    ];
    // e약은요: A(매칭) / B(매칭) / Z(매칭실패)
    const easy: ParsedEasyDrugRow[] = [
      easyRow(1, { itemSeq: 'A', itemImage: 'http://img/a', efcy: '효능A' }),
      easyRow(2, { itemSeq: 'B' }),
      easyRow(3, { itemSeq: 'Z', itemName: '미매칭약' }),
    ];

    const r = simulateEasyDrugToMasterMatch(drug, easy, { now: '2026-07-02T00:00:00Z' });

    expect(r.easyDrug.totalRows).toBe(3);
    expect(r.easyDrug.distinctItemSeq).toBe(3);
    expect(r.drugMaster.distinctMfdsCode).toBe(3); // A,B,C
    expect(r.drugMaster.distinctStandardCode).toBe(4);

    expect(r.match.matchedItemSeq).toBe(2); // A,B
    expect(r.match.unmatchedEasyDrugItemSeq).toBe(1); // Z
    expect(r.match.matchedItemSeqCoveragePercent).toBeCloseTo(66.67, 1);
    // 매칭된 mfds(A,B) / 전체 mfds(A,B,C) = 66.67%
    expect(r.match.matchedMfdsCodeCoveragePercent).toBeCloseTo(66.67, 1);
    expect(r.match.drugMasterOnlyMfdsCode).toBe(1); // C
    expect(r.match.matchedDistinctStandardCode).toBe(3); // A(2)+B(1)
    expect(r.match.matchedStandardCodeRows).toBe(3); // A rows 2 + B row 1
  });

  it('설명 1벌 → N 표준코드(SKU) 분포를 계산한다', () => {
    const drug: ParsedDrugRow[] = [
      drugRow(1, { mfds: 'A', std: '1111111111111', manuf: '가' }),
      drugRow(2, { mfds: 'A', std: '2222222222222', manuf: '가' }),
      drugRow(3, { mfds: 'A', std: '3333333333333', manuf: '가' }),
      drugRow(4, { mfds: 'B', std: '4444444444444', manuf: '나' }),
    ];
    const easy: ParsedEasyDrugRow[] = [
      easyRow(1, { itemSeq: 'A' }),
      easyRow(2, { itemSeq: 'B' }),
    ];
    const r = simulateEasyDrugToMasterMatch(drug, easy);
    const dist = r.distribution.standardCodesPerItemSeq;
    expect(dist.min).toBe(1); // B
    expect(dist.max).toBe(3); // A
    expect(dist.mean).toBe(2); // (3+1)/2
    expect(dist.histogram['3']).toBe(1);
    expect(dist.histogram['1']).toBe(1);
    expect(dist.totalItemSeq).toBe(2);
  });

  it('중복 itemSeq / 결측 itemSeq 를 집계한다', () => {
    const drug: ParsedDrugRow[] = [drugRow(1, { mfds: 'A', std: '1111111111111', manuf: '가' })];
    const easy: ParsedEasyDrugRow[] = [
      easyRow(1, { itemSeq: 'A' }),
      easyRow(2, { itemSeq: 'A' }), // 중복
      easyRow(3, { itemSeq: null }), // 결측
      easyRow(4, { itemSeq: '  ' }), // 공백 → 결측
    ];
    const r = simulateEasyDrugToMasterMatch(drug, easy);
    expect(r.easyDrug.totalRows).toBe(4);
    expect(r.easyDrug.distinctItemSeq).toBe(1); // A
    expect(r.easyDrug.missingItemSeqRows).toBe(2); // null + 공백
    expect(r.easyDrug.duplicateItemSeqCount).toBe(1); // A 2회
  });

  it('trailing space 를 trim 하여 매칭한다', () => {
    const drug: ParsedDrugRow[] = [drugRow(1, { mfds: '195700020', std: '1111111111111', manuf: '가' })];
    const easy: ParsedEasyDrugRow[] = [easyRow(1, { itemSeq: '195700020 ' })]; // trailing space
    const r = simulateEasyDrugToMasterMatch(drug, easy);
    expect(r.match.matchedItemSeq).toBe(1);
  });

  it('다제조사 / 이미지 / 공식설명 리스크 모수를 계산한다', () => {
    const drug: ParsedDrugRow[] = [
      // A: 표준코드 6개 + 제조사 2개 → multiManufacturer + manyPackages
      drugRow(1, { mfds: 'A', std: '1000000000001', manuf: '가' }),
      drugRow(2, { mfds: 'A', std: '1000000000002', manuf: '가' }),
      drugRow(3, { mfds: 'A', std: '1000000000003', manuf: '가' }),
      drugRow(4, { mfds: 'A', std: '1000000000004', manuf: '나' }),
      drugRow(5, { mfds: 'A', std: '1000000000005', manuf: '나' }),
      drugRow(6, { mfds: 'A', std: '1000000000006', manuf: '나' }),
      drugRow(7, { mfds: 'B', std: '2000000000001', manuf: '다' }),
    ];
    const easy: ParsedEasyDrugRow[] = [
      easyRow(1, { itemSeq: 'A', itemImage: 'http://img/a', efcy: '효능' }), // 매칭+이미지+설명
      easyRow(2, { itemSeq: 'B', itemImage: null, efcy: null }), // 매칭+이미지없음+설명없음
    ];
    const r = simulateEasyDrugToMasterMatch(drug, easy);
    expect(r.risk.multiManufacturerItemSeqCount).toBe(1); // A
    expect(r.risk.itemSeqWithManyPackagesCount).toBe(1); // A (표준코드 6개 > 5)
    expect(r.risk.itemSeqWithImageAndMatchCount).toBe(1); // A
    expect(r.risk.itemSeqWithoutImageButMatchedCount).toBe(1); // B
    expect(r.risk.itemSeqWithOfficialTextAndMatchCount).toBe(1); // A
  });

  it('표준코드 형식이상 row 는 SKU 로 세지 않는다(requireValid 기본)', () => {
    const drug: ParsedDrugRow[] = [
      drugRow(1, { mfds: 'A', std: '1111111111111', manuf: '가' }), // valid
      drugRow(2, { mfds: 'A', std: 'ABC', manuf: '가' }), // invalid → SKU 미집계
    ];
    const easy: ParsedEasyDrugRow[] = [easyRow(1, { itemSeq: 'A' })];
    const r = simulateEasyDrugToMasterMatch(drug, easy);
    expect(r.drugMaster.invalidStandardCodeRows).toBe(1);
    expect(r.distribution.standardCodesPerItemSeq.max).toBe(1); // valid 1개만
    // 하지만 포장(row)단위는 2개 모두 카운트
    expect(r.distribution.packagesPerItemSeq.max).toBe(2);
  });
});
