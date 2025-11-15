/**
 * Partner Link API Service
 * Phase 3-4: Partner link management API client
 * Phase 6-2: Mock/Real API integration
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import {
  GetPartnerLinksQuery,
  GetPartnerLinksResponse,
  GetPartnerLinkDetailResponse,
  PartnerLinkCreateRequest,
  CreatePartnerLinkResponse,
  PartnerLinkUpdateRequest,
  UpdatePartnerLinkResponse,
  DeletePartnerLinkResponse,
  PartnerLinkDetail,
  PartnerLinkListItem,
  PartnerLinkStatus,
  AnalyticsPeriod,
  PartnerAnalyticsSummary,
  PartnerAnalyticsTimeseries,
  PartnerAnalyticsTimeseriesPoint,
  PartnerLinkSummary,
  GetPartnerAnalyticsSummaryResponse,
  GetPartnerAnalyticsTimeseriesResponse,
  GetPartnerLinkSummariesResponse,
} from '../types/partner-link';

// Mock data for development
const MOCK_PARTNER_LINKS: PartnerLinkDetail[] = [
  {
    id: '1',
    partner_id: 'partner-1',
    name: '신규회원 10% 할인 프로모션',
    description: '신규 회원을 위한 특별 할인 링크',
    base_url: 'https://neture.co.kr/promotion/new-member',
    final_url: 'https://neture.co.kr/promotion/new-member?ref=partner_1&utm_source=partner&utm_medium=link&utm_campaign=new_member_10',
    utm_source: 'partner',
    utm_medium: 'link',
    utm_campaign: 'new_member_10',
    status: 'active',
    clicks: 245,
    conversions: 12,
    created_at: '2025-11-10T10:00:00Z',
    updated_at: '2025-11-10T10:00:00Z',
  },
  {
    id: '2',
    partner_id: 'partner-1',
    name: '프리미엄 유기농 상품 추천',
    description: '인기 유기농 제품 특별 링크',
    base_url: 'https://neture.co.kr/category/organic',
    final_url: 'https://neture.co.kr/category/organic?ref=partner_1&utm_source=partner&utm_medium=link&utm_campaign=organic_premium',
    utm_source: 'partner',
    utm_medium: 'link',
    utm_campaign: 'organic_premium',
    status: 'active',
    clicks: 532,
    conversions: 34,
    created_at: '2025-11-11T11:00:00Z',
    updated_at: '2025-11-11T11:00:00Z',
  },
  {
    id: '3',
    partner_id: 'partner-1',
    name: '계절 한정 과일 페어',
    description: '제주 감귤 시즌 프로모션',
    base_url: 'https://neture.co.kr/seasonal/citrus',
    final_url: 'https://neture.co.kr/seasonal/citrus?ref=partner_1&utm_source=partner&utm_medium=link&utm_campaign=seasonal_citrus',
    utm_source: 'partner',
    utm_medium: 'link',
    utm_campaign: 'seasonal_citrus',
    status: 'inactive',
    clicks: 128,
    conversions: 8,
    created_at: '2025-11-12T09:00:00Z',
    updated_at: '2025-11-12T09:00:00Z',
  },
  {
    id: '4',
    partner_id: 'partner-1',
    name: '블랙프라이데이 메인 페이지',
    description: '연말 대규모 할인 행사',
    base_url: 'https://neture.co.kr/event/black-friday',
    final_url: 'https://neture.co.kr/event/black-friday?ref=partner_1&utm_source=partner&utm_medium=link&utm_campaign=blackfriday_2025',
    utm_source: 'partner',
    utm_medium: 'link',
    utm_campaign: 'blackfriday_2025',
    status: 'active',
    clicks: 892,
    conversions: 67,
    created_at: '2025-11-13T08:00:00Z',
    updated_at: '2025-11-13T08:00:00Z',
  },
  {
    id: '5',
    partner_id: 'partner-1',
    name: '친환경 생활용품 기획전',
    description: '에코프렌들리 제품 모음',
    base_url: 'https://neture.co.kr/category/eco-friendly',
    final_url: 'https://neture.co.kr/category/eco-friendly?ref=partner_1&utm_source=partner&utm_medium=link&utm_campaign=eco_lifestyle',
    utm_source: 'partner',
    utm_medium: 'link',
    utm_campaign: 'eco_lifestyle',
    status: 'active',
    clicks: 367,
    conversions: 21,
    created_at: '2025-11-14T07:00:00Z',
    updated_at: '2025-11-14T07:00:00Z',
  },
];

// Phase 6-2: Use centralized mock flags
const USE_MOCK_LINKS = MOCK_FLAGS.PARTNER_LINKS;
const USE_MOCK_ANALYTICS = MOCK_FLAGS.PARTNER_ANALYTICS;

/**
 * Mock API delay
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate final URL with UTM parameters
 */
export const generateFinalUrl = (
  baseUrl: string,
  partnerId: string,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', `partner_${partnerId}`);

  if (utmSource) url.searchParams.set('utm_source', utmSource);
  if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
  if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);

  return url.toString();
};

