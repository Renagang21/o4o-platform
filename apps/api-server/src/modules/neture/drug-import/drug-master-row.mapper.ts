/**
 * Drug Master Row Mapper — 약가마스터 CSV 1행 → ProductCandidate 후보 매핑 (PURE, DB 무관)
 *
 * WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1
 * 선행: IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1, CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 *  - 약가마스터 22컬럼 1행 → CreateCandidateInput 형태 + 검토 플래그(reviewFlags) 산출.
 *  - 원본 22컬럼은 rawPayload.source(무손실) 에 통째 보존한다.
 *  - 표준코드/품목기준코드/ATC 는 Core 식별자로 즉시 확정하지 않고 candidate 필드/rawPayload 에 보존한다.
 *  - 대표상품 manufacturer 자동 파생 / ProductMaster·representative_products·ProductIdentifier 생성은 하지 않는다.
 */

/** 약가마스터 공식 헤더 22컬럼 (CHECK §5 — 순서/명칭 1:1) */
export const DRUG_MASTER_HEADERS = [
  '한글상품명',
  '업체명',
  '약품규격',
  '제품총수량',
  '제형구분',
  '포장형태',
  '품목기준코드',
  '품목허가일자',
  '전문일반구분',
  '대표코드',
  '표준코드',
  '제품코드(개정후)',
  '일반명코드(성분명코드)',
  '비고',
  '취소일자',
  '양도양수적용(공고)일자',
  '양도양수종료일자',
  '일련번호생략여부',
  '일련번호생략사유',
  '국제표준코드(ATC코드)',
  '특수관리약품구분',
  '의약품판독장비구분',
] as const;

export const DRUG_MASTER_COLUMN_COUNT = DRUG_MASTER_HEADERS.length;

/** 표준코드 형식: 13자리 숫자 (CHECK §10 — 전 행 13자리 100%) */
const STANDARD_CODE_PATTERN = /^\d{13}$/;

export type DrugReviewFlag =
  | 'PACKAGE_FORM_MISSING' // 포장형태 결측
  | 'STANDARD_CODE_FORMAT' // 표준코드 형식 이상 (13자리 숫자 아님 / 결측)
  | 'MFDS_CODE_MISSING' // 품목기준코드 결측
  | 'PRODUCT_NAME_MISSING' // 한글상품명 결측
  | 'MANUFACTURER_MISSING' // 업체명 결측
  | 'ENCODING_SUSPECT' // 인코딩 변환 이상 의심 (U+FFFD 등)
  | 'COLUMN_COUNT_MISMATCH'; // CSV 컬럼 수 이상

export interface MappedDrugCandidate {
  /** ProductCandidateService.createCandidate 에 그대로 전달 가능한 입력 */
  candidateInput: {
    serviceKey: string | null;
    sourceType: 'csv_import';
    sourceLabel: string | null;
    identifierType: 'KOREA_DRUG_CODE' | null;
    identifierValue: string | null;
    candidateName: string | null;
    candidateManufacturer: string | null;
    candidateCategory: string | null;
    candidateSpec: string | null;
    candidateUnit: string | null;
    rawPayload: Record<string, unknown>;
  };
  /** dedup 키 (source + standardCode + sourceBaseDate) 구성 요소 */
  dedupKey: {
    sourceType: 'csv_import';
    standardCode: string | null;
    sourceBaseDate: string | null;
  };
  /** 검토 대상 플래그 */
  reviewFlags: DrugReviewFlag[];
  /** active(취소일자 공란) / cancelled(취소일자 존재) */
  isCancelled: boolean;
  /** 그룹핑 키 (= 품목기준코드) */
  groupKey: string | null;
}

export interface MapRowOptions {
  serviceKey?: string | null;
  sourceFileName: string;
  sourceBaseDate: string; // 예: '2025-10-31'
  rowNumber: number; // 1-base 데이터 행 번호 (헤더 제외)
}

