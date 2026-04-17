/**
 * LMS API Client — GlycoPharm
 * WO-GLYCOPHARM-LMS-ROUTING-INTEGRATION-V1
 *
 * 전역 LMS 엔드포인트 /api/v1/lms/courses 사용
 * kpaLmsScopeGuard는 GET 요청을 통과시킴 — 백엔드 변경 불필요
 */
import { api } from '@/lib/apiClient';

export interface LmsCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: string;
  duration: number;
  instructorId: string | null;
  isPublished: boolean;
  createdAt: string;
}

export interface LmsCoursesResult {
  data: LmsCourse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const lmsApi = {
  getCourses: async (params?: {
    search?: string;
    level?: string;
    page?: number;
    limit?: number;
  }): Promise<LmsCoursesResult> => {
    const query = new URLSearchParams({ status: 'published' });
    if (params?.search) query.set('search', params.search);
    if (params?.level && params.level !== 'all') query.set('level', params.level);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const { data } = await api.get<LmsCoursesResult>(`/lms/courses?${query.toString()}`);
    return data;
  },
};
