/**
 * Supplier 대량 등록 — CSV 파싱 · 검증 · 미리보기 (저장 전 단계)
 *
 * WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2
 *
 * 목적: 공급자가 업로드한 CSV 가 선택한 제품 유형 템플릿에 맞는지 저장 전에 검증한다.
 *   - header 검증(필수/금지/타유형/처방 금지 컬럼)
 *   - 혼합 파일 방지(메타 컬럼 값이 선택 유형과 다르면 오류)
 *   - row 단위 최소 검증(제품명 필수, 공급가 숫자 등)
 *   - 미리보기 테이블용 정규화
 *
 * 이 모듈은 **frontend 전용**이며 어떤 저장/네트워크도 수행하지 않는다.
 * 실제 저장은 별도 BULK-UPLOAD-SAVE-V3 에서 다룬다 — 기존 CSV Import applyBatch 경로를 재사용하지 않는다.
 */

import {
  getSupplierProductType,
  getBulkTemplateColumns,
  SUPPLIER_BULK_TEMPLATE_COLUMNS,
  SUPPLIER_BULK_EXCLUDED_COLUMNS,
  type SupplierProductTypeDef,
} from './supplierProductTypes';

type TypeKey = SupplierProductTypeDef['key'];

/* ------------------------------------------------------------------ */
/*  컬럼 별칭 (영문 ↔ 한글 템플릿 표준명)                                  */
/* ------------------------------------------------------------------ */

/**
 * 업로드 파일이 영문 헤더를 쓰더라도 한글 템플릿 표준명으로 정규화해 검증한다.
 * 좌변(키)은 소문자/trim 기준, 우변은 SUPPLIER_BULK_TEMPLATE_COLUMNS 의 표준 한글명.
 */
const COLUMN_ALIASES: Record<string, string> = {
  'product_name': '제품명', 'name': '제품명', '상품명': '제품명',
  'brand': '브랜드', 'brand_name': '브랜드',
  'manufacturer': '제조사', 'manufacturer_name': '제조사', 'maker': '제조사',
  'supplier_sku': '공급자상품코드', 'sku': '공급자상품코드', 'supplier_code': '공급자상품코드',
  'barcode': '바코드', 'gtin': '바코드',
  'barcode_or_standard_code': '바코드또는표준코드',
  'standard_code': '의약품표준코드', 'standard_code_or_kd_code': '의약품표준코드', 'kd_code': '의약품표준코드', 'edi_code': '의약품표준코드',
  'insurance_code': '보험코드',
  'package_unit': '포장단위', 'pack_unit': '포장단위',
  'ingredient': '성분명', 'ingredient_name': '성분명',
  'content': '함량', 'strength': '함량',
  'dosage_form': '제형', 'form': '제형',
  'base_supply_price': '기본공급가', 'supply_price': '기본공급가', 'price': '기본공급가',
  'description': '제품설명', 'desc': '제품설명',
  'image_url': '이미지URL', 'image': '이미지URL', 'imageurl': '이미지URL',
  'spec': '규격', 'specification': '규격',
  'unit': '단위',
  'report_no': '품목신고번호', 'approval_or_report_no': '품목신고번호', 'approval_no': '품목신고번호',
  'pharmacy_target': '약국대상여부',
  'note': '비고', 'reason_for_review': '비고', 'remark': '비고',
  'supply_note': '공급메모',
};

/** header 셀 → 표준 한글명 (별칭 없으면 trim 원본) */
function normalizeHeader(raw: string): string {
  const t = (raw || '').trim();
  const alias = COLUMN_ALIASES[t.toLowerCase()];
  return alias || t;
}

/** 모든 유형 템플릿 컬럼의 합집합 (타유형 컬럼 혼입 탐지용) */
const ALL_TEMPLATE_COLUMNS = new Set<string>(
  Object.values(SUPPLIER_BULK_TEMPLATE_COLUMNS).flat(),
);

/** 처방/이력추적 등 O4O 범위 외 금지 컬럼 (한·영 모두). 모든 유형에서 불허. */
const FORBIDDEN_COLUMNS = new Set<string>(
  [
    ...SUPPLIER_BULK_EXCLUDED_COLUMNS,
    'lot', 'lot_no', 'lot_number', 'serial', 'serial_number', 'expiry', 'expiry_date',
    'expiration', 'expiration_date', 'stock', 'inventory', 'inbound_date', 'warehouse',
    'warehouse_location', 'traceability', 'traceability_status',
    '유효기간', '일련번호', '재고', '입고일', '로트', '재고수량', '창고',
  ].map((c) => c.toLowerCase()),
);

/** 혼합 파일 탐지에 쓰는 메타 컬럼 (선택 유형과 값이 다르면 오류) */
const META_COLUMNS: Record<string, 'drug_category' | 'regulatory_type' | 'product_type'> = {
  'drug_category': 'drug_category', '약품분류': 'drug_category', '의약품분류': 'drug_category',
  'regulatory_type': 'regulatory_type', '규제유형': 'regulatory_type',
  'product_type': 'product_type', '제품유형': 'product_type', '유형': 'product_type',
};

