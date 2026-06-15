/**
 * Supplier 제품 등록 — 제품 유형 정의 (공유 상수)
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1
 *
 * 제품 등록 진입(유형 선택) + 대량 등록 유형 분기에서 공통 사용.
 * regulatoryType 은 기존 ProductMaster.regulatoryType 코드 체계(GENERAL/QUASI_DRUG/DRUG)와 정합.
 * drugCategory 는 F1 active drug_category(otc/rx) 와 정합 (운영자 검토에서 최종 확정).
 */

export interface SupplierProductTypeDef {
  /** 내부 키 (라우트 쿼리 파라미터) */
  key: 'non_drug' | 'quasi_drug' | 'otc_drug' | 'rx_drug' | 'unclassified';
  /** 사용자 표시 라벨 */
  label: string;
  /** 한 줄 설명 */
  desc: string;
  /** 매핑되는 regulatoryType (미분류는 빈 문자열 → create 기본값) */
  regulatoryType: '' | 'GENERAL' | 'QUASI_DRUG' | 'DRUG';
  /** 의약품 세부 분류 힌트 (운영자 검토에서 확정) */
  drugCategory?: 'otc' | 'rx';
  /** 약국 대상(의약품류) 여부 */
  pharmacyTarget?: boolean;
  /** 처방의약품 — 일반 공급오퍼/이벤트/펀딩 자동 연결 제외 대상 */
  rx?: boolean;
}

export const SUPPLIER_PRODUCT_TYPES: SupplierProductTypeDef[] = [
  {
    key: 'non_drug',
    label: '비의약품',
    desc: '일반 상품 (식품·생활·잡화 등). 약국 외 매장에도 공급 가능.',
    regulatoryType: 'GENERAL',
  },
  {
    key: 'quasi_drug',
    label: '의약외품',
    desc: '밴드·마스크·구강청결제 등 의약외품. 품목/신고 정보 권장.',
    regulatoryType: 'QUASI_DRUG',
  },
  {
    key: 'otc_drug',
    label: '비처방 의약품',
    desc: '일반의약품(OTC). 약국 대상. 성분·함량·제형 정보 권장.',
    regulatoryType: 'DRUG',
    drugCategory: 'otc',
    pharmacyTarget: true,
  },
  {
    key: 'rx_drug',
    label: '처방의약품',
    desc: '전문의약품(ETC). 약국 대상 — O4O는 유통 정보화만(재고·유효기간·일련번호 관리 아님).',
    regulatoryType: 'DRUG',
    drugCategory: 'rx',
    pharmacyTarget: true,
    rx: true,
  },
  {
    key: 'unclassified',
    label: '미분류 / 운영자 검토',
    desc: '분류가 불확실한 경우. 등록 후 운영자가 검토해 유형을 확정합니다.',
    regulatoryType: '',
  },
];

export function getSupplierProductType(key: string | null | undefined): SupplierProductTypeDef | undefined {
  if (!key) return undefined;
  return SUPPLIER_PRODUCT_TYPES.find((t) => t.key === key);
}

/* ------------------------------------------------------------------ */
/*  유형별 대량 등록 CSV 템플릿 — WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1  */
/* ------------------------------------------------------------------ */

/**
 * 유형별 CSV 템플릿 헤더 컬럼.
 *
 * 처방의약품(rx)에는 lot/유효기간/일련번호/재고 이력 컬럼을 넣지 않는다 —
 * O4O는 유통 정보화 플랫폼으로 처방의약품도 제품/유통 단위로만 다룬다.
 */
export const SUPPLIER_BULK_TEMPLATE_COLUMNS: Record<SupplierProductTypeDef['key'], string[]> = {
  non_drug: ['제품명', '브랜드', '제조사', '공급자상품코드', '바코드', '규격', '단위', '기본공급가', '제품설명', '이미지URL'],
  quasi_drug: ['제품명', '브랜드', '제조사', '공급자상품코드', '바코드또는표준코드', '품목신고번호', '규격', '단위', '기본공급가', '제품설명', '이미지URL'],
  otc_drug: ['제품명', '제조사', '공급자상품코드', '의약품표준코드', '보험코드', '포장단위', '성분명', '함량', '제형', '기본공급가', '약국대상여부'],
  // 처방의약품: lot/유효기간/일련번호/재고 컬럼 없음 (유통 정보화 범위)
  rx_drug: ['제품명', '제조사', '공급자상품코드', '의약품표준코드', '보험코드', '포장단위', '성분명', '함량', '제형', '기본공급가', '공급메모'],
  unclassified: ['제품명', '브랜드', '제조사', '공급자상품코드', '바코드', '기본공급가', '비고'],
};

