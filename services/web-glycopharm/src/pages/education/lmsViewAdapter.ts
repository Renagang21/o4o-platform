/**
 * GlycoPharm LMS — 공통 View adapter
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * `@o4o/lms-ui` 의 CourseDetailView / LessonPlayerView 가 요구하는 `LmsLearnerPort` 를
 * GlycoPharm `lmsApi` / `aiApi` 위에 구현한다.
 *
 * GlycoPharm 정책 유지:
 *  - accent = GP green
 *  - 수료증은 별도 화면이 아니라 상세 사이드바에서 PDF 다운로드 (renderSidebarExtra slot)
 *  - 비로그인 수강신청 → LoginModal (페이지에서 config.onRequireLogin 주입)
 */

import { createLmsLabels, type LmsLearnerPort, type LmsViewLabels } from '@o4o/lms-ui';
import { lmsApi, normalizeEnrollment } from '@/api/lms';
import { aiApi } from '@/api/ai';

export const GP_LMS_ACCENT = '#16a34a';
export const GP_LMS_HUB_PATH = '/lms';

export const gpLmsLabels: LmsViewLabels = createLmsLabels({
  breadcrumbHub: '강의 목록',
  enrollLabel: '수강신청',
  enrollingLabel: '신청 중...',
  enrolledMessage: '수강신청이 완료되었습니다.',
  enrollFailedMessage: '수강신청 중 오류가 발생했습니다.',
});

function toEnrollment(raw: unknown) {
  const e = normalizeEnrollment(raw as any);
  if (!e) return null;
  return {
    id: e.id,
    status: e.status,
    progress: e.progress ?? 0,
    completedLessons: e.completedLessons ?? 0,
    completedLessonIds: e.metadata?.completedLessonIds ?? [],
  };
}

function toLesson(l: any) {
  return {
    id: l.id,
    title: l.title,
    courseId: l.courseId,
    type: l.type,
    order: l.order,
    durationMinutes: l.duration,
    isPreview: l.isFree ?? l.isPreview,
    videoUrl: l.videoUrl ?? null,
    content: typeof l.content === 'string' ? l.content : null,
  };
}

export const gpLmsPort: LmsLearnerPort = {
  getCourse: async (courseId) => {
    const res = (await lmsApi.getCourse(courseId)) as any;
    const c = res?.data?.course ?? res?.data ?? null;
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail ?? null,
      category: c.category,
      instructorName: c.instructorName ?? c.instructor?.name ?? null,
      instructorId: c.instructorId ?? null,
      lessonCount: c.lessonCount,
      durationMinutes: c.duration,
      enrollmentCount: c.enrollmentCount,
      visibility: c.visibility,
      requiresApproval: c.requiresApproval,
      isPaid: c.isPaid,
      status: c.status,
    };
  },

  getLessons: async (courseId) => {
    const res = (await lmsApi.getLessons(courseId)) as any;
    const list = res?.data ?? [];
    return (Array.isArray(list) ? list : []).map(toLesson);
  },

  getLesson: async (courseId, lessonId) => {
    const res = (await lmsApi.getLesson(courseId, lessonId)) as any;
    const l = res?.data?.lesson ?? res?.data ?? null;
    return l ? toLesson(l) : null;
  },

  getEnrollment: async (courseId) => {
    const res = (await lmsApi.getEnrollmentByCourse(courseId)) as any;
    return toEnrollment(res?.data?.enrollment ?? res?.data);
  },

  enroll: async (courseId) => {
    const res = (await lmsApi.enrollCourse(courseId)) as any;
    return toEnrollment(res?.data?.enrollment ?? res?.data);
  },

  updateProgress: async (courseId, lessonId, completed, metrics) => {
    const res = (await lmsApi.updateProgress(courseId, lessonId, completed, metrics)) as any;
    return toEnrollment(res?.data?.enrollment ?? res?.data);
  },

  getQuizForLesson: async (lessonId) => {
    const res = (await lmsApi.getQuizForLesson(lessonId)) as any;
    const q = res?.data?.quiz ?? res?.data ?? null;
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
    const res = (await lmsApi.submitQuiz(quizId, answers)) as any;
    const r = res?.data ?? null;
    if (!r) return null;
    return {
      score: r.score,
      passed: r.passed,
      correctCount: r.correctCount,
      total: r.total,
      creditsEarned: r.creditsEarned ?? 0,
      answers: (r.answers ?? []).map((a: any) => ({ questionId: a.questionId, isCorrect: !!a.isCorrect })),
    };
  },

  getAssignmentForLesson: async (lessonId) => {
    const res = (await lmsApi.getAssignmentForLesson(lessonId)) as any;
    const a = res?.data?.assignment ?? null;
    if (!a) return null;
    return { id: a.id, instructions: a.instructions, dueDate: a.dueDate };
  },

  getMyAssignmentSubmission: async (assignmentId) => {
    const res = (await lmsApi.getMyAssignmentSubmission(assignmentId)) as any;
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
    const res = (await lmsApi.submitAssignment(assignmentId, content)) as any;
    const s = res?.data?.submission ?? null;
    return {
      submission: s
        ? {
            id: s.id,
            content: s.content,
            submittedAt: s.submittedAt,
            gradingStatus: s.gradingStatus,
            score: s.score,
            feedback: s.feedback,
            gradedAt: s.gradedAt,
          }
        : null,
      lessonCompleted: !!res?.data?.lessonCompleted,
    };
  },

  analyzeQuiz: async (input) => {
    const res = await aiApi.analyzeQuiz({
      ...input,
      questions: input.questions.map((q) => ({
        ...q,
        type: q.type as 'single' | 'multi' | 'text' | undefined,
      })),
    });
    const r = (res as any)?.data ?? null;
    if (!r) return null;
    return { summary: r.summary, insights: r.insights ?? [], recommendations: r.recommendations ?? [] };
  },

  feedbackAssignment: async (input) => {
    const res = await aiApi.feedbackAssignment(input);
    const r = (res as any)?.data ?? null;
    if (!r) return null;
    return { summary: r.summary, insights: r.insights ?? [], recommendations: r.recommendations ?? [] };
  },
};
