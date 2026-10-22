import { api } from './apiClient';
import type { LmsApiResponse } from '@o4o/lms-client';
import { lmsHttp } from '../api/lecture';
import type { EnrollmentPolicyReference } from '@o4o/shared-space-ui';
/**
 * O4O 강의 (lecture) — `@o4o/lms-ui` 공통 View adapter
 *
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §11
 *
 * `CourseDetailView` / `LessonPlayerView` 가 요구하는 `LmsLearnerPort` 를
 * `learnerApi`(= `@o4o/lms-client` learner client) 위에 구현한다.
 * Lecture 전용 enrollment · 진도 · 수료 로직을 새로 만들지 않는다 — 백엔드 LMS Core 계약을 그대로 쓴다.
 *
 * Phase 2 범위 밖(§16): AI 퀴즈 분석 / 과제 피드백 → `analyzeQuiz` · `feedbackAssignment` 미구현.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLmsLabels, type LmsLearnerPort, type LmsViewConfig, type LmsViewLabels } from '@o4o/lms-ui';
import { learnerApi, type LectureCourse, type LectureEnrollment, type LectureLesson } from '../api/lecture';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export const LECTURE_ACCENT = '#302b73';
export const LECTURE_HUB_PATH = '/courses';
export const LECTURE_CERTIFICATES_PATH = '/my/certificates';
export const LECTURE_ENROLLMENTS_PATH = '/my/enrollments';

export const coursePath = (courseId: string) => `${LECTURE_HUB_PATH}/${courseId}`;
export const lessonPath = (courseId: string, lessonId: string) => `${LECTURE_HUB_PATH}/${courseId}/lesson/${lessonId}`;

export const lectureLabels: LmsViewLabels = createLmsLabels({
  breadcrumbHub: '강의',
  membersOnlyTitle: '회원 전용 강의입니다',
  membersOnlyDesc: 'O4O 강의 서비스 회원만 볼 수 있는 강의입니다. 로그인 후 다시 시도해 주세요.',
});

function toEnrollment(e: LectureEnrollment | null | undefined) {
  if (!e) return null;
  return {
    id: e.id,
    status: e.status,
    progress: e.progressPercentage ?? e.progress ?? 0,
    completedLessons: e.completedLessons ?? 0,
    completedLessonIds: e.metadata?.completedLessonIds ?? [],
  };
}

function toLesson(l: LectureLesson) {
  return {
    id: l.id,
    title: l.title,
    courseId: l.courseId,
    type: l.type,
    order: l.order,
    durationMinutes: l.duration,
    isPreview: false, // isFree does not bypass the server enrollment/approval boundary.
    attachments: l.attachments ?? [],
    videoUrl: l.videoUrl ?? null,
    content: l.content ?? null,
  };
}

export async function enrollWithPolicy(courseId: string, policyReferences: EnrollmentPolicyReference[]) {
  const response = await api.post(`/lms/courses/${encodeURIComponent(courseId)}/enroll`, { policyReferences });
  return toEnrollment(response.data?.data?.enrollment ?? response.data?.data);
}

export const lecturePort: LmsLearnerPort = {
  getPlayback: async (courseId, lessonId) => {
    const response = await api.get(`/lms/enrollments/${encodeURIComponent(courseId)}/playback`, { params: { lessonId } });
    return response.data.data.playback;
  },
  savePlayback: async (courseId, lessonId, positionSeconds) => {
    await api.post(`/lms/enrollments/${encodeURIComponent(courseId)}/playback`, { lessonId, positionSeconds });
  },
  getCourse: async (courseId) => {
    const res = await learnerApi.getCourse<LectureCourse>(courseId);
    const c = res.data.course;
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail ?? null,
      category: c.category ?? null,
      instructorName: c.instructorName ?? c.instructor?.name ?? null,
      instructorId: c.instructorId ?? null,
      lessonCount: c.lessonCount,
      durationMinutes: c.duration,
      enrollmentCount: c.enrollmentCount ?? c.currentEnrollments,
      visibility: c.visibility,
      requiresApproval: c.requiresApproval,
      isPaid: c.isPaid,
      status: c.status,
      professionalInfo: c.metadata?.professionalInfo,
    };
  },

  getCurriculum: async (courseId) => {
    const res = await lmsHttp.get<LmsApiResponse<{ curriculum: LectureLesson[] }>>(`/lms/courses/${encodeURIComponent(courseId)}`, { includeCurriculum: true });
    return res.data.curriculum.map(toLesson);
  },

  getLessons: async (courseId) => {
    const res = await learnerApi.getLessons<LectureLesson>(courseId);
    return res.data.map(toLesson);
  },

  getLesson: async (_courseId, lessonId) => {
    const res = await learnerApi.getLesson(lessonId);
    const l = res.data.lesson;
    return l ? toLesson(l) : null;
  },

  getEnrollment: async (courseId) => {
    try {
      const res = await learnerApi.getEnrollmentByCourse<LectureEnrollment>(courseId);
      return toEnrollment(res.data.enrollment);
    } catch (err) {
      // 미수강(404) 은 정상 상태 — 수강 CTA 노출
      if ((err as any)?.response?.status === 404) return null;
      throw err;
    }
  },

  enroll: async (courseId) => {
    const res = await learnerApi.enrollCourse<LectureEnrollment>(courseId);
    return toEnrollment(res.data.enrollment);
  },

  updateProgress: async (courseId, lessonId, completed, metrics) => {
    const res = await learnerApi.updateProgress<LectureEnrollment>(courseId, lessonId, completed, metrics);
    return toEnrollment(res.data.enrollment);
  },

  getQuizForLesson: async (lessonId) => {
    const res = (await learnerApi.getQuizForLesson(lessonId)) as any;
    const q = res?.data?.quiz ?? null;
    if (!q) return null;
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      passingScore: q.passingScore,
      questions: (q.questions ?? []).map((qq: any) => ({
        id: qq.id,
        question: qq.question,
        type: qq.type,
        options: qq.options,
        points: qq.points,
      })),
    };
  },

  submitQuiz: async (quizId, answers) => {
    const res = (await learnerApi.submitQuiz(quizId, answers)) as any;
    const r = res?.data ?? null;
    if (!r) return null;
    return {
      score: r.score,
      passed: r.passed,
      correctCount: r.correctCount,
      total: r.total,
      // §17 reward = OFF — 표시용 0 고정
      creditsEarned: 0,
      answers: (r.answers ?? []).map((a: any) => ({ questionId: a.questionId, isCorrect: !!a.isCorrect })),
    };
  },

  getAssignmentForLesson: async (lessonId) => {
    const res = (await learnerApi.getAssignmentForLesson(lessonId)) as any;
    const a = res?.data?.assignment ?? null;
    if (!a) return null;
    return { id: a.id, instructions: a.instructions, dueDate: a.dueDate };
  },

  getMyAssignmentSubmission: async (assignmentId) => {
    const res = (await learnerApi.getMyAssignmentSubmission(assignmentId)) as any;
    const s = res?.data?.submission ?? null;
    if (!s) return null;
    return {
      id: s.id,
      content: s.content,
      submittedAt: s.submittedAt,
      gradingStatus: s.gradingStatus,
      score: s.score,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
    };
  },

  submitAssignment: async (assignmentId, content) => {
    const res = (await learnerApi.submitAssignment(assignmentId, content)) as any;
    const s = res?.data?.submission ?? null;
    return {
      submission: s
        ? { id: s.id, content: s.content, submittedAt: s.submittedAt, gradingStatus: s.gradingStatus, score: s.score, feedback: s.feedback, gradedAt: s.gradedAt }
        : null,
      lessonCompleted: !!res?.data?.lessonCompleted,
    };
  },
};

/** 공통 View 에 주입할 config — 라우터 · 인증 · toast 를 서비스 쪽에서 묶는다. */
export function useLectureViewConfig(): LmsViewConfig {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  return useMemo<LmsViewConfig>(() => ({
    accent: LECTURE_ACCENT,
    hubPath: LECTURE_HUB_PATH,
    coursePath,
    lessonPath,
    certificatesPath: LECTURE_CERTIFICATES_PATH,
    isAuthenticated,
    accountId: user?.id,
    // 로그인 후 보던 강의 화면으로 돌아오도록 현재 경로를 넘긴다 (WO-O4O-LECTURE-HANDOFF-NONMEMBER-UX-V1)
    onRequireLogin: () => navigate('/login', { state: { from: `${window.location.pathname}${window.location.search}` } }),
    navigate: (path: string) => navigate(path),
    notify: { success: toast.success, error: toast.error },
    labels: lectureLabels,
    enrollmentEnabled: true,
  }), [navigate, isAuthenticated, user?.id, toast]);
}
