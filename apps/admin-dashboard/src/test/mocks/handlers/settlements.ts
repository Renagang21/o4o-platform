import { http, HttpResponse } from 'msw';
import type { SettlementData } from '@o4o/types';
import type { SettlementProcessData, FeePolicyData, FeeCalculationData } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Extended type for mock data
interface MockVendorSettlement extends Partial<SettlementData> {
  vendorName: string;
  vendorEmail: string;
  settlementPeriod: {
    startDate: string;
    endDate: string;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  receiptUrl?: string;
  memo?: string;
  [key: string]: any;
}

// Mock settlement overview data
const mockSettlementOverview = {
  todayRevenue: 2450000,
  todayPlatformFee: 122500,
  todayTossFee: 73500,
  todayNetRevenue: 2254000,
  pendingSettlements: 1850000,
  completedSettlements: 12,
  monthlyRevenue: 45600000,
  monthlyGrowth: 12.5,
  totalVendors: 28,
  activeVendors: 18
};

// Mock vendor settlements
let mockVendorSettlements: MockVendorSettlement[] = [
  {
    id: 'settlement-1',
    vendorId: 'vendor-1',
    vendorName: '건강식품몰',
    vendorEmail: 'health@store.com',
    settlementPeriod: {
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z'
    },
    orderCount: 45,
    totalSales: 2340000,
    platformFee: 117000,
    tossFee: 70200,
    taxAmount: 234000,
    netAmount: 1918800,
    status: 'pending',
    requestedAt: '2025-01-24T09:00:00Z',
    bankAccount: {
      bankName: '국민은행',
      accountNumber: '123456-78-901234',
      accountHolder: '건강식품몰 대표'
    }
  },
  {
    id: 'settlement-2',
    vendorId: 'vendor-2',
    vendorName: '프리미엄 뷰티',
    vendorEmail: 'beauty@premium.com',
    settlementPeriod: {
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z'
    },
    orderCount: 32,
    totalSales: 1890000,
    platformFee: 94500,
    tossFee: 56700,
    taxAmount: 189000,
    netAmount: 1549800,
    status: 'completed',
    requestedAt: '2025-01-23T14:30:00Z',
    approvedAt: '2025-01-23T16:00:00Z',
    completedAt: '2025-01-24T10:30:00Z',
    receiptUrl: 'https://example.com/receipt/settlement-2',
    memo: '정상 정산 완료'
  },
  {
    id: 'settlement-3',
    vendorId: 'vendor-3',
    vendorName: '테크 가젯',
    vendorEmail: 'tech@gadget.com',
    settlementPeriod: {
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-31T23:59:59Z'
    },
    orderCount: 67,
    totalSales: 4560000,
    platformFee: 228000,
    tossFee: 136800,
    taxAmount: 456000,
    netAmount: 3739200,
    status: 'processing' as const,
    requestedAt: '2025-01-24T11:00:00Z',
    approvedAt: '2025-01-24T12:00:00Z'
  }
];

// Mock revenue chart data
const mockRevenueData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  totalRevenue: Math.floor(Math.random() * 500000) + 200000,
  platformFee: Math.floor(Math.random() * 25000) + 10000,
  tossFee: Math.floor(Math.random() * 15000) + 6000,
  netRevenue: Math.floor(Math.random() * 460000) + 184000,
  orderCount: Math.floor(Math.random() * 50) + 10
}));

// Mock fee breakdown
const mockFeeBreakdown = [
  { name: '플랫폼 수수료', value: 2450000, color: '#3b82f6' },
  { name: '토스 수수료', value: 1470000, color: '#10b981' },
  { name: '기타 수수료', value: 490000, color: '#f59e0b' }
];

// Mock fee policies
let mockFeePolicies = [
  {
    id: 'policy-1',
    name: '기본 플랫폼 수수료',
    type: 'platform',
    baseRate: 5.0,
    minFee: 0,
    maxFee: 0,
    isActive: true,
    conditions: [],
    description: '모든 거래에 적용되는 기본 플랫폼 수수료',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z'
  },
  {
    id: 'policy-2',
    name: '전자제품 카테고리 수수료',
    type: 'category',
    baseRate: 3.5,
    minFee: 1000,
    maxFee: 50000,
    isActive: true,
    conditions: [
      { key: 'categoryId', operator: 'equals', value: 'electronics', label: '전자제품 카테고리' }
    ],
    description: '전자제품 카테고리 전용 수수료 정책',
    createdAt: '2024-12-15T00:00:00Z',
    updatedAt: '2025-01-18T14:30:00Z'
  },
  {
    id: 'policy-3',
    name: 'VIP 판매자 우대 수수료',
    type: 'vendor_tier',
    baseRate: 4.0,
    minFee: 0,
    maxFee: 0,
    isActive: true,
    conditions: [
      { key: 'vendorTier', operator: 'equals', value: 'vip', label: 'VIP 등급 판매자' }
    ],
    description: 'VIP 등급 판매자를 위한 우대 수수료 정책',
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-22T09:15:00Z'
  }
];

