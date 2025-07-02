// Product Management Types

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  brand?: string;
  model?: string;
  image?: string;
  images?: string[];
  currentStock: number;
  minStockAlert: number;
  supplierPrice: number;
  recommendedPrice: number;
  marginRate: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  shippingCost: number;
  shippingDays: number;
  shippingAreas: 'all' | 'selected';
  specialInstructions?: string;
  minOrderQuantity: number;
  stockManagement: 'auto' | 'manual';
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
  description?: string;
}

export interface ProductFilters {
  search: string;
  category: string[];
  status: string[];
  priceRange: {
    min: number;
    max: number;
  };
  stockRange: {
    min: number;
    max: number;
  };
}

export interface ProductFormData {
  // Step 1: Basic Info
  name: string;
  category: string;
  description: string;
  brand: string;
  model: string;
  
  // Step 2: Pricing
  supplierPrice: number;
  recommendedPrice: number;
  minOrderQuantity: number;
  
  // Step 3: Inventory
  currentStock: number;
  minStockAlert: number;
  stockManagement: 'auto' | 'manual';
  
  // Step 4: Images
  mainImage?: File | string;
  additionalImages?: (File | string)[];
  
  // Step 5: Shipping
  shippingCost: number;
  shippingDays: number;
  shippingAreas: 'all' | 'selected';
  specialInstructions: string;
}

export interface ProductListState {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export type ProductAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<ProductFilters> }
  | { type: 'SET_PAGINATION'; payload: Partial<ProductListState['pagination']> }
  | { type: 'SET_SORT'; payload: { sortBy: string; sortOrder: 'asc' | 'desc' } };

// Sample data
export const sampleProducts: Product[] = [
  {
    id: 1,
    name: '스마트폰 케이스',
    description: '투명 실리콘 소재로 제작된 고품질 케이스',
    category: 'electronics',
    brand: 'TechCase',
    model: 'TC-001',
    image: '/images/phone-case.jpg',
    images: ['/images/phone-case.jpg', '/images/phone-case-2.jpg'],
    currentStock: 150,
    minStockAlert: 20,
    supplierPrice: 8000,
    recommendedPrice: 15000,
    marginRate: 46.7,
    status: 'active',
    shippingCost: 0,
    shippingDays: 2,
    shippingAreas: 'all',
    minOrderQuantity: 1,
    stockManagement: 'auto',
    createdAt: '2025-06-25T09:00:00Z'
  },
  {
    id: 2,
    name: '무선 이어폰',
    description: '블루투스 5.0 지원, 노이즈 캔슬링 기능',
    category: 'electronics',
    brand: 'SoundMax',
    model: 'SM-WE100',
    image: '/images/earphones.jpg',
    images: ['/images/earphones.jpg'],
    currentStock: 45,
    minStockAlert: 50,
    supplierPrice: 25000,
    recommendedPrice: 45000,
    marginRate: 44.4,
    status: 'active',
    shippingCost: 0,
    shippingDays: 1,
    shippingAreas: 'all',
    minOrderQuantity: 1,
    stockManagement: 'auto',
    createdAt: '2025-06-20T14:30:00Z'
  },
  {
    id: 3,
    name: '휴대용 배터리',
    description: '10000mAh 대용량 고속충전 지원',
    category: 'electronics',
    brand: 'PowerBank',
    model: 'PB-10000',
    image: '/images/powerbank.jpg',
    images: ['/images/powerbank.jpg'],
    currentStock: 0,
    minStockAlert: 30,
    supplierPrice: 15000,
    recommendedPrice: 25000,
    marginRate: 40.0,
    status: 'out_of_stock',
    shippingCost: 2500,
    shippingDays: 3,
    shippingAreas: 'all',
    minOrderQuantity: 5,
    stockManagement: 'manual',
    createdAt: '2025-06-15T11:15:00Z'
  },
  {
    id: 4,
    name: '블루투스 스피커',
    description: '포터블 방수 스피커, IPX7 등급',
    category: 'electronics',
    brand: 'AudioPro',
    model: 'AP-BT200',
    image: '/images/speaker.jpg',
    images: ['/images/speaker.jpg'],
    currentStock: 85,
    minStockAlert: 25,
    supplierPrice: 35000,
    recommendedPrice: 65000,
    marginRate: 46.2,
    status: 'active',
    shippingCost: 0,
    shippingDays: 2,
    shippingAreas: 'all',
    minOrderQuantity: 1,
    stockManagement: 'auto',
    createdAt: '2025-06-18T16:45:00Z'
  },
  {
    id: 5,
    name: 'USB-C 케이블',
    description: '고속 데이터 전송 및 충전 지원',
    category: 'electronics',
    brand: 'CablePro',
    model: 'CP-UC100',
    image: '/images/usb-cable.jpg',
    images: ['/images/usb-cable.jpg'],
    currentStock: 8,
    minStockAlert: 50,
    supplierPrice: 5000,
    recommendedPrice: 12000,
    marginRate: 58.3,
    status: 'active',
    shippingCost: 0,
    shippingDays: 1,
    shippingAreas: 'all',
    minOrderQuantity: 10,
    stockManagement: 'auto',
    createdAt: '2025-06-22T08:20:00Z'
  }
];

export const productCategories: ProductCategory[] = [
  { id: 'electronics', name: '전자기기', color: 'blue', description: '스마트폰, 컴퓨터, 가전 액세서리' },
  { id: 'clothing', name: '의류', color: 'green', description: '남성, 여성, 아동 의류' },
  { id: 'appliances', name: '가전제품', color: 'purple', description: '대형 가전, 생활 가전' },
  { id: 'sports', name: '스포츠', color: 'red', description: '운동용품, 피트니스 장비' },
  { id: 'beauty', name: '뷰티', color: 'yellow', description: '화장품, 미용 도구' },
  { id: 'others', name: '기타', color: 'gray', description: '기타 상품 카테고리' }
];