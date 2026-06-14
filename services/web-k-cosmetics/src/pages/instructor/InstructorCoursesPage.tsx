/**
 * InstructorCoursesPage — K-Cosmetics 강사 강의 목록 (thin wrapper)
 *
 * WO-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1:
 *   bespoke read-only 테이블 → 공통 `InstructorCoursesManager`(@o4o/operator-core-ui) 위에 build-on.
 *   KCos 는 아직 생성/편집/삭제 route·API 미보유 → read-only config(생성 CTA·row action·row click 없음).
 *   향후 Phase 1-B 에서 create/edit/delete route·API 추가 시 config 만 확장하면 됨.
 */

import { InstructorCoursesManager } from '@o4o/operator-core-ui';
import { lmsApi } from '@/api/lms';

export default function InstructorCoursesPage() {
  return (
    <InstructorCoursesManager
      config={{
        accent: '#db2777',
        rowActions: [],
        columns: { thumbnail: false, category: true, lessonCount: true },
        routes: { dashboard: '/instructor' },
        api: {
          list: async () => {
            const res: any = await lmsApi.getInstructorCourses();
            const list = res?.data ?? res ?? [];
            return (Array.isArray(list) ? list : []).map((c: any) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              category: c.category,
              lessonCount: c.lessonCount,
              enrollmentCount: c.enrollmentCount,
            }));
          },
        },
      }}
    />
  );
}
