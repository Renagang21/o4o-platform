import { Product } from './product';

export interface SellerProduct extends Product {
  // Seller-specific fields
  sellerPrice: number; // Price set by seller
  isActive: boolean; // Whether seller is actively selling this product
  partnerCommissionRate: number; // Commission rate for partners
  salesCount: number; // Number of sales for this seller
  dateAdded: string; // When seller added this product to their catalog
}

export interface SellerStats {
  totalProducts: number; // Products in seller's catalog
  monthlyRevenue: number; // Seller's revenue this month
  activePartners: number; // Number of active partners promoting seller's products
  averageMargin: number; // Average margin percentage
  totalOrders: number; // Total orders for seller's products
  conversionRate: number; // Order conversion rate
}

export interface PartnerPerformance {
  partnerId: string;
  partnerName: string;
  totalSales: number;
  totalCommission: number;
  conversionRate: number;
  activeProducts: number;
  lastActivity: string;
}

export interface SellerDashboardData {
  stats: SellerStats;
  topProducts: {
    productId: number;
    productName: string;
    salesCount: number;
    revenue: number;
    margin: number;
  }[];
  partnerPerformance: PartnerPerformance[];
  revenueChart: {
    date: string;
    revenue: number;
    orders: number;
  }[];
}

// Sample data for seller products
export const generateSellerProducts = (): SellerProduct[] => {
  return [
    {
      id: 1,
      name: '무선 블루투스 이어폰 프리미엄',
      description: '고품질 사운드와 액티브 노이즈 캔슬링 기능을 제공하는 프리미엄 이어폰',
      price: 89000,
      originalPrice: 129000,
      imageUrl: '/images/products/earphones-premium.jpg',
      category: '전자제품',
      stock: 45,
      rating: 4.8,
      reviewCount: 324,
      tags: ['블루투스', '노이즈캔슬링', '프리미엄'],
      sellerPrice: 89000,
      isActive: true,
      partnerCommissionRate: 15,
      salesCount: 89,
      dateAdded: '2024-01-15'
    },
    {
      id: 2,
      name: '스마트 워치 밴드 실리콘',
      description: '편안한 착용감과 다양한 색상으로 제공되는 고급 실리콘 밴드',
      price: 25000,
      originalPrice: 35000,
      imageUrl: '/images/products/watch-band-silicone.jpg',
      category: '액세서리',
      stock: 156,
      rating: 4.6,
      reviewCount: 198,
      tags: ['스마트워치', '실리콘', '다양한색상'],
      sellerPrice: 25000,
      isActive: true,
      partnerCommissionRate: 20,
      salesCount: 67,
      dateAdded: '2024-02-01'
    },
    {
      id: 3,
      name: 'USB-C 고속 충전 케이블 3m',
      description: '고속 충전과 데이터 전송을 지원하는 내구성 있는 3미터 케이블',
      price: 15000,
      originalPrice: 22000,
      imageUrl: '/images/products/usbc-cable-3m.jpg',
      category: '전자제품',
      stock: 234,
      rating: 4.7,
      reviewCount: 456,
      tags: ['USB-C', '고속충전', '3미터'],
      sellerPrice: 15000,
      isActive: true,
      partnerCommissionRate: 25,
      salesCount: 124,
      dateAdded: '2024-01-20'
    }
  ];
};

// Sample data for seller dashboard
export const generateSellerDashboardData = (): SellerDashboardData => {
  return {
    stats: {
      totalProducts: 45,
      monthlyRevenue: 12500000,
      activePartners: 8,
      averageMargin: 32.5,
      totalOrders: 287,
      conversionRate: 4.2
    },
    topProducts: [
      {
        productId: 1,
        productName: '무선 블루투스 이어폰 프리미엄',
        salesCount: 89,
        revenue: 7921000,
        margin: 2670000
      },
      {
        productId: 5,
        productName: '스마트 워치 밴드 실리콘',
        salesCount: 67,
        revenue: 1675000,
        margin: 469000
      },
      {
        productId: 3,
        productName: 'USB-C 고속 충전 케이블 3m',
        salesCount: 124,
        revenue: 1860000,
        margin: 868000
      },
      {
        productId: 2,
        productName: '무선 마우스 게이밍용',
        salesCount: 43,
        revenue: 2795000,
        margin: 860000
      },
      {
        productId: 8,
        productName: '노트북 스탠드 알루미늄',
        salesCount: 31,
        revenue: 1550000,
        margin: 465000
      }
    ],
    partnerPerformance: [
      {
        partnerId: 'PART001',
        partnerName: '마케팅파트너',
        totalSales: 156,
        totalCommission: 780000,
        conversionRate: 5.8,
        activeProducts: 12,
        lastActivity: '2024-06-29T10:30:00Z'
      },
      {
        partnerId: 'PART002',
        partnerName: '블로그파트너',
        totalSales: 89,
        totalCommission: 445000,
        conversionRate: 3.2,
        activeProducts: 8,
        lastActivity: '2024-06-29T09:15:00Z'
      },
      {
        partnerId: 'PART003',
        partnerName: 'SNS파트너',
        totalSales: 134,
        totalCommission: 670000,
        conversionRate: 4.7,
        activeProducts: 15,
        lastActivity: '2024-06-29T08:45:00Z'
      },
      {
        partnerId: 'PART004',
        partnerName: '유튜브파트너',
        totalSales: 67,
        totalCommission: 335000,
        conversionRate: 6.1,
        activeProducts: 6,
        lastActivity: '2024-06-28T16:20:00Z'
      },
      {
        partnerId: 'PART005',
        partnerName: '인플루언서파트너',
        totalSales: 98,
        totalCommission: 490000,
        conversionRate: 7.3,
        activeProducts: 9,
        lastActivity: '2024-06-29T07:30:00Z'
      }
    ],
    revenueChart: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const baseRevenue = 350000 + Math.sin(i * 0.3) * 150000;
      const randomVariation = (Math.random() - 0.5) * 100000;
      const revenue = Math.max(0, baseRevenue + randomVariation);
      
      return {
        date: date.toISOString().split('T')[0],
        revenue: Math.round(revenue),
        orders: Math.round(revenue / 43000) // Average order value ~43k
      };
    })
  };
};