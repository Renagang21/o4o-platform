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

function mapCourse(c: LmsCourse): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    level: c.level,
    status: c.status,
    duration: c.duration,
    createdAt: c.createdAt,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

const glycoConfig: LmsHubConfig = {
  title: '강의',
  subtitle: '혈당관리 전문성을 높이는 다양한 교육 자료',
  courseDetailPath: (id) => `/lms/${id}`,

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
