/**
 * Patient API Client
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * 당뇨인 본인용 API (프로필 조회/수정)
 */

import { api } from '@/lib/apiClient';

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
  try {
    const response = method === 'GET'
      ? await api.get(path)
      : method === 'POST'
        ? await api.post(path, body)
        : method === 'PUT'
          ? await api.put(path, body)
          : await api.delete(path);

    return response.data;
  } catch (error: any) {
    const data = error.response?.data;
    return {
      success: false,
      error: data?.error || { code: 'API_ERROR', message: data?.message || 'Request failed' },
    };
  }
}

// Flat patient profile (matches flattened API response)
export interface PatientProfile {
  id: string | null;
  name: string;
  lastName?: string;
  firstName?: string;
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
  metadata?: {
    mealTiming?: string;
    mealTimingLabel?: string;
    // WO-GLYCOPHARM-DATA-INPUT-EXPANSION-V1
    medication?: { name: string; dose: string; takenAt: string };
    exercise?: { type: string; duration: number; intensity: string };
    symptoms?: string[];
  };
}

// Coaching session from pharmacist (WO-GLYCOPHARM-PATIENT-COACHING-VIEW-SCREEN-V1)
export interface PatientCoachingRecord {
  id: string;
  patientId: string;
  pharmacistId: string;
  summary: string;
  actionPlan: string;
  createdAt: string;
  pharmacistName: string;
}

// Pharmacy Link types (WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1)
export interface PharmacyListItem {
  id: string;
  name: string;
  patientCount: number;
}

export interface MyLinkStatus {
  linked: boolean;
  pharmacyId?: string;
  pharmacyName?: string;
  pendingRequest?: {
    id: string;
    pharmacyName: string;
    createdAt: string;
  };
}

// Appointment types (WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1)
export interface AppointmentDto {
  id: string;
  pharmacyName: string;
  scheduledAt: string;
  status: 'requested' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export const patientApi = {
  getMyProfile: () =>
    request<PatientProfile>('GET', '/care/patient-profile/me'),

  createProfile: (data: HealthProfilePayload) =>
    request<PatientProfile>('POST', '/care/patient-profile', data),

  updateProfile: (data: HealthProfilePayload) =>
    request<PatientProfile>('PUT', '/care/patient-profile', data),

  postGlucoseReading: (data: GlucoseReadingPayload) =>
    request<GlucoseReading>('POST', '/care/patient/health-readings', data),

  getGlucoseReadings: (params?: { from?: string; to?: string; metricType?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.metricType) query.set('metricType', params.metricType);
    const qs = query.toString();
    return request<GlucoseReading[]>(
      'GET',
      `/care/patient/health-readings${qs ? `?${qs}` : ''}`,
    );
  },

  getMyCoaching: () =>
    request<PatientCoachingRecord[]>('GET', '/care/patient/coaching'),

  // Pharmacy Link (WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1)
  getPharmacies: () =>
    request<PharmacyListItem[]>('GET', '/care/pharmacy-link/pharmacies'),

  getMyLinkStatus: () =>
    request<MyLinkStatus>('GET', '/care/pharmacy-link/my-status'),

  requestPharmacyLink: (pharmacyId: string, message?: string) =>
    request<{ id: string }>('POST', '/care/pharmacy-link/request', { pharmacyId, message }),

  disconnectPharmacy: () =>
    request<{ disconnected: boolean }>('POST', '/care/pharmacy-link/disconnect'),

  cancelPharmacyLinkRequest: () =>
    request<{ cancelled: boolean }>('POST', '/care/pharmacy-link/cancel'),

  // Appointments (WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1)
  getMyAppointments: () =>
    request<AppointmentDto[]>('GET', '/care/appointments/my'),

  createAppointment: (scheduledAt: string, notes?: string) =>
    request<{ id: string }>('POST', '/care/appointments', { scheduledAt, notes }),

  cancelAppointment: (id: string) =>
    request<void>('DELETE', `/care/appointments/${id}`),
};
