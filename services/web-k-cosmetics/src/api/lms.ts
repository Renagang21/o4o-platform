/**
 * LMS API Client — K-Cosmetics
 *
 * WO-KCOS-KPA-LMS-STEP1-ENABLE-V1 / WO-KCOS-KPA-LMS-STEP3-LESSON-PLAYER-V1
 *
 * KPA-Society lmsApi 구조 기준.
 * K-Cosmetics api(Axios) 래퍼를 사용하되, 호출 시그니처와 반환 타입은 KPA와 동일하게 유지한다.
 * 향후 KPA lmsApi 변경 시 동일 패턴으로 반영하기 위함.
 */

import { api } from '../lib/apiClient';

// ─── Types (KPA types 기준) ─────────────────────────────────────────────────

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
  isFree?: boolean;
  type?: 'video' | 'article' | 'quiz' | 'assignment' | 'live';
}

export interface LmsEnrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completedLessons: string[];
  startedAt: string;
  completedAt?: string;
  status?: string;
  metadata?: { completedLessonIds: string[] };
}

export interface LmsQuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  points?: number;
  order: number;
}

export interface LmsQuiz {
  id: string;
  title: string;
  description?: string;
  questions: LmsQuizQuestion[];
  passingScore: number;
}

export interface LmsQuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  creditsEarned: number;
}

// WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
export interface LmsAssignment {
  id: string;
  lessonId: string;
  instructions: string | null;
  submissionType: 'text';
  dueDate: string | null;
}

export interface LmsAssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  lessonId: string;
  content: string | null;
  submittedAt: string;
  status: 'submitted';
}

// WO-O4O-LMS-LIVE-MINIMAL-V1
export interface LmsLive {
  lessonId: string;
  liveStartAt: string | null;
  liveEndAt: string | null;
  liveUrl: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  totalPages?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const lmsApi = {
  // 강의 목록
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

  // 강의 상세
  getCourse: async (id: string): Promise<ApiResponse<LmsCourse>> => {
    const { data } = await api.get<ApiResponse<LmsCourse>>(`/lms/courses/${id}`);
    return data;
  },

  // 레슨 목록
  getLessons: async (courseId: string): Promise<ApiResponse<LmsLesson[]>> => {
    const { data } = await api.get<ApiResponse<LmsLesson[]>>(`/lms/courses/${courseId}/lessons`);
    return data;
  },

  // 레슨 상세
  getLesson: async (_courseId: string, lessonId: string): Promise<ApiResponse<{ lesson: LmsLesson }>> => {
    const { data } = await api.get<ApiResponse<{ lesson: LmsLesson }>>(`/lms/lessons/${lessonId}`);
    return data;
  },

  // 수강 상태 조회
  getEnrollmentByCourse: async (courseId: string): Promise<ApiResponse<{ enrollment: LmsEnrollment }>> => {
    const { data } = await api.get<ApiResponse<{ enrollment: LmsEnrollment }>>(`/lms/enrollments/me/course/${courseId}`);
    return data;
  },

  // 수강 신청
  enrollCourse: async (courseId: string): Promise<ApiResponse<{ enrollment: LmsEnrollment }>> => {
    const { data } = await api.post<ApiResponse<{ enrollment: LmsEnrollment }>>(`/lms/courses/${courseId}/enroll`);
    return data;
  },

  // 진행률 업데이트
  updateProgress: async (courseId: string, lessonId: string, completed: boolean): Promise<ApiResponse<{ enrollment: LmsEnrollment }>> => {
    const { data } = await api.post<ApiResponse<{ enrollment: LmsEnrollment }>>(`/lms/enrollments/${courseId}/progress`, {
      lessonId,
      completed,
    });
    return data;
  },

  // 퀴즈 조회
  getQuizForLesson: async (lessonId: string): Promise<ApiResponse<{ quiz: LmsQuiz }>> => {
    const { data } = await api.get<ApiResponse<{ quiz: LmsQuiz }>>(`/lms/lessons/${lessonId}/quiz`);
    return data;
  },

  // 퀴즈 제출
  submitQuiz: async (quizId: string, answers: Array<{ questionId: string; answer: string | string[] }>): Promise<ApiResponse<LmsQuizResult>> => {
    const { data } = await api.post<ApiResponse<LmsQuizResult>>(`/lms/quizzes/${quizId}/submit`, { answers });
    return data;
  },

  // 과제 (WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1)
  getAssignmentForLesson: async (lessonId: string): Promise<ApiResponse<{ assignment: LmsAssignment }>> => {
    const { data } = await api.get<ApiResponse<{ assignment: LmsAssignment }>>(`/lms/lessons/${lessonId}/assignment`);
    return data;
  },

  submitAssignment: async (assignmentId: string, content: string): Promise<ApiResponse<{ submission: LmsAssignmentSubmission; lessonCompleted: boolean }>> => {
    const { data } = await api.post<ApiResponse<{ submission: LmsAssignmentSubmission; lessonCompleted: boolean }>>(
      `/lms/assignments/${assignmentId}/submit`,
      { content },
    );
    return data;
  },

  getMyAssignmentSubmission: async (assignmentId: string): Promise<ApiResponse<{ submission: LmsAssignmentSubmission | null }>> => {
    const { data } = await api.get<ApiResponse<{ submission: LmsAssignmentSubmission | null }>>(
      `/lms/assignments/${assignmentId}/my`,
    );
    return data;
  },

  // 라이브 (WO-O4O-LMS-LIVE-MINIMAL-V1)
  getLiveForLesson: async (lessonId: string): Promise<ApiResponse<{ live: LmsLive }>> => {
    const { data } = await api.get<ApiResponse<{ live: LmsLive }>>(`/lms/lessons/${lessonId}/live`);
    return data;
  },

  joinLive: async (lessonId: string): Promise<ApiResponse<{ lessonCompleted: boolean }>> => {
    const { data } = await api.post<ApiResponse<{ lessonCompleted: boolean }>>(
      `/lms/lessons/${lessonId}/live/join`,
    );
    return data;
  },
};
