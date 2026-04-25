/**
 * EducationPage - KPA /lms HUB
 *
 * WO-O4O-LMS-HUB-TEMPLATE-FOUNDATION-V1
 *
 * LmsHubTemplate + kpa config.
 * 강사 소유 강의 수정/종료 액션은 KPA-specific renderRowActions로 주입.
 */

import { useNavigate } from 'react-router-dom';
import { LmsHubTemplate, type LmsHubConfig, type LmsHubCourse } from '@o4o/shared-space-ui';
import { RowActionMenu, type RowActionItem } from '@o4o/ui';
import { lmsApi } from '../../api';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import type { Course } from '../../types';

// ─── Course type adapter ─────────────────────────────────────────────────────

function mapCourse(c: Course): LmsHubCourse {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    lessonCount: c.lessonCount,
    status: c.status,
    instructorName: (c as any).instructor?.name || c.instructorName || undefined,
    instructorId: (c as any).instructor?.id || undefined,
    tags: c.tags,
    createdAt: (c as any).createdAt,
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function EducationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const config: LmsHubConfig = {
    serviceKey: 'kpa-society',
    heroTitle: '강의',
    heroDesc: '보수교육, 온라인 세미나, 실무 강의',
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
        total: pag?.totalItems ?? pag?.total,
      };
    },

    renderRowActions: (course, reload) => {
      const isOwner = !!(user && course.instructorId === user.id);
      if (!isOwner) return null;

      const actions: RowActionItem[] = [
        {
          key: 'edit',
          label: '수정',
          onClick: () => navigate(`/instructor/courses/${course.id}/edit`),
        },
        {
          key: 'delete',
          label: '강의 종료',
          variant: 'danger',
          onClick: async () => {
            try {
              await lmsInstructorApi.deleteCourse(course.id);
              toast.success('강의가 종료 처리되었습니다');
              reload();
            } catch {
              toast.error('처리에 실패했습니다');
            }
          },
          confirm: {
            title: '강의 종료',
            message: '이 강의를 종료(보관) 처리하시겠습니까?',
            variant: 'danger',
          },
        },
      ];

      return <RowActionMenu actions={actions} />;
    },
  };

  return <LmsHubTemplate config={config} />;
}

export default EducationPage;
