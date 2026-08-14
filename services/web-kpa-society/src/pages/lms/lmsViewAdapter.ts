/**
 * KPA LMS — 공통 View adapter
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * `@o4o/lms-ui` 의 CourseDetailView / LessonPlayerView 가 요구하는
 * `LmsLearnerPort` 를 KPA `lmsApi` / `aiApi` 위에 구현한다.
 * KPA apiClient 는 envelope(`{success, data}`)를 그대로 반환하므로 여기서 unwrap 한다.
 *
 * KPA 정책 유지:
 *  - 어휘: 강의="안내 흐름", 레슨="단계" (기존 화면 문구 보존)
 *  - 수료증 경로 `/mypage/certificates`
 *  - accent = KPA primary
 */

import { createLmsLabels, type LmsLearnerPort, type LmsViewLabels } from '@o4o/lms-ui';
import { lmsApi, normalizeEnrollment } from '../../api/lms';
import { aiApi } from '../../api';
import { colors } from '../../styles/theme';

export const KPA_LMS_ACCENT = colors.primary;
export const KPA_LMS_HUB_PATH = '/lms';
export const KPA_LMS_CERTIFICATES_PATH = '/mypage/certificates';

export const kpaLmsLabels: LmsViewLabels = createLmsLabels({
  courseWord: '안내 흐름',
  lessonWord: '단계',
  breadcrumbHub: '안내 흐름',
  courseLoading: '안내 흐름을 불러오는 중...',
  courseNotFoundTitle: '안내 흐름을 찾을 수 없습니다',
  courseNotFoundDesc: '삭제되었거나 존재하지 않는 안내 흐름입니다.',
  membersOnlyTitle: '회원 전용 안내 흐름입니다',
  membersOnlyDesc: '이 안내 흐름은 로그인한 회원만 볼 수 있습니다. 로그인 후 다시 시도해 주세요.',
  backToCourseLabel: '안내 흐름으로',
  lessonsSectionTitle: '단계 목록',
  enrollLabel: '시작하기',
  enrollingLabel: '시작 중...',
  enrolledMessage: '시작되었습니다.',
  enrollFailedMessage: '시작에 실패했습니다.',
  continueLabel: '계속 보기',
  lessonLoading: '단계를 불러오는 중...',
  lessonNotFoundTitle: '단계를 찾을 수 없습니다',
  lessonNotFoundDesc: '삭제되었거나 존재하지 않는 단계입니다.',
  prevLessonLabel: '← 이전 단계',
  nextLessonLabel: '다음 단계 →',
  allDoneMessage: '모든 단계를 완료했습니다!',
});

/** enrollment 정규화 — completedLessons(count) / metadata.completedLessonIds(배열) 분리 보존. */
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

export const kpaLmsPort: LmsLearnerPort = {
  getCourse: async (courseId) => {
    const res = (await lmsApi.getCourse(courseId)) as any;
    const c = res?.data?.course ?? res?.data ?? null;
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail ?? c.thumbnailUrl ?? null,
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
    return (Array.isArray(list) ? list : []).map((l: any) => ({
      id: l.id,
      title: l.title,
      courseId: l.courseId,
      type: l.type,
      order: l.order,
      durationMinutes: l.duration,
      isPreview: l.isPreview,
      videoUrl: l.videoUrl ?? null,
      content: l.content ?? null,
    }));
  },

  getLesson: async (courseId, lessonId) => {
    const res = (await lmsApi.getLesson(courseId, lessonId)) as any;
    const l = res?.data?.lesson ?? res?.data ?? null;
    if (!l) return null;
    return {
      id: l.id,
      title: l.title,
      courseId: l.courseId,
      type: l.type,
      order: l.order,
      durationMinutes: l.duration,
      isPreview: l.isPreview,
      videoUrl: l.videoUrl ?? null,
      content: l.content ?? null,
    };
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
    const res = (await aiApi.analyzeQuiz({
      ...input,
      questions: input.questions.map((q) => ({
        ...q,
        type: q.type as 'single' | 'multi' | 'text' | undefined,
      })),
    })) as any;
    const r = res?.data ?? null;
    if (!r) return null;
    return { summary: r.summary, insights: r.insights ?? [], recommendations: r.recommendations ?? [] };
  },

  feedbackAssignment: async (input) => {
    const res = (await aiApi.feedbackAssignment(input)) as any;
    const r = res?.data ?? null;
    if (!r) return null;
    return { summary: r.summary, insights: r.insights ?? [], recommendations: r.recommendations ?? [] };
  },
};
