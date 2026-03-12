/**
 * Patient API Client
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1
 *
 * 환자 본인용 API (프로필 조회/수정)
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'API_ERROR', message: data.message || 'Request failed' },
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

// Health Profile types
export interface BasicInfo {
  name: string;
  email: string;
  phone: string | null;
}

export interface CustomerInfo {
  birthYear: number | null;
  gender: string | null;
}

export interface HealthProfile {
  id?: string;
  diabetesType: string | null;
  treatmentMethod: string | null;
  height: string | null;
  weight: string | null;
  targetHbA1c: string | null;
  targetGlucoseLow: number;
  targetGlucoseHigh: number;
  birthDate: string | null;
}

export interface PatientProfileData {
  basicInfo: BasicInfo;
  customerInfo: CustomerInfo | null;
  healthProfile: HealthProfile | null;
}

export const patientApi = {
  getProfile: () =>
    request<PatientProfileData>('GET', '/api/v1/care/patient-profile/me'),

  createProfile: (data: Partial<HealthProfile>) =>
    request<HealthProfile>('POST', '/api/v1/care/patient-profile', data),

  saveProfile: (data: Partial<HealthProfile>) =>
    request<HealthProfile>('PUT', '/api/v1/care/patient-profile', data),
};