/** O4O 유통 정보화 범위상 대량 등록 템플릿에서 절대 받지 않는 컬럼(특히 처방의약품) */
export const SUPPLIER_BULK_EXCLUDED_COLUMNS = ['lot', 'lot_no', 'expiry_date', '유효기간', 'serial_number', '일련번호', 'warehouse_location', '재고', 'traceability_status'];

export function getBulkTemplateColumns(key: string | null | undefined): string[] {
  const def = getSupplierProductType(key);
  return def ? SUPPLIER_BULK_TEMPLATE_COLUMNS[def.key] : [];
}

/** 헤더만 담은 CSV 문자열 생성 (UTF-8 BOM 포함 — Excel 한글 호환) */
export function buildBulkTemplateCsv(key: string): string {
  const cols = getBulkTemplateColumns(key);
  const header = cols.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',');
  return `﻿${header}\r\n`;
}

/* ------------------------------------------------------------------ */
/*  제품 활용(후속 공급활동) 액션 — WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1  */
/* ------------------------------------------------------------------ */

export type SupplierOfferAction = 'supply' | 'recruit' | 'event' | 'funding';

/** 후속 액션 메타 (라벨/이동경로/구현여부). ready=false 는 준비 중(비활성). */
// WO-O4O-SUPPLIER-PRODUCT-LIST-NEXT-ACTIONS-CLARITY-V1: 라벨 어휘 정비(연결/관리/준비중 — '자동 등록/즉시 판매' 금지)
export const SUPPLIER_OFFER_ACTION_META: Record<SupplierOfferAction, { label: string; path?: string; ready: boolean }> = {
  supply: { label: '일반 공급 오퍼 연결', path: '/supplier/supply-offers', ready: true },
  recruit: { label: '판매자 모집 연결 (준비 중)', ready: false },
  event: { label: '이벤트 오퍼 연결', path: '/supplier/event-offers', ready: true },
  funding: { label: '유통참여형 펀딩 연결', path: '/supplier/market-trial/new', ready: true },
};

/**
 * 제품의 regulatoryType 기준 허용 후속 액션.
 *
 * - DRUG(의약품: 비처방·처방) → 검토 중심(restricted), 후속 공급활동 미제공.
 * - 그 외(비의약품·의약외품·건기식·화장품·기타) → 전체 액션.
 *
 * 한계: 목록 응답에 drugCategory 가 없어 otc/rx/미분류 세분 게이트는 불가
 *       (DRUG 은 모두 검토 중심으로 안전 처리). 세분화는 후속 WO.
 */
/**
 * 후속 액션 게이트.
 * WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1 (regulatoryType)
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1 (drugCategory 수용 — 보수 정책 유지)
 *
 * DRUG(의약품: otc/rx/drug_unspecified/미분류) → 검토 중심(restricted). 그 외 → 전체 액션.
 * drugCategory 는 향후 세분 정책용으로 받되, 본 V1 에서 gate 를 완화하지 않는다.
 *
 * 하위호환: 문자열(regulatoryType) 단독 인자도 허용.
 */
export function getAllowedOfferActions(
  arg?: string | null | { regulatoryType?: string | null; drugCategory?: string | null },
): { restricted: boolean; actions: SupplierOfferAction[] } {
  const regulatoryType = typeof arg === 'object' && arg !== null ? arg.regulatoryType : arg;
  const reg = (regulatoryType || '').trim().toUpperCase();
  if (reg === 'DRUG') return { restricted: true, actions: [] };
  return { restricted: false, actions: ['supply', 'recruit', 'event', 'funding'] };
}

/* ------------------------------------------------------------------ */
/*  의약품 공급 Gate — WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1  */
/* ------------------------------------------------------------------ */

export type DrugGateCategory = 'non_drug' | 'quasi_drug' | 'otc' | 'rx' | 'drug_unspecified';

export interface DrugSupplyGate {
  category: DrugGateCategory;
  /** DRUG(의약품) regulatoryType 여부 */
  isDrug: boolean;
  /** 후속 공급 액션(공급/이벤트/펀딩) 차단 여부 — V1: 의약품 전부 차단 유지 */
  offerActionsBlocked: boolean;
  /** OTC: 운영자 검토 후 약국 매장 유형 대상 공급 후보 */
  pharmacyReviewCandidate: boolean;
  /** 목록 "후속 작업" 칸 짧은 라벨 */
  shortLabel: string;
  /** 상세/툴팁 안내 문구 */
  notice: string;
}

/**
 * 제품의 regulatoryType + drugCategory 기준 의약품 공급 gate (표시/정책 판단용).
 *
 * V1 정책 (OTC-PHARMACY-SUPPLY-GATE-V1):
 *  - OTC(비처방) → 운영자 검토 후 "약국 매장 유형 대상 공급 후보". 일반매장/고객노출/이벤트/펀딩 자동 연결 안 함.
 *  - Rx(처방) → 운영자 검토 전용. 모든 후속 공급 활동 차단.
 *  - drug_unspecified/미분류 → 분류 필요. 모든 후속 공급 활동 차단.
 *  - 의약외품/비의약품 → 기존 흐름(액션 허용).
 *
 * V1 은 **표시만 세분화**하고 액션은 의약품 전부 계속 차단한다(getAllowedOfferActions 와 정합).
 */
