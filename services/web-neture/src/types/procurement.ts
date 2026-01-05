/**
 * B2B Procurement Types
 * 자격/접근/상태 모델 정의
 */

// 구매자 자격 상태
export type BuyerStatus = 'unverified' | 'pending' | 'verified' | 'suspended';

// 구매자 유형
export type BuyerType = 'general' | 'pharmacy' | 'medical';

// 공급 신청 상태
export type SupplyRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

// 상품 카테고리
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredBuyerTypes: BuyerType[];
}

// B2B 유통 설정
export interface B2BDistributionSettings {
  enabled: boolean;
  b2bPrice?: number;
  b2bMinOrderQty?: number;
}

// 상품
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  supplierId: string;
  supplierName: string;
  requiredBuyerTypes: BuyerType[];
  taxType: 'taxable' | 'exempt' | 'zero';
  minOrderQty: number;
  unit: string;
  contentIds: string[];
  // 유통 채널 설정
  serviceDistribution: boolean; // 서비스 유통 (기존)
  b2bDistribution?: B2BDistributionSettings; // B2B 조달 유통
  // 콘텐츠 이벤트 연결
  hasActiveContentEvent?: boolean;
}

// 공급자
export interface Supplier {
  id: string;
  name: string;
  description: string;
  categories: string[];
}

// 구매자 정보 (공급자에게 공개되는 제한된 정보)
export interface BuyerInfo {
  businessName: string;
  buyerType: BuyerType;
  address: string;
  taxInvoiceEligible: boolean;
}

// 공급 신청
export interface SupplyRequest {
  id: string;
  productId: string;
  buyerId: string;
  status: SupplyRequestStatus;
  requestedAt: string;
  processedAt?: string;
}

// 구매자 자격 정보
export interface BuyerQualification {
  status: BuyerStatus;
  buyerType: BuyerType;
  businessNumber?: string;
  businessName?: string;
  address?: string;
  taxInvoiceEmail?: string;
}

// 상태별 표시 텍스트
export const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  unverified: '미인증',
  pending: '심사 중',
  verified: '인증 완료',
  suspended: '정지됨',
};

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  general: '일반 사업자',
  pharmacy: '약국',
  medical: '의료기관',
};

export const SUPPLY_REQUEST_STATUS_LABELS: Record<SupplyRequestStatus, string> = {
  none: '미신청',
  pending: '검토 중',
  approved: '승인됨',
  rejected: '거부됨',
};
