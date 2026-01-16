/**
 * Context Asset Types & Configuration
 * WO-AI-CONTEXT-ASSET-MANAGER-V1
 *
 * AI 응답에 노출되는 광고/정보/컨텐츠(Context Asset) 타입 정의
 * "AI가 무엇을 말할 수 있는지는 모델이 아니라, 관리자가 등록한 자산으로 결정된다."
 */

// ===== Asset 유형 =====
export type AssetType = 'brand' | 'product' | 'non_product' | 'content';

export const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string; description: string }> = [
  { value: 'brand', label: '브랜드', description: '브랜드/공급자 소개' },
  { value: 'product', label: '상품', description: '판매 상품' },
  { value: 'non_product', label: '비상품', description: '비판매 제품, 출시 예정, 테스트 제품' },
  { value: 'content', label: '콘텐츠', description: '가이드, 설명, 캠페인, 정보성 콘텐츠' },
];

export function getAssetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
}

// ===== 서비스 범위 =====
export type ServiceScope = 'all' | 'neture' | 'k-cosmetics' | 'glycopharm' | 'glucoseview' | 'kpa-society';

export const SERVICE_SCOPE_OPTIONS: Array<{ value: ServiceScope; label: string }> = [
  { value: 'all', label: '전체 서비스' },
  { value: 'neture', label: '네처 (Neture)' },
  { value: 'k-cosmetics', label: 'K-코스메틱' },
  { value: 'glycopharm', label: '글라이코팜' },
  { value: 'glucoseview', label: '글루코스뷰' },
  { value: 'kpa-society', label: 'KPA 약사회' },
];

// ===== 페이지 타입 =====
export type PageType = 'all' | 'product' | 'store' | 'category' | 'home' | 'search' | 'content';

export const PAGE_TYPE_OPTIONS: Array<{ value: PageType; label: string }> = [
  { value: 'all', label: '전체 페이지' },
  { value: 'product', label: '상품 상세' },
  { value: 'store', label: '매장/스토어' },
  { value: 'category', label: '카테고리' },
  { value: 'home', label: '홈' },
  { value: 'search', label: '검색 결과' },
  { value: 'content', label: '콘텐츠 페이지' },
];

// ===== 목적 태그 =====
export type PurposeTag = 'branding' | 'information' | 'conversion' | 'engagement';

export const PURPOSE_TAG_OPTIONS: Array<{ value: PurposeTag; label: string; color: string }> = [
  { value: 'branding', label: '브랜딩', color: 'bg-purple-100 text-purple-700' },
  { value: 'information', label: '정보 제공', color: 'bg-blue-100 text-blue-700' },
  { value: 'conversion', label: '전환 유도', color: 'bg-green-100 text-green-700' },
  { value: 'engagement', label: '참여 유도', color: 'bg-amber-100 text-amber-700' },
];

export function getPurposeTagInfo(tag: PurposeTag) {
  return PURPOSE_TAG_OPTIONS.find((opt) => opt.value === tag);
}

// ===== 실험 태그 =====
export type ExperimentTag = 'none' | 'engine-a' | 'engine-b' | 'control' | 'variant-1' | 'variant-2';

export const EXPERIMENT_TAG_OPTIONS: Array<{ value: ExperimentTag; label: string }> = [
  { value: 'none', label: '실험 없음' },
  { value: 'engine-a', label: 'Engine A' },
  { value: 'engine-b', label: 'Engine B' },
  { value: 'control', label: '대조군' },
  { value: 'variant-1', label: '실험군 1' },
  { value: 'variant-2', label: '실험군 2' },
];

// ===== Asset 상태 =====
export type AssetStatus = 'active' | 'inactive' | 'draft' | 'archived';

export const ASSET_STATUS_OPTIONS: Array<{ value: AssetStatus; label: string; color: string }> = [
  { value: 'active', label: '활성', color: 'bg-green-100 text-green-700' },
  { value: 'inactive', label: '비활성', color: 'bg-gray-100 text-gray-600' },
  { value: 'draft', label: '초안', color: 'bg-amber-100 text-amber-700' },
  { value: 'archived', label: '보관됨', color: 'bg-red-100 text-red-700' },
];

export function getAssetStatusInfo(status: AssetStatus) {
  return ASSET_STATUS_OPTIONS.find((opt) => opt.value === status);
}

// ===== Context Asset 인터페이스 =====
export interface ContextAsset {
  id: string;
  type: AssetType;
  title: string;
  summary: string;
  content: string; // 본문 (텍스트 or HTML)
  imageUrl?: string;
  linkUrl?: string;

  // AI 전용 메타데이터
  serviceScope: ServiceScope[];
  pageTypes: PageType[];
  purposeTags: PurposeTag[];
  experimentTags: ExperimentTag[];

  // 상태
  status: AssetStatus;

  // 노출 통계
  exposureCount: number;
  lastExposedAt?: string;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ===== 폼 데이터 인터페이스 =====
export interface ContextAssetFormData {
  type: AssetType;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  linkUrl: string;
  serviceScope: ServiceScope[];
  pageTypes: PageType[];
  purposeTags: PurposeTag[];
  experimentTags: ExperimentTag[];
  status: AssetStatus;
}

export const DEFAULT_FORM_DATA: ContextAssetFormData = {
  type: 'product',
  title: '',
  summary: '',
  content: '',
  imageUrl: '',
  linkUrl: '',
  serviceScope: ['all'],
  pageTypes: ['all'],
  purposeTags: ['information'],
  experimentTags: ['none'],
  status: 'draft',
};

// ===== 필터 인터페이스 =====
export interface ContextAssetFilter {
  type?: AssetType;
  status?: AssetStatus;
  serviceScope?: ServiceScope;
  purposeTag?: PurposeTag;
  search?: string;
}