/** 값 정규화: trim. 빈 문자열은 null 로. */
function clean(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/** U+FFFD(replacement char) 또는 NUL 포함 시 인코딩 변환 이상 의심 */
function looksEncodingBroken(values: (string | null)[]): boolean {
  const NUL = String.fromCharCode(0);
  return values.some((v) => v != null && (v.includes('�') || v.includes(NUL)));
}

/**
 * 약가마스터 1행(헤더 키 맵) → 후보 + 검토 플래그.
 *
 * @param record 헤더명→값 (csv-parse columns:true 결과). 키 누락 가능.
 * @param rawColumnCount 원본 row 의 실제 컬럼 수 (컬럼수 이상 감지용)
 */
export function mapDrugMasterRow(
  record: Record<string, string>,
  rawColumnCount: number,
  opts: MapRowOptions,
): MappedDrugCandidate {
  const productName = clean(record['한글상품명']);
  const manufacturer = clean(record['업체명']);
  const spec = clean(record['약품규격']);
  const totalQuantity = clean(record['제품총수량']);
  const dosageForm = clean(record['제형구분']);
  const packageForm = clean(record['포장형태']);
  const mfdsCode = clean(record['품목기준코드']);
  const licenseDate = clean(record['품목허가일자']);
  const rxOtc = clean(record['전문일반구분']);
  const representativeCode = clean(record['대표코드']);
  const standardCode = clean(record['표준코드']);
  const productCodeRevised = clean(record['제품코드(개정후)']);
  const ingredientCode = clean(record['일반명코드(성분명코드)']);
  const note = clean(record['비고']);
  const cancelledAt = clean(record['취소일자']);
  const transferStart = clean(record['양도양수적용(공고)일자']);
  const transferEnd = clean(record['양도양수종료일자']);
  const serialOmitYn = clean(record['일련번호생략여부']);
  const serialOmitReason = clean(record['일련번호생략사유']);
  const atcCode = clean(record['국제표준코드(ATC코드)']);
  const specialMgmt = clean(record['특수관리약품구분']);
  const readDevice = clean(record['의약품판독장비구분']);

  const isCancelled = cancelledAt != null;

  // 형식 검증된 표준코드 (13자리 숫자). 형식이상/결측이면 null → 식별자 미부착 + dedup 키 없음.
  const validStandardCode = standardCode && STANDARD_CODE_PATTERN.test(standardCode) ? standardCode : null;

  const reviewFlags: DrugReviewFlag[] = [];
  if (packageForm == null) reviewFlags.push('PACKAGE_FORM_MISSING');
  if (standardCode == null || !STANDARD_CODE_PATTERN.test(standardCode)) {
    reviewFlags.push('STANDARD_CODE_FORMAT');
  }
  if (mfdsCode == null) reviewFlags.push('MFDS_CODE_MISSING');
  if (productName == null) reviewFlags.push('PRODUCT_NAME_MISSING');
  if (manufacturer == null) reviewFlags.push('MANUFACTURER_MISSING');
  if (rawColumnCount !== DRUG_MASTER_COLUMN_COUNT) reviewFlags.push('COLUMN_COUNT_MISMATCH');
  if (
    looksEncodingBroken([
      productName,
      manufacturer,
      spec,
      dosageForm,
      packageForm,
      note,
    ])
  ) {
    reviewFlags.push('ENCODING_SUSPECT');
  }

  // 원본 22컬럼 무손실 보존 (헤더명 그대로)
  const source: Record<string, string | null> = {
    한글상품명: productName,
    업체명: manufacturer,
    약품규격: spec,
    제품총수량: totalQuantity,
    제형구분: dosageForm,
    포장형태: packageForm,
    품목기준코드: mfdsCode,
    품목허가일자: licenseDate,
    전문일반구분: rxOtc,
    대표코드: representativeCode,
    표준코드: standardCode,
    '제품코드(개정후)': productCodeRevised,
    '일반명코드(성분명코드)': ingredientCode,
    비고: note,
    취소일자: cancelledAt,
    '양도양수적용(공고)일자': transferStart,
    양도양수종료일자: transferEnd,
    일련번호생략여부: serialOmitYn,
    일련번호생략사유: serialOmitReason,
    '국제표준코드(ATC코드)': atcCode,
    특수관리약품구분: specialMgmt,
    의약품판독장비구분: readDevice,
  };

  const rawPayload: Record<string, unknown> = {
    // import 메타
    sourceFileName: opts.sourceFileName,
    sourceBaseDate: opts.sourceBaseDate,
    rowNumber: opts.rowNumber,
    // 식별자 후보 (Core 즉시 확정 아님 — 보존)
    standardCode, // → KOREA_DRUG_CODE 후보
    mfdsCode, // → MFDS_CODE 후보 (+ groupKey)
    atcCode, // → ATC_CODE 후보 (있을 때만)
    // 표시/검토 보조 원본값
    packageFormRaw: packageForm,
    totalQuantityRaw: totalQuantity,
    specificationRaw: spec,
    dosageFormRaw: dosageForm,
    // 상태/그룹
    isCancelled,
    cancelledAt,
    groupKey: mfdsCode, // 대표상품 그룹핑 키 = 품목기준코드
    // 검토 플래그
    reviewFlags,
    // 무손실 원본 22컬럼
    source,
  };

  return {
    candidateInput: {
      serviceKey: opts.serviceKey ?? null,
      sourceType: 'csv_import',
      sourceLabel: drugSourceLabel(opts.sourceFileName, opts.sourceBaseDate),
      // 식별자 후보로 KOREA_DRUG_CODE(표준코드)만 매칭 입력으로 사용. 형식이상이면 미부착.
      identifierType: validStandardCode ? 'KOREA_DRUG_CODE' : null,
      identifierValue: validStandardCode,
      candidateName: productName,
      candidateManufacturer: manufacturer, // 후보값 — 대표상품 자동 파생 아님
      candidateCategory: rxOtc, // 전문/일반 구분 (분류 보조)
      candidateSpec: spec,
      candidateUnit: packageForm, // 결측 시 null (fallback 합성은 승격 시점)
      rawPayload,
    },
    dedupKey: {
      sourceType: 'csv_import',
      standardCode: validStandardCode, // 형식검증 통과한 표준코드만 dedup 키로 사용
      sourceBaseDate: opts.sourceBaseDate,
    },
    reviewFlags,
    isCancelled,
    groupKey: mfdsCode,
  };
}

/** sourceLabel 생성 (파일명 stem + 기준일). 최대 128자(컬럼 한도) 절단. */
export function drugSourceLabel(sourceFileName: string, sourceBaseDate: string): string {
  const stem = sourceFileName.replace(/\.[^.]+$/, '');
  const label = `${stem}`.includes(sourceBaseDate) ? stem : `${stem}_${sourceBaseDate}`;
  return label.slice(0, 128);
}
