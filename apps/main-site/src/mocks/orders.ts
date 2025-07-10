import { Order, OrderItem, CartItem } from '../types/order';
import { mockSuppliers } from './users';

// 주문 Mock 데이터
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'O20240601001',
    buyerId: '3', // XYZ마트 (VIP)
    buyerType: 'retailer',
    buyerName: '이영희',
    buyerGrade: 'vip',
    items: [
      {
        id: '1',
        productId: '1',
        productName: '삼성 갤럭시 노트북 15인치',
        productImage: '/images/products/laptop-1-main.jpg',
        productBrand: '삼성',
        quantity: 2,
        unitPrice: 1100000, // VIP 가격
        totalPrice: 2200000,
        supplierId: '2',
        supplierName: 'ABC전자',
      },
      {
        id: '2',
        productId: '2',
        productName: 'iPhone 15 Pro 128GB',
        productImage: '/images/products/iphone-15-pro-main.jpg',
        productBrand: '애플',
        quantity: 1,
        unitPrice: 1250000, // VIP 가격
        totalPrice: 1250000,
        supplierId: '2',
        supplierName: 'ABC전자',
      },
    ],
    subtotalAmount: 3450000,
    discountAmount: 150000,  // VIP 추가 할인
    shippingAmount: 0,       // 무료배송
    taxAmount: 330000,       // 10% 부가세
    totalAmount: 3630000,
    status: 'shipped',
    paymentStatus: 'completed',
    paymentMethod: 'card',
    shippingAddress: {
      recipientName: '이영희',
      phone: '010-3456-7890',
      zipCode: '48058',
      address: '부산시 해운대구 센텀대로 456',
      detailAddress: 'XYZ마트',
      deliveryRequest: '매장 입구에 배치해주세요',
    },
    trackingNumber: '123456789012',
    orderDate: '2024-06-01T10:30:00Z',
    paymentDate: '2024-06-01T10:35:00Z',
    shippingDate: '2024-06-02T14:00:00Z',
    notes: '대량 주문이므로 품질 검수 후 배송 부탁드립니다.',
  },
  {
    id: '2',
    orderNumber: 'O20240602001',
    buyerId: '7', // 동네편의점 (Gold)
    buyerType: 'retailer',
    buyerName: '정민수',
    buyerGrade: 'gold',
    items: [
      {
        id: '3',
        productId: '3',
        productName: '블루투스 무선 이어폰',
        productImage: '/images/products/earbuds-main.jpg',
        productBrand: '소니',
        quantity: 10,
        unitPrice: 180000, // Gold 가격
        totalPrice: 1800000,
        supplierId: '5',
        supplierName: 'DEF생활용품',
      },
      {
        id: '4',
        productId: '4',
        productName: '스테인리스 스틸 텀블러',
        productImage: '/images/products/tumbler-main.jpg',
        productBrand: '써모스',
        quantity: 20,
        unitPrice: 45000, // Gold 가격
        totalPrice: 900000,
        supplierId: '5',
        supplierName: 'DEF생활용품',
      },
    ],
    subtotalAmount: 2700000,
    discountAmount: 0,
    shippingAmount: 30000,   // 배송비
    taxAmount: 273000,       // 10% 부가세
    totalAmount: 3003000,
    status: 'processing',
    paymentStatus: 'completed',
    paymentMethod: 'transfer',
    shippingAddress: {
      recipientName: '정민수',
      phone: '010-7890-1234',
      zipCode: '03925',
      address: '서울시 마포구 서교동 123-45',
      detailAddress: '동네편의점',
      deliveryRequest: '평일 오전 배송 희망',
    },
    orderDate: '2024-06-02T15:20:00Z',
    paymentDate: '2024-06-02T15:25:00Z',
  },
  {
    id: '3',
    orderNumber: 'O20240603001',
    buyerId: '8', // 프리미엄스토어 (Premium)
    buyerType: 'retailer',
    buyerName: '김프리미엄',
    buyerGrade: 'premium',
    items: [
      {
        id: '5',
        productId: '1',
        productName: '삼성 갤럭시 노트북 15인치',
        productImage: '/images/products/laptop-1-main.jpg',
        productBrand: '삼성',
        quantity: 1,
        unitPrice: 1150000, // Premium 가격
        totalPrice: 1150000,
        supplierId: '2',
        supplierName: 'ABC전자',
      },
    ],
    subtotalAmount: 1150000,
    discountAmount: 50000,   // Premium 추가 할인
    shippingAmount: 0,       // 무료배송
    taxAmount: 110000,       // 10% 부가세
    totalAmount: 1210000,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'virtual_account',
    shippingAddress: {
      recipientName: '김프리미엄',
      phone: '010-8901-2345',
      zipCode: '06296',
      address: '서울시 강남구 압구정로 678',
      detailAddress: '프리미엄스토어',
    },
    orderDate: '2024-06-03T09:15:00Z',
  },
  {
    id: '4',
    orderNumber: 'O20240520001',
    buyerId: '3', // XYZ마트 (VIP) - 과거 주문
    buyerType: 'retailer',
    buyerName: '이영희',
    buyerGrade: 'vip',
    items: [
      {
        id: '6',
        productId: '4',
        productName: '스테인리스 스틸 텀블러',
        productImage: '/images/products/tumbler-main.jpg',
        productBrand: '써모스',
        quantity: 50,
        unitPrice: 39000, // VIP 가격
        totalPrice: 1950000,
        supplierId: '5',
        supplierName: 'DEF생활용품',
      },
    ],
    subtotalAmount: 1950000,
    discountAmount: 100000,  // VIP 추가 할인
    shippingAmount: 0,       // 무료배송
    taxAmount: 185000,       // 10% 부가세
    totalAmount: 2035000,
    status: 'delivered',
    paymentStatus: 'completed',
    paymentMethod: 'card',
    shippingAddress: {
      recipientName: '이영희',
      phone: '010-3456-7890',
      zipCode: '48058',
      address: '부산시 해운대구 센텀대로 456',
      detailAddress: 'XYZ마트',
    },
    trackingNumber: '987654321098',
    orderDate: '2024-05-20T14:00:00Z',
    paymentDate: '2024-05-20T14:05:00Z',
    shippingDate: '2024-05-21T10:00:00Z',
    deliveryDate: '2024-05-23T16:30:00Z',
  },
];