// Mock settlement reports data
const mockSettlementReport = {
  period: {
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-01-31T23:59:59Z'
  },
  summary: {
    totalRevenue: 12450000,
    totalPlatformFee: 622500,
    totalTossFee: 373500,
    totalVendorPayouts: 11454000,
    totalTaxAmount: 1245000,
    transactionCount: 234,
    vendorCount: 28,
    averageOrderValue: 53205
  },
  trends: mockRevenueData,
  vendorBreakdown: [
    {
      vendorName: '건강식품몰',
      vendorId: 'vendor-1',
      totalSales: 2340000,
      platformFee: 117000,
      tossFee: 70200,
      netPayout: 2152800,
      transactionCount: 45,
      avgOrderValue: 52000
    },
    {
      vendorName: '프리미엄 뷰티',
      vendorId: 'vendor-2',
      totalSales: 1890000,
      platformFee: 94500,
      tossFee: 56700,
      netPayout: 1738800,
      transactionCount: 32,
      avgOrderValue: 59063
    },
    {
      vendorName: '테크 가젯',
      vendorId: 'vendor-3',
      totalSales: 4560000,
      platformFee: 228000,
      tossFee: 136800,
      netPayout: 4195200,
      transactionCount: 67,
      avgOrderValue: 68060
    }
  ],
  categoryBreakdown: [
    { categoryName: '건강식품', totalSales: 3450000, platformFee: 172500, percentage: 27.7, color: '#3b82f6' },
    { categoryName: '뷰티', totalSales: 2890000, platformFee: 144500, percentage: 23.2, color: '#10b981' },
    { categoryName: '전자제품', totalSales: 2560000, platformFee: 128000, percentage: 20.6, color: '#f59e0b' },
    { categoryName: '패션', totalSales: 1890000, platformFee: 94500, percentage: 15.2, color: '#8b5cf6' },
    { categoryName: '기타', totalSales: 1660000, platformFee: 83000, percentage: 13.3, color: '#ef4444' }
  ],
  paymentMethodBreakdown: [
    { method: 'card', methodName: '신용카드', totalSales: 7890000, transactionCount: 156, percentage: 63.4, color: '#3b82f6' },
    { method: 'transfer', methodName: '계좌이체', totalSales: 3240000, transactionCount: 54, percentage: 26.0, color: '#10b981' },
    { method: 'virtual_account', methodName: '가상계좌', totalSales: 980000, transactionCount: 18, percentage: 7.9, color: '#f59e0b' },
    { method: 'mobile', methodName: '휴대폰 결제', totalSales: 340000, transactionCount: 6, percentage: 2.7, color: '#8b5cf6' }
  ]
};