/**
 * Filter and sort mock links
 */
const filterAndSortMockLinks = (
  links: PartnerLinkDetail[],
  query: GetPartnerLinksQuery
): PartnerLinkDetail[] => {
  let result = [...links];

  // Search filter
  if (query.search) {
    const search = query.search.toLowerCase();
    result = result.filter(
      (link) =>
        link.name.toLowerCase().includes(search) ||
        link.final_url.toLowerCase().includes(search) ||
        (link.description && link.description.toLowerCase().includes(search))
    );
  }

  // Status filter
  if (query.status && query.status !== 'all') {
    result = result.filter((link) => link.status === query.status);
  }

  // Sort
  const sortBy = query.sort_by || 'created_at';
  const sortOrder = query.sort_order || 'desc';

  result.sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'clicks':
        aVal = a.clicks;
        bVal = b.clicks;
        break;
      case 'created_at':
      default:
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
};

/**
 * Paginate links
 */
const paginateLinks = (
  links: PartnerLinkDetail[],
  page: number,
  limit: number
) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedLinks = links.slice(start, end);
  const total = links.length;
  const totalPages = Math.ceil(total / limit);

  return {
    links: paginatedLinks,
    total,
    totalPages,
  };
};

/**
 * Convert detail to list item
 */
const toListItem = (link: PartnerLinkDetail): PartnerLinkListItem => {
  return {
    id: link.id,
    name: link.name,
    final_url: link.final_url,
    clicks: link.clicks,
    conversions: link.conversions,
    status: link.status,
    created_at: link.created_at,
  };
};

/**
 * Partner Link API client
 */
