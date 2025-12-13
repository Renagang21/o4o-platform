/**
 * PharmacyOps DTOs
 *
 * @package @o4o/pharmacyops
 */

// ===== Dashboard DTOs =====

export interface PharmacyDashboardDto {
  // 약국 정보
  pharmacyId: string;
  pharmacyName: string;
  pharmacyLicenseNumber: string;

  // 주문 통계
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  completedOrders: number;

  // 금액 통계
  totalPurchaseAmount: number;
  pendingPaymentAmount: number;
  thisMonthPurchaseAmount: number;

  // 최근 주문
  recentOrders: PharmacyOrderListItemDto[];

  // 배송 중인 항목
  activeDispatches: PharmacyDispatchListItemDto[];
}

// ===== Product DTOs =====

export interface PharmacyProductDto {
  id: string;
  name: string;

  // 의약품 코드
  drugCode?: string;
  insuranceCode?: string;
  atcCode?: string;
  itemPermitNumber?: string; // 품목허가번호

  // 분류
  category: 'otc' | 'etc' | 'quasi_drug';
  therapeuticCategory?: string;

  // 제조/수입
  manufacturer?: string;
  importer?: string;

  // 상세 정보
  description?: string;
  indications?: string; // 효능/효과
  dosage?: string; // 용법/용량
  warnings?: string; // 주의사항
  storageCondition?: string; // 저장조건

  // 성분
  activeIngredients?: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;

  // 포장
  unit?: string;
  packageSize?: number;

  // 이미지
  images?: string[];

  // 상태
  status: 'active' | 'inactive' | 'discontinued' | 'recalled';
}

export interface PharmacyProductListItemDto {
  id: string;
  name: string;
  drugCode?: string;
  permitNumber?: string; // 품목허가번호
  insuranceCode?: string | null; // 보험코드
  category: 'otc' | 'etc' | 'quasi_drug';
  therapeuticCategory?: string; // 치료 카테고리
  manufacturer?: string;
  activeIngredient?: string; // 주성분
  dosageForm?: string; // 제형
  unit?: string;
  packageSize?: string; // 포장단위
  status: string;
  activeOfferCount: number; // 유효한 Offer 수 (v2 이름 변경)
  lowestOfferPrice?: number; // 최저가 (v2 이름 변경)
  requiresColdChain?: boolean; // 콜드체인 필요
  isNarcotics?: boolean; // 마약류
}

// ===== Offer DTOs =====

export interface PharmacyOfferDto {
  id: string;
  productId: string;
  productName: string;
  productDrugCode?: string;

  // 공급자 정보
  supplierId: string;
  supplierName: string;
  supplierType: 'wholesaler' | 'manufacturer';

  // 가격
  supplierPrice: number;
  insurancePrice?: number;

  // 재고/주문 조건
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;

  // 할인
  bulkDiscountRate?: number;
  bulkDiscountThreshold?: number;

  // 배송
  leadTimeDays: number;
  shippingOptions?: {
    sameDay?: boolean;
    nextDay?: boolean;
    coldChain?: boolean;
  };

  status: 'active' | 'inactive' | 'out_of_stock';
  createdAt: Date;
}

export interface PharmacyOfferListItemDto {
  id: string;
  productId: string;
  productName: string;
  productDrugCode?: string;
  supplierName: string;
  supplierType: 'wholesaler' | 'manufacturer';
  supplierPrice: number;
  stockQuantity: number;
  minOrderQuantity: number;
  leadTimeDays: number;
  hasColdChain: boolean;
  status: string;
}

// ===== Order DTOs =====

export interface PharmacyOrderDto {
  id: string;
  orderNumber: string;

  // Offer 정보
  offerId: string;
  productId: string;
  productName: string;
  productDrugCode?: string;

  // 공급자 정보
  supplierId: string;
  supplierName: string;

  // 수량/금액
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalAmount: number;

  // 상태
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // 배송
  shippingInfo: {
    address: string;
    zipCode: string;
    contactName: string;
    contactPhone: string;
    specialInstructions?: string;
  };
  requestedDeliveryDate?: Date;

  // 추적
  trackingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };

  // 타임스탬프
  createdAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  paidAt?: Date;

  notes?: string;
  cancellationReason?: string;
}

