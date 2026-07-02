/**
 * Easy Drug → Drug Master Offline Match Simulator (PURE, DB 무관)
 *
 * WO-O4O-EASY-DRUG-INFO-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1
 * 선행: 06e007fb1 (표준상품 설계 기준선), CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1
 *
 * 목적:
 *   "설명 1벌(e약은요 itemSeq) 이 실제 몇 개 SKU(약가마스터 표준코드)에 연결되는지" 규모를
 *   실 DB 없이 **파일 기반**으로 추정한다.
 *
 * 매칭축:
 *   e약은요 item.itemSeq  ↔  약가마스터 품목기준코드
 *   (둘 다 MFDS_CODE = 동일 식별 체계. trim 후 exact match)
 *
 * grain 관계 (설계 기준선):
 *   - ProductMaster = 포장단위/SKU (grain = 약가마스터 표준코드)
 *   - e약은요 itemSeq = 품목·설명 단위 (grain = 품목기준코드)
 *   → 1 itemSeq ↔ N 표준코드 = 설명 1벌 → N SKU 파생 규모
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 * 입력은 이미 파싱된 배열(약가마스터 record[], e약은요 item[]) 이다.
 */

import type { ParsedDrugRow } from './drug-master-csv.parser.js';
import type { ParsedEasyDrugRow, EasyDrugInfoItem } from './easy-drug-info-jsonl.parser.js';

