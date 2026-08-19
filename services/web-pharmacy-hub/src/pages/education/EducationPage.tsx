/**
 * EducationPage — Pharmacy-Hub 교육 허브 (/education)
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7
 *
 * 공통 `LmsHubTemplate` 을 그대로 채택한다. PH 전용 복제 JSX 를 만들지 않는다.
 * §8: 조회·학습 baseline — 수강신청/진도/수료증/퀴즈/과제 CTA 는 노출하지 않는다.
 */

import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { lmsApi, type LmsCourse } from '../../api/lms';
import { PH_LMS_ACCENT } from './lmsViewAdapter';

const normalizeVisibility = (v: unknown): 'public' | 'members' | undefined =>
  v === 'public' || v === 'members' ? v : undefined;

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
    visibility: normalizeVisibility(c.visibility),
    requiresApproval: c.requiresApproval,
    isPaid: c.isPaid,
  };
}

export function EducationPage() {
  const config: LmsHubConfig = {
    serviceKey: 'pharmacy-hub',
    accent: PH_LMS_ACCENT,
    heroTitle: '교육',
    heroDesc: '약국 운영과 상품 이해를 돕는 PharmacyHub 교육 콘텐츠',
    courseDetailPath: (id) => `/education/course/${id}`,

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
  };

  return <LmsHubTemplate config={config} />;
}

export default EducationPage;