/* ------------------------------------------------------------------ */
/*  유형별 검증 스펙                                                     */
/* ------------------------------------------------------------------ */

/** 유형별 필수/권장 컬럼 (표준 한글명 기준). 필수=없으면 오류, 권장=없으면 경고. */
const TYPE_VALIDATION: Record<TypeKey, { required: string[]; recommended: string[] }> = {
  non_drug: { required: ['제품명'], recommended: ['공급자상품코드', '바코드', '기본공급가'] },
  quasi_drug: { required: ['제품명'], recommended: ['제조사', '바코드또는표준코드', '품목신고번호'] },
  otc_drug: { required: ['제품명'], recommended: ['제조사', '의약품표준코드', '포장단위'] },
  rx_drug: { required: ['제품명'], recommended: ['제조사', '의약품표준코드', '포장단위'] },
  unclassified: { required: ['제품명'], recommended: ['비고'] },
};

/** drug_category 메타 값이 선택 유형과 호환되는지 */
const EXPECTED_DRUG_CATEGORY: Record<TypeKey, string[]> = {
  non_drug: ['', 'non_drug', 'general', '일반', '비의약품'],
  quasi_drug: ['quasi_drug', 'quasi', '의약외품'],
  otc_drug: ['otc', '일반의약품', '비처방', '비처방의약품'],
  rx_drug: ['rx', 'etc', '전문', '처방', '처방의약품'],
  unclassified: ['', 'unclassified', '미분류'],
};

const EXPECTED_REGULATORY_TYPE: Record<TypeKey, string[]> = {
  non_drug: ['general', ''],
  quasi_drug: ['quasi_drug'],
  otc_drug: ['drug'],
  rx_drug: ['drug'],
  unclassified: [''],
};

/* ------------------------------------------------------------------ */
/*  CSV 파서 (BOM/따옴표/콤마/줄바꿈/한글 처리)                            */
/* ------------------------------------------------------------------ */

