/**
 * Patient API
 *
 * GlucoseView 환자 데이터 API 클라이언트
 * CGM 요약 데이터만 조회 (Raw 데이터 없음)
 */

import type { PatientSummary, PatientsResponse, PatientDetail } from '../types/patient';

/**
 * API Base URL
 * - 개발 환경: Vite proxy 사용 (/api)
 * - 프로덕션: 환경변수 사용 (VITE_API_BASE_URL)
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * API 응답 타입 (Backend 응답 형식)
 */
interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ApiSingleResponse<T> {
  data: T;
}

/**
 * 환자 목록 조회
 *
 * GET /api/v1/glucoseview/patients
 */
export async function fetchPatients(): Promise<PatientsResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/glucoseview/patients`);

  if (!response.ok) {
    console.error('Failed to fetch patients:', response.status, response.statusText);
    // 조용히 실패: 빈 목록 반환
    return {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const result: ApiPaginatedResponse<PatientSummary> = await response.json();

  return {
    data: result.data,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.total_pages,
    },
  };
}

/**
 * 환자 상세 조회
 *
 * GET /api/v1/glucoseview/patients/:id
 */
export async function fetchPatientDetail(id: string): Promise<PatientDetail | null> {
  const response = await fetch(`${API_BASE_URL}/v1/glucoseview/patients/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    console.error('Failed to fetch patient detail:', response.status, response.statusText);
    return null;
  }

  const result: ApiSingleResponse<PatientDetail> = await response.json();
  return result.data;
}
