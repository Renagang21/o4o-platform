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