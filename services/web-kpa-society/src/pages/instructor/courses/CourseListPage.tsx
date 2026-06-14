/**
 * CourseListPage — /instructor/courses (thin wrapper)
 *
 * WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1:
 *   공통 `InstructorCoursesManager`(@o4o/operator-core-ui) 소비(KPA = canonical). 차이는 config 주입.
 */

import { InstructorCoursesManager } from '@o4o/operator-core-ui';
import { lmsInstructorApi } from '../../../api/lms-instructor';

export default function CourseListPage() {
  return (
    <InstructorCoursesManager
      config={{
        accent: '#4f46e5',
        bulkDelete: true,
        rowActions: ['edit', 'delete'],
        columns: { description: true, createdAt: true },
        routes: {
          dashboard: '/instructor',
          create: '/instructor/courses/new',
          edit: (id) => `/instructor/courses/${id}/edit`,
          manage: (id) => `/instructor/courses/${id}`,
        },
        api: {
          list: async () => {
            const res: any = await lmsInstructorApi.myCourses();
            const list = res?.data?.data;
            return (Array.isArray(list) ? list : []).map((c: any) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              thumbnail: c.thumbnail,
              description: c.description,
              enrollmentCount: c.currentEnrollments,
              createdAt: c.createdAt,
            }));
          },
          delete: (id) => lmsInstructorApi.deleteCourse(id),
        },
      }}
    />
  );
}
