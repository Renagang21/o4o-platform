/**
 * LMS API Client — K-Cosmetics
 *
 * WO-KCOS-KPA-LMS-STEP1-ENABLE-V1
 *
 * KPA-Society lmsApi 구조 기준.
 * K-Cosmetics api(Axios) 래퍼를 사용하되, 호출 시그니처와 반환 타입은 KPA와 동일하게 유지한다.
 * 향후 KPA lmsApi 변경 시 동일 패턴으로 반영하기 위함.
 */

import { api } from '../lib/apiClient';

// ─── Types (KPA types/Course 기준 최소 정의) ────────────────────────────────

export interface LmsCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  category?: string;
  level?: string;
  status?: string;
  duration?: number;
  lessonCount?: number;
  instructorId?: string | null;
  instructorName?: string;
  instructor?: { id: string; name: string };
  createdAt?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  totalPages?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const lmsApi = {
  /**
   * 강의 목록 조회 — KPA lmsApi.getCourses 동일 시그니처
   */
  getCourses: async (params?: {
    category?: string;
    level?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<LmsCourse>> => {
    const { data } = await api.get<PaginatedResponse<LmsCourse>>('/lms/courses', { params });
    return data;
  },
};
