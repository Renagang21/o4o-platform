/**
 * MFDS (식약처) Service
 *
 * 식약처 공공데이터 API 연동 — 바코드 기반 제품 정보 조회
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1
 *
 * 인터페이스 FROZEN — 구현부만 교체
 *
 * 환경변수:
 *   MFDS_API_KEY        — data.go.kr 인증키 (없으면 미검증 반환)
 *   MFDS_TIMEOUT_MS     — API 타임아웃 (기본 5000ms)
 */

import logger from '../../../utils/logger.js';

export interface MfdsProductResult {
  /** 규제 유형 (e.g. 의약품, 건강기능식품, 의약외품, 의료기기 등) */
  regulatoryType: string;
  /** 식약처 공식 제품명 */
  regulatoryName: string;
  /** 제조사명 */
  manufacturerName: string;
  /** 식약처 허가 번호 (nullable) */
  permitNumber: string | null;
  /** 식약처 제품 ID (nullable) */
  productId: string | null;
}

export interface MfdsVerificationResult {
  verified: boolean;
  product: MfdsProductResult | null;
  error?: string;
}

const MFDS_TIMEOUT_MS = parseInt(process.env.MFDS_TIMEOUT_MS || '5000', 10);
const MFDS_API_KEY = process.env.MFDS_API_KEY || '';

// data.go.kr 공공데이터 API 엔드포인트
const MFDS_DRUG_BARCODE_URL =
  'https://apis.data.go.kr/1471000/MdcinBardInfoService01/getMdcinBardItemList01';
const MFDS_HEALTH_FOOD_URL =
  'https://apis.data.go.kr/1471000/HlthFoodBardInfoService/getHlthFoodBardItemList';

/**
 * 바코드로 식약처 제품 정보 조회
 *
 * 1. 의약품 바코드 API 시도
 * 2. 미발견 시 건강기능식품 API 시도
 * 3. MFDS_API_KEY 미설정 시 graceful degradation (미검증 반환)
 */
export async function verifyProductByBarcode(
  barcode: string,
): Promise<MfdsVerificationResult> {
  if (!MFDS_API_KEY) {
    logger.debug('[MFDS] MFDS_API_KEY not configured, returning unverified');
    return { verified: false, product: null, error: 'MFDS_API_KEY_NOT_CONFIGURED' };
  }

  // 1. 의약품 바코드 API
  const drugResult = await queryMfdsApi(MFDS_DRUG_BARCODE_URL, barcode, '의약품');
  if (drugResult.verified) return drugResult;

  // 2. 건강기능식품 바코드 API
  const healthResult = await queryMfdsApi(MFDS_HEALTH_FOOD_URL, barcode, '건강기능식품');
  if (healthResult.verified) return healthResult;

  return { verified: false, product: null, error: 'PRODUCT_NOT_FOUND_IN_MFDS' };
}

/**
 * MFDS 제품 ID로 제품 정보 조회
 */
export async function getProductByMfdsId(
  mfdsProductId: string,
): Promise<MfdsProductResult | null> {
  if (!MFDS_API_KEY) return null;

  try {
    const url = new URL(MFDS_DRUG_BARCODE_URL);
    url.searchParams.set('serviceKey', MFDS_API_KEY);
    url.searchParams.set('item_seq', mfdsProductId);
    url.searchParams.set('type', 'json');
    url.searchParams.set('numOfRows', '1');

    const item = await fetchMfdsItem(url);
    if (!item) return null;

    return mapDrugItem(item, '의약품');
  } catch (err) {
    logger.warn(`[MFDS] getProductByMfdsId error for ${mfdsProductId}:`, err);
    return null;
  }
}

// ── Internal helpers ────────────────────────────────────────────────────

async function queryMfdsApi(
  baseUrl: string,
  barcode: string,
  fallbackType: string,
): Promise<MfdsVerificationResult> {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('serviceKey', MFDS_API_KEY);
    url.searchParams.set('bar_code', barcode);
    url.searchParams.set('type', 'json');
    url.searchParams.set('numOfRows', '1');

    const item = await fetchMfdsItem(url);
    if (!item) {
      return { verified: false, product: null };
    }

    return {
      verified: true,
      product: mapDrugItem(item, fallbackType),
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      logger.warn(`[MFDS] API timeout for barcode ${barcode} (${baseUrl})`);
      return { verified: false, product: null, error: 'MFDS_TIMEOUT' };
    }
    logger.error(`[MFDS] API error for barcode ${barcode}:`, err);
    return { verified: false, product: null, error: `MFDS_ERROR: ${(err as Error).message}` };
  }
}

async function fetchMfdsItem(url: URL): Promise<Record<string, string> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MFDS_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`[MFDS] HTTP ${response.status}: ${url.pathname}`);
      return null;
    }

    const json = await response.json() as Record<string, unknown>;

    // data.go.kr JSON 응답 구조 파싱
    // Format 1: { body: { items: [ {...} ] } }
    // Format 2: { body: { items: { item: [ {...} ] } } }
    const body = json.body as Record<string, unknown> | undefined;
    if (!body) return null;

    const totalCount = Number(body.totalCount ?? 0);
    if (totalCount === 0) return null;

    let items: Record<string, string>[] | undefined;
    const rawItems = body.items;

    if (Array.isArray(rawItems)) {
      items = rawItems as Record<string, string>[];
    } else if (rawItems && typeof rawItems === 'object') {
      const nested = (rawItems as Record<string, unknown>).item;
      if (Array.isArray(nested)) {
        items = nested as Record<string, string>[];
      }
    }

    return items && items.length > 0 ? items[0] : null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapDrugItem(
  item: Record<string, string>,
  fallbackType: string,
): MfdsProductResult {
  return {
    regulatoryType: item.PRDUCT_TYPE || item.PRDLST_NM || fallbackType,
    regulatoryName: item.ITEM_NAME || item.PRDLST_NM || '',
    manufacturerName: item.ENTP_NAME || item.BSSH_NM || '',
    permitNumber: item.ITEM_PERMIT_NO || item.PRMS_DT || null,
    productId: item.ITEM_SEQ || item.PRDLST_REPORT_NO || null,
  };
}
