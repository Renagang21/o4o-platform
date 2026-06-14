/**
 * OperatorLmsCoursesPage — K-Cosmetics Operator 강의 관리 (thin wrapper)
 *
 * WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1:
 *   공통 `OperatorLmsCoursesManager`(@o4o/operator-core-ui) 소비. K-Cosmetics 차이는 API adapter 만 주입.
 */

import { OperatorLmsCoursesManager } from '@o4o/operator-core-ui';
import { lmsApi } from '@/api/lms';

export default function OperatorLmsCoursesPage() {
  return (
    <OperatorLmsCoursesManager
      config={{
        detailLinkLabel: '편집 페이지 이동',
        api: {
          list: (p) => lmsApi.getCourses(p),
          approve: (id) => lmsApi.operatorApproveCourse(id),
          reject: (id, reason) => lmsApi.operatorRejectCourse(id, reason),
          unpublish: (id) => lmsApi.operatorUnpublishCourse(id),
          archive: (id) => lmsApi.operatorArchiveCourse(id),
          hardDelete: (id) => lmsApi.operatorHardDeleteCourse(id),
        },
      }}
    />
  );
}
