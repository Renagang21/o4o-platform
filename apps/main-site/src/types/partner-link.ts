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
