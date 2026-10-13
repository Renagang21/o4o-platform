import type { DataSource } from 'typeorm';
import { ProductCandidateService } from './product-candidate.service.js';

/** productType(프론트 key + 단축 alias) → 분류. unclassified/unknown 은 null(운영자 검토). */
const BULK_TYPE_MAP: Record<
  string,
  { regulatoryType: string | null; drugCategory: string | null; rx: boolean }
> = {
  non_drug: { regulatoryType: 'GENERAL', drugCategory: null, rx: false },
  quasi_drug: { regulatoryType: 'QUASI_DRUG', drugCategory: 'quasi_drug', rx: false },
  otc_drug: { regulatoryType: 'DRUG', drugCategory: 'otc', rx: false },
  otc: { regulatoryType: 'DRUG', drugCategory: 'otc', rx: false },
  rx_drug: { regulatoryType: 'DRUG', drugCategory: 'rx', rx: true },
  rx: { regulatoryType: 'DRUG', drugCategory: 'rx', rx: true },
  unclassified: { regulatoryType: null, drugCategory: null, rx: false },
  unknown: { regulatoryType: null, drugCategory: null, rx: false },
};

/** O4O 범위 외(처방 lot/유효기간/일련번호/재고 등) — 모든 유형에서 금지 (한·영) */
const BULK_FORBIDDEN_KEYS = new Set(
  [
    'lot',
    'lot_no',
    'lot_number',
    'serial',
    'serial_number',
    'expiry',
    'expiry_date',
    'expiration',
    'expiration_date',
    'stock',
    'inventory',
    'inbound_date',
    'warehouse',
    'warehouse_location',
    'traceability',
    'traceability_status',
    '유효기간',
    '일련번호',
    '재고',
    '입고일',
    '로트',
    '재고수량',
    '창고',
  ].map((k) => k.toLowerCase()),
);

/** 혼합 파일 메타 컬럼 값 ↔ 선택 유형 호환 (서버 재검증) */
const BULK_EXPECTED_DRUG_CATEGORY: Record<string, string[]> = {
  non_drug: ['', 'non_drug', 'general', '일반', '비의약품'],
  quasi_drug: ['quasi_drug', 'quasi', '의약외품'],
  otc_drug: ['otc', '일반의약품', '비처방', '비처방의약품'],
  rx_drug: ['rx', 'etc', '전문', '처방', '처방의약품'],
  unclassified: ['', 'unclassified', '미분류'],
};

const BULK_MAX_ROWS = 200;

/** fields(정규화 한글명) 또는 raw 에서 첫 비어있지 않은 값 */
function pickField(fields: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = (fields?.[k] ?? '').trim();
    if (v) return v;
  }
  return '';
}

export interface SupplierBulkCandidateInput {
  productType?: string;
  rows?: Array<{
    rowNumber?: number;
    fields?: Record<string, string>;
    raw?: Record<string, string>;
  }>;
}
export type SupplierBulkCandidateResult =
  | { success: false; error: string; message: string }
  | {
      success: true;
      data: {
        total: number;
        created: number;
        duplicate: number;
        failed: number;
        results: Array<{
          rowNumber: number;
          status: string;
          candidateId?: string;
          message?: string;
        }>;
      };
    };

/** Existing bulk Candidate validation and sequential intake. No Master/Offer writes. */
export class SupplierBulkCandidateService {
  private readonly productCandidateService: ProductCandidateService;
  constructor(dataSource: DataSource) {
    this.productCandidateService = new ProductCandidateService(dataSource);
  }
  async submit(
    supplierId: string,
    submittedBy: string | null,
    input: SupplierBulkCandidateInput,
  ): Promise<SupplierBulkCandidateResult> {
    const { productType, rows } = input as {
      productType?: string;
      rows?: Array<{
        rowNumber?: number;
        fields?: Record<string, string>;
        raw?: Record<string, string>;
      }>;
    };
    const typeKey = String(productType ?? '');
    const typeInfo = Object.hasOwn(BULK_TYPE_MAP, typeKey) ? BULK_TYPE_MAP[typeKey] : undefined;
    if (!typeInfo) {
      return {
        success: false,
        error: 'INVALID_PRODUCT_TYPE',
        message: '제품 유형이 올바르지 않습니다.',
      };
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'ROWS_REQUIRED', message: '등록할 행이 없습니다.' };
    }
    if (rows.length > BULK_MAX_ROWS) {
      return {
        success: false,
        error: 'TOO_MANY_ROWS',
        message: `한 번에 등록할 수 있는 제품 수(${BULK_MAX_ROWS})를 초과했습니다. 파일을 나누어 다시 업로드해 주세요.`,
      };
    }
    for (const r of rows) {
      const keys = Object.keys(r?.raw ?? {});
      const bad = keys.find((k) => BULK_FORBIDDEN_KEYS.has(k.trim().toLowerCase()));
      if (bad) {
        return {
          success: false,
          error: 'FORBIDDEN_COLUMN',
          message: `허용되지 않는 컬럼 "${bad}"이(가) 포함되어 있습니다. O4O는 유효기간·일련번호·lot·재고 정보를 수집하지 않습니다.`,
        };
      }
    }
    const expectedCat = BULK_EXPECTED_DRUG_CATEGORY[typeKey] ?? [];
    const seenSku = new Set<string>();
    const seenCode = new Set<string>();
    const results: Array<{
      rowNumber: number;
      status: string;
      candidateId?: string;
      message?: string;
    }> = [];
    let created = 0,
      duplicate = 0,
      failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const rowNumber = r.rowNumber ?? i + 1;
      const fields = r.fields ?? {};
      const raw = r.raw ?? {};