export function getDrugSupplyGate(
  arg?: string | null | { regulatoryType?: string | null; drugCategory?: string | null },
): DrugSupplyGate {
  const regulatoryType = typeof arg === 'object' && arg !== null ? arg.regulatoryType : arg;
  const drugCategory = typeof arg === 'object' && arg !== null ? arg.drugCategory : null;
  const reg = (regulatoryType || '').trim().toUpperCase();
  const cat = (drugCategory || '').trim().toLowerCase();

  if (reg === 'DRUG') {
    if (cat === 'otc') {
      return {
        category: 'otc', isDrug: true, offerActionsBlocked: true, pharmacyReviewCandidate: true,
        shortLabel: '약국 대상 공급 후보 (검토 후)',
        notice: '비처방 의약품(OTC)은 운영자 검토 후 약국 매장 유형 대상으로만 공급 후보가 됩니다. 일반 매장 공급·고객 노출·이벤트 오퍼·유통참여형 펀딩으로 자동 연결되지 않습니다.',
      };
    }
    if (cat === 'rx') {
      return {
        category: 'rx', isDrug: true, offerActionsBlocked: true, pharmacyReviewCandidate: false,
        shortLabel: '운영자 검토 전용 · 공급 차단',
        notice: '처방의약품(Rx)은 제품/유통 정보 단위로만 관리하며, 일반 판매·고객 노출·이벤트 오퍼·유통참여형 펀딩으로 연결하지 않습니다. 모든 후속 공급 활동이 차단됩니다.',
      };
    }
    // null / drug_unspecified / 기타
    return {
      category: 'drug_unspecified', isDrug: true, offerActionsBlocked: true, pharmacyReviewCandidate: false,
      shortLabel: '의약품 분류 필요',
      notice: '의약품 분류가 확정되기 전까지 모든 후속 공급 활동이 차단됩니다. 운영자가 비처방/처방 여부를 확정해야 합니다.',
    };
  }
  if (reg === 'QUASI_DRUG') {
    return {
      category: 'quasi_drug', isDrug: false, offerActionsBlocked: false, pharmacyReviewCandidate: false,
      shortLabel: '', notice: '',
    };
  }
  return {
    category: 'non_drug', isDrug: false, offerActionsBlocked: false, pharmacyReviewCandidate: false,
    shortLabel: '', notice: '',
  };
}

/**
 * 공급자 목록 표시용 제품 유형 라벨 (regulatoryType + drugCategory 조합).
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1
 *
 * 기타(COSMETIC/HEALTH_FUNCTIONAL/MEDICAL_DEVICE 등)는 null 반환 → 호출처가 기존 라벨로 fallback.
 */
export function getSupplierProductTypeLabel(
  regulatoryType?: string | null,
  drugCategory?: string | null,
): string | null {
  const reg = (regulatoryType || '').trim().toUpperCase();
  const cat = (drugCategory || '').trim().toLowerCase();
  if (reg === 'DRUG') {
    if (cat === 'otc') return '비처방 의약품';
    if (cat === 'rx') return '처방의약품';
    return '의약품 분류 필요'; // drug_unspecified 또는 미설정
  }
  if (reg === 'QUASI_DRUG') return '의약외품';
  if (reg === 'GENERAL' || reg === '') return '비의약품';
  return null; // 기타 → 호출처 fallback
}

/** 후속 액션 진입 시 선택 상품 context 를 전달하는 query 파라미터 키 (생성 화면이 읽음) */
export interface OfferActionProductContext {
  id: string;
  masterId?: string | null;
  name?: string | null;
  brandName?: string | null;
  priceGeneral?: number | null;
  regulatoryType?: string | null;
}

/**
 * 후속 액션 이동 URL 빌더 — 선택 공급자 상품 context 를 query 로 전달.
 * WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1
 * ready=false(준비중) 또는 path 없으면 null.
 */
export function buildOfferActionUrl(action: SupplierOfferAction, product: OfferActionProductContext): string | null {
  const meta = SUPPLIER_OFFER_ACTION_META[action];
  if (!meta.ready || !meta.path) return null;
  const p = new URLSearchParams();
  p.set('supplierProductId', product.id);
  if (product.masterId) p.set('masterId', product.masterId);
  if (product.name) p.set('name', product.name);
  if (product.brandName) p.set('brand', product.brandName);
  if (product.priceGeneral != null) p.set('price', String(product.priceGeneral));
  if (product.regulatoryType) p.set('regulatoryType', product.regulatoryType);
  return `${meta.path}?${p.toString()}`;
}
