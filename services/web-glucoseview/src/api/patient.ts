/**
 * Patient API Client — GlucoseView
 * WO-GLUCOSEVIEW-PATIENT-MODULE-EXTRACT-V1
 *
 * glycopharm patient.ts 에서 이식.
 * 인증: httpOnly Cookie (credentials: 'include')
 * Bearer token 사용하지 않음.
 */

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
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
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

// Glucose reading types
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
    medication?: { name: string; dose: string; takenAt: string };
    exercise?: { type: string; duration: number; intensity: string };
    symptoms?: string[];
  };
}

// Coaching session from pharmacist
export interface PatientCoachingRecord {
  id: string;
  patientId: string;
  pharmacistId: string;
  summary: string;
  actionPlan: string;
  createdAt: string;
  pharmacistName: string;
}

// Pharmacy Link types
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

// Appointment types
export interface AppointmentDto {
  id: string;
  pharmacyName: string;
  scheduledAt: string;
  status: 'requested' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  rejectReason: string | null;
  createdAt: string;
}

// AI Insight
export interface AiInsight {
  summary: string | null;
  warning: string | null;
  tip: string | null;
  generatedAt: string | null;
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

  getMyCoaching: () =>
    request<PatientCoachingRecord[]>('GET', '/api/v1/care/patient/coaching'),

  // Pharmacy Link
  getPharmacies: () =>
    request<PharmacyListItem[]>('GET', '/api/v1/care/pharmacy-link/pharmacies'),

  getMyLinkStatus: () =>
    request<MyLinkStatus>('GET', '/api/v1/care/pharmacy-link/my-status'),

  requestPharmacyLink: (pharmacyId: string, message?: string) =>
    request<{ id: string }>('POST', '/api/v1/care/pharmacy-link/request', { pharmacyId, message }),

  // Appointments
  getMyAppointments: () =>
    request<AppointmentDto[]>('GET', '/api/v1/care/appointments/my'),

  createAppointment: (scheduledAt: string, notes?: string) =>
    request<{ id: string }>('POST', '/api/v1/care/appointments', { scheduledAt, notes }),

  cancelAppointment: (id: string) =>
    request<void>('DELETE', `/api/v1/care/appointments/${id}`),

  // AI Insight
  getAiInsight: () =>
    request<AiInsight>('GET', '/api/v1/care/patient/ai-insight'),
};
