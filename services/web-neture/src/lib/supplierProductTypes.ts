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
