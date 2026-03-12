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

// Flat patient profile (matches flattened API response)
export interface PatientProfile {
  id: string | null;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  diabetesType: string | null;
  treatmentMethod: string | null;
  height: string | null;
  weight: string | null;
  targetHbA1c: string | null;
  targetGlucoseLow: number;
  targetGlucoseHigh: number;
}

// Health profile fields for create/update payload
export interface HealthProfilePayload {
  diabetesType: string | null;
  treatmentMethod: string | null;
  height: string | null;
  weight: string | null;
  targetHbA1c: string | null;
  targetGlucoseLow: number;
  targetGlucoseHigh: number;
  birthDate: string | null;
}

// Glucose reading types (WO-GLYCOPHARM-GLUCOSE-INPUT-PAGE-V1)
export interface GlucoseReading {
  id: string;
  patientId: string;
  metricType: string;
  valueNumeric: string | null;
  unit: string;
  measuredAt: string;
  sourceType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GlucoseReadingPayload {
  metricType?: string;
  valueNumeric: number;
  unit?: string;
  measuredAt: string;
  metadata?: { mealTiming?: string; mealTimingLabel?: string };
}

export const patientApi = {
  getMyProfile: () =>
    request<PatientProfile>('GET', '/api/v1/care/patient-profile/me'),

  createProfile: (data: HealthProfilePayload) =>
    request<PatientProfile>('POST', '/api/v1/care/patient-profile', data),

  updateProfile: (data: HealthProfilePayload) =>
    request<PatientProfile>('PUT', '/api/v1/care/patient-profile', data),

  postGlucoseReading: (data: GlucoseReadingPayload) =>
    request<GlucoseReading>('POST', '/api/v1/care/patient/health-readings', data),

  getGlucoseReadings: (params?: { from?: string; to?: string; metricType?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.metricType) query.set('metricType', params.metricType);
    const qs = query.toString();
    return request<GlucoseReading[]>(
      'GET',
      `/api/v1/care/patient/health-readings${qs ? `?${qs}` : ''}`,
    );
  },
};
