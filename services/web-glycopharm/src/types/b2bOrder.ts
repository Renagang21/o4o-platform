/**
 * B2B Order Types
 *
 * 프랜차이즈 전용 주문 + 일반 B2B 주문 통합 구조
 * - 단일 화면, 탭 분리
 * - 장바구니는 공유 (출처 표시)
 */

import type { Product, OrderStatus } from './index';

/**
 * B2B 주문 소스 (출처)
 */
export type B2BOrderSource = 'franchise' | 'general';

/**
 * B2B 상품 (기본 Product 확장)
 */
export interface B2BProduct extends Product {
  // 프랜차이즈 전용 필드
  isFranchiseOnly: boolean;
  franchisePrice?: number;           // 프랜차이즈 특별가
  minOrderQty?: number;              // 최소 주문 수량
  maxOrderQty?: number;              // 최대 주문 수량
  isRecommended?: boolean;           // 본부 추천 상품
  isMandatory?: boolean;             // 필수 주문 상품
  bundleCondition?: string;          // 묶음 조건 설명
  // Trial 연계
  linkedTrialId?: string;
  // 프로모션
  promotionBadge?: string;
}

/**
 * 장바구니 아이템
 */
export interface CartItem {
  id: string;
  product: B2BProduct;
  quantity: number;
  source: B2BOrderSource;            // 담은 출처 (탭)
  unitPrice: number;                 // 적용 단가
  totalPrice: number;                // 소계
  // 정책 경고
  warnings?: CartItemWarning[];
}

/**
 * 장바구니 아이템 경고
 */
export interface CartItemWarning {
  type: 'min_qty' | 'max_qty' | 'conflict' | 'stock' | 'shipping';
  message: string;
}

/**
 * 장바구니 상태
 */
export interface CartState {
  items: CartItem[];
  franchiseItemCount: number;
  generalItemCount: number;
  franchiseTotal: number;
  generalTotal: number;
  grandTotal: number;
  // 정책 경고 (전체)
  orderWarnings: OrderWarning[];
}

/**
 * 주문 정책 경고
 */
export interface OrderWarning {
  type: 'min_order' | 'shipping_split' | 'conflict' | 'franchise_rule';
  message: string;
  canProceed: boolean;               // 진행 가능 여부
}

/**
 * B2B 주문
 */
export interface B2BOrder {
  id: string;
  orderNumber: string;
  pharmacyId: string;
  pharmacyName: string;
  items: B2BOrderItem[];
  // 금액
  franchiseSubtotal: number;
  generalSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  // 상태
  status: OrderStatus;
  // 메타
  createdAt: string;
  updatedAt: string;
}

/**
 * B2B 주문 아이템
 */
export interface B2BOrderItem {
  id: string;
  productId: string;
  productName: string;
  source: B2BOrderSource;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // 공급자
  supplierId: string;
  supplierName: string;
}

/**
 * 공급자 필터
 */
export interface SupplierFilter {
  id: string;
  name: string;
  productCount: number;
}

/**
 * 카테고리 필터
 */
export interface CategoryFilter {
  id: string;
  name: string;
  productCount: number;
}
