export interface Campaign {
  id: string;
  name: string;
  sellerId: string;
  sellerName: string;
  productId: number;
  productName: string;
  productImage: string;
  commissionRate: number;
  status: 'active' | 'paused' | 'completed' | 'pending';
  startDate: string;
  endDate?: string;
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerStats {
  totalCommission: number; // This month's commission
  activeCampaigns: number;
  totalConversions: number;
  averageConversionRate: number;
  pendingCommission: number;
  paidCommission: number;
  topPerformingCampaign?: Campaign;
}

export interface CommissionTransaction {
  id: string;
  campaignId: string;
  campaignName: string;
  orderId: string;
  customerId: string;
  productName: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt?: string;
}

export interface PartnerPerformanceData {
  date: string;
  clicks: number;
  conversions: number;
  commission: number;
  conversionRate: number;
}

export interface PartnerDashboardData {
  stats: PartnerStats;
  recentCampaigns: Campaign[];
  recentCommissions: CommissionTransaction[];
  performanceChart: PartnerPerformanceData[];
  topProducts: {
    productId: number;
    productName: string;
    productImage: string;
    sellerName: string;
    commissionRate: number;
    totalClicks: number;
    totalConversions: number;
    totalCommission: number;
  }[];
}

// Helper functions
export const getCampaignStatusText = (status: Campaign['status']): string => {
  switch (status) {
    case 'active': return '진행중';
    case 'paused': return '일시정지';
    case 'completed': return '완료';
    case 'pending': return '승인대기';
    default: return '알 수 없음';
  }
};

export const getCampaignStatusColor = (status: Campaign['status']): string => {
  switch (status) {
    case 'active': return 'green';
    case 'paused': return 'yellow';
    case 'completed': return 'blue';
    case 'pending': return 'orange';
    default: return 'gray';
  }
};

export const getCommissionStatusText = (status: CommissionTransaction['status']): string => {
  switch (status) {
    case 'pending': return '승인대기';
    case 'approved': return '승인완료';
    case 'paid': return '지급완료';
    case 'cancelled': return '취소';
    default: return '알 수 없음';
  }
};

export const getCommissionStatusColor = (status: CommissionTransaction['status']): string => {
  switch (status) {
    case 'pending': return 'yellow';
    case 'approved': return 'blue';
    case 'paid': return 'green';
    case 'cancelled': return 'red';
    default: return 'gray';
  }
};

// Sample data generator
export const generatePartnerDashboardData = (): PartnerDashboardData => {
  const campaigns: Campaign[] = [
    {
      id: 'CAM001',
      name: '무선 이어폰 여름 프로모션',
      sellerId: 'SELL001',
      sellerName: '스마트몰',
      productId: 1,
      productName: '무선 블루투스 이어폰 프리미엄',
      productImage: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=이어폰',
      commissionRate: 5.0,
      status: 'active',
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2024-07-31T23:59:59Z',
      totalClicks: 2456,
      totalConversions: 124,
      totalCommission: 551600,
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z'
    },
    {
      id: 'CAM002',
      name: '게이밍 마우스 리뷰 캠페인',
      sellerId: 'SELL003',
      sellerName: '게이밍스토어',
      productId: 2,
      productName: '무선 마우스 게이밍용',
      productImage: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=마우스',
      commissionRate: 6.0,
      status: 'active',
      startDate: '2024-06-15T00:00:00Z',
      totalClicks: 1834,
      totalConversions: 89,
      totalCommission: 368460,
      createdAt: '2024-06-15T00:00:00Z',
      updatedAt: '2024-06-29T09:30:00Z'
    },
    {
      id: 'CAM003',
      name: 'USB-C 케이블 대량 구매 이벤트',
      sellerId: 'SELL001',
      sellerName: '스마트몰',
      productId: 3,
      productName: 'USB-C 고속 충전 케이블 3m',
      productImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=케이블',
      commissionRate: 4.0,
      status: 'completed',
      startDate: '2024-05-01T00:00:00Z',
      endDate: '2024-05-31T23:59:59Z',
      totalClicks: 3421,
      totalConversions: 203,
      totalCommission: 134058,
      createdAt: '2024-05-01T00:00:00Z',
      updatedAt: '2024-05-31T23:59:59Z'
    },
    {
      id: 'CAM004',
      name: '스마트 워치 밴드 신제품 출시',
      sellerId: 'SELL002',
      sellerName: '액세서리마트',
      productId: 5,
      productName: '스마트 워치 밴드 실리콘',
      productImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=워치밴드',
      commissionRate: 7.0,
      status: 'paused',
      startDate: '2024-06-20T00:00:00Z',
      totalClicks: 892,
      totalConversions: 34,
      totalCommission: 64260,
      createdAt: '2024-06-20T00:00:00Z',
      updatedAt: '2024-06-25T14:00:00Z'
    }
  ];

  const commissionTransactions: CommissionTransaction[] = [
    {
      id: 'COM001',
      campaignId: 'CAM001',
      campaignName: '무선 이어폰 여름 프로모션',
      orderId: 'ORD-20240629-001',
      customerId: 'CUST001',
      productName: '무선 블루투스 이어폰 프리미엄',
      orderAmount: 89000,
      commissionRate: 5.0,
      commissionAmount: 4450,
      status: 'approved',
      createdAt: '2024-06-29T10:30:00Z'
    },
    {
      id: 'COM002',
      campaignId: 'CAM002',
      campaignName: '게이밍 마우스 리뷰 캠페인',
      orderId: 'ORD-20240629-002',
      customerId: 'CUST002',
      productName: '무선 마우스 게이밍용',
      orderAmount: 69000,
      commissionRate: 6.0,
      commissionAmount: 4140,
      status: 'paid',
      createdAt: '2024-06-28T14:15:00Z',
      paidAt: '2024-06-29T09:00:00Z'
    },
    {
      id: 'COM003',
      campaignId: 'CAM001',
      campaignName: '무선 이어폰 여름 프로모션',
      orderId: 'ORD-20240628-003',
      customerId: 'CUST003',
      productName: '무선 블루투스 이어폰 프리미엄',
      orderAmount: 178000,
      commissionRate: 5.0,
      commissionAmount: 8900,
      status: 'pending',
      createdAt: '2024-06-28T16:45:00Z'
    }
  ];

  const performanceChart: PartnerPerformanceData[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    
    const baseClicks = 150 + Math.sin(i * 0.3) * 50;
    const randomVariation = (Math.random() - 0.5) * 40;
    const clicks = Math.max(0, Math.round(baseClicks + randomVariation));
    
    const conversionRate = 0.04 + (Math.random() - 0.5) * 0.02; // 2-6%
    const conversions = Math.round(clicks * conversionRate);
    const commission = conversions * 4500; // Average commission per conversion
    
    return {
      date: date.toISOString().split('T')[0],
      clicks,
      conversions,
      commission,
      conversionRate: conversionRate * 100
    };
  });