      const productName = pickField(fields, '제품명');
      if (!productName) {
        results.push({ rowNumber, status: 'failed', message: '제품명이 비어 있습니다.' });
        failed++;
        continue;
      }

      // 공급가 숫자 검증
      const priceRaw = pickField(fields, '기본공급가');
      let candidatePrice: number | null = null;
      if (priceRaw) {
        const num = Number(priceRaw.replace(/[,\s원]/g, ''));
        if (Number.isNaN(num)) {
          results.push({
            rowNumber,
            status: 'failed',
            message: `기본공급가 "${priceRaw}"이(가) 숫자가 아닙니다.`,
          });
          failed++;
          continue;
        }
        candidatePrice = num;
      }

      // 혼합 파일 재검증 (메타 컬럼)
      const metaCat = (raw['drug_category'] ?? raw['약품분류'] ?? raw['의약품분류'] ?? '')
        .trim()
        .toLowerCase();
      if (metaCat && expectedCat.length > 0 && !expectedCat.includes(metaCat)) {
        results.push({
          rowNumber,
          status: 'failed',
          message: `선택 유형과 다른 약품분류 "${metaCat}" 행입니다.`,
        });
        failed++;
        continue;
      }

      // 요청 내 중복 (자동 병합 안 함 — 플래그만)
      const sku = pickField(fields, '공급자상품코드');
      const code = pickField(fields, '의약품표준코드', '바코드또는표준코드', '바코드');
      let isDup = false;
      if (sku) {
        if (seenSku.has(sku)) isDup = true;
        else seenSku.add(sku);
      }
      if (code) {
        if (seenCode.has(code)) isDup = true;
        else seenCode.add(code);
      }

      const candidate = await this.productCandidateService.createCandidate({
        serviceKey: 'neture',
        organizationId: null,
        sourceType: 'csv_import',
        sourceLabel: '공급자 대량 등록',
        submittedBy,
        candidateName: productName,
        candidateBrand: pickField(fields, '브랜드') || null,
        candidateManufacturer: pickField(fields, '제조사') || null,
        candidateSpec: pickField(fields, '규격', '포장단위') || null,
        candidateUnit: pickField(fields, '단위') || null,
        candidateImageUrl: pickField(fields, '이미지URL') || null,
        candidatePrice,
        rawPayload: {
          // 안전 후보 출처/분류 보존 (전용 컬럼 없음 → rawPayload)
          source: 'supplier_bulk_upload',
          productType: typeKey,
          regulatoryType: typeInfo.regulatoryType,
          drugCategory: typeInfo.drugCategory,
          // classifyProductType 가 읽는 키 (운영자 콘솔 분류 추론용)
          drug_category: typeInfo.drugCategory,
          product_type: typeKey,
          supplierId,
          rowNumber,
          duplicateInBatch: isDup,
          fields,
          original: raw,
        },
      });

      if (isDup) {
        results.push({
          rowNumber,
          status: 'duplicate',
          candidateId: candidate.id,
          message: '요청 내 중복 가능 — 운영자 검토 필요',
        });
        duplicate++;
      } else {
        results.push({ rowNumber, status: 'created', candidateId: candidate.id });
        created++;
      }
    }
    return {
      success: true,
      data: { total: rows.length, created, duplicate, failed, results },
    };
  }
}
