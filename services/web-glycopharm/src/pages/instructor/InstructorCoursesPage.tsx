/**
 * InstructorCoursesPage — /instructor/courses (thin wrapper)
 *
 * WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1:
 *   공통 `InstructorCoursesManager`(@o4o/operator-core-ui) 소비. GlycoPharm 차이는 config 주입
 *   (검색 + 완료율 컬럼 + 수강자 action, bulk 없음, accent green).
 */

import { InstructorCoursesManager } from '@o4o/operator-core-ui';
import { lmsApi } from '@/api/lms';

export default function InstructorCoursesPage() {
  return (
    <InstructorCoursesManager
      config={{
        accent: '#16a34a',
        search: true,
        rowActions: ['edit', 'participants', 'delete'],
        columns: { completionRate: true },
        routes: {
          dashboard: '/instructor',
          create: '/instructor/courses/new',
          edit: (id) => `/instructor/courses/${id}`,
          manage: (id) => `/instructor/courses/${id}`,
          participants: (id) => `/instructor/courses/${id}/enrollments`,
        },
        api: {
          list: async () => {
            const res: any = await lmsApi.getInstructorCourses();
            const list = res?.data ?? res ?? [];
            return (Array.isArray(list) ? list : []).map((c: any) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              thumbnail: c.thumbnail,
              enrollmentCount: c.enrolledCount,
              completionRate: c.completionRate,
            }));
          },
          delete: (id) => lmsApi.instructorDeleteCourse(id),
        },
      }}
    />
  );
}