/** trim + 빈문자열 null. 코드값 trailing-space 제거용. */
function norm(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/** 표준코드 형식: 13자리 숫자 */
const STANDARD_CODE_PATTERN = /^\d{13}$/;

/** 분포(count 별 itemSeq 수) → 정렬된 표 + 요약 통계 */
export interface DistributionStat {
  /** count(예: 표준코드 개수) → 그 count 를 가진 itemSeq 수 */
  histogram: Record<string, number>;
  min: number;
  max: number;
  mean: number;
  median: number;
  /** 대상 itemSeq 총수(=합산 분모) */
  totalItemSeq: number;
  /** 대상 요소 총합(예: 매칭 표준코드 총 개수) */
  totalElements: number;
}

function buildDistribution(countsByItemSeq: Map<string, number>): DistributionStat {
  const values = [...countsByItemSeq.values()];
  const histogram: Record<string, number> = {};
  for (const c of values) {
    const key = String(c);
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const median =
    n === 0 ? 0 : n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    histogram,
    min: n === 0 ? 0 : sorted[0],
    max: n === 0 ? 0 : sorted[n - 1],
    mean: n === 0 ? 0 : sum / n,
    median,
    totalItemSeq: n,
    totalElements: sum,
  };
}

export interface MatchSimulationReport {
  meta: {
    wo: string;
    generatedAt: string;
    matchAxis: string;
    drugMasterSourceFile: string | null;
    easyDrugSourceFile: string | null;
  };
  easyDrug: {
    totalRows: number;
    distinctItemSeq: number;
    /** itemSeq 결측(식별불가) row 수 */
    missingItemSeqRows: number;
    /** 동일 itemSeq 가 2회 이상 등장한 itemSeq 수 */
    duplicateItemSeqCount: number;
    /** 이미지 보유 distinct itemSeq */
    itemSeqWithImage: number;
    /** 공식 설명 원문 보유 distinct itemSeq */
    itemSeqWithOfficialText: number;
  };
  drugMaster: {
    totalRows: number;
    /** 품목기준코드 distinct (매칭 축) */
    distinctMfdsCode: number;
    /** 표준코드 distinct (SKU grain) */
    distinctStandardCode: number;
    /** 표준코드 형식이상/결측 row 수 */
    invalidStandardCodeRows: number;
    /** 품목기준코드 결측 row 수 */
    missingMfdsCodeRows: number;
    /** 취소일자 존재 row 수 */
    cancelledRows: number;
  };
  match: {
    /** 약가마스터 품목기준코드와 매칭된 e약은요 distinct itemSeq */
    matchedItemSeq: number;
    /** 매칭 실패한 e약은요 distinct itemSeq */
    unmatchedEasyDrugItemSeq: number;
    /** 매칭된 itemSeq 로 연결되는 약가마스터 행(표준코드 row) 총 개수 */
    matchedStandardCodeRows: number;
    /** 매칭된 itemSeq 로 연결되는 distinct 표준코드 개수 */
    matchedDistinctStandardCode: number;
    /** e약은요 itemSeq 매칭률 = matchedItemSeq / distinctItemSeq */
    matchedItemSeqCoveragePercent: number;
    /** 약가마스터 품목기준코드 커버리지 = e약은요와 매칭된 distinct 품목기준코드 / drugMaster.distinctMfdsCode */
    matchedMfdsCodeCoveragePercent: number;
    /** 약가마스터에만 존재(e약은요 없음)하는 품목기준코드 수 */
    drugMasterOnlyMfdsCode: number;
  };
  distribution: {
    /** 매칭된 itemSeq 1개당 연결되는 distinct 표준코드 개수 분포 (=설명1벌→N SKU) */
    standardCodesPerItemSeq: DistributionStat;
    /** 매칭된 itemSeq 1개당 연결되는 distinct 업체명(제조사) 개수 분포 */
    manufacturersPerItemSeq: DistributionStat;
    /** 매칭된 itemSeq 1개당 연결되는 약가마스터 row(포장단위) 개수 분포 */
    packagesPerItemSeq: DistributionStat;
  };
  risk: {
    /** 매칭된 itemSeq 중 업체명이 2개 이상 → 설명↔제조사 불일치 위험 */
    multiManufacturerItemSeqCount: number;
    /** 매칭된 itemSeq 중 표준코드(SKU) 가 5개 초과 → 대량 파생 */
    itemSeqWithManyPackagesCount: number;
    /** 매칭 + 이미지 보유 itemSeq (이미지 복사 기대효과 모수) */
    itemSeqWithImageAndMatchCount: number;
    /** 매칭됐으나 이미지 없는 itemSeq */
    itemSeqWithoutImageButMatchedCount: number;
    /** 매칭 + 공식설명 보유 itemSeq (SharedProductDescription 파생 모수) */
    itemSeqWithOfficialTextAndMatchCount: number;
  };
  examples: {
    /** 매칭 실패 itemSeq 샘플 (최대 20) */
    unmatchedItemSeqSample: Array<{ itemSeq: string; itemName: string | null; entpName: string | null }>;
    /** 표준코드 다수 파생 itemSeq 상위 샘플 (최대 20) */
    topStandardCodeItemSeqSample: Array<{
      itemSeq: string;
      itemName: string | null;
      distinctStandardCode: number;
      distinctManufacturer: number;
    }>;
    /** 약가마스터에만 있는 품목기준코드 샘플 (최대 20) */
    drugMasterOnlyMfdsCodeSample: string[];
  };
}

export interface EasyDrugAggInput {
  itemSeq: string;
  item: EasyDrugInfoItem;
}

export interface SimulateOptions {
  drugMasterSourceFile?: string | null;
  easyDrugSourceFile?: string | null;
  /** 표준코드 형식검증 통과분만 SKU 로 셀지(true) / 결측 아닌 모든 표준코드값(false). 기본 true. */
  requireValidStandardCode?: boolean;
  now?: string;
}

/** e약은요 item 이 공식 설명 원문(효능/용법/주의 등)을 최소 1개 보유하는지 */
function hasOfficialText(item: EasyDrugInfoItem): boolean {
  const fields = [
    item.efcyQesitm,
    item.useMethodQesitm,
    item.atpnWarnQesitm,
    item.atpnQesitm,
    item.intrcQesitm,
    item.seQesitm,
    item.depositMethodQesitm,
  ];
  return fields.some((v) => v != null && String(v).trim().length > 0);
}

/**
 * 오프라인 매칭 시뮬레이션.
 *
 * @param drugRows   약가마스터 파싱 행 (ParsedDrugRow[])
 * @param easyRows   e약은요 파싱 행 (ParsedEasyDrugRow[])
 */
export function simulateEasyDrugToMasterMatch(
  drugRows: ParsedDrugRow[],
  easyRows: ParsedEasyDrugRow[],
  opts: SimulateOptions = {},
): MatchSimulationReport {
  const requireValid = opts.requireValidStandardCode ?? true;

  // ── 약가마스터 집계: 품목기준코드 → { 표준코드 set, 업체명 set, row 수 } ──
  const masterByMfds = new Map<
    string,
    { standardCodes: Set<string>; manufacturers: Set<string>; rowCount: number }
  >();
  const allDistinctStandardCode = new Set<string>();
  const allDistinctMfdsCode = new Set<string>();
  let invalidStandardCodeRows = 0;
  let missingMfdsCodeRows = 0;
  let cancelledRows = 0;

  for (const row of drugRows) {
    const rec = row.record;
    const mfds = norm(rec['품목기준코드']);
    const stdRaw = norm(rec['표준코드']);
    const manuf = norm(rec['업체명']);
    const cancelled = norm(rec['취소일자']);
    if (cancelled != null) cancelledRows += 1;

    const validStd = stdRaw != null && STANDARD_CODE_PATTERN.test(stdRaw);
    if (!validStd) invalidStandardCodeRows += 1;

    if (mfds == null) {
      missingMfdsCodeRows += 1;
      continue; // 매칭 축 결측 → 그룹 미형성
    }
    allDistinctMfdsCode.add(mfds);

    let g = masterByMfds.get(mfds);
    if (!g) {
      g = { standardCodes: new Set(), manufacturers: new Set(), rowCount: 0 };
      masterByMfds.set(mfds, g);
    }
    g.rowCount += 1;
    if (manuf != null) g.manufacturers.add(manuf);

    // 표준코드(SKU grain): requireValid 정책에 따라 카운트
    const stdToCount = requireValid ? (validStd ? stdRaw : null) : stdRaw;
    if (stdToCount != null) {
      g.standardCodes.add(stdToCount);
      allDistinctStandardCode.add(stdToCount);
    }
  }

  // ── e약은요 집계: itemSeq → item (첫 등장 유지), 중복 카운트 ──
  const easyByItemSeq = new Map<string, EasyDrugInfoItem>();
  const itemSeqOccurrences = new Map<string, number>();
  let missingItemSeqRows = 0;
  const easyTotalRows = easyRows.length;

  for (const row of easyRows) {
    const itemSeq = norm(row.item.itemSeq);
    if (itemSeq == null) {
      missingItemSeqRows += 1;
      continue;
    }
    itemSeqOccurrences.set(itemSeq, (itemSeqOccurrences.get(itemSeq) ?? 0) + 1);
    if (!easyByItemSeq.has(itemSeq)) easyByItemSeq.set(itemSeq, row.item);
  }

  const distinctItemSeq = easyByItemSeq.size;
  const duplicateItemSeqCount = [...itemSeqOccurrences.values()].filter((c) => c > 1).length;

  let itemSeqWithImage = 0;
  let itemSeqWithOfficialText = 0;
  for (const item of easyByItemSeq.values()) {
    if (norm(item.itemImage) != null) itemSeqWithImage += 1;
    if (hasOfficialText(item)) itemSeqWithOfficialText += 1;
  }

  // ── 매칭: e약은요 itemSeq ∈ 약가마스터 품목기준코드 ──
  const stdPerItemSeq = new Map<string, number>();
  const manufPerItemSeq = new Map<string, number>();
  const pkgPerItemSeq = new Map<string, number>();

  let matchedItemSeq = 0;
  let matchedStandardCodeRows = 0;
  const matchedDistinctStandardCode = new Set<string>();
  const matchedMfdsCodeSet = new Set<string>();

  let multiManufacturerItemSeqCount = 0;
  let itemSeqWithManyPackagesCount = 0;
  let itemSeqWithImageAndMatchCount = 0;
  let itemSeqWithoutImageButMatchedCount = 0;
  let itemSeqWithOfficialTextAndMatchCount = 0;

  const unmatchedSample: MatchSimulationReport['examples']['unmatchedItemSeqSample'] = [];
  const topCandidates: Array<{
    itemSeq: string;
    itemName: string | null;
    distinctStandardCode: number;
    distinctManufacturer: number;
  }> = [];

  for (const [itemSeq, item] of easyByItemSeq) {
    const g = masterByMfds.get(itemSeq);
    if (!g) {
      if (unmatchedSample.length < 20) {
        unmatchedSample.push({
          itemSeq,
          itemName: norm(item.itemName),
          entpName: norm(item.entpName),
        });
      }
      continue;
    }
    matchedItemSeq += 1;
    matchedMfdsCodeSet.add(itemSeq);
    const distinctStd = g.standardCodes.size;
    const distinctManuf = g.manufacturers.size;

    stdPerItemSeq.set(itemSeq, distinctStd);
    manufPerItemSeq.set(itemSeq, distinctManuf);
    pkgPerItemSeq.set(itemSeq, g.rowCount);

    matchedStandardCodeRows += g.rowCount;
    for (const s of g.standardCodes) matchedDistinctStandardCode.add(s);

    if (distinctManuf >= 2) multiManufacturerItemSeqCount += 1;
    if (distinctStd > 5) itemSeqWithManyPackagesCount += 1;

    const hasImg = norm(item.itemImage) != null;
    if (hasImg) itemSeqWithImageAndMatchCount += 1;
    else itemSeqWithoutImageButMatchedCount += 1;
    if (hasOfficialText(item)) itemSeqWithOfficialTextAndMatchCount += 1;

    topCandidates.push({
      itemSeq,
      itemName: norm(item.itemName),
      distinctStandardCode: distinctStd,
      distinctManufacturer: distinctManuf,
    });
  }

  const unmatchedEasyDrugItemSeq = distinctItemSeq - matchedItemSeq;

  // 약가마스터에만 있는 품목기준코드
  const drugMasterOnlyMfdsSample: string[] = [];
  let drugMasterOnlyMfdsCode = 0;
  for (const mfds of allDistinctMfdsCode) {
    if (!easyByItemSeq.has(mfds)) {
      drugMasterOnlyMfdsCode += 1;
      if (drugMasterOnlyMfdsSample.length < 20) drugMasterOnlyMfdsSample.push(mfds);
    }
  }

  topCandidates.sort((a, b) => b.distinctStandardCode - a.distinctStandardCode);
  const topStandardCodeItemSeqSample = topCandidates.slice(0, 20);

  const pct = (num: number, den: number): number =>
    den === 0 ? 0 : Math.round((num / den) * 10000) / 100;

  return {
    meta: {
      wo: 'WO-O4O-EASY-DRUG-INFO-TO-DRUG-MASTER-OFFLINE-MATCH-SIMULATION-V1',
      generatedAt: opts.now ?? new Date().toISOString(),
      matchAxis: 'easyDrug.itemSeq == drugMaster.품목기준코드 (both MFDS_CODE, trim exact)',
      drugMasterSourceFile: opts.drugMasterSourceFile ?? null,
      easyDrugSourceFile: opts.easyDrugSourceFile ?? null,
    },
    easyDrug: {
      totalRows: easyTotalRows,
      distinctItemSeq,
      missingItemSeqRows,
      duplicateItemSeqCount,
      itemSeqWithImage,
      itemSeqWithOfficialText,
    },
    drugMaster: {
      totalRows: drugRows.length,
      distinctMfdsCode: allDistinctMfdsCode.size,
      distinctStandardCode: allDistinctStandardCode.size,
      invalidStandardCodeRows,
      missingMfdsCodeRows,
      cancelledRows,
    },
    match: {
      matchedItemSeq,
      unmatchedEasyDrugItemSeq,
      matchedStandardCodeRows,
      matchedDistinctStandardCode: matchedDistinctStandardCode.size,
      matchedItemSeqCoveragePercent: pct(matchedItemSeq, distinctItemSeq),
      matchedMfdsCodeCoveragePercent: pct(matchedMfdsCodeSet.size, allDistinctMfdsCode.size),
      drugMasterOnlyMfdsCode,
    },
    distribution: {
      standardCodesPerItemSeq: buildDistribution(stdPerItemSeq),
      manufacturersPerItemSeq: buildDistribution(manufPerItemSeq),
      packagesPerItemSeq: buildDistribution(pkgPerItemSeq),
    },
    risk: {
      multiManufacturerItemSeqCount,
      itemSeqWithManyPackagesCount,
      itemSeqWithImageAndMatchCount,
      itemSeqWithoutImageButMatchedCount,
      itemSeqWithOfficialTextAndMatchCount,
    },
    examples: {
      unmatchedItemSeqSample: unmatchedSample,
      topStandardCodeItemSeqSample,
      drugMasterOnlyMfdsCodeSample: drugMasterOnlyMfdsSample,
    },
  };
}
