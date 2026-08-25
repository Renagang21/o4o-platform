/**
 * InstructorCoursesPage — /instructor/courses (thin wrapper)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
 *
 * 화면 본체는 공통 `InstructorCoursesManager`(@o4o/operator-core-ui) 다
 * (KPA-Society · GlycoPharm · K-Cosmetics 가 이미 같은 모듈을 쓴다).
 * PH 차이는 config(accent teal · 강의 상세 경로 /education/course/:id)로만 주입한다.
 */

import { InstructorCoursesManager } from '@o4o/operator-core-ui';
import { lmsApi } from '../../api/lms';

export default function InstructorCoursesPage() {
  return (
    <InstructorCoursesManager
      config={{
        accent: '#0d9488',
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
            const res = (await lmsApi.getInstructorCourses()) as unknown as {
              data?: unknown;
            };
            const list = (res?.data ?? res ?? []) as unknown;
            return (Array.isArray(list) ? list : []).map((raw) => {
              const c = raw as Record<string, unknown>;
              return {
                id: String(c.id),
                title: String(c.title ?? ''),
                status: String(c.status ?? 'draft'),
                thumbnail: (c.thumbnail as string | null | undefined) ?? null,
                enrollmentCount: c.enrolledCount as number | undefined,
                completionRate: c.completionRate as number | undefined,
              };
            });
          },
          delete: (id) => lmsApi.instructorDeleteCourse(id),
        },
      }}
    />
  );
}