  const totalCommission = performanceChart.reduce((sum, data) => sum + data.commission, 0);
  const totalConversions = performanceChart.reduce((sum, data) => sum + data.conversions, 0);
  const totalClicks = performanceChart.reduce((sum, data) => sum + data.clicks, 0);
  const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  const pendingCommission = commissionTransactions
    .filter(t => t.status === 'pending' || t.status === 'approved')
    .reduce((sum, t) => sum + t.commissionAmount, 0);

  const paidCommission = commissionTransactions
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => sum + t.commissionAmount, 0);

  return {
    stats: {
      totalCommission,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalConversions,
      averageConversionRate,
      pendingCommission,
      paidCommission,
      topPerformingCampaign: campaigns
        .filter(c => c.status === 'active')
        .sort((a, b) => b.totalCommission - a.totalCommission)[0]
    },
    recentCampaigns: campaigns.slice(0, 5),
    recentCommissions: commissionTransactions.slice(0, 10),
    performanceChart,
    topProducts: [
      {
        productId: 1,
        productName: '무선 블루투스 이어폰 프리미엄',
        productImage: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=이어폰',
        sellerName: '스마트몰',
        commissionRate: 5.0,
        totalClicks: 2456,
        totalConversions: 124,
        totalCommission: 551600
      },
      {
        productId: 2,
        productName: '무선 마우스 게이밍용',
        productImage: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=마우스',
        sellerName: '게이밍스토어',
        commissionRate: 6.0,
        totalClicks: 1834,
        totalConversions: 89,
        totalCommission: 368460
      },
      {
        productId: 3,
        productName: 'USB-C 고속 충전 케이블 3m',
        productImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=케이블',
        sellerName: '스마트몰',
        commissionRate: 4.0,
        totalClicks: 3421,
        totalConversions: 203,
        totalCommission: 134058
      },
      {
        productId: 5,
        productName: '스마트 워치 밴드 실리콘',
        productImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=워치밴드',
        sellerName: '액세서리마트',
        commissionRate: 7.0,
        totalClicks: 892,
        totalConversions: 34,
        totalCommission: 64260
      }
    ]
  };
};