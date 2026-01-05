/**
 * Store Types for GlycoPharm B2C Store
 * 회원 약국 몰 관련 타입 정의
 */

// 약국 몰 상태
export type PharmacyStoreStatus =
  | 'pending'      // 신청 대기
  | 'reviewing'    // 심사 중
  | 'approved'     // 승인됨 (몰 운영 가능)
  | 'rejected'     // 반려됨
  | 'suspended';   // 정지됨

// 약국 몰 정보
export interface PharmacyStore {
  id: string;
  slug: string;                    // URL slug (고정, 변경 불가)
  name: string;                    // 약국명
  businessName: string;            // 상호명
  businessNumber: string;          // 사업자등록번호
  onlineSalesNumber?: string;      // 통신판매업 신고번호
  status: PharmacyStoreStatus;
  address: string;
  phone: string;
  email?: string;
  representativeName: string;      // 대표자명
  pharmacistName: string;          // 관리약사
  pharmacistLicense: string;       // 약사면허번호
  franchiseId?: string;            // 프랜차이즈 소속 ID
  franchiseName?: string;          // 프랜차이즈명
  description?: string;            // 약국 소개
  logoUrl?: string;
  bannerUrl?: string;
  operatingHours: OperatingHours;
  shippingInfo: ShippingInfo;
  returnPolicy: string;
  privacyPolicy: string;
  termsOfService: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 영업시간 정보
export interface OperatingHours {
  weekday: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
  holiday?: { open: string; close: string } | 'closed';
  note?: string;
}

// 배송 정보
export interface ShippingInfo {
  freeShippingThreshold: number;   // 무료배송 기준금액
  baseShippingFee: number;         // 기본 배송비
  additionalFee?: {                // 도서산간 추가 배송비
    island: number;
    mountain: number;
  };
  deliveryNote: string;            // 배송 안내 문구
}

// 상품 카테고리
export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  productCount: number;
  order: number;
}

// 스토어 상품 (약국이 선택한 공급자 상품)
export interface StoreProduct {
  id: string;
  productId: string;               // 원본 공급자 상품 ID
  name: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  salePrice?: number;
  supplierId: string;
  supplierName: string;
  images: string[];
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  isDropshipping: boolean;         // 무재고 판매 여부
  stock?: number;                  // 재고 (무재고 판매 시 null)
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

// 장바구니 아이템
export interface CartItem {
  id: string;
  productId: string;
  product: StoreProduct;
  quantity: number;
  addedAt: string;
}

// 주문 상태
export type StoreOrderStatus =
  | 'pending'        // 결제 대기
  | 'paid'           // 결제 완료
  | 'received'       // 약국 접수 (약국이 주문을 확인하고 운영 책임 인지)
  | 'preparing'      // 상품 준비중 (공급자 처리 중)
  | 'shipped'        // 배송중
  | 'delivered'      // 배송 완료
  | 'cancelled'      // 주문 취소
  | 'refunding'      // 환불 진행중
  | 'refunded';      // 환불 완료

// 주문 채널
export type OrderChannel = 'web' | 'kiosk' | 'tablet';

// 주문 정보
export interface StoreOrder {
  id: string;
  orderNumber: string;
  pharmacyStoreId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: StoreOrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: StoreOrderStatus;
  orderChannel: OrderChannel;       // 주문 채널 (web/kiosk/tablet)
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  receivedAt?: string;              // 약국 접수 시각
  shippedAt?: string;
  deliveredAt?: string;
}

// 주문 상품
export interface StoreOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;
  supplierName: string;
}

// 배송지 정보
export interface ShippingAddress {
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

// 판매 참여 신청서
export interface StoreApplicationForm {
  // 사업자 정보
  businessName: string;
  businessNumber: string;
  representativeName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;

  // 통신판매업 정보
  onlineSalesNumber: string;
  onlineSalesRegisteredAt: string;

  // 약국 정보
  pharmacyName: string;
  pharmacistName: string;
  pharmacistLicense: string;
  pharmacyPhone: string;
  pharmacyAddress: string;

  // 정산 정보
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;

  // 동의 항목
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedMarketing?: boolean;

  note?: string;
}

// 신청 상태
export type StoreApplicationStatus =
  | 'draft'          // 작성 중
  | 'submitted'      // 제출 완료
  | 'reviewing'      // 심사 중
  | 'supplementing'  // 보완 요청
  | 'approved'       // 승인
  | 'rejected';      // 반려

// 판매 참여 신청
export interface StoreApplication {
  id: string;
  userId: string;
  pharmacyId?: string;
  form: StoreApplicationForm;
  status: StoreApplicationStatus;
  reviewCheckpoints?: ReviewCheckpoint[];
  rejectionReason?: string;
  supplementRequest?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 심사 체크포인트
export interface ReviewCheckpoint {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
}

// API 응답 타입
export interface StoreApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface StorePaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
