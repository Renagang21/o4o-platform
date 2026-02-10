/**
 * Store Catalog Config
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1
 * Phase 1: 프론트엔드 하드코딩 카탈로그 (DB 테이블 없음)
 * 상품 카테고리별 Product Policy 매핑
 */

import type { ProductPolicy, ProductPolicyConfig, StoreCatalogItem } from '@/types/store-main';

/** Product Policy 설정 맵 */
export const PRODUCT_POLICY_CONFIG: Record<ProductPolicy, ProductPolicyConfig> = {
  OPEN: {
    policy: 'OPEN',
    label: '자유 판매',
    description: '즉시 판매 가능한 상품',
    badgeColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  REQUEST_REQUIRED: {
    policy: 'REQUEST_REQUIRED',
    label: '신청 필요',
    description: '운영자 승인 후 판매 가능',
    badgeColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  DISPLAY_ONLY: {
    policy: 'DISPLAY_ONLY',
    label: '진열 전용',
    description: '매장 진열만 가능 (직접 판매 불가)',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  LIMITED: {
    policy: 'LIMITED',
    label: '한정 판매',
    description: '수량 또는 기간 한정 상품',
    badgeColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
};

/**
 * Phase 1 기본 카탈로그 상품 목록
 * 실제 운영 시 API 응답으로 대체됨
 */
export const DEFAULT_CATALOG: StoreCatalogItem[] = [
  // OPEN - 자유 판매
  {
    id: 'cat-001',
    name: '혈당측정지 (일반)',
    categoryName: '당뇨 소모품',
    policy: 'OPEN',
    price: 15000,
    status: 'available',
  },
  {
    id: 'cat-002',
    name: '인슐린 주사바늘',
    categoryName: '당뇨 소모품',
    policy: 'OPEN',
    price: 12000,
    status: 'available',
  },
  {
    id: 'cat-003',
    name: '건강기능식품 A',
    categoryName: '건강기능식품',
    policy: 'OPEN',
    price: 35000,
    status: 'available',
  },
  // DISPLAY_ONLY - 진열 전용
  {
    id: 'cat-004',
    name: '브랜드 홍보 키트',
    categoryName: '홍보물',
    policy: 'DISPLAY_ONLY',
    status: 'display_only',
  },
  {
    id: 'cat-005',
    name: '신제품 샘플 세트',
    categoryName: '샘플',
    policy: 'DISPLAY_ONLY',
    status: 'display_only',
  },
  // REQUEST_REQUIRED - 신청 필요
  {
    id: 'cat-006',
    name: '처방연계 혈당관리 프로그램',
    categoryName: '처방 연계',
    policy: 'REQUEST_REQUIRED',
    price: 89000,
    status: 'request_needed',
  },
  {
    id: 'cat-007',
    name: 'B2B 전용 도매 상품',
    categoryName: 'B2B',
    policy: 'REQUEST_REQUIRED',
    price: 250000,
    status: 'request_needed',
  },
  // LIMITED - 한정 판매
  {
    id: 'cat-008',
    name: '신규 런칭 프로모션 세트',
    categoryName: '프로모션',
    policy: 'LIMITED',
    price: 49000,
    status: 'limited',
  },
];

/** Ready to Use 카탈로그 (OPEN + DISPLAY_ONLY) */
export function getReadyToUseCatalog(): StoreCatalogItem[] {
  return DEFAULT_CATALOG.filter(
    (item) => item.policy === 'OPEN' || item.policy === 'DISPLAY_ONLY'
  );
}

/** Expandable 카탈로그 (REQUEST_REQUIRED + LIMITED) */
export function getExpandableCatalog(): StoreCatalogItem[] {
  return DEFAULT_CATALOG.filter(
    (item) => item.policy === 'REQUEST_REQUIRED' || item.policy === 'LIMITED'
  );
}
