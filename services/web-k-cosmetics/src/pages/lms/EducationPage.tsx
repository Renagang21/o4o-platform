/**
 * EducationPage - K-Cosmetics /lms HUB
 *
 * WO-KCOS-KPA-LMS-STEP1-ENABLE-V1
 *
 * KPA-Society EducationPage 구조 기준.
 * LmsHubTemplate + 서비스별 config.
 *
 * KPA 대비 차이:
 *   - serviceKey / heroDesc / courseDetailPath만 K-Cosmetics 전용
 *   - renderRowActions: KPA instructor 구조 도입 전까지 미구현
 *     → 향후 KPA와 동일 패턴(RowActionMenu + isOwner 분기)으로 추가
 */

import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { lmsApi, type LmsCourse } from '../../api/lms';

// ─── Course type adapter (KPA mapCourse 동일 구조) ──────────────────────────

function mapCourse(c: LmsCourse): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    lessonCount: c.lessonCount,
    status: c.status,
    instructorName: c.instructor?.name || c.instructorName || undefined,
    instructorId: c.instructor?.id || undefined,
    createdAt: c.createdAt,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function EducationPage() {
  const config: LmsHubConfig = {
    serviceKey: 'k-cosmetics',
    heroTitle: '강의',
    heroDesc: 'K-Beauty, 매장 운영, 고객 응대, 상품 이해를 위한 교육 콘텐츠',
    courseDetailPath: (id) => `/lms/course/${id}`,

    fetchCourses: async (params) => {
      const res = await lmsApi.getCourses({
        status: 'published',
        search: params.search,
        page: params.page,
        limit: params.limit,
      });
      const pag = (res as any).pagination;
      return {
        data: (res.data || []).map(mapCourse),
        totalPages: pag?.totalPages || (res as any).totalPages || 1,
      };
    },

    // KPA renderRowActions 위치 — instructor 소유 강의 수정/종료 액션
    // K-Cosmetics Step 1에서는 미구현. 향후 KPA instructor 구조 도입 시 동일 패턴 적용:
    //   renderRowActions: (course, reload) => {
    //     const isOwner = !!(user && course.instructorId === user.id);
    //     if (!isOwner) return null;
    //     return <RowActionMenu actions={[...]} />;
    //   },
  };

  return <LmsHubTemplate config={config} />;
}

export default EducationPage;
