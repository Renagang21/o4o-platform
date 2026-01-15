/**
 * Partner Dashboard API Client
 * WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 *
 * K-Cosmetics Partner API Integration
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const PARTNER_SERVICE_ID = 'k-cosmetics';

interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || {
          code: 'API_ERROR',
          message: data.message || 'API request failed',
        },
      };
    }

    return data;
  } catch (error) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

// Partner API Types
export interface PartnerOverviewData {
  activeContentCount: number;
  activeEventCount: number;
  status: 'active' | 'inactive';
}

export interface PartnerTarget {
  id: string;
  name: string;
  type: 'pharmacy' | 'region';
  serviceArea?: string;
  address?: string;
  description?: string;
}

export interface PartnerContent {
  id: string;
  type: 'text' | 'image' | 'link';
  title: string;
  body?: string;
  url?: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PartnerEvent {
  id: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  region?: string;
  targetScope?: string;
  isActive: boolean;
  status: 'active' | 'scheduled' | 'ended';
}

export interface PartnerStatusData {
  contents: Array<{ id: string; name: string; status: 'active' | 'inactive' }>;
  events: Array<{ id: string; name: string; status: 'active' | 'ongoing' | 'ended' }>;
}

export const partnerApi = {
  // Overview
  getOverview: () =>
    apiRequest<PartnerOverviewData>('GET', `/api/v1/partner/overview?serviceId=${PARTNER_SERVICE_ID}`),

  // Targets (Read Only)
  getTargets: () =>
    apiRequest<PartnerTarget[]>('GET', `/api/v1/partner/targets?serviceId=${PARTNER_SERVICE_ID}`),

  // Contents CRUD
  getContents: () =>
    apiRequest<PartnerContent[]>('GET', `/api/v1/partner/content?serviceId=${PARTNER_SERVICE_ID}`),

  createContent: (data: { type: 'text' | 'image' | 'link'; title: string; body?: string; url?: string }) =>
    apiRequest<PartnerContent>('POST', `/api/v1/partner/content?serviceId=${PARTNER_SERVICE_ID}`, data),

  updateContent: (id: string, data: { title?: string; body?: string; url?: string; isActive?: boolean }) =>
    apiRequest<PartnerContent>('PATCH', `/api/v1/partner/content/${id}?serviceId=${PARTNER_SERVICE_ID}`, data),

  // Events CRUD
  getEvents: () =>
    apiRequest<PartnerEvent[]>('GET', `/api/v1/partner/events?serviceId=${PARTNER_SERVICE_ID}`),

  createEvent: (data: { name: string; startDate: string; endDate: string; region?: string; targetScope?: string }) =>
    apiRequest<PartnerEvent>('POST', `/api/v1/partner/events?serviceId=${PARTNER_SERVICE_ID}`, data),

  updateEvent: (id: string, data: { name?: string; startDate?: string; endDate?: string; region?: string; targetScope?: string; isActive?: boolean }) =>
    apiRequest<PartnerEvent>('PATCH', `/api/v1/partner/events/${id}?serviceId=${PARTNER_SERVICE_ID}`, data),

  // Status
  getStatus: () =>
    apiRequest<PartnerStatusData>('GET', `/api/v1/partner/status?serviceId=${PARTNER_SERVICE_ID}`),
};
