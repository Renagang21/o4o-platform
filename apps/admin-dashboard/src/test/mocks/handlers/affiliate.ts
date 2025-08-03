import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock affiliate partners data
let mockPartners = [
  {
    id: '1',
    name: '김인플루언서',
    email: 'influencer1@example.com',
    website: 'https://youtube.com/influencer1',
    type: 'influencer',
    status: 'active',
    joinedAt: '2024-01-15',
    stats: {
      clicks: 15420,
      conversions: 462,
      revenue: 13860000,
      conversionRate: 3.0
    },
    commissionRate: 15,
    paymentMethod: 'bank',
    bankName: '국민은행',
    accountNumber: '123-456-789012',
    accountHolder: '김인플루언서',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: '건강 블로그',
    email: 'healthblog@example.com',
    website: 'https://healthblog.com',
    type: 'blog',
    status: 'active',
    joinedAt: '2024-02-01',
    stats: {
      clicks: 8920,
      conversions: 267,
      revenue: 8010000,
      conversionRate: 2.99
    },
    commissionRate: 12,
    paymentMethod: 'paypal',
    paypalEmail: 'healthblog@paypal.com',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: '뷰티 크리에이터',
    email: 'beauty@example.com',
    website: 'https://instagram.com/beautystar',
    type: 'influencer',
    status: 'pending',
    joinedAt: '2024-03-20',
    stats: {
      clicks: 0,
      conversions: 0,
      revenue: 0,
      conversionRate: 0
    },
    commissionRate: 10,
    paymentMethod: 'bank',
    createdAt: new Date('2024-03-20').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const affiliateHandlers = [
  // Get all partners
  http.get(`${API_BASE}/v1/affiliate/partners`, ({ request }: any) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    
    let filteredPartners = [...mockPartners];
    
    if (search) {
      filteredPartners = filteredPartners.filter((partner: any) =>
        partner.name.toLowerCase().includes(search.toLowerCase()) ||
        partner.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (type && type !== 'all') {
      filteredPartners = filteredPartners.filter((partner: any) => partner.type === type);
    }
    
    if (status && status !== 'all') {
      filteredPartners = filteredPartners.filter((partner: any) => partner.status === status);
    }
    
    return HttpResponse.json({
      success: true,
      data: filteredPartners,
      total: filteredPartners.length
    });
  }),

  // Get single partner
  http.get(`${API_BASE}/v1/affiliate/partners/:id`, ({ params }: any) => {
    const partner = mockPartners.find((p: any) => p.id === params.id);
    
    if (!partner) {
      return HttpResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      data: partner
    });
  }),

  // Create partner
  http.post(`${API_BASE}/v1/affiliate/partners`, async ({ request }: any) => {
    const data = await request.json();
    
    const newPartner = {
      id: String(mockPartners.length + 1),
      ...data,
      status: 'pending',
      joinedAt: new Date().toISOString().split('T')[0],
      stats: {
        clicks: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockPartners.push(newPartner);
    
    return HttpResponse.json({
      success: true,
      data: newPartner
    }, { status: 201 });
  }),

  // Update partner
  http.put(`${API_BASE}/v1/affiliate/partners/:id`, async ({ params, request }: any) => {
    const { id } = params as any;
    const data = await request.json();
    
    const index = mockPartners.findIndex(p => p.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    mockPartners[index] = {
      ...mockPartners[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return HttpResponse.json({
      success: true,
      data: mockPartners[index]
    });
  }),

  // Delete partner
  http.delete(`${API_BASE}/v1/affiliate/partners/:id`, ({ params }: any) => {
    const { id } = params as any;
    const index = mockPartners.findIndex(p => p.id === id);
    
    if (index === -1) {
      return HttpResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    mockPartners.splice(index, 1);
    
    return HttpResponse.json({
      success: true,
      message: '제휴사가 삭제되었습니다'
    });
  }),

  // Approve partner
  http.post(`${API_BASE}/v1/affiliate/partners/:id/approve`, ({ params }: any) => {
    const { id } = params as any;
    const partner = mockPartners.find((p: any) => p.id === id);
    
    if (!partner) {
      return HttpResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    partner.status = 'active';
    partner.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      data: partner
    });
  }),

  // Suspend partner
  http.post(`${API_BASE}/v1/affiliate/partners/:id/suspend`, ({ params }: any) => {
    const { id } = params as any;
    const partner = mockPartners.find((p: any) => p.id === id);
    
    if (!partner) {
      return HttpResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    partner.status = 'inactive';
    partner.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      data: partner
    });
  }),

  // Get partner statistics
  http.get(`${API_BASE}/v1/affiliate/statistics`, () => {
    const totalStats = mockPartners.reduce((acc: any, partner: any) => ({
      clicks: acc.clicks + partner.stats.clicks,
      conversions: acc.conversions + partner.stats.conversions,
      revenue: acc.revenue + partner.stats.revenue,
      partners: acc.partners + 1,
      activePartners: acc.activePartners + (partner.status === 'active' ? 1 : 0)
    }), { clicks: 0, conversions: 0, revenue: 0, partners: 0, activePartners: 0 });

    return HttpResponse.json({
      success: true,
      data: {
        ...totalStats,
        averageConversionRate: totalStats.clicks > 0 
          ? (totalStats.conversions / totalStats.clicks * 100).toFixed(2) 
          : 0
      }
    });
  })
];