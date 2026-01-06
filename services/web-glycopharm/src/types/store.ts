/**
 * Store Types for GlycoPharm B2C Store
 * 회원 약국 몰 관련 타입 정의
 */

// ============================================================================
// Service Context
// ============================================================================
// 하나의 스토어 엔진에서 여러 서비스를 병렬 운영하기 위한 컨텍스트
// Store는 약국 단위로 1개, Service Context는 상품/카테고리에만 부여

/**
 * 서비스 컨텍스트 타입
 * - glycopharm: 글리코팜 (기본값)
 * - yaksa: 약사회 서비스
 */
export type ServiceContext = 'glycopharm' | 'yaksa';

/** 기본 서비스 컨텍스트 */
export const DEFAULT_SERVICE_CONTEXT: ServiceContext = 'glycopharm';

// ============================================================================
// Store Template (구조)
// ============================================================================
// Template은 구조만 담당 - 섹션 블록 조합
// Theme와 절대 섞지 않음

/**
 * 스토어 템플릿 타입
 * - franchise-standard: 프랜차이즈 표준 레이아웃
 */
export type StoreTemplate = 'franchise-standard';

/** 기본 스토어 템플릿 */
export const DEFAULT_STORE_TEMPLATE: StoreTemplate = 'franchise-standard';

/**
 * 템플릿 섹션 타입
 * Franchise Standard 기준 고정 순서:
 * 1. Hero Section
 * 2. Featured Products
 * 3. Category Grid
 * 4. Event / Notice Slot
 * 5. Legal / Footer
 */
export type TemplateSectionType =
  | 'hero'
  | 'featured-products'
  | 'category-grid'
  | 'event-notice'
  | 'legal-footer';

/**
 * 콘텐츠 소유권 타입
 * - operator: 운영자(본부) 관리
 * - pharmacy: 약국 관리
 */
export type ContentOwner = 'operator' | 'pharmacy';

/**
 * 섹션 관리 권한 타입
 * - operator: 운영자만 수정 가능
 * - pharmacy: 약국이 수정 가능
 * - readonly: 수정 불가 (시스템 고정)
 */
export type SectionManagedBy = 'operator' | 'pharmacy' | 'readonly';

/**
 * 템플릿 섹션 설정
 * 섹션 단위 ON/OFF 허용
 * 섹션 순서 변경 불가
 */
export interface TemplateSectionConfig {
  /** 섹션 타입 */
  type: TemplateSectionType;
  /** 섹션 활성화 여부 */
  enabled: boolean;
  /** 섹션 관리 주체 */
  managedBy: SectionManagedBy;
  /** 섹션 설명 (PharmacySettings에서 표시) */
  description: string;
  /** 섹션별 추가 설정 (옵션) */
  options?: Record<string, unknown>;
}

/**
 * 스토어 템플릿 설정
 */
export interface StoreTemplateConfig {
  template: StoreTemplate;
  sections: TemplateSectionConfig[];
}

/** Franchise Standard 기본 섹션 설정 */
export const DEFAULT_FRANCHISE_STANDARD_SECTIONS: TemplateSectionConfig[] = [
  {
    type: 'hero',
    enabled: true,
    managedBy: 'pharmacy',
    description: '스토어 메인 배너 영역. 약국 브랜딩 및 주요 메시지를 표시합니다.',
  },
  {
    type: 'featured-products',
    enabled: true,
    managedBy: 'operator',
    description: '추천 상품 영역. 운영자 지정 상품이 우선 표시됩니다.',
  },
  {
    type: 'category-grid',
    enabled: true,
    managedBy: 'pharmacy',
    description: '카테고리 그리드. 상품 카테고리 바로가기를 제공합니다.',
  },
  {
    type: 'event-notice',
    enabled: true,
    managedBy: 'operator',
    description: '이벤트/공지 영역. 운영자 공지가 항상 우선 표시됩니다.',
  },
  {
    type: 'legal-footer',
    enabled: true,
    managedBy: 'readonly',
    description: '법정 고지 영역. 사업자 정보, 배송/환불 정책 등 필수 정보를 표시합니다.',
  },
];

// ============================================================================
// Hero Content
// ============================================================================
// Hero 콘텐츠 우선순위: 운영자 > 약국 > 기본

/**
 * Hero 콘텐츠 출처
 * - operator: 운영자(본부) 등록
 * - pharmacy: 약국 등록
 * - default: 시스템 기본
 */
export type HeroContentSource = 'operator' | 'pharmacy' | 'default';

/**
 * Hero 콘텐츠
 */
export interface HeroContent {
  id: string;
  /** 콘텐츠 출처 */
  source: HeroContentSource;
  /** 제목 */
  title: string;
  /** 부제목/설명 */
  subtitle?: string;
  /** 배경 이미지 URL */
  imageUrl?: string;
  /** CTA 버튼 텍스트 */
  ctaText?: string;
  /** CTA 버튼 링크 */
  ctaLink?: string;
  /** 활성화 여부 */
  isActive: boolean;
  /** 우선순위 (낮을수록 먼저 표시) */
  priority: number;
  /** 시작일 */
  startDate?: string;
  /** 종료일 */
  endDate?: string;
}

// ============================================================================
// Event / Notice
// ============================================================================
// Event/Notice 콘텐츠 우선순위: 운영자 콘텐츠 항상 우선

/**
 * Event/Notice 콘텐츠 타입
 */
export type EventNoticeType = 'event' | 'notice';

/**
 * Event/Notice 콘텐츠
 */
