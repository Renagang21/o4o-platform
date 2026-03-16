/**
 * Partner Dashboard API Client
 * WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * K-Cosmetics Partner API Integration
 */

import { api } from '../lib/apiClient';

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
    const m = method.toLowerCase();
    let response;
    if (m === 'get' || m === 'delete') {
      response = await (api as any)[m](path);
    } else {
      response = await (api as any)[m](path, body);
    }

    return response.data;
  } catch (error: any) {
    const errData = error?.response?.data;
    if (errData) {
      return {
        error: errData.error || {
          code: 'API_ERROR',
          message: errData.message || 'API request failed',
        },
      };
    }
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
    apiRequest<PartnerOverviewData>('GET', `/partner/overview?serviceId=${PARTNER_SERVICE_ID}`),

  // Targets (Read Only)
  getTargets: () =>
    apiRequest<PartnerTarget[]>('GET', `/partner/targets?serviceId=${PARTNER_SERVICE_ID}`),

  // Contents CRUD
  getContents: () =>
    apiRequest<PartnerContent[]>('GET', `/partner/content?serviceId=${PARTNER_SERVICE_ID}`),

  createContent: (data: { type: 'text' | 'image' | 'link'; title: string; body?: string; url?: string }) =>
    apiRequest<PartnerContent>('POST', `/partner/content?serviceId=${PARTNER_SERVICE_ID}`, data),

  updateContent: (id: string, data: { title?: string; body?: string; url?: string; isActive?: boolean }) =>
    apiRequest<PartnerContent>('PATCH', `/partner/content/${id}?serviceId=${PARTNER_SERVICE_ID}`, data),

  // Events CRUD
  getEvents: () =>
    apiRequest<PartnerEvent[]>('GET', `/partner/events?serviceId=${PARTNER_SERVICE_ID}`),

  createEvent: (data: { name: string; startDate: string; endDate: string; region?: string; targetScope?: string }) =>
    apiRequest<PartnerEvent>('POST', `/partner/events?serviceId=${PARTNER_SERVICE_ID}`, data),

  updateEvent: (id: string, data: { name?: string; startDate?: string; endDate?: string; region?: string; targetScope?: string; isActive?: boolean }) =>
    apiRequest<PartnerEvent>('PATCH', `/partner/events/${id}?serviceId=${PARTNER_SERVICE_ID}`, data),

  // Status
  getStatus: () =>
    apiRequest<PartnerStatusData>('GET', `/partner/status?serviceId=${PARTNER_SERVICE_ID}`),
};