export const partnerLinkAPI = {
  /**
   * Fetch partner links with filters, sorting, and pagination
   */
  async fetchLinks(
    query: GetPartnerLinksQuery = {}
  ): Promise<GetPartnerLinksResponse> {
    if (USE_MOCK_LINKS) {
      await mockDelay();

      const page = query.page || 1;
      const limit = query.limit || 20;

      // Filter and sort
      const filtered = filterAndSortMockLinks(MOCK_PARTNER_LINKS, query);

      // Paginate
      const { links, total, totalPages } = paginateLinks(filtered, page, limit);

      return {
        success: true,
        data: {
          links: links.map(toListItem),
          pagination: {
            total,
            page,
            limit,
            total_pages: totalPages,
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.PARTNER_LINKS.LIST, {
      params: query,
    });
    return response.data;
  },

  /**
   * Fetch partner link detail by ID
   */
  async fetchLinkDetail(id: string): Promise<GetPartnerLinkDetailResponse> {
    if (USE_MOCK_LINKS) {
      await mockDelay();

      const link = MOCK_PARTNER_LINKS.find((l) => l.id === id);
      if (!link) {
        throw new Error('링크를 찾을 수 없습니다');
      }

      return {
        success: true,
        data: link,
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.PARTNER_LINKS.DETAIL(id));
    return response.data;
  },

  /**
   * Create new partner link
   */
  async createLink(
    payload: PartnerLinkCreateRequest
  ): Promise<CreatePartnerLinkResponse> {
    if (USE_MOCK_LINKS) {
      await mockDelay();

      // Generate final URL with UTM parameters
      const partnerId = '1'; // Mock partner ID
      const finalUrl = generateFinalUrl(
        payload.base_url,
        partnerId,
        payload.utm_source || 'partner',
        payload.utm_medium || 'link',
        payload.utm_campaign || 'default'
      );

      const newLink: PartnerLinkDetail = {
        id: `link-${Date.now()}`,
        partner_id: partnerId,
        name: payload.name,
        description: payload.description,
        base_url: payload.base_url,
        final_url: finalUrl,
        utm_source: payload.utm_source || 'partner',
        utm_medium: payload.utm_medium || 'link',
        utm_campaign: payload.utm_campaign || 'default',
        status: payload.status || 'active',
        clicks: 0,
        conversions: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_PARTNER_LINKS.unshift(newLink);

      return {
        success: true,
        data: newLink,
        message: '링크가 생성되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.post(API_ENDPOINTS.PARTNER_LINKS.CREATE, payload);
    return response.data;
  },

  /**
   * Update partner link
   */
  async updateLink(
    id: string,
    payload: PartnerLinkUpdateRequest
  ): Promise<UpdatePartnerLinkResponse> {
    if (USE_MOCK_LINKS) {
      await mockDelay();

      const linkIndex = MOCK_PARTNER_LINKS.findIndex((l) => l.id === id);
      if (linkIndex === -1) {
        throw new Error('링크를 찾을 수 없습니다');
      }

      const link = MOCK_PARTNER_LINKS[linkIndex];

      // Update fields
      if (payload.name !== undefined) link.name = payload.name;
      if (payload.description !== undefined) link.description = payload.description;
      if (payload.base_url !== undefined) link.base_url = payload.base_url;
      if (payload.utm_source !== undefined) link.utm_source = payload.utm_source;
      if (payload.utm_medium !== undefined) link.utm_medium = payload.utm_medium;
      if (payload.utm_campaign !== undefined) link.utm_campaign = payload.utm_campaign;
      if (payload.status !== undefined) link.status = payload.status;

      // Regenerate final URL if base_url or UTM params changed
      if (
        payload.base_url !== undefined ||
        payload.utm_source !== undefined ||
        payload.utm_medium !== undefined ||
        payload.utm_campaign !== undefined
      ) {
        link.final_url = generateFinalUrl(
          link.base_url,
          link.partner_id.split('-')[1],
          link.utm_source,
          link.utm_medium,
          link.utm_campaign
        );
      }

      link.updated_at = new Date().toISOString();

      return {
        success: true,
        data: link,
        message: '링크가 수정되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(API_ENDPOINTS.PARTNER_LINKS.UPDATE(id), payload);
    return response.data;
  },

  /**
   * Delete partner link
   */
  async deleteLink(id: string): Promise<DeletePartnerLinkResponse> {
    if (USE_MOCK_LINKS) {
      await mockDelay();

      const linkIndex = MOCK_PARTNER_LINKS.findIndex((l) => l.id === id);
      if (linkIndex === -1) {
        throw new Error('링크를 찾을 수 없습니다');
      }

      MOCK_PARTNER_LINKS.splice(linkIndex, 1);

      return {
        success: true,
        message: '링크가 삭제되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.delete(API_ENDPOINTS.PARTNER_LINKS.DELETE(id));
    return response.data;
  },

  /**
   * Fetch partner analytics summary
   * 파트너 전체 성과 요약
   */
  async fetchAnalyticsSummary(
    period: AnalyticsPeriod = '30d'
  ): Promise<GetPartnerAnalyticsSummaryResponse> {
    if (USE_MOCK_ANALYTICS) {
      await mockDelay();

      // Calculate summary from mock links
      const totalClicks = MOCK_PARTNER_LINKS.reduce((sum, link) => sum + link.clicks, 0);
      const totalConversions = MOCK_PARTNER_LINKS.reduce(
        (sum, link) => sum + link.conversions,
        0
      );

      // Mock revenue and commission calculation
      const avgOrderValue = 45000; // 평균 주문 금액
      const commissionRate = 0.05; // 5% 커미션
      const totalRevenue = totalConversions * avgOrderValue;
      const totalCommission = totalRevenue * commissionRate;

      const averageCtr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const averageCvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      const summary: PartnerAnalyticsSummary = {
        period,
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        total_revenue: Math.round(totalRevenue),
        total_commission: Math.round(totalCommission),
        average_ctr: parseFloat(averageCtr.toFixed(2)),
        average_cvr: parseFloat(averageCvr.toFixed(2)),
      };

      return {
        success: true,
        data: summary,
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.PARTNER_ANALYTICS.SUMMARY, {
      params: { period },
    });
    return response.data;
  },

  /**
   * Fetch partner analytics timeseries
   * 파트너 전체 트렌드 (시간별)
   */
  async fetchAnalyticsTimeseries(
    period: AnalyticsPeriod = '30d'
  ): Promise<GetPartnerAnalyticsTimeseriesResponse> {
    if (USE_MOCK_ANALYTICS) {
      await mockDelay();

      // Generate mock timeseries data
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const points: PartnerAnalyticsTimeseriesPoint[] = [];

      const avgOrderValue = 45000;
      const commissionRate = 0.05;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Random variations
        const clicks = Math.floor(Math.random() * 100) + 20;
        const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.02));
        const revenue = conversions * avgOrderValue;
        const commission = revenue * commissionRate;

        points.push({
          date: dateStr,
          clicks,
          conversions,
          revenue: Math.round(revenue),
          commission: Math.round(commission),
        });
      }

      return {
        success: true,
        data: {
          period,
          points,
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.PARTNER_ANALYTICS.TIMESERIES, {
      params: { period },
    });
    return response.data;
  },

  /**
   * Fetch partner link summaries
   * 링크별 성과 요약
   */
  async fetchLinkSummaries(
    period: AnalyticsPeriod = '30d'
  ): Promise<GetPartnerLinkSummariesResponse> {
    if (USE_MOCK_ANALYTICS) {
      await mockDelay();

      const avgOrderValue = 45000;
      const commissionRate = 0.05;

      const summaries: PartnerLinkSummary[] = MOCK_PARTNER_LINKS.map((link) => {
        const revenue = link.conversions * avgOrderValue;
        const commission = revenue * commissionRate;
        const ctr = link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;
        const cvr = link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;

        return {
          link_id: link.id,
          name: link.name,
          total_clicks: link.clicks,
          total_conversions: link.conversions,
          total_revenue: Math.round(revenue),
          total_commission: Math.round(commission),
          ctr: parseFloat(ctr.toFixed(2)),
          cvr: parseFloat(cvr.toFixed(2)),
        };
      }).sort((a, b) => b.total_commission - a.total_commission); // Sort by commission desc

      return {
        success: true,
        data: summaries,
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.PARTNER_ANALYTICS.LINKS, {
      params: { period },
    });
    return response.data;
  },
};