// 장바구니 Mock 데이터 (사용자별)
export const mockCartItems: { [userId: string]: CartItem[] } = {
  '3': [ // XYZ마트 (VIP)
    {
      id: 'cart1',
      productId: '3',
      productName: '블루투스 무선 이어폰',
      productImage: '/images/products/earbuds-main.jpg',
      productBrand: '소니',
      unitPrice: 160000, // VIP 가격
      quantity: 5,
      supplierId: '5',
      supplierName: 'DEF생활용품',
      maxOrderQuantity: 20,
      stockQuantity: 100,
      addedAt: '2024-06-04T10:00:00Z',
    },
  ],
  '7': [ // 동네편의점 (Gold)
    {
      id: 'cart2',
      productId: '2',
      productName: 'iPhone 15 Pro 128GB',
      productImage: '/images/products/iphone-15-pro-main.jpg',
      productBrand: '애플',
      unitPrice: 1350000, // Gold 가격
      quantity: 1,
      supplierId: '2',
      supplierName: 'ABC전자',
      maxOrderQuantity: 5,
      stockQuantity: 30,
      addedAt: '2024-06-04T11:30:00Z',
    },
    {
      id: 'cart3',
      productId: '4',
      productName: '스테인리스 스틸 텀블러',
      productImage: '/images/products/tumbler-main.jpg',
      productBrand: '써모스',
      unitPrice: 45000, // Gold 가격
      quantity: 15,
      supplierId: '5',
      supplierName: 'DEF생활용품',
      maxOrderQuantity: 50,
      stockQuantity: 200,
      addedAt: '2024-06-04T12:00:00Z',
    },
  ],
};

// 사용자별 주문 필터링
export const getOrdersByBuyer = (buyerId: string): Order[] => {
  return mockOrders.filter(order => order.buyerId === buyerId);
};

// 공급자별 주문 필터링
export const getOrdersBySupplier = (supplierId: string): Order[] => {
  return mockOrders.filter(order => 
    order.items.some(item => item.supplierId === supplierId)
  );
};

// 주문 상태별 필터링
export const getOrdersByStatus = (status: string): Order[] => {
  return mockOrders.filter(order => order.status === status);
};

// 사용자별 장바구니 가져오기
export const getCartByUser = (userId: string): CartItem[] => {
  return mockCartItems[userId] || [];
};

// 주문 번호 생성 함수
export const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `O${year}${month}${day}${random}`;
};