export type OrderStatus = 'new' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type ShippingCompany = 'cj' | 'hanjin' | 'lotte' | 'logen' | 'epost';

export interface Order {
  id: string;
  orderNumber: string; // ORD-YYYYMMDD-001 format
  createdAt: string;
  updatedAt: string;
  
  // Product Information
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplierPrice: number;
  margin: number;
  
  // Customer Information
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  
  // Shipping Information
  recipientName: string;
  recipientPhone: string;
  shippingAddress: {
    zipCode: string;
    address: string;
    detailAddress: string;
  };
  shippingMemo?: string;
  
  // Seller Information
  sellerId: string;
  sellerName: string;
  sellerMargin: number;
  
  // Partner Information (if applicable)
  partnerId?: string;
  partnerName?: string;
  partnerCommission?: number;
  
  // Order Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  // Shipping Information
  shippingCompany?: ShippingCompany;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  
  // Additional Information
  specialRequest?: string;
  adminMemo?: string;
}

export interface OrderFormData {
  status: OrderStatus;
  shippingCompany?: ShippingCompany;
  trackingNumber?: string;
  adminMemo?: string;
}

export interface OrderStats {
  totalOrders: number;
  newOrders: number;
  processingOrders: number;
  shippingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalMargin: number;
  averageOrderValue: number;
}

export interface OrderFilters {
  status: OrderStatus[];
  dateRange: {
    start: string;
    end: string;
  };
  search: string;
  sellerId?: string;
  partnerId?: string;
}

// Sample data for development
export const generateOrderNumber = (date: Date = new Date()): string => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `ORD-${dateStr}-${randomNum.toString().padStart(3, '0')}`;
};

export const shippingCompanies = [
  { id: 'cj' as const, name: 'CJ대한통운', trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking' },
  { id: 'hanjin' as const, name: '한진택배', trackingUrl: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do' },
  { id: 'lotte' as const, name: '롯데택배', trackingUrl: 'https://www.lotteglogis.com/home/reservation/tracking/linkView' },
  { id: 'logen' as const, name: '로젠택배', trackingUrl: 'https://www.ilogen.com/web/personal/trace' },
  { id: 'epost' as const, name: '우체국택배', trackingUrl: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm' }
];

export const getStatusText = (status: OrderStatus): string => {
  switch (status) {
    case 'new': return '신규 주문';
    case 'processing': return '배송 준비';
    case 'shipping': return '배송 중';
    case 'delivered': return '배송 완료';
    case 'cancelled': return '주문 취소';
    default: return '알 수 없음';
  }
};

export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'new': return 'blue';
    case 'processing': return 'yellow';
    case 'shipping': return 'purple';
    case 'delivered': return 'green';
    case 'cancelled': return 'red';
    default: return 'gray';
  }
};

// Sample order data for development
export const sampleOrders: Order[] = [
  {
    id: '1',
    orderNumber: generateOrderNumber(new Date('2024-06-29')),
    createdAt: '2024-06-29T10:30:00Z',
    updatedAt: '2024-06-29T10:30:00Z',
    productId: 1,
    productName: '무선 블루투스 이어폰 프리미엄',
    productImage: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=이어폰',
    quantity: 2,
    unitPrice: 89000,
    totalAmount: 178000,
    supplierPrice: 65000,
    margin: 48000,
    customerId: 'CUST001',
    customerName: '김고객',
    customerPhone: '010-1234-5678',
    customerEmail: 'customer@example.com',
    recipientName: '김수령',
    recipientPhone: '010-1234-5678',
    shippingAddress: {
      zipCode: '06292',
      address: '서울특별시 강남구 테헤란로 152',
      detailAddress: '강남파이낸스센터 10층'
    },
    shippingMemo: '문 앞에 놓아주세요',
    sellerId: 'SELL001',
    sellerName: '스마트몰',
    sellerMargin: 24000,
    partnerId: 'PART001',
    partnerName: '마케팅파트너',
    partnerCommission: 4450,
    status: 'new',
    paymentStatus: 'paid',
    specialRequest: '선물포장 요청'
  },
  {
    id: '2',
    orderNumber: generateOrderNumber(new Date('2024-06-29')),
    createdAt: '2024-06-29T14:15:00Z',
    updatedAt: '2024-06-29T16:20:00Z',
    productId: 5,
    productName: '스마트 워치 밴드 실리콘',
    productImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=워치밴드',
    quantity: 1,
    unitPrice: 25000,
    totalAmount: 25000,
    supplierPrice: 18000,
    margin: 7000,
    customerId: 'CUST002',
    customerName: '이고객',
    customerPhone: '010-9876-5432',
    customerEmail: 'lee@example.com',
    recipientName: '이수령',
    recipientPhone: '010-9876-5432',
    shippingAddress: {
      zipCode: '03722',
      address: '서울특별시 서대문구 연세로 50',
      detailAddress: '연세대학교 학생회관 201호'
    },
    sellerId: 'SELL002',
    sellerName: '액세서리마트',
    sellerMargin: 7000,
    status: 'processing',
    paymentStatus: 'paid',
    shippingCompany: 'cj',
    adminMemo: '오후에 픽업 예정'
  },
  {
    id: '3',
    orderNumber: generateOrderNumber(new Date('2024-06-28')),
    createdAt: '2024-06-28T09:45:00Z',
    updatedAt: '2024-06-29T08:30:00Z',
    productId: 3,
    productName: 'USB-C 고속 충전 케이블 3m',
    productImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=케이블',
    quantity: 3,
    unitPrice: 15000,
    totalAmount: 45000,
    supplierPrice: 8000,
    margin: 21000,
    customerId: 'CUST003',
    customerName: '박고객',
    customerPhone: '010-5555-1234',
    customerEmail: 'park@example.com',
    recipientName: '박수령',
    recipientPhone: '010-5555-1234',
    shippingAddress: {
      zipCode: '48058',
      address: '부산광역시 해운대구 센텀중앙로 79',
      detailAddress: '센텀시티 아파트 101동 1205호'
    },
    sellerId: 'SELL001',
    sellerName: '스마트몰',
    sellerMargin: 21000,
    status: 'shipping',
    paymentStatus: 'paid',
    shippingCompany: 'hanjin',
    trackingNumber: '123456789012',
    shippedAt: '2024-06-28T16:00:00Z'
  },
  {
    id: '4',
    orderNumber: generateOrderNumber(new Date('2024-06-27')),
    createdAt: '2024-06-27T13:20:00Z',
    updatedAt: '2024-06-28T10:15:00Z',
    productId: 2,
    productName: '무선 마우스 게이밍용',
    productImage: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=마우스',
    quantity: 1,
    unitPrice: 65000,
    totalAmount: 65000,
    supplierPrice: 45000,
    margin: 20000,
    customerId: 'CUST004',
    customerName: '최고객',
    customerPhone: '010-7777-8888',
    customerEmail: 'choi@example.com',
    recipientName: '최수령',
    recipientPhone: '010-7777-8888',
    shippingAddress: {
      zipCode: '34141',
      address: '대전광역시 유성구 대학로 291',
      detailAddress: 'KAIST 학생생활관 3동 415호'
    },
    sellerId: 'SELL003',
    sellerName: '게이밍스토어',
    sellerMargin: 20000,
    status: 'delivered',
    paymentStatus: 'paid',
    shippingCompany: 'lotte',
    trackingNumber: '987654321098',
    shippedAt: '2024-06-27T18:00:00Z',
    deliveredAt: '2024-06-28T10:15:00Z'
  }
];