export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cur.push(field); field = '';
    } else if (c === '\r') {
      // ignore — handled by \n
    } else if (c === '\n') {
      cur.push(field); rows.push(cur); cur = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  검증 결과 타입                                                       */
/* ------------------------------------------------------------------ */

export type BulkRowStatus = 'ok' | 'warning' | 'error';

export interface BulkRowResult {
  /** 1-based 데이터 행 번호(헤더 제외) */
  rowNumber: number;
  productName: string;
  makerOrBrand: string;
  sku: string;
  code: string;
  price: string;
  status: BulkRowStatus;
  messages: string[];
}

export interface BulkValidationResult {
  typeKey: TypeKey;
  typeLabel: string;
  headerErrors: string[];
  headerWarnings: string[];
  rows: BulkRowResult[];
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
  /** header 오류 또는 row 오류가 하나라도 있으면 true → 저장 비활성 */
  hasError: boolean;
}

/* ------------------------------------------------------------------ */
/*  검증 진입점                                                          */
/* ------------------------------------------------------------------ */

export function validateBulkCsv(typeKey: string, csvText: string): BulkValidationResult {
  const def = getSupplierProductType(typeKey);
  const key = (def?.key ?? 'unclassified') as TypeKey;
  const label = def?.label ?? '미분류';
  const spec = TYPE_VALIDATION[key];
  const templateCols = getBulkTemplateColumns(key);
  const templateSet = new Set(templateCols);

  const headerErrors: string[] = [];
  const headerWarnings: string[] = [];

  const parsed = parseCsv(csvText);
  if (parsed.length === 0) {
    headerErrors.push('파일이 비어 있습니다.');
    return {
      typeKey: key, typeLabel: label, headerErrors, headerWarnings,
      rows: [], totalRows: 0, okCount: 0, warningCount: 0, errorCount: 0, hasError: true,
    };
  }

  const rawHeader = parsed[0];
  const normHeader = rawHeader.map(normalizeHeader);

  // 헤더 → 인덱스 (정규화 기준, 첫 등장 우선)
  const headerIndex = new Map<string, number>();
  normHeader.forEach((h, i) => { if (h && !headerIndex.has(h)) headerIndex.set(h, i); });

  // 메타 컬럼 위치 (혼합 검사용)
  const metaCols: Array<{ index: number; kind: 'drug_category' | 'regulatory_type' | 'product_type'; raw: string }> = [];

  // --- header 검증 ---
  // 1) 필수 컬럼 존재
  for (const req of spec.required) {
    if (!headerIndex.has(req)) headerErrors.push(`필수 컬럼 "${req}"이(가) 없습니다.`);
  }
  // 2) 권장 컬럼 존재 (경고)
  for (const rec of spec.recommended) {
    if (!headerIndex.has(rec)) headerWarnings.push(`권장 컬럼 "${rec}"이(가) 없습니다.`);
  }
  // 3) 각 헤더 셀 분류
  normHeader.forEach((h, i) => {
    const raw = (rawHeader[i] || '').trim();
    if (!h) return;
    const lower = raw.toLowerCase();
    const normLower = h.toLowerCase();
    // 메타 컬럼
    const metaKind = META_COLUMNS[lower] || META_COLUMNS[h] || META_COLUMNS[normLower];
    if (metaKind) { metaCols.push({ index: i, kind: metaKind, raw }); return; }
    // 금지 컬럼 (처방 등 O4O 범위 외)
    if (FORBIDDEN_COLUMNS.has(lower) || FORBIDDEN_COLUMNS.has(normLower)) {
      if (key === 'rx_drug') {
        headerErrors.push(`처방의약품 파일에 "${raw}" 컬럼이 있습니다. O4O는 유효기간·일련번호·lot·재고 정보를 수집하지 않습니다.`);
      } else {
        headerErrors.push(`허용되지 않는 컬럼 "${raw}"이(가) 있습니다 (유효기간·일련번호·재고 계열은 수집하지 않습니다).`);
      }
      return;
    }
    // 이 유형 템플릿 컬럼
    if (templateSet.has(h)) return;
    // 타 유형 템플릿 컬럼 → 혼합/잘못된 템플릿 의심
    if (ALL_TEMPLATE_COLUMNS.has(h)) {
      headerErrors.push(`"${raw}" 컬럼은 ${label} 템플릿에 없습니다 — 다른 제품 유형 템플릿일 수 있습니다.`);
      return;
    }
    // 알 수 없는 컬럼 (비차단 경고)
    headerWarnings.push(`알 수 없는 컬럼 "${raw}"은(는) 무시됩니다.`);
  });

  // --- row 검증 ---
  const get = (row: string[], col: string): string => {
    const idx = headerIndex.get(col);
    return idx != null ? (row[idx] ?? '').trim() : '';
  };
  const firstOf = (row: string[], cols: string[]): string => {
    for (const c of cols) { const v = get(row, c); if (v) return v; }
    return '';
  };

  const rows: BulkRowResult[] = [];
  let okCount = 0, warningCount = 0, errorCount = 0;

  for (let r = 1; r < parsed.length; r++) {
    const raw = parsed[r];
    // 빈 행 무시
    if (raw.every((c) => (c ?? '').trim() === '')) continue;

    const messages: string[] = [];
    let status: BulkRowStatus = 'ok';
    const bump = (next: BulkRowStatus) => {
      if (next === 'error') status = 'error';
      else if (next === 'warning' && status !== 'error') status = 'warning';
    };

    const productName = get(raw, '제품명');
    const makerOrBrand = firstOf(raw, ['제조사', '브랜드']);
    const sku = get(raw, '공급자상품코드');
    const code = firstOf(raw, ['의약품표준코드', '바코드또는표준코드', '바코드']);
    const priceRaw = get(raw, '기본공급가');

    // 제품명 필수
    if (!productName) { messages.push('제품명이 비어 있습니다.'); bump('error'); }

    // 공급가 숫자 형식 (값이 있을 때만)
    let price = priceRaw;
    if (priceRaw) {
      const num = Number(priceRaw.replace(/[,\s원]/g, ''));
      if (Number.isNaN(num)) { messages.push(`기본공급가 "${priceRaw}"이(가) 숫자가 아닙니다.`); bump('error'); }
      else price = num.toLocaleString();
    }

    // 권장 컬럼 값 누락 (컬럼은 있으나 값 비어있음)
    for (const rec of spec.recommended) {
      if (headerIndex.has(rec) && !get(raw, rec)) { messages.push(`권장 항목 "${rec}" 값이 비어 있습니다.`); bump('warning'); }
    }

    // 혼합 파일 검사 (메타 컬럼 값 ↔ 선택 유형)
    for (const meta of metaCols) {
      const val = (raw[meta.index] ?? '').trim();
      if (!val) continue;
      const lower = val.toLowerCase();
      if (meta.kind === 'drug_category' && !EXPECTED_DRUG_CATEGORY[key].includes(lower)) {
        messages.push(`${label} 파일에 약품분류 "${val}" 행이 섞여 있습니다.`); bump('error');
      } else if (meta.kind === 'regulatory_type' && !EXPECTED_REGULATORY_TYPE[key].includes(lower)) {
        messages.push(`${label} 파일에 규제유형 "${val}" 행이 섞여 있습니다.`); bump('error');
      } else if (meta.kind === 'product_type' && lower !== key && lower !== label.toLowerCase()) {
        messages.push(`${label} 파일에 제품유형 "${val}" 행이 섞여 있습니다.`); bump('error');
      }
    }

    if (status === 'ok') okCount++;
    else if (status === 'warning') warningCount++;
    else errorCount++;

    rows.push({ rowNumber: rows.length + 1, productName, makerOrBrand, sku, code, price, status, messages });
  }

  const hasError = headerErrors.length > 0 || errorCount > 0;

  return {
    typeKey: key, typeLabel: label, headerErrors, headerWarnings,
    rows, totalRows: rows.length, okCount, warningCount, errorCount, hasError,
  };
}
