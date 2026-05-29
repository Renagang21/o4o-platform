/**
 * K-Cosmetics MyPage API — 내 신청 내역 (frontend aggregation)
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 *
 * Sources:
 *   1) GET /cosmetics/stores/application/me — 매장(파트너) 신청 (store_application)
 *   2) GET /lms/enrollments/me             — LMS 수강 신청 (course_enrollment)
 *
 * 두 소스를 MyRequestItem[] 으로 정규화한 뒤 createdAt DESC 병합.
 */

import { api } from '../lib/apiClient';
import type { MyRequestItem } from '@o4o/account-ui';

function normalizeStoreApplication(app: any): MyRequestItem {
  return {
    id: app.id,
    entityType: 'store_application',
    status: app.canonicalStatus ?? app.status ?? 'pending',
    displayTitle: app.storeName || '매장 입점 신청',
    displayDescription: app.storeType ?? null,
    reviewComment: app.rejectionReason ?? app.reviewComment ?? null,
    revisionNote: null,
    reviewedAt: app.reviewedAt ?? app.decidedAt ?? null,
    resultEntityId: null,
    resultMetadata: null,
    submittedAt: app.submittedAt ?? app.createdAt ?? null,
    createdAt: app.createdAt ?? app.submittedAt ?? new Date().toISOString(),
    updatedAt: app.updatedAt ?? app.createdAt ?? undefined,
    serviceKey: 'k-cosmetics',
    payload: {
      storeType: app.storeType ?? null,
      businessNumber: app.businessNumber ?? null,
      applicantName: app.applicantName ?? null,
    },
  };
}

function normalizeLmsEnrollment(enrollment: any): MyRequestItem {
  const course = enrollment.course ?? {};
  return {
    id: enrollment.id,
    entityType: 'course_enrollment',
    status: enrollment.status ?? 'in_progress',
    displayTitle: course.title ?? enrollment.courseTitle ?? '강의 수강',
    displayDescription: course.category ?? null,
    reviewComment: null,
    revisionNote: null,
    reviewedAt: enrollment.completedAt ?? null,
    resultEntityId: enrollment.courseId ?? null,
    resultMetadata: null,
    submittedAt: enrollment.startedAt ?? enrollment.createdAt ?? null,
    createdAt: enrollment.createdAt ?? enrollment.startedAt ?? new Date().toISOString(),
    updatedAt: enrollment.updatedAt ?? enrollment.createdAt ?? undefined,
    serviceKey: 'k-cosmetics',
    payload: {
      courseId: enrollment.courseId ?? null,
      progress: enrollment.progressPercentage ?? enrollment.progress ?? null,
    },
  };
}

export const kcosMyRequestsApi = {
  getMyRequests: async (): Promise<MyRequestItem[]> => {
    const [storeRes, lmsRes] = await Promise.allSettled([
      api.get<any>('/cosmetics/stores/application/me'),
      api.get<any>('/lms/enrollments/me'),
    ]);

    const items: MyRequestItem[] = [];

    if (storeRes.status === 'fulfilled') {
      const raw = storeRes.value.data;
      const applications: any[] = Array.isArray(raw?.data)
        ? raw.data
        : raw?.data
        ? [raw.data]
        : [];
      for (const app of applications) {
        items.push(normalizeStoreApplication(app));
      }
    }

    if (lmsRes.status === 'fulfilled') {
      const raw = lmsRes.value.data;
      const enrollments: any[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      for (const enrollment of enrollments) {
        items.push(normalizeLmsEnrollment(enrollment));
      }
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return items;
  },
};