export interface PharmacyOrderListItemDto {
  id: string;
  orderNumber: string;
  productId?: string;
  productName: string;
  productDrugCode?: string;
  supplierName: string;
  quantity: number;
  unitPrice?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  hasTracking: boolean;
  canReorder?: boolean; // Reorder Engine 지원
  canCancel?: boolean;
  requiresColdChain?: boolean;
}

export interface CreatePharmacyOrderDto {
  offerId: string;
  quantity: number;
  requestedDeliveryDate?: Date;
  shippingInfo: {
    address: string;
    zipCode: string;
    contactName: string;
    contactPhone: string;
    specialInstructions?: string;
  };
  notes?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'refunded'
  | 'cancelled';

// ===== Dispatch DTOs =====

export interface PharmacyDispatchDto {
  id: string;
  orderId: string;
  orderNumber: string;
  dispatchNumber: string;

  // 배송 상태
  status: DispatchStatus;

  // 배송사 정보
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;

  // 온도 관리
  temperatureControl: 'none' | 'refrigerated' | 'frozen' | 'controlled';
  requiresColdChain: boolean;
  temperatureRange?: {
    min: number;
    max: number;
  };
  temperatureLogs?: Array<{
    timestamp: Date;
    temperature: number;
    location?: string;
  }>;

  // 마약류 관리
  isNarcotics: boolean;
  narcoticsControlNumber?: string;

  // 운전자 정보
  driverInfo?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };

  // 타임스탬프
  estimatedDeliveryAt?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;

  // 수령 확인
  deliveryConfirmation?: {
    receiverName?: string;
    receiverSignature?: string;
    receivedAt?: Date;
    notes?: string;
  };

  failureReason?: string;
  retryCount: number;
  createdAt: Date;
}

export interface PharmacyDispatchListItemDto {
  id: string;
  orderId: string;
  orderNumber: string;
  dispatchNumber: string;
  productName?: string;
  quantity?: number;
  status: DispatchStatus;
  carrierName?: string;
  trackingNumber?: string;
  temperatureControl: string;
  requiresColdChain: boolean;
  isNarcotics: boolean;
  narcoticsVerificationRequired?: boolean;
  estimatedDeliveryAt?: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  currentLocation?: string;
  currentTemperature?: number;
  receiverName?: string;
  receiverSignature?: boolean;
}

export type DispatchStatus =
  | 'pending'
  | 'preparing'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned';

// ===== Settlement DTOs =====

export interface PharmacySettlementDto {
  id: string;
  batchNumber: string;

  // 대상 (약국 관점에서는 공급자)
  supplierId: string;
  supplierName: string;

  // 기간
  periodStart: Date;
  periodEnd: Date;

  // 금액
  orderCount: number;
  totalOrderAmount: number;
  totalDiscountAmount: number;
  platformFee: number;
  netAmount: number; // 약국이 지불해야 할 금액

  // 상태
  status: SettlementStatus;

  // 결제 정보
  paymentDueDate?: Date;
  paidAt?: Date;
  paymentInfo?: {
    method?: string;
    reference?: string;
  };

  createdAt: Date;
  closedAt?: Date;
}

export interface PharmacySettlementListItemDto {
  id: string;
  settlementNumber: string; // v2: batchNumber → settlementNumber
  supplierName: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  totalAmount: number; // 총 금액
  paidAmount: number; // 결제 완료 금액
  pendingAmount: number; // 미결제 금액
  status: SettlementStatus;
  dueDate: Date; // 결제 기한
  paidAt?: Date; // 결제 일시
  disputeReason?: string; // 분쟁 사유
}

export interface PharmacySettlementSummaryDto {
  pharmacyId: string;

  // 총계
  totalBatches: number;
  totalPaidAmount: number;
  totalPendingAmount: number;

  // 이번 달
  thisMonthPurchaseAmount: number;
  thisMonthOrderCount: number;

  // 미결제
  pendingBatches: number;
  pendingAmount: number;
  nextPaymentDueDate?: Date;
}

export type SettlementStatus =
  | 'open'
  | 'closed'
  | 'pending_payment'
  | 'paid'
  | 'disputed';
