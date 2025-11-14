/**
 * Partner Link Types
 * Type definitions for partner link management
 */

/**
 * Link status
 */
export type PartnerLinkStatus = 'active' | 'inactive';

/**
 * Partner Link (main entity)
 */
export interface PartnerLink {
  id: string;
  partner_id: string;
  name: string;
  description?: string;
  base_url: string;
  final_url: string; // UTM 포함된 최종 URL
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  status: PartnerLinkStatus;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at: string;
}

/**
 * Partner Link List Item (for table display)
 */
export interface PartnerLinkListItem {
  id: string;
  name: string;
  final_url: string;
  clicks: number;
  conversions: number;
  status: PartnerLinkStatus;
  created_at: string;
}

/**
 * Partner Link Detail (full information)
 */
export interface PartnerLinkDetail extends PartnerLink {
  // Additional fields if needed
}

/**
 * Request to create partner link
 */
export interface PartnerLinkCreateRequest {
  name: string;
  description?: string;
  base_url: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  status?: PartnerLinkStatus;
}

/**
 * Request to update partner link
 */
export interface PartnerLinkUpdateRequest {
  name?: string;
  description?: string;
  base_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  status?: PartnerLinkStatus;
}

/**
 * Query parameters for fetching partner links
 */
export interface GetPartnerLinksQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PartnerLinkStatus | 'all';
  sort_by?: 'created_at' | 'name' | 'clicks';
  sort_order?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface LinkPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * API Response types
 */
export interface GetPartnerLinksResponse {
  success: boolean;
  data: {
    links: PartnerLinkListItem[];
    pagination: LinkPagination;
  };
}

export interface GetPartnerLinkDetailResponse {
  success: boolean;
  data: PartnerLinkDetail;
}

export interface CreatePartnerLinkResponse {
  success: boolean;
  data: PartnerLink;
  message?: string;
}

export interface UpdatePartnerLinkResponse {
  success: boolean;
  data: PartnerLink;
  message?: string;
}

export interface DeletePartnerLinkResponse {
  success: boolean;
  message?: string;
}

/**
 * Analytics Period Type
 */
export type AnalyticsPeriod = '7d' | '30d' | '90d' | '365d';

/**
 * Partner Analytics Summary
 * 파트너 전체 성과 요약
 */
export interface PartnerAnalyticsSummary {
  period: AnalyticsPeriod;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;      // 전환 기준 매출(추정)
  total_commission: number;   // 파트너 예상 커미션 합계
  average_ctr: number;        // 평균 클릭률 (%)
  average_cvr: number;        // 평균 전환율 (%)
}

/**
 * Partner Analytics Timeseries Point
 * 시간별 데이터 포인트
 */
export interface PartnerAnalyticsTimeseriesPoint {
  date: string;         // YYYY-MM-DD
  clicks: number;
  conversions: number;
  revenue: number;      // 해당 날짜 매출(추정)
  commission: number;   // 해당 날짜 커미션
}

/**
 * Partner Analytics Timeseries
 * 시간별 트렌드 데이터
 */
export interface PartnerAnalyticsTimeseries {
  period: AnalyticsPeriod;
  points: PartnerAnalyticsTimeseriesPoint[];
}

/**
 * Partner Link Summary
 * 링크별 성과 요약
 */
export interface PartnerLinkSummary {
  link_id: string;
  name: string;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  total_commission: number;
  ctr: number; // 클릭률 (%)
  cvr: number; // 전환율: conversions / clicks (%)
}

/**
 * Analytics API Response types
 */
export interface GetPartnerAnalyticsSummaryResponse {
  success: boolean;
  data: PartnerAnalyticsSummary;
}

export interface GetPartnerAnalyticsTimeseriesResponse {
  success: boolean;
  data: PartnerAnalyticsTimeseries;
}

export interface GetPartnerLinkSummariesResponse {
  success: boolean;
  data: PartnerLinkSummary[];
}
