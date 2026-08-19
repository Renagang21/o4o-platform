/**
 * Pharmacy-Hub LMS — 공통 View adapter
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7·§8
 *
 * `@o4o/lms-ui` 의 CourseDetailView / LessonPlayerView 가 요구하는 `LmsLearnerPort` 를
 * PH `lmsApi` 위에 구현한다.
 *
 * §8: PH baseline 은 "조회·학습"만이므로 Enrollment / Progress 는 사용하지 않는다.
 *   - config.enrollmentEnabled = false 로 공통 View 의 해당 CTA 를 비활성화한다.
 *   - port 의 필수 메서드 시그니처는 유지하되(공통 계약 변경 금지) 호출되지 않는 no-op 으로 둔다.
 *   - quiz / assignment / AI 는 optional 메서드이므로 미구현 = 해당 UI 미노출.
 */

import { createLmsLabels, type LmsLearnerPort, type LmsViewLabels } from '@o4o/lms-ui';
import { lmsApi } from '../../api/lms';

export const PH_LMS_ACCENT = '#0f766e';
export const PH_LMS_HUB_PATH = '/education';

export const phLmsLabels: LmsViewLabels = createLmsLabels({});

function toLesson(l: any) {
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
}

export const phLmsPort: LmsLearnerPort = {
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

  // §8 범위 밖 — enrollmentEnabled=false 이므로 공통 View 가 호출하지 않는다.
  getEnrollment: async () => null,
  enroll: async () => null,
  updateProgress: async () => null,
};