export const settlementsHandlers = [
  // Get settlement overview
  http.get(`${API_BASE}/v1/settlements/overview`, () => {
    return HttpResponse.json({
      success: true,
      data: mockSettlementOverview
    });
  }),

  // Get vendor settlements
  http.get(`${API_BASE}/v1/settlements/vendors`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    
    let filteredSettlements = [...mockVendorSettlements];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSettlements = filteredSettlements.filter((settlement: any) =>
        settlement.vendorName.toLowerCase().includes(searchLower) ||
        settlement.vendorEmail.toLowerCase().includes(searchLower)
      );
    }
    
    if (status && status !== 'all') {
      filteredSettlements = filteredSettlements.filter((settlement: any) => settlement.status === status);
    }
    
    return HttpResponse.json({
      success: true,
      data: filteredSettlements
    });
  }),

  // Bulk approve settlements
  http.post(`${API_BASE}/v1/settlements/vendors/approve-bulk`, async ({ request }) => {
    const data = await request.json();
    const { settlementIds, memo } = data as SettlementProcessData;
    
    // Update mock data
    settlementIds.forEach((id: string) => {
      const index = mockVendorSettlements.findIndex(s => s.id === id);
      if (index !== -1) {
        mockVendorSettlements[index] = {
          ...mockVendorSettlements[index],
          status: 'processing' as const,
          approvedAt: new Date().toISOString(),
          memo
        };
      }
    });
    
    return HttpResponse.json({
      success: true,
      message: `${settlementIds.length}건의 정산이 승인되었습니다`
    });
  }),

  // Individual settlement actions
  http.post(`${API_BASE}/v1/settlements/vendors/:id/:action`, async ({ params, request }) => {
    const { id, action } = params as { id: string; action: string };
    const data = await request.json() as { memo?: string };
    
    const index = mockVendorSettlements.findIndex(s => s.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Settlement not found' },
        { status: 404 }
      );
    }
    
    const now = new Date().toISOString();
    
    switch (action) {
      case 'approve':
        mockVendorSettlements[index] = {
          ...mockVendorSettlements[index],
          status: 'processing' as const,
          approvedAt: now,
          memo: data.memo
        };
        break;
      case 'reject':
        mockVendorSettlements[index] = {
          ...mockVendorSettlements[index],
          status: 'hold' as const,
          memo: data.memo
        };
        break;
      case 'complete':
        mockVendorSettlements[index] = {
          ...mockVendorSettlements[index],
          status: 'completed',
          completedAt: now,
          receiptUrl: `https://example.com/receipt/${id}`,
          memo: data.memo
        };
        break;
    }
    
    return HttpResponse.json({
      success: true,
      data: mockVendorSettlements[index],
      message: `정산이 ${action}되었습니다`
    });
  }),

  // Export settlements
  http.post(`${API_BASE}/v1/settlements/vendors/export`, async () => {
    // Simulate Excel file creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock blob data
    const mockExcelData = new Uint8Array([1, 2, 3, 4, 5]); // Mock Excel data
    return new HttpResponse(mockExcelData, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="settlements.xlsx"'
      }
    });
  }),

  // Get revenue charts
  http.get(`${API_BASE}/v1/settlements/charts`, ({ request }) => {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '7days';
    
    // Adjust data based on range
    let chartData = mockRevenueData;
    switch (range) {
      case '7days':
        chartData = mockRevenueData.slice(-7);
        break;
      case '30days':
        chartData = mockRevenueData.slice(-30);
        break;
      case '90days':
        chartData = mockRevenueData.slice(-90);
        break;
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        revenue: chartData,
        feeBreakdown: mockFeeBreakdown
      }
    });
  }),

  // Fee policies endpoints
  http.get(`${API_BASE}/v1/settlements/fee-policies`, () => {
    return HttpResponse.json({
      success: true,
      data: mockFeePolicies
    });
  }),

  http.post(`${API_BASE}/v1/settlements/fee-policies`, async ({ request }) => {
    const data = await request.json() as FeePolicyData;
    
    const newPolicy = {
      id: `policy-${Date.now()}`,
      name: data.name,
      type: data.type,
      baseRate: data.baseRate,
      minFee: data.minFee || 0,
      maxFee: data.maxFee || 0,
      isActive: data.isActive ?? true,
      conditions: data.conditions || [],
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockFeePolicies.push(newPolicy);
    
    return HttpResponse.json({
      success: true,
      data: newPolicy
    });
  }),

  http.put(`${API_BASE}/v1/settlements/fee-policies/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const data = await request.json() as Partial<FeePolicyData>;
    
    const index = mockFeePolicies.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    
    mockFeePolicies[index] = {
      ...mockFeePolicies[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockFeePolicies[index]
    });
  }),

  http.delete(`${API_BASE}/v1/settlements/fee-policies/:id`, ({ params }) => {
    const { id } = params as { id: string };
    
    const index = mockFeePolicies.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    
    mockFeePolicies.splice(index, 1);
    
    return HttpResponse.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  }),

  http.patch(`${API_BASE}/v1/settlements/fee-policies/:id/toggle`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const data = await request.json();
    const { isActive } = data as { isActive: boolean };
    
    const index = mockFeePolicies.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    
    mockFeePolicies[index] = {
      ...mockFeePolicies[index],
      isActive,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockFeePolicies[index]
    });
  }),

  // Fee calculation
  http.post(`${API_BASE}/v1/settlements/calculate-fee`, async ({ request }) => {
    const data = await request.json();
    const { orderAmount, categoryId, vendorTier, paymentMethod } = data as FeeCalculationData;
    
    // Simulate fee calculation
    const platformFeeRate = vendorTier === 'vip' ? 4.0 : categoryId === 'electronics' ? 3.5 : 5.0;
    const tossFeeRate = paymentMethod === 'card' ? 3.0 : 2.8;
    
    const platformFee = Math.floor(orderAmount * platformFeeRate / 100);
    const tossFee = Math.floor(orderAmount * tossFeeRate / 100);
    const vendorAmount = orderAmount - platformFee - tossFee;
    
    const breakdown = [
      {
        type: 'platform',
        name: '플랫폼 수수료',
        rate: platformFeeRate,
        amount: platformFee,
        description: '기본 플랫폼 운영 수수료'
      },
      {
        type: 'payment',
        name: '토스 수수료',
        rate: tossFeeRate,
        amount: tossFee,
        description: '결제 처리 수수료'
      }
    ];
    
    return HttpResponse.json({
      success: true,
      data: {
        orderAmount,
        platformFee,
        tossFee,
        vendorAmount,
        breakdown
      }
    });
  }),

  // Settlement reports
  http.get(`${API_BASE}/v1/settlements/reports`, ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    url.searchParams.get('type');
    
    // Customize report based on parameters
    let reportData = { ...mockSettlementReport };
    
    if (startDate && endDate) {
      reportData.period = {
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`
      };
    }
    
    return HttpResponse.json({
      success: true,
      data: reportData
    });
  }),

  // Export settlement report
  http.get(`${API_BASE}/v1/settlements/reports/export`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'excel';
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockFileData = new Uint8Array([1, 2, 3, 4, 5]);
    
    return new HttpResponse(mockFileData, {
      headers: {
        'Content-Type': format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
        'Content-Disposition': `attachment; filename="settlement_report.${format === 'excel' ? 'xlsx' : 'pdf'}"`
      }
    });
  })
];