export interface EventNoticeContent {
  id: string;
  /** 콘텐츠 타입 */
  type: EventNoticeType;
  /** 콘텐츠 소유자 (operator 항상 우선) */
  owner: ContentOwner;
  /** 제목 */
  title: string;
  /** 내용 요약 */
  summary?: string;
  /** 상세 링크 */
  link?: string;
  /** 이미지 URL */
  imageUrl?: string;
  /** 활성화 여부 */
  isActive: boolean;
  /** 고정 여부 (운영자 콘텐츠는 항상 고정) */
  isPinned: boolean;
  /** 시작일 */
  startDate?: string;
  /** 종료일 */
  endDate?: string;
  /** 생성일 */
  createdAt: string;
}

// ============================================================================
// Store Theme (스타일)
// ============================================================================
// Theme는 인상만 담당 - CSS Variable 기반
// Template과 절대 섞지 않음

/**
 * 스토어 테마 타입
 * - neutral: GlycoPharm 기본 (중립적, 상업적, 범용)
 * - clean: 약사회 서비스 계열 (신뢰/공공/정보 중심)
 * - modern: 디지털 친화 (키오스크/태블릿 최적화)
 * - professional: 전문적/의료 이미지 (운영자 권장)
 */
export type StoreTheme = 'neutral' | 'clean' | 'modern' | 'professional';

/** 기본 스토어 테마 */
export const DEFAULT_STORE_THEME: StoreTheme = 'professional';

/** 키오스크/태블릿 자동 적용 테마 */
export const DEVICE_OPTIMIZED_THEME: StoreTheme = 'modern';

/**
 * 서비스별 기본 테마 매핑
 * 운영자가 지정하지 않은 경우 서비스 컨텍스트에 따라 기본 테마 결정
 */
export const SERVICE_DEFAULT_THEMES: Record<ServiceContext, StoreTheme> = {
  glycopharm: 'professional', // GlycoPharm: 전문적 의료 이미지
  yaksa: 'clean',             // 약사회: 공공/신뢰 중심
};

/**
 * 서비스별 기본 테마 조회
 * @param serviceContext 서비스 컨텍스트
 * @returns 해당 서비스의 기본 테마
 */
export function getServiceDefaultTheme(serviceContext: ServiceContext): StoreTheme {
  return SERVICE_DEFAULT_THEMES[serviceContext] ?? DEFAULT_STORE_THEME;
}

/**
 * 테마 메타 정보
 */
export interface ThemeMeta {
  id: StoreTheme;
  name: string;
  description: string;
  /** 키오스크/태블릿 자동 적용 대상 여부 */
  isDeviceOptimized: boolean;
  /** 운영자 권장 여부 */
  isRecommended: boolean;
  /** 미리보기 색상 스와치 (Primary, Accent, Background, Text) */
  previewColors: [string, string, string, string];
}

/** 테마 메타 정보 목록 */
export const THEME_METAS: ThemeMeta[] = [
  {
    id: 'professional',
    name: '전문적',
    description: '신뢰 / 전문 / 의료 이미지. GlycoPharm 기본 브랜드 톤.',
    isDeviceOptimized: false,
    isRecommended: true,
    // Primary(Navy), Accent(Gray), Background(Off-white), Text(Slate)
    previewColors: ['#1e40af', '#64748b', '#fafafa', '#1e293b'],
  },
  {
    id: 'modern',
    name: '모던',
    description: '디지털 친화적. 키오스크/태블릿 가독성 최적화.',
    isDeviceOptimized: true,
    isRecommended: false,
    // Primary(Indigo), Accent(Cyan), Background(Slate-50), Text(Slate-900)
    previewColors: ['#4f46e5', '#06b6d4', '#f8fafc', '#0f172a'],
  },
  {
    id: 'neutral',
    name: '중립',
    description: '범용적인 상업 스타일. 기존 기본 테마.',
    isDeviceOptimized: false,
    isRecommended: false,
    // Primary(Blue), Accent(Amber), Background(Slate-50), Text(Slate-800)
    previewColors: ['#3b82f6', '#f59e0b', '#f8fafc', '#1e293b'],
  },
  {
    id: 'clean',
    name: '클린',
    description: '신뢰/공공/정보 중심. 약사회 서비스 계열.',
    isDeviceOptimized: false,
    isRecommended: false,
    // Primary(Teal), Accent(Cyan), Background(Teal-50), Text(Teal-900)
    previewColors: ['#0d9488', '#0891b2', '#f0fdfa', '#134e4a'],
  },
];

/**
 * 테마 색상 설정
 */
export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * 테마 폰트 설정
 */
export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

/**
 * 테마 설정
 */
export interface StoreThemeConfig {
  theme: StoreTheme;
  colors: ThemeColors;
  fonts: ThemeFonts;
  /** 버튼 스타일 */
  buttonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** 카드 스타일 */
  cardRadius: 'none' | 'sm' | 'md' | 'lg';
  /** 그림자 강도 */
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'strong';
}

// ============================================================================
// Store Status & Info
// ============================================================================

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

// ============================================================================
// Category & Product
// ============================================================================

// 상품 카테고리
// 카테고리는 반드시 Service Context 하위에 속한다
// 서로 다른 서비스 간 카테고리 공유 불가
export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  productCount: number;
  order: number;
  /** 서비스 컨텍스트 (기본값: glycopharm) */
  serviceContext: ServiceContext;
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
  /** 서비스 컨텍스트 (기본값: glycopharm) */
  serviceContext: ServiceContext;
  /** Market Trial 상품 여부 (serviceContext=glycopharm + isMarketTrial=true로 구분) */
  isMarketTrial?: boolean;
  /**
   * 운영자 지정 추천 상품 여부
   * Featured Products 노출 우선순위: 운영자 지정 > Market Trial > 자동 추천
   */
  isFeaturedByOperator?: boolean;
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
