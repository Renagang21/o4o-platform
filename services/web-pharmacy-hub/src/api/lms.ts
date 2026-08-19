/**
 * LMS API Client — Pharmacy-Hub
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7
 *
 * 기존 LMS API client(`@o4o/lms-client`) 를 그대로 재사용한다. PH 전용 endpoint 를 만들지 않는다.
 * canonical serviceKey='pharmacy-hub' 를 client 계층에서 주입해 서버 필터로 경계를 정한다
 * (client-side filtering 아님 — WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1 과 동일 패턴).
 *
 * §8 정책: PH baseline 은 "조회·학습"만. enroll / progress / certificate / quiz / assignment 는
 * 범위 밖이므로 여기서 래핑하지 않는다.
 */

import { api } from '../lib/apiClient';
import {
  createLmsLearnerClient,
  type LmsHttpClient,
  type LmsApiResponse,
} from '@o4o/lms-client';

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
  enrollmentCount?: number;
  instructorId?: string | null;
  instructorName?: string;
  instructor?: { id: string; name: string };
  createdAt?: string;
  visibility?: 'public' | 'members';
  requiresApproval?: boolean;
  isPaid?: boolean;
}

export interface LmsLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  videoUrl?: string;
  content?: string;
  isPreview: boolean;
  type?: 'video' | 'article' | 'quiz' | 'assignment';
}

type ApiResponse<T> = LmsApiResponse<T>;

const lmsHttp: LmsHttpClient = {
  get: async <T>(path: string, params?: Record<string, unknown>): Promise<T> => {
    const { data } = await api.get<T>(path, { params });
    return data;
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const { data } = await api.post<T>(path, body);
    return data;
  },
  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const { data } = await api.patch<T>(path, body);
    return data;
  },
  delete: async <T>(path: string): Promise<T> => {
    const { data } = await api.delete<T>(path);
    return data;
  },
};

const learnerClient = createLmsLearnerClient(lmsHttp, { serviceKey: 'pharmacy-hub' });

export const lmsApi = {
  getCourses: (params?: {
    category?: string;
    level?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => learnerClient.getCourses<LmsCourse>(params as Record<string, unknown> | undefined),

  getCourse: (id: string) => learnerClient.getCourse<LmsCourse>(id),

  getLessons: (courseId: string) => learnerClient.getLessons<LmsLesson>(courseId),

  // getLesson 은 공통 factory 범위 밖 — 다른 서비스와 동일하게 직접 호출한다.
  getLesson: async (_courseId: string, lessonId: string): Promise<ApiResponse<{ lesson: LmsLesson }>> => {
    const { data } = await api.get<ApiResponse<{ lesson: LmsLesson }>>(`/lms/lessons/${lessonId}`);
    return data;
  },
};
