/**
 * Organization API 서비스
 */

import { apiClient } from './client';
import type {
  Organization,
  Officer,
  ApiResponse,
} from '../types';

export const organizationApi = {
  // 조직 정보
  getOrganization: () =>
    apiClient.get<ApiResponse<Organization>>('/organization'),

  // 임원 목록
  getOfficers: (params?: { organizationId?: string }) =>
    apiClient.get<ApiResponse<Officer[]>>('/organization/officers', params),

  // 연락처 정보
  getContactInfo: () =>
    apiClient.get<ApiResponse<{
      address: string;
      phone: string;
      fax?: string;
      email: string;
      workingHours: string;
      map?: { lat: number; lng: number };
    }>>('/organization/contact'),
};
