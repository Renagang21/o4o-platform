/**
 * EducationPage - GlycoPharm /lms HUB
 *
 * WO-O4O-LMS-HUB-TEMPLATE-FOUNDATION-V1
 *
 * LmsHubTemplate + glycopharm config.
 */

import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { lmsApi, type LmsCourse } from '@/api/lms';

// ─── Course type adapter ─────────────────────────────────────────────────────

// WO-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1: 공개/회원제 배지용 — 유효값만 매핑, 그 외 undefined(=category fallback)
const normalizeVisibility = (v: unknown): 'public' | 'members' | undefined =>
  v === 'public' || v === 'members' ? v : undefined;

function mapCourse(c: LmsCourse): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    status: c.status,
    duration: c.duration,
    createdAt: c.createdAt,
    visibility: normalizeVisibility(c.visibility),
    requiresApproval: c.requiresApproval,
    isPaid: c.isPaid,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

const glycoConfig: LmsHubConfig = {
  serviceKey: 'glycopharm',
  accent: '#16a34a',
  heroTitle: '강의',
  heroDesc: '혈당관리 전문성을 높이는 다양한 교육 자료',
  courseDetailPath: (id) => `/lms/course/${id}`,

  fetchCourses: async (params) => {
    const result = await lmsApi.getCourses({
      search: params.search,
      limit: params.limit ?? 20,
    });
    return {
      data: (result.data ?? []).map(mapCourse),
      totalPages: result.meta?.totalPages ?? 1,
    };
  },
};

export default function EducationPage() {
  return <LmsHubTemplate config={glycoConfig} />;
}
